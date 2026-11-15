-- Rental lifecycle: automatic expiry, farmer cancellation, and rental extension.

create or replace function public.expire_due_rentals()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_expired integer := 0;
  v_cancelled integer := 0;
begin
  with expired as (
    update public.rentals
    set status = 'expired'
    where status = 'active'
      and end_date <= current_date
    returning id
  )
  select count(*) into v_expired from expired;

  with stale as (
    update public.rentals
    set status = 'cancelled'
    where status = 'pending'
      and start_date < current_date
    returning id
  )
  select count(*) into v_cancelled from stale;

  update public.rooms room
  set status = 'available'
  where room.status = 'occupied'
    and not exists (
      select 1
      from public.rental_rooms rental_room
      join public.rentals rental on rental.id = rental_room.rental_id
      where rental_room.room_id = room.id
        and rental.status = 'active'
        and current_date < rental.end_date
    );

  return v_expired + v_cancelled;
end;
$$;

create or replace function public.cancel_rental(p_rental_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_rental public.rentals%rowtype;
begin
  select * into v_rental
  from public.rentals
  where id = p_rental_id
  for update;

  if not found then
    raise exception 'This rental no longer exists.';
  end if;
  if v_rental.farmer_id <> auth.uid() and not public.is_admin() then
    raise exception 'You can only cancel your own rentals.';
  end if;
  if v_rental.status not in ('pending', 'active') then
    raise exception 'Only pending or active rentals can be cancelled.';
  end if;

  update public.rentals
  set status = 'cancelled'
  where id = p_rental_id;

  update public.rooms room
  set status = 'available'
  where room.status = 'occupied'
    and room.id in (
      select room_id from public.rental_rooms where rental_id = p_rental_id
    )
    and not exists (
      select 1
      from public.rental_rooms rental_room
      join public.rentals rental on rental.id = rental_room.rental_id
      where rental_room.room_id = room.id
        and rental.id <> p_rental_id
        and rental.status = 'active'
        and current_date < rental.end_date
    );
end;
$$;

create or replace function public.renew_rental(p_rental_id uuid, p_new_end_date date)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_rental public.rentals%rowtype;
  v_room_id uuid;
begin
  select * into v_rental
  from public.rentals
  where id = p_rental_id
  for update;

  if not found then
    raise exception 'This rental no longer exists.';
  end if;
  if v_rental.farmer_id <> auth.uid() then
    raise exception 'You can only renew your own rentals.';
  end if;
  if v_rental.status <> 'active' then
    raise exception 'Only active rentals can be renewed.';
  end if;
  if p_new_end_date <= v_rental.end_date then
    raise exception 'Choose an end date after the current rental end date.';
  end if;

  select room_id into v_room_id
  from public.rental_rooms
  where rental_id = p_rental_id
  limit 1;

  if v_room_id is null then
    raise exception 'This rental has no room assigned.';
  end if;

  if exists (
    select 1
    from public.rental_rooms rental_room
    join public.rentals rental on rental.id = rental_room.rental_id
    where rental_room.room_id = v_room_id
      and rental.id <> p_rental_id
      and rental.status in ('pending', 'active')
      and rental.start_date < p_new_end_date
      and rental.end_date > v_rental.end_date
  ) then
    raise exception 'That room is already booked for part of the renewal period.';
  end if;

  update public.rentals
  set end_date = p_new_end_date
  where id = p_rental_id;
end;
$$;

revoke all on function public.expire_due_rentals() from public, anon;
revoke all on function public.cancel_rental(uuid) from public, anon;
revoke all on function public.renew_rental(uuid, date) from public, anon;
grant execute on function public.expire_due_rentals() to authenticated;
grant execute on function public.cancel_rental(uuid) to authenticated;
grant execute on function public.renew_rental(uuid, date) to authenticated;
