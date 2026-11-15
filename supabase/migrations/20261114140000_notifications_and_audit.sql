-- In-app notifications and administrator audit log.

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  body text not null default '',
  kind text not null default 'info' check (kind in ('info', 'success', 'warning')),
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_profile_created_idx
on public.notifications (profile_id, created_at desc);

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id) on delete set null,
  actor_name text not null default 'System',
  action text not null,
  entity_type text not null,
  entity_id text not null,
  summary text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_log_created_idx on public.audit_log (created_at desc);
create index if not exists audit_log_action_idx on public.audit_log (action);

alter table public.notifications enable row level security;
alter table public.audit_log enable row level security;

drop policy if exists "Notifications readable by owner" on public.notifications;
create policy "Notifications readable by owner" on public.notifications
for select to authenticated using (profile_id = (select auth.uid()));

drop policy if exists "Notifications readable by own admins" on public.notifications;
drop policy if exists "Notifications markable by owner" on public.notifications;
create policy "Notifications markable by owner" on public.notifications
for update to authenticated
using (profile_id = (select auth.uid()))
with check (profile_id = (select auth.uid()));

drop policy if exists "Audit log readable by admins" on public.audit_log;
create policy "Audit log readable by admins" on public.audit_log
for select to authenticated using ((select public.is_admin()));

grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;
grant select on public.audit_log to authenticated;

create or replace function public.notify_rental_event()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_title text;
  v_body text;
  v_kind text := 'info';
begin
  if tg_op = 'INSERT' then
    insert into public.notifications (profile_id, title, body, kind, link)
    values (
      new.farmer_id,
      'Rental request received',
      format('Your request for %s to %s is awaiting farm review.', new.start_date, new.end_date),
      'info',
      '/rentals'
    );
    return new;
  end if;

  if new.status is distinct from old.status then
    if new.status = 'active' then
      v_title := 'Rental approved';
      v_body := format('Your rental from %s to %s is now active.', new.start_date, new.end_date);
      v_kind := 'success';
    elsif new.status = 'cancelled' then
      v_title := 'Rental cancelled';
      v_body := format('A rental for %s to %s was cancelled.', new.start_date, new.end_date);
      v_kind := 'warning';
    elsif new.status = 'expired' then
      v_title := 'Rental ended';
      v_body := format('Your rental ended on %s.', new.end_date);
    end if;
    if v_title is not null then
      insert into public.notifications (profile_id, title, body, kind, link)
      values (new.farmer_id, v_title, v_body, v_kind, '/rentals');
    end if;
  elsif new.end_date is distinct from old.end_date then
    insert into public.notifications (profile_id, title, body, kind, link)
    values (
      new.farmer_id,
      'Rental extended',
      format('Your rental now ends on %s.', new.end_date),
      'success',
      '/rentals'
    );
  end if;

  return new;
end;
$$;

drop trigger if exists rentals_notify on public.rentals;
create trigger rentals_notify
after insert or update on public.rentals
for each row execute function public.notify_rental_event();

create or replace function public.notify_service_request_event()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.status is distinct from old.status and new.status in ('confirmed', 'declined') then
    insert into public.notifications (profile_id, title, body, kind, link)
    values (
      new.farmer_id,
      case new.status when 'confirmed' then 'Service request confirmed' else 'Service request declined' end,
      format('%s for %s was %s by the farm team.',
        initcap(new.service),
        new.preferred_date,
        new.status),
      case new.status when 'confirmed' then 'success' else 'warning' end,
      '/services'
    );
  end if;
  return new;
end;
$$;

drop trigger if exists service_requests_notify on public.service_requests;
create trigger service_requests_notify
after update of status on public.service_requests
for each row execute function public.notify_service_request_event();

create or replace function public.log_rental_audit()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
  v_actor_name text := 'System';
  v_action text;
  v_summary text;
begin
  if tg_op = 'INSERT' then
    v_action := 'rental.requested';
    v_summary := format('Rental %s requested for %s to %s.', left(new.id::text, 8), new.start_date, new.end_date);
  elsif new.status is distinct from old.status then
    v_action := 'rental.status_changed';
    v_summary := format('Rental %s changed from %s to %s.', left(new.id::text, 8), old.status, new.status);
  elsif new.end_date is distinct from old.end_date then
    v_action := 'rental.extended';
    v_summary := format('Rental %s extended to %s.', left(new.id::text, 8), new.end_date);
  else
    return new;
  end if;

  if v_actor is not null then
    select coalesce(nullif(full_name, ''), 'System') into v_actor_name
    from public.profiles
    where id = v_actor;
  end if;

  insert into public.audit_log (actor_id, actor_name, action, entity_type, entity_id, summary, metadata)
  values (
    v_actor,
    coalesce(v_actor_name, 'System'),
    v_action,
    'rental',
    new.id::text,
    v_summary,
    jsonb_build_object('farmer_id', new.farmer_id, 'status', new.status, 'end_date', new.end_date)
  );

  return new;
end;
$$;

drop trigger if exists rentals_audit on public.rentals;
create trigger rentals_audit
after insert or update on public.rentals
for each row execute function public.log_rental_audit();

create or replace function public.log_farmer_state_audit()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
  v_actor_name text := 'System';
begin
  if new.is_active is not distinct from old.is_active then
    return new;
  end if;

  if v_actor is not null then
    select coalesce(nullif(full_name, ''), 'System') into v_actor_name
    from public.profiles
    where id = v_actor;
  end if;

  insert into public.audit_log (actor_id, actor_name, action, entity_type, entity_id, summary, metadata)
  values (
    v_actor,
    coalesce(v_actor_name, 'System'),
    'farmer.account_state_changed',
    'profile',
    new.id::text,
    format('%s was %s.', coalesce(nullif(new.full_name, ''), 'A farmer account'), case when new.is_active then 'reactivated' else 'deactivated' end),
    jsonb_build_object('is_active', new.is_active)
  );

  return new;
end;
$$;

drop trigger if exists profiles_audit_state on public.profiles;
create trigger profiles_audit_state
after update of is_active on public.profiles
for each row execute function public.log_farmer_state_audit();

revoke all on function public.notify_rental_event() from public, anon, authenticated;
revoke all on function public.notify_service_request_event() from public, anon, authenticated;
revoke all on function public.log_rental_audit() from public, anon, authenticated;
revoke all on function public.log_farmer_state_audit() from public, anon, authenticated;
