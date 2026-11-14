alter table public.profiles
add column email text;

create unique index profiles_email_unique
on public.profiles (lower(email))
where email is not null;

update public.profiles as profile
set email = lower(auth_user.email)
from auth.users as auth_user
where auth_user.id = profile.id
  and auth_user.email is not null
  and profile.email is null;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, full_name, phone, email)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), ''),
    new.phone,
    lower(new.email)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
