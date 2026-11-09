-- Gifts of Love: removes the old .NET app's tables (PascalCase) once the
-- import (import_legacy.sql + scripts/import-legacy-images.mjs) is
-- confirmed. Run it once in the SQL Editor, whenever you're sure nothing
-- was left behind. There is no undo: the old tables were the backup.
--
-- Safety: before dropping anything it checks that every old gift,
-- restaurant, date idea and movie exists in the new tables, and that no gift
-- lost all its photos, and aborts otherwise. One DO block = one statement: it drops everything or
-- nothing. No PL/pgSQL variables on purpose (plain IF EXISTS checks).

do $$
begin
  if exists (select 1 from public."Gifts" o where not exists (select 1 from public.gifts n where n.id = o."Id")) then
    raise exception 'Nada foi apagado: presentes antigos que não estão no app novo: %',
      (select string_agg(o."Name", ', ') from public."Gifts" o where not exists (select 1 from public.gifts n where n.id = o."Id"));
  end if;

  -- Photos: only a gift that had photos and now has NONE counts as a loss.
  -- Removing or swapping some photos in the new app is a normal edit (the
  -- swapped-out ones are deleted on purpose), so it doesn't block.
  if exists (
    select 1 from public."GiftImages" o
    where exists (select 1 from public.gifts n where n.id = o."GiftId")
      and not exists (select 1 from public.gift_images n where n.gift_id = o."GiftId")
  ) then
    raise exception 'Nada foi apagado: presentes que tinham fotos no app antigo e estão sem nenhuma foto no novo: %',
      (select string_agg(distinct g."Name", ', ')
       from public."GiftImages" o join public."Gifts" g on g."Id" = o."GiftId"
       where exists (select 1 from public.gifts n where n.id = o."GiftId")
         and not exists (select 1 from public.gift_images n where n.gift_id = o."GiftId"));
  end if;

  if exists (select 1 from public."Restaurants" o where not exists (select 1 from public.restaurants n where n.id = o."Id")) then
    raise exception 'Nada foi apagado: restaurantes antigos que não estão no app novo: %',
      (select string_agg(o."Name", ', ') from public."Restaurants" o where not exists (select 1 from public.restaurants n where n.id = o."Id"));
  end if;

  if exists (select 1 from public."DateIdeas" o where not exists (select 1 from public.date_ideas n where n.id = o."Id")) then
    raise exception 'Nada foi apagado: ideias de date antigas que não estão no app novo: %',
      (select string_agg(o."Name", ', ') from public."DateIdeas" o where not exists (select 1 from public.date_ideas n where n.id = o."Id"));
  end if;

  if exists (select 1 from public."Movies" o where not exists (select 1 from public.movies n where n.id = o."Id")) then
    raise exception 'Nada foi apagado: filmes antigos que não estão no app novo: %',
      (select string_agg(o."Name", ', ') from public."Movies" o where not exists (select 1 from public.movies n where n.id = o."Id"));
  end if;

  -- Listing them together lets Postgres drop the old foreign keys between
  -- them. No CASCADE, so it stops if anything unexpected still depends on
  -- these tables.
  drop table if exists
    public."AgendaEntries",
    public."Availabilities",
    public."MovieReviews",
    public."Movies",
    public."DateIdeaReviews",
    public."DateIdeas",
    public."RestaurantReviews",
    public."Restaurants",
    public."GiftImages",
    public."Gifts",
    public."CoupleRequests",
    public."Couples",
    public."Users",
    public."__EFMigrationsHistory";
end $$;

-- Should list nothing: no old table left.
select tablename as tabela_antiga_restante
from pg_tables
where schemaname = 'public' and tablename ~ '^[A-Z_]';
