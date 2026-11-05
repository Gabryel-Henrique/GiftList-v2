-- GiftList — Supabase schema (initial, complete).
-- Run this whole file once in the SQL Editor of the Supabase project that
-- already hosts the old .NET GiftList database.
-- Before running: replace '<8efe8a8e-72b7-4172-a5f6-a961826fcea5>' below with the invite code.
--
-- Where the old app kept business rules in C# services, this schema keeps
-- them in the database itself, because the SPA talks to Supabase directly:
--   * Row Level Security scopes every row to the logged-in user's couple.
--   * Multi-step rules (couple requests, gift purchase, agenda) live in
--     SECURITY DEFINER functions called via supabase.rpc(). Their error
--     messages are the user-facing pt-BR messages from the old app.
--   * Plain CRUD (restaurants, dates, movies, reviews, gifts) goes straight
--     through PostgREST, guarded by RLS + triggers.

-- ============================================================
-- 0. Legacy tables from the .NET app (PascalCase, quoted).
--    They live in `public`, so the Data API would expose them (password
--    hashes included) to anyone holding the publishable key that ships in
--    the new app's bundle. RLS with no policies blocks the API entirely.
--    The old app connects as `postgres` (the table owner), which bypasses
--    RLS, so it keeps working until it's switched off.
-- ============================================================
do $$
declare
  t text;
begin
  foreach t in array array[
    'Users', 'Couples', 'CoupleRequests', 'Gifts', 'GiftImages',
    'Restaurants', 'RestaurantReviews', 'DateIdeas', 'DateIdeaReviews',
    'Movies', 'MovieReviews', 'Availabilities', 'AgendaEntries',
    '__EFMigrationsHistory'
  ]
  loop
    if to_regclass(format('public.%I', t)) is not null then
      execute format('alter table public.%I enable row level security', t);
    end if;
  end loop;
end $$;

-- ============================================================
-- 1. Invite-code secret (unreadable from the client, RLS blocks everyone)
-- ============================================================
create table public.app_config (
  key text primary key,
  value text not null
);
alter table public.app_config enable row level security;
-- Intentionally no policies: only SECURITY DEFINER functions read it.

insert into public.app_config (key, value) values ('invite_code', '<CHANGE-ME>');

create or replace function public.check_invite_code()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  required_code text;
begin
  select value into required_code from public.app_config where key = 'invite_code';
  if required_code is null
     or (new.raw_user_meta_data ->> 'invite_code') is distinct from required_code then
    raise exception 'invalid_invite_code';
  end if;
  return new;
end;
$$;

create trigger enforce_invite_code
  before insert on auth.users
  for each row
  execute function public.check_invite_code();

-- Accounts have no real e-mail (the app signs up `<username>@giftlist.invalid`,
-- see features/auth/authApi.ts), so a confirmation link could never arrive.
create or replace function public.auto_confirm_signup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email like '%@giftlist.invalid' then
    new.email_confirmed_at := now();
  end if;
  return new;
end;
$$;

create trigger auto_confirm_signup
  before insert on auth.users
  for each row
  execute function public.auto_confirm_signup();

-- ============================================================
-- 2. Profiles (old "Users" table). Filled by a trigger on signup from the
--    metadata the register screen sends (name, username, gender).
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 100),
  username text not null unique check (username = lower(trim(username)) and length(username) between 1 and 50),
  gender text not null check (gender in ('Male', 'Female'))
);
alter table public.profiles enable row level security;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, username, gender)
  values (
    new.id,
    trim(new.raw_user_meta_data ->> 'name'),
    lower(trim(new.raw_user_meta_data ->> 'username')),
    coalesce(new.raw_user_meta_data ->> 'gender', 'Male')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- ============================================================
-- 3. Couples and couple requests
-- ============================================================
create table public.couples (
  id uuid primary key default gen_random_uuid(),
  user_a_id uuid not null unique references public.profiles(id) on delete cascade, -- who invited
  user_b_id uuid not null unique references public.profiles(id) on delete cascade, -- who accepted
  created_at timestamptz not null default now(),
  check (user_a_id <> user_b_id)
);
alter table public.couples enable row level security;

create table public.couple_requests (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid not null references public.profiles(id) on delete cascade,
  to_user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'Proposed' check (status in ('Proposed', 'Accepted', 'Declined', 'Cancelled')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  check (from_user_id <> to_user_id)
);
alter table public.couple_requests enable row level security;
create index on public.couple_requests (from_user_id, to_user_id);
create index on public.couple_requests (to_user_id);

-- SECURITY DEFINER so RLS policies can call these without recursing into
-- the couples table's own policies.
create or replace function public.my_couple_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.couples
  where user_a_id = auth.uid() or user_b_id = auth.uid()
  limit 1;
$$;

create or replace function public.my_partner_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select case when user_a_id = auth.uid() then user_b_id else user_a_id end
  from public.couples
  where user_a_id = auth.uid() or user_b_id = auth.uid()
  limit 1;
$$;

-- The "needs a couple" rule every feature starts with.
create or replace function public.require_couple()
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  c uuid := public.my_couple_id();
begin
  if c is null then
    raise exception 'Você ainda não está vinculado com seu parceiro(a). Vincule sua conta antes de usar essa funcionalidade.';
  end if;
  return c;
end;
$$;

create policy "select own couple" on public.couples
  for select using (auth.uid() in (user_a_id, user_b_id));

create policy "select own requests" on public.couple_requests
  for select using (auth.uid() in (from_user_id, to_user_id));

-- Profiles: yourself, your partner, and anyone with a pending request
-- to/from you (so the requests cards can show their name).
create policy "select related profiles" on public.profiles
  for select using (
    id = auth.uid()
    or id = public.my_partner_id()
    or exists (
      select 1 from public.couple_requests r
      where r.status = 'Proposed'
        and (
          (r.from_user_id = auth.uid() and r.to_user_id = profiles.id)
          or (r.to_user_id = auth.uid() and r.from_user_id = profiles.id)
        )
    )
  );

create or replace function public.send_couple_request(partner_username text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  partner uuid;
begin
  if public.my_couple_id() is not null then
    raise exception 'Você já está vinculado com um parceiro(a).';
  end if;

  select id into partner from public.profiles
  where username = lower(trim(coalesce(partner_username, '')));
  if partner is null then
    raise exception 'Não encontramos ninguém com esse usuário.';
  end if;
  if partner = me then
    raise exception 'Você não pode se vincular com você mesmo(a).';
  end if;
  if exists (select 1 from public.couples where partner in (user_a_id, user_b_id)) then
    raise exception 'Essa pessoa já está vinculada com outro parceiro(a).';
  end if;
  if exists (
    select 1 from public.couple_requests
    where status = 'Proposed'
      and ((from_user_id = me and to_user_id = partner) or (from_user_id = partner and to_user_id = me))
  ) then
    raise exception 'Já existe um pedido pendente entre vocês.';
  end if;

  insert into public.couple_requests (from_user_id, to_user_id) values (me, partner);
end;
$$;

create or replace function public.accept_couple_request(request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  r public.couple_requests;
begin
  select * into r from public.couple_requests
  where id = request_id and me in (from_user_id, to_user_id)
  for update;
  if not found then
    raise exception 'Pedido não encontrado.';
  end if;
  if r.to_user_id <> me then
    raise exception 'Só quem recebeu o pedido pode aceitá-lo.';
  end if;
  if exists (select 1 from public.couples where r.from_user_id in (user_a_id, user_b_id)) then
    raise exception 'Quem te convidou já está vinculado com outro parceiro(a).';
  end if;
  if exists (select 1 from public.couples where me in (user_a_id, user_b_id)) then
    raise exception 'Você já está vinculado com um parceiro(a).';
  end if;
  if r.status <> 'Proposed' then
    raise exception 'Esse pedido já foi respondido.';
  end if;

  update public.couple_requests set status = 'Accepted', responded_at = now() where id = r.id;
  insert into public.couples (user_a_id, user_b_id) values (r.from_user_id, r.to_user_id);

  -- Any other pending request involving either of them is now moot.
  update public.couple_requests
  set status = 'Cancelled', responded_at = now()
  where status = 'Proposed'
    and id <> r.id
    and (from_user_id in (r.from_user_id, r.to_user_id) or to_user_id in (r.from_user_id, r.to_user_id));
end;
$$;

create or replace function public.decline_couple_request(request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  r public.couple_requests;
begin
  select * into r from public.couple_requests
  where id = request_id and me in (from_user_id, to_user_id)
  for update;
  if not found then
    raise exception 'Pedido não encontrado.';
  end if;
  if r.to_user_id <> me then
    raise exception 'Só quem recebeu o pedido pode recusá-lo.';
  end if;
  if r.status <> 'Proposed' then
    raise exception 'Esse pedido já foi respondido.';
  end if;
  update public.couple_requests set status = 'Declined', responded_at = now() where id = r.id;
end;
$$;

create or replace function public.cancel_couple_request(request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  r public.couple_requests;
begin
  select * into r from public.couple_requests
  where id = request_id and me in (from_user_id, to_user_id)
  for update;
  if not found then
    raise exception 'Pedido não encontrado.';
  end if;
  if r.from_user_id <> me then
    raise exception 'Só quem enviou o pedido pode cancelá-lo.';
  end if;
  if r.status <> 'Proposed' then
    raise exception 'Esse pedido já foi respondido.';
  end if;
  update public.couple_requests set status = 'Cancelled', responded_at = now() where id = r.id;
end;
$$;

-- ============================================================
-- 4. Generic triggers shared by the couple-scoped tables
-- ============================================================

-- couple_id always comes from the session, never from the client.
create or replace function public.set_couple_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.couple_id := public.require_couple();
  return new;
end;
$$;

-- The generic repository sends the whole record on update; this pins the
-- columns that must never change (passed as trigger arguments).
create or replace function public.protect_columns()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  col text;
begin
  foreach col in array tg_argv
  loop
    new := jsonb_populate_record(new, jsonb_build_object(col, to_jsonb(old) -> col));
  end loop;
  return new;
end;
$$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ============================================================
-- 5. Gifts
-- ============================================================
create table public.gifts (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  owner_user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 200),
  description text check (length(description) <= 1000),
  link text check (length(link) <= 2000),
  price numeric(18, 2) check (price >= 0),
  priority text not null default 'Medium' check (priority in ('Low', 'Medium', 'High')),
  type text not null check (type in ('WishList', 'ToGive')),
  created_at timestamptz not null default now(),
  is_purchased boolean not null default false,
  purchased_at timestamptz,
  purchased_by_user_id uuid references public.profiles(id) on delete set null
);
alter table public.gifts enable row level security;
create index on public.gifts (owner_user_id, type);
create index on public.gifts (couple_id);

create trigger gifts_set_couple before insert on public.gifts
  for each row execute function public.set_couple_id();
create trigger gifts_protect before update on public.gifts
  for each row execute function public.protect_columns('couple_id', 'owner_user_id', 'type', 'created_at');

-- Purchase fields only change through set_gift_purchased(), which raises
-- this flag for its own transaction.
create or replace function public.protect_gift_purchase()
returns trigger
language plpgsql
as $$
begin
  if current_setting('giftlist.purchase_change', true) is distinct from 'on' then
    new.is_purchased := old.is_purchased;
    new.purchased_at := old.purchased_at;
    new.purchased_by_user_id := old.purchased_by_user_id;
  end if;
  return new;
end;
$$;

create trigger gifts_protect_purchase before update on public.gifts
  for each row execute function public.protect_gift_purchase();

-- A "ToGive" gift is a surprise: only its owner may ever see it.
create policy "select couple gifts" on public.gifts
  for select using (
    couple_id = public.my_couple_id()
    and (type = 'WishList' or owner_user_id = auth.uid())
  );
create policy "insert own gifts" on public.gifts
  for insert with check (owner_user_id = auth.uid() and couple_id = public.my_couple_id());
create policy "update own gifts" on public.gifts
  for update using (owner_user_id = auth.uid() and couple_id = public.my_couple_id());
create policy "delete own gifts" on public.gifts
  for delete using (owner_user_id = auth.uid() and couple_id = public.my_couple_id());

create or replace function public.set_gift_purchased(gift_id uuid, purchased boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  c uuid := public.require_couple();
  g public.gifts;
begin
  select * into g from public.gifts
  where id = gift_id and couple_id = c
    and (type = 'WishList' or owner_user_id = me)
  for update;
  if not found then
    raise exception 'Presente não encontrado.';
  end if;

  -- ToGive: the owner tracks their own purchases. WishList: only the
  -- partner can mark it, so the owner can't spoil their own surprise.
  if (g.type = 'ToGive' and g.owner_user_id <> me)
     or (g.type = 'WishList' and g.owner_user_id = me) then
    raise exception 'Você não pode alterar esse presente.';
  end if;

  perform set_config('giftlist.purchase_change', 'on', true);
  if purchased then
    update public.gifts
    set is_purchased = true, purchased_at = now(), purchased_by_user_id = me
    where id = g.id;
  else
    update public.gifts
    set is_purchased = false, purchased_at = null, purchased_by_user_id = null
    where id = g.id;
  end if;
  perform set_config('giftlist.purchase_change', 'off', true);
end;
$$;

-- Images: the files live in the private `gift-images` Storage bucket at
-- `<couple_id>/<gift_id>/<uuid>.jpg`; this table orders them and ties the
-- file to the gift, so visibility follows the gift's own RLS.
create table public.gift_images (
  id uuid primary key default gen_random_uuid(),
  gift_id uuid not null references public.gifts(id) on delete cascade,
  couple_id uuid not null references public.couples(id) on delete cascade,
  path text not null unique,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.gift_images enable row level security;
create index on public.gift_images (gift_id, sort_order);

create trigger gift_images_set_couple before insert on public.gift_images
  for each row execute function public.set_couple_id();

create or replace function public.check_gift_image_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.gift_images where gift_id = new.gift_id) >= 6 then
    raise exception 'Um presente pode ter no máximo 6 imagens.';
  end if;
  return new;
end;
$$;

create trigger gift_images_limit before insert on public.gift_images
  for each row execute function public.check_gift_image_limit();

create policy "select visible gift images" on public.gift_images
  for select using (exists (select 1 from public.gifts g where g.id = gift_images.gift_id));
create policy "insert own gift images" on public.gift_images
  for insert with check (
    exists (select 1 from public.gifts g where g.id = gift_images.gift_id and g.owner_user_id = auth.uid())
  );
create policy "delete own gift images" on public.gift_images
  for delete using (
    exists (select 1 from public.gifts g where g.id = gift_images.gift_id and g.owner_user_id = auth.uid())
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('gift-images', 'gift-images', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "read visible gift images" on storage.objects
  for select using (
    bucket_id = 'gift-images'
    and exists (select 1 from public.gift_images gi where gi.path = storage.objects.name)
  );
create policy "upload own gift images" on storage.objects
  for insert with check (
    bucket_id = 'gift-images'
    and (storage.foldername(storage.objects.name))[1] = public.my_couple_id()::text
    and exists (
      select 1 from public.gifts g
      where g.id::text = (storage.foldername(storage.objects.name))[2] and g.owner_user_id = auth.uid()
    )
  );
create policy "delete own gift images" on storage.objects
  for delete using (
    bucket_id = 'gift-images'
    and (storage.foldername(storage.objects.name))[1] = public.my_couple_id()::text
    and exists (
      select 1 from public.gifts g
      where g.id::text = (storage.foldername(storage.objects.name))[2] and g.owner_user_id = auth.uid()
    )
  );

-- ============================================================
-- 6. Restaurants, date ideas, movies and their reviews.
--    Anyone in the couple can edit/delete an item; each person only
--    writes their own review (one per item, upserted by the app).
-- ============================================================
create table public.restaurants (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  created_by_user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 200),
  description text check (length(description) <= 1000),
  link text check (length(link) <= 2000),
  image_url text check (length(image_url) <= 2000),
  created_at timestamptz not null default now()
);

create table public.restaurant_reviews (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  couple_id uuid not null references public.couples(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  rating int not null check (rating between 0 and 10),
  comment text check (length(comment) <= 1000),
  would_return boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (restaurant_id, user_id)
);

create table public.date_ideas (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  created_by_user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 200),
  description text check (length(description) <= 1000),
  estimated_cost numeric(18, 2) check (estimated_cost >= 0),
  video_link text check (length(video_link) <= 2000),
  priority text not null default 'Medium' check (priority in ('Low', 'Medium', 'High')),
  created_at timestamptz not null default now()
);

create table public.date_idea_reviews (
  id uuid primary key default gen_random_uuid(),
  date_idea_id uuid not null references public.date_ideas(id) on delete cascade,
  couple_id uuid not null references public.couples(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  rating int not null check (rating between 0 and 10),
  comment text check (length(comment) <= 1000),
  would_repeat boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (date_idea_id, user_id)
);

create table public.movies (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  created_by_user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 200),
  image_url text check (length(image_url) <= 2000),
  created_at timestamptz not null default now()
);

create table public.movie_reviews (
  id uuid primary key default gen_random_uuid(),
  movie_id uuid not null references public.movies(id) on delete cascade,
  couple_id uuid not null references public.couples(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  -- 1 to 5 stars in half-star steps.
  rating numeric(2, 1) not null check (rating between 1 and 5 and rating * 2 = trunc(rating * 2)),
  review text check (length(review) <= 2000),
  watched_date date,
  is_first_watch boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (movie_id, user_id)
);

do $$
declare
  t text;
begin
  -- Items: whole couple can read and write.
  foreach t in array array['restaurants', 'date_ideas', 'movies']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create index on public.%I (couple_id)', t);
    execute format(
      'create trigger %I before insert on public.%I for each row execute function public.set_couple_id()',
      t || '_set_couple', t
    );
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.protect_columns(''couple_id'', ''created_by_user_id'', ''created_at'')',
      t || '_protect', t
    );
    execute format(
      'create policy "select couple" on public.%I for select using (couple_id = public.my_couple_id())', t
    );
    execute format(
      'create policy "insert couple" on public.%I for insert with check (created_by_user_id = auth.uid() and couple_id = public.my_couple_id())', t
    );
    execute format(
      'create policy "update couple" on public.%I for update using (couple_id = public.my_couple_id())', t
    );
    execute format(
      'create policy "delete couple" on public.%I for delete using (couple_id = public.my_couple_id())', t
    );
  end loop;

  -- Reviews: couple reads all, each user writes only their own.
  foreach t in array array['restaurant_reviews', 'date_idea_reviews', 'movie_reviews']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create index on public.%I (couple_id)', t);
    execute format(
      'create trigger %I before insert on public.%I for each row execute function public.set_couple_id()',
      t || '_set_couple', t
    );
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.protect_columns(''couple_id'', ''user_id'', ''created_at'')',
      t || '_protect', t
    );
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.touch_updated_at()',
      t || '_touch', t
    );
    execute format(
      'create policy "select couple" on public.%I for select using (couple_id = public.my_couple_id())', t
    );
    execute format(
      'create policy "insert own" on public.%I for insert with check (user_id = auth.uid() and couple_id = public.my_couple_id())', t
    );
    execute format(
      'create policy "update own" on public.%I for update using (user_id = auth.uid())', t
    );
    execute format(
      'create policy "delete own" on public.%I for delete using (user_id = auth.uid())', t
    );
  end loop;
end $$;

-- A review must point at an item of the same couple (the FK alone would
-- accept any id the client sends).
create or replace function public.check_review_parent()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  parent_couple uuid;
begin
  if tg_table_name = 'restaurant_reviews' then
    select couple_id into parent_couple from public.restaurants where id = new.restaurant_id;
    if parent_couple is distinct from new.couple_id then
      raise exception 'Restaurante não encontrado.';
    end if;
  elsif tg_table_name = 'date_idea_reviews' then
    select couple_id into parent_couple from public.date_ideas where id = new.date_idea_id;
    if parent_couple is distinct from new.couple_id then
      raise exception 'Ideia de date não encontrada.';
    end if;
  else
    select couple_id into parent_couple from public.movies where id = new.movie_id;
    if parent_couple is distinct from new.couple_id then
      raise exception 'Filme ou série não encontrado.';
    end if;
  end if;
  return new;
end;
$$;

-- Named with a "z" so it runs after the *_set_couple trigger (Postgres
-- fires same-event triggers in alphabetical order).
create trigger z_check_parent before insert on public.restaurant_reviews
  for each row execute function public.check_review_parent();
create trigger z_check_parent before insert on public.date_idea_reviews
  for each row execute function public.check_review_parent();
create trigger z_check_parent before insert on public.movie_reviews
  for each row execute function public.check_review_parent();

-- ============================================================
-- 7. Agenda: availability per user/day and plan proposals.
--    Read through RLS; every write goes through the functions below,
--    since they carry state rules (who can confirm, auto-cancel...).
-- ============================================================
create table public.availabilities (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  date date not null,
  is_open boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, date)
);
alter table public.availabilities enable row level security;
create index on public.availabilities (couple_id);

create table public.agenda_entries (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  proposed_by_user_id uuid not null references public.profiles(id) on delete cascade,
  couple_id uuid not null references public.couples(id) on delete cascade,
  date_idea_id uuid references public.date_ideas(id) on delete cascade,
  restaurant_id uuid references public.restaurants(id) on delete cascade,
  note text check (length(note) <= 1000),
  status text not null default 'Proposed' check (status in ('Proposed', 'Confirmed', 'Declined', 'Cancelled')),
  status_note text check (length(status_note) <= 1000),
  was_done boolean not null default false,
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  check ((date_idea_id is null) <> (restaurant_id is null))
);
alter table public.agenda_entries enable row level security;
create index on public.agenda_entries (date);
create index on public.agenda_entries (couple_id);
create index on public.agenda_entries (date_idea_id);
create index on public.agenda_entries (restaurant_id);

create policy "select couple" on public.availabilities
  for select using (couple_id = public.my_couple_id());
create policy "select couple" on public.agenda_entries
  for select using (couple_id = public.my_couple_id());

-- Opens (or creates) a user's availability on a day. Internal helper.
create or replace function public.open_availability(p_user uuid, p_couple uuid, p_date date)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.availabilities (couple_id, user_id, date, is_open)
  values (p_couple, p_user, p_date, true)
  on conflict (user_id, date) do update set is_open = true, updated_at = now();
$$;
revoke execute on function public.open_availability(uuid, uuid, date) from public, anon, authenticated;

create or replace function public.set_availability(p_date date, p_open boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  c uuid := public.require_couple();
begin
  if p_date is null then
    raise exception 'Informe uma data válida.';
  end if;

  if p_open then
    perform public.open_availability(me, c, p_date);
    return;
  end if;

  update public.availabilities
  set is_open = false, updated_at = now()
  where user_id = me and date = p_date;
  if not found then
    raise exception 'Você não tinha marcado disponibilidade nesse dia.';
  end if;

  -- Nobody left on that day: plans for it can't happen anymore.
  if not exists (
    select 1 from public.availabilities
    where couple_id = c and date = p_date and is_open
  ) then
    update public.agenda_entries
    set status = 'Cancelled',
        status_note = 'Cancelado automaticamente: ninguém está mais disponível em '
          || to_char(p_date, 'DD/MM/YYYY') || '.'
    where couple_id = c and date = p_date and status in ('Proposed', 'Confirmed');
  end if;
end;
$$;

create or replace function public.propose_agenda_entry(
  p_date date,
  p_date_idea_id uuid,
  p_restaurant_id uuid,
  p_note text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  c uuid := public.require_couple();
begin
  if p_date is null then
    raise exception 'Informe uma data válida.';
  end if;
  if p_date_idea_id is null and p_restaurant_id is null then
    raise exception 'Escolha um date ou um restaurante para vincular a essa data.';
  end if;
  if p_date_idea_id is not null and p_restaurant_id is not null then
    raise exception 'Escolha só um: date ou restaurante, não os dois.';
  end if;
  if p_date_idea_id is not null
     and not exists (select 1 from public.date_ideas where id = p_date_idea_id and couple_id = c) then
    raise exception 'Ideia de date não encontrada.';
  end if;
  if p_restaurant_id is not null
     and not exists (select 1 from public.restaurants where id = p_restaurant_id and couple_id = c) then
    raise exception 'Restaurante não encontrado.';
  end if;

  perform public.open_availability(me, c, p_date);

  insert into public.agenda_entries (date, proposed_by_user_id, couple_id, date_idea_id, restaurant_id, note)
  values (p_date, me, c, p_date_idea_id, p_restaurant_id, nullif(trim(p_note), ''));
end;
$$;

create or replace function public.confirm_agenda_entry(entry_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  c uuid := public.require_couple();
  e public.agenda_entries;
begin
  select * into e from public.agenda_entries where id = entry_id and couple_id = c for update;
  if not found then
    raise exception 'Proposta não encontrada.';
  end if;
  if e.proposed_by_user_id = me then
    raise exception 'Você não pode confirmar sua própria proposta.';
  end if;
  if e.status <> 'Proposed' then
    raise exception 'Essa proposta já foi respondida.';
  end if;

  update public.agenda_entries set status = 'Confirmed', responded_at = now() where id = e.id;
  perform public.open_availability(me, c, e.date);
end;
$$;

create or replace function public.decline_agenda_entry(entry_id uuid, reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  c uuid := public.require_couple();
  e public.agenda_entries;
begin
  select * into e from public.agenda_entries where id = entry_id and couple_id = c for update;
  if not found then
    raise exception 'Proposta não encontrada.';
  end if;
  if e.proposed_by_user_id = me then
    raise exception 'Você não pode recusar sua própria proposta.';
  end if;
  if e.status <> 'Proposed' then
    raise exception 'Essa proposta já foi respondida.';
  end if;

  update public.agenda_entries
  set status = 'Declined', status_note = nullif(trim(reason), ''), responded_at = now()
  where id = e.id;
end;
$$;

create or replace function public.cancel_agenda_entry(entry_id uuid, reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  c uuid := public.require_couple();
  e public.agenda_entries;
begin
  select * into e from public.agenda_entries where id = entry_id and couple_id = c for update;
  if not found then
    raise exception 'Proposta não encontrada.';
  end if;
  if e.proposed_by_user_id <> me then
    raise exception 'Só quem propôs pode cancelar esse plano. Retire sua disponibilidade se não puder mais.';
  end if;
  if e.status in ('Declined', 'Cancelled') then
    raise exception 'Essa proposta já foi encerrada.';
  end if;

  update public.agenda_entries
  set status = 'Cancelled', status_note = nullif(trim(reason), '')
  where id = e.id;
end;
$$;

-- `today` comes from the client: the user's local date, not the server's
-- UTC clock (which is already "tomorrow" from 21h on in Brasília).
create or replace function public.mark_agenda_entry_done(entry_id uuid, today date)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  c uuid := public.require_couple();
  e public.agenda_entries;
begin
  select * into e from public.agenda_entries where id = entry_id and couple_id = c for update;
  if not found then
    raise exception 'Proposta não encontrada.';
  end if;
  if e.status <> 'Confirmed' then
    raise exception 'Só é possível avaliar planos confirmados.';
  end if;
  if e.date > today then
    raise exception 'Esse date ainda não chegou. Por enquanto só dá para cancelar o plano ou desmarcar sua disponibilidade.';
  end if;

  update public.agenda_entries set was_done = true where id = e.id;
end;
$$;

-- ============================================================
-- 8. Function permissions: RPCs only for logged-in users.
-- ============================================================
do $$
declare
  f text;
begin
  foreach f in array array[
    'send_couple_request(text)',
    'accept_couple_request(uuid)',
    'decline_couple_request(uuid)',
    'cancel_couple_request(uuid)',
    'set_gift_purchased(uuid, boolean)',
    'set_availability(date, boolean)',
    'propose_agenda_entry(date, uuid, uuid, text)',
    'confirm_agenda_entry(uuid)',
    'decline_agenda_entry(uuid, text)',
    'cancel_agenda_entry(uuid, text)',
    'mark_agenda_entry_done(uuid, date)'
  ]
  loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
