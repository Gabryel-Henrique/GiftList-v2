-- GiftList — incremental migration: in-app notifications ("Avisos") and
-- profile editing. Run this once in the Supabase SQL Editor (after 002).
--
-- 1. `activity`: one row per thing your partner did that you'd want to
--    know about. Rows are written ONLY by the triggers below (no insert
--    policy), so the rules about what's notified live here, in one place:
--      * gift added to a WISHLIST           → notified
--      * gift added as a surprise (ToGive)  → never (it's a surprise)
--      * gift marked as purchased           → NEVER (would spoil it); purchases
--        are updates, and no trigger here looks at updates on gifts
--      * availability opened/withdrawn, plans proposed/confirmed/declined/
--        cancelled, restaurants/ideas/movies added, reviews written → notified
-- 2. Profiles: each user may change their own name and gender (not the
--    username: the login e-mail is derived from it).

-- ============================================================
-- 1. Activity feed
-- ============================================================
create table public.activity (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  actor_user_id uuid not null references public.profiles(id) on delete cascade,
  recipient_user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null,
  ref_id uuid,       -- the gift / plan / item it's about (may be gone later)
  ref_date date,     -- for availability and plans
  title text,        -- item name, kept so the notice survives a deletion
  created_at timestamptz not null default now(),
  read_at timestamptz
);
alter table public.activity enable row level security;
create index on public.activity (recipient_user_id, created_at desc);

create policy "select own notices" on public.activity
  for select using (recipient_user_id = auth.uid());
create policy "mark own notices read" on public.activity
  for update using (recipient_user_id = auth.uid());

-- Only read_at may change from the client.
create trigger activity_protect before update on public.activity
  for each row execute function public.protect_columns(
    'couple_id', 'actor_user_id', 'recipient_user_id', 'kind', 'ref_id', 'ref_date', 'title', 'created_at'
  );

-- Writes one notice for the actor's partner. No-op outside a couple.
create or replace function public.notify_partner(
  p_actor uuid, p_kind text, p_ref_id uuid, p_ref_date date, p_title text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.couples;
begin
  select * into c from public.couples where p_actor in (user_a_id, user_b_id);
  if not found then
    return;
  end if;
  insert into public.activity (couple_id, actor_user_id, recipient_user_id, kind, ref_id, ref_date, title)
  values (
    c.id, p_actor,
    case when c.user_a_id = p_actor then c.user_b_id else c.user_a_id end,
    p_kind, p_ref_id, p_ref_date, p_title
  );
end;
$$;
revoke execute on function public.notify_partner(uuid, text, uuid, date, text) from public, anon, authenticated;

-- Gifts: only new WISHLIST items. Surprises and purchases never notify.
create or replace function public.activity_on_gift()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.type = 'WishList' then
    perform public.notify_partner(new.owner_user_id, 'gift_added', new.id, null, new.name);
  end if;
  return new;
end;
$$;
create trigger activity_gift after insert on public.gifts
  for each row execute function public.activity_on_gift();

-- Restaurants, date ideas, movies: "added".
create or replace function public.activity_on_item()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.notify_partner(
    new.created_by_user_id,
    case tg_table_name
      when 'restaurants' then 'restaurant_added'
      when 'date_ideas' then 'date_idea_added'
      else 'movie_added'
    end,
    new.id, null, new.name
  );
  return new;
end;
$$;
create trigger activity_item after insert on public.restaurants
  for each row execute function public.activity_on_item();
create trigger activity_item after insert on public.date_ideas
  for each row execute function public.activity_on_item();
create trigger activity_item after insert on public.movies
  for each row execute function public.activity_on_item();

-- Reviews: a new review (edits don't notify again).
create or replace function public.activity_on_review()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  item_id uuid;
  item_name text;
  k text;
begin
  if tg_table_name = 'restaurant_reviews' then
    item_id := new.restaurant_id;
    select name into item_name from public.restaurants where id = item_id;
    k := 'restaurant_reviewed';
  elsif tg_table_name = 'date_idea_reviews' then
    item_id := new.date_idea_id;
    select name into item_name from public.date_ideas where id = item_id;
    k := 'date_idea_reviewed';
  else
    item_id := new.movie_id;
    select name into item_name from public.movies where id = item_id;
    k := 'movie_reviewed';
  end if;
  perform public.notify_partner(new.user_id, k, item_id, null, item_name);
  return new;
end;
$$;
create trigger activity_review after insert on public.restaurant_reviews
  for each row execute function public.activity_on_review();
create trigger activity_review after insert on public.date_idea_reviews
  for each row execute function public.activity_on_review();
create trigger activity_review after insert on public.movie_reviews
  for each row execute function public.activity_on_review();

-- Availability: opened (new or reopened) / withdrawn.
create or replace function public.activity_on_availability()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Confirming a plan opens the confirmer's availability right after its
  -- own notice: one action, one notice. (now() is fixed per transaction.)
  if exists (
    select 1 from public.activity
    where actor_user_id = new.user_id and ref_date = new.date
      and kind like 'entry\_%' and created_at = now()
  ) then
    return new;
  end if;

  if tg_op = 'INSERT' and new.is_open then
    perform public.notify_partner(new.user_id, 'availability_opened', null, new.date, null);
  elsif tg_op = 'UPDATE' and new.is_open is distinct from old.is_open then
    perform public.notify_partner(
      new.user_id,
      case when new.is_open then 'availability_opened' else 'availability_closed' end,
      null, new.date, null
    );
  end if;
  return new;
end;
$$;
create trigger activity_availability after insert or update on public.availabilities
  for each row execute function public.activity_on_availability();

-- Plans: proposed, and every status change (the actor is whoever is
-- logged in; the automatic cancel is attributed to who withdrew).
create or replace function public.activity_on_entry()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  item_name text;
  actor uuid := coalesce(auth.uid(), new.proposed_by_user_id);
begin
  select coalesce(
    (select name from public.date_ideas where id = new.date_idea_id),
    (select name from public.restaurants where id = new.restaurant_id)
  ) into item_name;

  if tg_op = 'INSERT' then
    -- Proposing opens the proposer's availability first; that notice is
    -- redundant next to "proposed a plan" (same transaction → same now()).
    delete from public.activity
    where actor_user_id = new.proposed_by_user_id and ref_date = new.date
      and kind = 'availability_opened' and created_at = now();
    perform public.notify_partner(new.proposed_by_user_id, 'entry_proposed', new.id, new.date, item_name);
  elsif new.status is distinct from old.status then
    perform public.notify_partner(
      actor,
      case new.status
        when 'Confirmed' then 'entry_confirmed'
        when 'Declined' then 'entry_declined'
        else 'entry_cancelled'
      end,
      new.id, new.date, item_name
    );
  elsif new.was_done and not old.was_done then
    perform public.notify_partner(actor, 'entry_done', new.id, new.date, item_name);
  end if;
  return new;
end;
$$;
create trigger activity_entry after insert or update on public.agenda_entries
  for each row execute function public.activity_on_entry();

-- Couple linked: a welcome notice for both.
create or replace function public.activity_on_couple()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.notify_partner(new.user_b_id, 'couple_linked', null, null, null);
  perform public.notify_partner(new.user_a_id, 'couple_linked', null, null, null);
  return new;
end;
$$;
create trigger activity_couple after insert on public.couples
  for each row execute function public.activity_on_couple();

-- Live updates in the app (Supabase Realtime respects RLS on this table).
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.activity;
  end if;
end $$;

-- ============================================================
-- 2. Profile editing (name and gender; the username is fixed)
-- ============================================================
create policy "update own profile" on public.profiles
  for update using (id = auth.uid());

create trigger profiles_protect before update on public.profiles
  for each row execute function public.protect_columns('id', 'username');
