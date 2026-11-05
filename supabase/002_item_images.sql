-- GiftList — incremental migration: lets restaurants and movies use a
-- photo picked from the device, besides a pasted image URL.
-- Run this once in the Supabase SQL Editor (after migration.sql).
--
-- The file goes to the private `item-images` bucket at
-- `<couple_id>/<table>/<uuid>.jpg`, and its path is saved in `image_path`.
-- An item shows `image_path` when set, otherwise `image_url`.
-- Unlike gift images (where surprises must stay hidden), everything here is
-- visible to the whole couple, so the couple folder alone decides access.

alter table public.restaurants
  add column image_path text check (length(image_path) <= 500);
alter table public.movies
  add column image_path text check (length(image_path) <= 500);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('item-images', 'item-images', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "read couple item images" on storage.objects
  for select using (
    bucket_id = 'item-images'
    and (storage.foldername(storage.objects.name))[1] = public.my_couple_id()::text
  );
create policy "upload couple item images" on storage.objects
  for insert with check (
    bucket_id = 'item-images'
    and (storage.foldername(storage.objects.name))[1] = public.my_couple_id()::text
  );
create policy "delete couple item images" on storage.objects
  for delete using (
    bucket_id = 'item-images'
    and (storage.foldername(storage.objects.name))[1] = public.my_couple_id()::text
  );
