create or replace view public.room_availability as
select
  room.id,
  room.farm_id,
  room.room_number,
  room.capacity,
  room.monthly_price,
  case
    when room.status <> 'available' then room.status
    when exists (
      select 1
      from public.rental_rooms rental_room
      join public.rentals rental on rental.id = rental_room.rental_id
      where rental_room.room_id = room.id
        and rental.status = 'active'
        and current_date >= rental.start_date
        and current_date < rental.end_date
    ) then 'occupied'
    else 'available'
  end as status
from public.rooms room;

grant select on public.room_availability to anon, authenticated;

create or replace function public.review_rental_request(p_rental_id uuid, p_decision text)
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

  select room_id into v_room_id
  from public.rental_rooms
  where rental_id = p_rental_id;
  if p_decision = 'active' then
    perform 1
    from public.rooms
    where id = v_room_id and status = 'available'
    for update;
    if not found then
      raise exception 'This room is no longer available.';
    end if;
    if exists (
      select 1
      from public.rental_rooms rental_room
      join public.rentals rental on rental.id = rental_room.rental_id
      where rental_room.room_id = v_room_id
        and rental.id <> p_rental_id
        and rental.status in ('pending', 'active')
        and rental.start_date < v_rental.end_date
        and rental.end_date > v_rental.start_date
    ) then
      raise exception 'Another rental request overlaps these dates.';
    end if;
  end if;

  update public.rentals
  set status = p_decision
  where id = p_rental_id;
end;
$$;

revoke all on function public.review_rental_request(uuid, text) from public, anon;
grant execute on function public.review_rental_request(uuid, text) to authenticated;
