create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  phone text unique,
  role text not null default 'farmer' check (role in ('admin', 'farmer')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.farms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  location text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms (id) on delete cascade,
  room_number integer not null check (room_number > 0),
  capacity integer not null check (capacity > 0),
  monthly_price numeric(10, 2) not null check (monthly_price >= 0),
  status text not null default 'available' check (status in ('available', 'reserved', 'occupied')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (farm_id, room_number)
);

create table public.cameras (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  name text not null,
  status text not null default 'offline' check (status in ('online', 'offline')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (room_id, name)
);

create table public.rentals (
  id uuid primary key default gen_random_uuid(),
  farmer_id uuid not null references public.profiles (id) on delete restrict,
  start_date date not null,
  end_date date not null,
  status text not null default 'pending' check (status in ('pending', 'active', 'expired', 'cancelled')),
  pig_count integer check (pig_count is null or pig_count > 0),
  request_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date > start_date),
  unique (id, farmer_id)
);

create table public.rental_rooms (
  rental_id uuid not null references public.rentals (id) on delete cascade,
  room_id uuid not null references public.rooms (id) on delete restrict,
  primary key (rental_id, room_id)
);

create table public.service_requests (
  id uuid primary key default gen_random_uuid(),
  farmer_id uuid not null,
  rental_id uuid not null,
  service text not null check (service in ('feeding', 'cleaning')),
  preferred_date date not null,
  note text not null default '',
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'declined')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (rental_id, farmer_id) references public.rentals (id, farmer_id) on delete cascade
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  farmer_id uuid not null,
  rental_id uuid not null,
  payment_date date not null,
  description text not null,
  amount numeric(10, 2) not null check (amount >= 0),
  status text not null default 'due' check (status in ('paid', 'due')),
  reference text not null unique,
  created_at timestamptz not null default now(),
  foreign key (rental_id, farmer_id) references public.rentals (id, farmer_id) on delete restrict
);

create index rentals_farmer_status_idx on public.rentals (farmer_id, status);
create index rentals_dates_status_idx on public.rentals (start_date, end_date, status);
create index rental_rooms_room_idx on public.rental_rooms (room_id);
create index service_requests_farmer_idx on public.service_requests (farmer_id, created_at desc);
create index payments_farmer_date_idx on public.payments (farmer_id, payment_date desc);

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger farms_set_updated_at before update on public.farms
for each row execute function public.set_updated_at();
create trigger rooms_set_updated_at before update on public.rooms
for each row execute function public.set_updated_at();
create trigger cameras_set_updated_at before update on public.cameras
for each row execute function public.set_updated_at();
create trigger rentals_set_updated_at before update on public.rentals
for each row execute function public.set_updated_at();
create trigger service_requests_set_updated_at before update on public.service_requests
for each row execute function public.set_updated_at();

create function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), ''),
    new.phone
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

insert into public.profiles (id, full_name, phone)
select
  id,
  coalesce(nullif(trim(raw_user_meta_data ->> 'full_name'), ''), ''),
  phone
from auth.users
on conflict (id) do nothing;

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
  );
$$;

create function public.request_room(
  p_room_id uuid,
  p_start_date date,
  p_end_date date,
  p_pig_count integer,
  p_note text default ''
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_farmer_id uuid := auth.uid();
  v_capacity integer;
  v_room_status text;
  v_rental_id uuid;
begin
  if v_farmer_id is null then
    raise exception 'Sign in to request a room.';
  end if;
  if not exists (select 1 from public.profiles where id = v_farmer_id and role = 'farmer') then
    raise exception 'Only farmer accounts can request rooms.';
  end if;
  if p_start_date < current_date or p_end_date <= p_start_date then
    raise exception 'Choose valid future rental dates.';
  end if;

  select capacity, status into v_capacity, v_room_status
  from public.rooms
  where id = p_room_id
  for update;

  if not found or v_room_status <> 'available' then
    raise exception 'That room is not available.';
  end if;
  if p_pig_count is null or p_pig_count < 1 or p_pig_count > v_capacity then
    raise exception 'Pig count must be between 1 and the room capacity.';
  end if;
  if exists (
    select 1
    from public.rental_rooms rr
    join public.rentals r on r.id = rr.rental_id
    where rr.room_id = p_room_id
      and r.status in ('pending', 'active')
      and r.start_date < p_end_date
      and r.end_date > p_start_date
  ) then
    raise exception 'That room already has a request or rental for some of those dates.';
  end if;

  insert into public.rentals (farmer_id, start_date, end_date, pig_count, request_note)
  values (v_farmer_id, p_start_date, p_end_date, p_pig_count, coalesce(p_note, ''))
  returning id into v_rental_id;
  insert into public.rental_rooms (rental_id, room_id) values (v_rental_id, p_room_id);
  return v_rental_id;
end;
$$;

create function public.review_rental_request(p_rental_id uuid, p_decision text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_rental public.rentals%rowtype;
  v_room_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Only an administrator can review rental requests.';
  end if;
  if p_decision not in ('active', 'cancelled') then
    raise exception 'Unsupported rental decision.';
  end if;
  select * into v_rental
  from public.rentals
  where id = p_rental_id
  for update;
  if not found or v_rental.status <> 'pending' then
    raise exception 'This rental request is no longer awaiting review.';
  end if;

  select room_id into v_room_id from public.rental_rooms where rental_id = p_rental_id;
  if p_decision = 'active' then
    perform 1 from public.rooms where id = v_room_id and status = 'available' for update;
    if not found then
      raise exception 'This room is no longer available.';
    end if;
    if exists (
      select 1
      from public.rental_rooms rr
      join public.rentals r on r.id = rr.rental_id
      where rr.room_id = v_room_id
        and r.id <> p_rental_id
        and r.status = 'active'
        and r.start_date < v_rental.end_date
        and r.end_date > v_rental.start_date
    ) then
      raise exception 'Another active rental overlaps these dates.';
    end if;
    update public.rooms set status = 'occupied' where id = v_room_id;
  end if;
  update public.rentals set status = p_decision where id = p_rental_id;
end;
$$;

create function public.create_service_request(
  p_rental_id uuid,
  p_service text,
  p_preferred_date date,
  p_note text default ''
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_farmer_id uuid := auth.uid();
  v_rental public.rentals%rowtype;
  v_request_id uuid;
begin
  if v_farmer_id is null then
    raise exception 'Sign in to request a farm service.';
  end if;
  if p_service not in ('feeding', 'cleaning') then
    raise exception 'Unsupported farm service.';
  end if;
  select * into v_rental
  from public.rentals
  where id = p_rental_id and farmer_id = v_farmer_id and status = 'active';
  if not found then
    raise exception 'Choose one of your active rentals.';
  end if;
  if p_preferred_date < v_rental.start_date or p_preferred_date > v_rental.end_date then
    raise exception 'Choose a service date within the selected rental period.';
  end if;

  insert into public.service_requests (farmer_id, rental_id, service, preferred_date, note)
  values (v_farmer_id, p_rental_id, p_service, p_preferred_date, coalesce(p_note, ''))
  returning id into v_request_id;
  return v_request_id;
end;
$$;

create function public.review_service_request(p_request_id uuid, p_decision text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() then
    raise exception 'Only an administrator can review service requests.';
  end if;
  if p_decision not in ('confirmed', 'declined') then
    raise exception 'Unsupported service request decision.';
  end if;
  update public.service_requests
  set status = p_decision
  where id = p_request_id and status = 'pending';
  if not found then
    raise exception 'This service request is no longer awaiting review.';
  end if;
end;
$$;

create or replace function public.prevent_profile_role_escalation()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.role is distinct from old.role
    and current_user not in ('postgres', 'service_role')
    and not public.is_admin() then
    raise exception 'Only an administrator can change profile roles.';
  end if;
  return new;
end;
$$;

create trigger profiles_guard_role before update of role on public.profiles
for each row execute function public.prevent_profile_role_escalation();

alter table public.profiles enable row level security;
alter table public.farms enable row level security;
alter table public.rooms enable row level security;
alter table public.cameras enable row level security;
alter table public.rentals enable row level security;
alter table public.rental_rooms enable row level security;
alter table public.service_requests enable row level security;
alter table public.payments enable row level security;

create policy "Profiles readable by owner or admin" on public.profiles
for select to authenticated using (id = (select auth.uid()) or (select public.is_admin()));
create policy "Farmers can update their profile" on public.profiles
for update to authenticated using (id = (select auth.uid()) or (select public.is_admin()))
with check (id = (select auth.uid()) or (select public.is_admin()));

create policy "Farms are publicly readable" on public.farms
for select to anon, authenticated using (true);
create policy "Admins manage farms" on public.farms
for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "Rooms are publicly readable" on public.rooms
for select to anon, authenticated using (true);
create policy "Admins manage rooms" on public.rooms
for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "Camera access by admin or active renter" on public.cameras
for select to authenticated using (
  (select public.is_admin())
  or exists (
    select 1
    from public.rental_rooms rr
    join public.rentals r on r.id = rr.rental_id
    where rr.room_id = cameras.room_id
      and r.farmer_id = (select auth.uid())
      and r.status = 'active'
      and current_date >= r.start_date
      and current_date <= r.end_date
  )
);
create policy "Admins manage cameras" on public.cameras
for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "Rentals readable by owner or admin" on public.rentals
for select to authenticated using (farmer_id = (select auth.uid()) or (select public.is_admin()));
create policy "Rental rooms readable by owner or admin" on public.rental_rooms
for select to authenticated using (
  (select public.is_admin())
  or exists (
    select 1 from public.rentals r
    where r.id = rental_rooms.rental_id and r.farmer_id = (select auth.uid())
  )
);

create policy "Service requests readable by owner or admin" on public.service_requests
for select to authenticated using (farmer_id = (select auth.uid()) or (select public.is_admin()));
create policy "Payments readable by owner or admin" on public.payments
for select to authenticated using (farmer_id = (select auth.uid()) or (select public.is_admin()));

grant select on public.farms, public.rooms to anon, authenticated;
grant select on public.profiles, public.cameras, public.rentals, public.rental_rooms,
  public.service_requests, public.payments to authenticated;
grant insert, update, delete on public.farms, public.rooms, public.cameras to authenticated;
grant update (full_name, phone) on public.profiles to authenticated;

revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.handle_new_auth_user() from public, anon, authenticated;
revoke all on function public.is_admin() from public, anon;
revoke all on function public.request_room(uuid, date, date, integer, text) from public, anon;
revoke all on function public.review_rental_request(uuid, text) from public, anon;
revoke all on function public.create_service_request(uuid, text, date, text) from public, anon;
revoke all on function public.review_service_request(uuid, text) from public, anon;
revoke all on function public.prevent_profile_role_escalation() from public, anon, authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.request_room(uuid, date, date, integer, text) to authenticated;
grant execute on function public.review_rental_request(uuid, text) to authenticated;
grant execute on function public.create_service_request(uuid, text, date, text) to authenticated;
grant execute on function public.review_service_request(uuid, text) to authenticated;
