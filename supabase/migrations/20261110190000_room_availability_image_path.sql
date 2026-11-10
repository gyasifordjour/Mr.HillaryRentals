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
  end as status,
  room.image_path
from public.rooms room;

grant select on public.room_availability to anon, authenticated;
