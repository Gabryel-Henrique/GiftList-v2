-- GiftList — one-off import of the old .NET app's data (PascalCase tables)
-- into the new schema. Not a migration: run it ONCE in the SQL Editor,
-- AFTER both of you created your new accounts with the SAME usernames as
-- before (byelzinho, clara) and linked them in the app.
--
-- Then run `node scripts/import-legacy-images.mjs` to upload the gift photos
-- (bytea in "GiftImages") to Storage at the paths this script records.
--
-- What it does:
--   * maps each old user to the new account by username;
--   * copies gifts (+ image rows), restaurants, date ideas, movies, their
--     reviews, availabilities and agenda plans, keeping the original ids
--     and dates — so "Nossa história" includes the past;
--   * skips the old couple / couple requests (the new link is what counts)
--     and passwords (incompatible with the new login);
--   * turns the tables' own triggers off while copying, so the import
--     doesn't flood you with hundreds of notifications about old things.
--
-- It's a single DO block on purpose: the SQL Editor doesn't keep one
-- session across statements (so no temp tables), and one statement is
-- atomic — any error undoes everything, triggers included.

do $$
declare
  target uuid;
  missing text;
begin
  -- 1. Every old user needs a new account with the same username.
  select string_agg(u."Username", ', ') into missing
  from public."Users" u
  where not exists (select 1 from public.profiles p where p.username = lower(trim(u."Username")));
  if missing is not null then
    raise exception 'Crie no app novo as contas com estes usuários antes de importar: %', missing;
  end if;

  -- 2. ...and those new accounts must be linked as a couple.
  select c.id into target
  from public.couples c
  join public.profiles pa on pa.id = c.user_a_id
  join public.profiles pb on pb.id = c.user_b_id
  where pa.username in (select lower(trim("Username")) from public."Users")
    and pb.username in (select lower(trim("Username")) from public."Users");
  if target is null then
    raise exception 'Vincule as duas contas novas no app (tela Vincular parceiro(a)) antes de importar.';
  end if;

  if exists (select 1 from public.gifts g join public."Gifts" o on o."Id" = g.id)
     or exists (select 1 from public.date_ideas d join public."DateIdeas" o on o."Id" = d.id) then
    raise exception 'Os dados antigos já foram importados — nada a fazer.';
  end if;

  -- 3. Copy without firing the tables' triggers (couple_id comes from the
  --    session there, and every insert would become a notification).
  alter table public.gifts disable trigger user;
  alter table public.gift_images disable trigger user;
  alter table public.restaurants disable trigger user;
  alter table public.restaurant_reviews disable trigger user;
  alter table public.date_ideas disable trigger user;
  alter table public.date_idea_reviews disable trigger user;
  alter table public.movies disable trigger user;
  alter table public.movie_reviews disable trigger user;
  alter table public.availabilities disable trigger user;
  alter table public.agenda_entries disable trigger user;

  -- `um` = old user id → new account id, by username (repeated per insert).
  with um as (
    select u."Id" as old_id, p.id as new_id
    from public."Users" u join public.profiles p on p.username = lower(trim(u."Username"))
  )
  insert into public.gifts (
    id, couple_id, owner_user_id, name, description, link, price, priority, type,
    created_at, is_purchased, purchased_at, purchased_by_user_id
  )
  select
    g."Id", target, owner.new_id, trim(g."Name"),
    nullif(trim(g."Description"), ''), nullif(trim(g."Link"), ''), g."Price", g."Priority", g."Type",
    g."CreatedAt", g."IsPurchased", g."PurchasedAt", buyer.new_id
  from public."Gifts" g
  join um owner on owner.old_id = g."OwnerUserId"
  left join um buyer on buyer.old_id = g."PurchasedByUserId";

  -- The files themselves are uploaded by scripts/import-legacy-images.mjs
  -- to exactly these paths.
  insert into public.gift_images (id, gift_id, couple_id, path, sort_order)
  select i."Id", i."GiftId", target,
    target || '/' || i."GiftId" || '/legacy-' || i."Id" || '.jpg',
    i."SortOrder"
  from public."GiftImages" i;

  with um as (
    select u."Id" as old_id, p.id as new_id
    from public."Users" u join public.profiles p on p.username = lower(trim(u."Username"))
  )
  insert into public.restaurants (id, couple_id, created_by_user_id, name, description, link, image_url, created_at)
  select r."Id", target, um.new_id, trim(r."Name"),
    nullif(trim(r."Description"), ''), nullif(trim(r."Link"), ''), nullif(trim(r."ImageUrl"), ''), r."CreatedAt"
  from public."Restaurants" r join um on um.old_id = r."CreatedByUserId";

  with um as (
    select u."Id" as old_id, p.id as new_id
    from public."Users" u join public.profiles p on p.username = lower(trim(u."Username"))
  )
  insert into public.restaurant_reviews (id, restaurant_id, couple_id, user_id, rating, comment, would_return, created_at, updated_at)
  select v."Id", v."RestaurantId", target, um.new_id, v."Rating",
    nullif(trim(v."Comment"), ''), v."WouldReturn", v."CreatedAt", v."UpdatedAt"
  from public."RestaurantReviews" v join um on um.old_id = v."UserId";

  with um as (
    select u."Id" as old_id, p.id as new_id
    from public."Users" u join public.profiles p on p.username = lower(trim(u."Username"))
  )
  insert into public.date_ideas (id, couple_id, created_by_user_id, name, description, estimated_cost, video_link, priority, created_at)
  select d."Id", target, um.new_id, trim(d."Name"),
    nullif(trim(d."Description"), ''), d."EstimatedCost", nullif(trim(d."VideoLink"), ''), d."Priority", d."CreatedAt"
  from public."DateIdeas" d join um on um.old_id = d."CreatedByUserId";

  with um as (
    select u."Id" as old_id, p.id as new_id
    from public."Users" u join public.profiles p on p.username = lower(trim(u."Username"))
  )
  insert into public.date_idea_reviews (id, date_idea_id, couple_id, user_id, rating, comment, would_repeat, created_at, updated_at)
  select v."Id", v."DateIdeaId", target, um.new_id, v."Rating",
    nullif(trim(v."Comment"), ''), v."WouldRepeat", v."CreatedAt", v."UpdatedAt"
  from public."DateIdeaReviews" v join um on um.old_id = v."UserId";

  with um as (
    select u."Id" as old_id, p.id as new_id
    from public."Users" u join public.profiles p on p.username = lower(trim(u."Username"))
  )
  insert into public.movies (id, couple_id, created_by_user_id, name, image_url, created_at)
  select mv."Id", target, um.new_id, trim(mv."Name"), nullif(trim(mv."ImageUrl"), ''), mv."CreatedAt"
  from public."Movies" mv join um on um.old_id = mv."CreatedByUserId";

  with um as (
    select u."Id" as old_id, p.id as new_id
    from public."Users" u join public.profiles p on p.username = lower(trim(u."Username"))
  )
  insert into public.movie_reviews (id, movie_id, couple_id, user_id, rating, review, watched_date, is_first_watch, created_at, updated_at)
  select v."Id", v."MovieId", target, um.new_id, v."Rating",
    nullif(trim(v."Review"), ''), v."WatchedDate", v."IsFirstWatch", v."CreatedAt", v."UpdatedAt"
  from public."MovieReviews" v join um on um.old_id = v."UserId";

  with um as (
    select u."Id" as old_id, p.id as new_id
    from public."Users" u join public.profiles p on p.username = lower(trim(u."Username"))
  )
  insert into public.availabilities (id, couple_id, user_id, date, is_open, created_at, updated_at)
  select a."Id", target, um.new_id, a."Date", a."IsOpen", a."CreatedAt", a."UpdatedAt"
  from public."Availabilities" a join um on um.old_id = a."UserId"
  on conflict (user_id, date) do nothing; -- a day already marked in the new app wins

  with um as (
    select u."Id" as old_id, p.id as new_id
    from public."Users" u join public.profiles p on p.username = lower(trim(u."Username"))
  )
  insert into public.agenda_entries (
    id, date, proposed_by_user_id, couple_id, date_idea_id, restaurant_id, note,
    status, status_note, was_done, created_at, responded_at
  )
  select e."Id", e."Date", um.new_id, target, e."DateIdeaId", e."RestaurantId",
    nullif(trim(e."Note"), ''), e."Status", nullif(trim(e."StatusNote"), ''), e."WasDone", e."CreatedAt", e."RespondedAt"
  from public."AgendaEntries" e join um on um.old_id = e."ProposedByUserId";

  alter table public.gifts enable trigger user;
  alter table public.gift_images enable trigger user;
  alter table public.restaurants enable trigger user;
  alter table public.restaurant_reviews enable trigger user;
  alter table public.date_ideas enable trigger user;
  alter table public.date_idea_reviews enable trigger user;
  alter table public.movies enable trigger user;
  alter table public.movie_reviews enable trigger user;
  alter table public.availabilities enable trigger user;
  alter table public.agenda_entries enable trigger user;
end $$;

-- Summary (shown in the SQL Editor's result panel).
select 'presentes' as item, count(*) from public.gifts
union all select 'fotos de presentes (a enviar)', count(*) from public.gift_images
union all select 'restaurantes', count(*) from public.restaurants
union all select 'avaliações de restaurantes', count(*) from public.restaurant_reviews
union all select 'ideias de date', count(*) from public.date_ideas
union all select 'avaliações de dates', count(*) from public.date_idea_reviews
union all select 'filmes e séries', count(*) from public.movies
union all select 'avaliações de filmes', count(*) from public.movie_reviews
union all select 'disponibilidades', count(*) from public.availabilities
union all select 'planos na agenda', count(*) from public.agenda_entries;
