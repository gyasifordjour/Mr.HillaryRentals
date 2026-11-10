alter table public.rooms add column image_path text;
alter table public.profiles add column avatar_path text;

grant update (full_name, phone, avatar_path) on public.profiles to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('room-images', 'room-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('profile-avatars', 'profile-avatars', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Room images are publicly readable"
on storage.objects for select to anon, authenticated
using (bucket_id = 'room-images');

create policy "Admins manage room images"
on storage.objects for all to authenticated
using (bucket_id = 'room-images' and (select public.is_admin()))
with check (bucket_id = 'room-images' and (select public.is_admin()));

create policy "Users read own avatar and admins read all"
on storage.objects for select to authenticated
using (
  bucket_id = 'profile-avatars'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or (select public.is_admin())
  )
);

create policy "Users upload own avatar"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'profile-avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "Users update own avatar"
on storage.objects for update to authenticated
using (
  bucket_id = 'profile-avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'profile-avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "Users delete own avatar"
on storage.objects for delete to authenticated
using (
  bucket_id = 'profile-avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
