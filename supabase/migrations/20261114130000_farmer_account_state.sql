alter table public.profiles
add column if not exists is_active boolean not null default true;

create index if not exists profiles_active_role_idx
on public.profiles (role, is_active);
