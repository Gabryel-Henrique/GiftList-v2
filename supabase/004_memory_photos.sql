-- GiftList — incremental migration: photos of the dates you went on, for
-- "Nossa história". Run this once in the Supabase SQL Editor (after 003;
-- it relies on the `item-images` bucket created by 002).
--
-- Files go to `item-images` at `<couple_id>/memories/<entry_id>/<uuid>.jpg`
-- (002's couple-folder policies already cover them); this table ties each
-- file to a plan that was confirmed and actually happened.

create table public.memory_photos (
  id uuid primary key default gen_random_uuid(),
  agenda_entry_id uuid not null references public.agenda_entries(id) on delete cascade,
  couple_id uuid not null references public.couples(id) on delete cascade,
  path text not null unique check (length(path) <= 500),
  created_by_user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.memory_photos enable row level security;
create index on public.memory_photos (agenda_entry_id);
create index on public.memory_photos (couple_id);

create trigger memory_photos_set_couple before insert on public.memory_photos
  for each row execute function public.set_couple_id();

create or replace function public.check_memory_photo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.agenda_entries
    where id = new.agenda_entry_id and couple_id = new.couple_id
      and status = 'Confirmed' and was_done
  ) then
    raise exception 'Só dá para adicionar fotos a um encontro que já aconteceu.';
  end if;
  if (select count(*) from public.memory_photos where agenda_entry_id = new.agenda_entry_id) >= 6 then
    raise exception 'Cada encontro pode ter no máximo 6 fotos.';
  end if;
  return new;
end;
$$;

-- "z" so it runs after memory_photos_set_couple (alphabetical order).
create trigger z_check_memory_photo before insert on public.memory_photos
  for each row execute function public.check_memory_photo();

create policy "select couple" on public.memory_photos
  for select using (couple_id = public.my_couple_id());
create policy "insert couple" on public.memory_photos
  for insert with check (created_by_user_id = auth.uid() and couple_id = public.my_couple_id());
-- Either of you can remove a photo from your shared history.
create policy "delete couple" on public.memory_photos
  for delete using (couple_id = public.my_couple_id());
