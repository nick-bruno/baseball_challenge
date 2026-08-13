-- 9-9-9 Challenge Tracker — initial schema
--
-- Security model: rooms are protected by an unguessable code, not by per-user
-- authorization. Any authenticated (incl. anonymous) session may SELECT, which
-- is what lets everyone watch the shared leaderboard. All writes go through the
-- SECURITY DEFINER functions at the bottom, which enforce that you can only
-- ever write events attributed to your own participant row.

-- ---------------------------------------------------------------- tables ----

create table if not exists public.rooms (
  id                  uuid primary key default gen_random_uuid(),
  code                text not null unique,
  name                text,
  current_inning      int  not null default 1 check (current_inning between 1 and 9),
  status              text not null default 'active' check (status in ('active', 'finished')),
  host_participant_id uuid,
  created_at          timestamptz not null default now(),
  finished_at         timestamptz
);

create table if not exists public.participants (
  id           uuid primary key default gen_random_uuid(),
  room_id      uuid not null references public.rooms (id) on delete cascade,
  auth_user_id uuid not null references auth.users (id) on delete cascade,
  display_name text not null check (length(btrim(display_name)) between 1 and 24),
  joined_at    timestamptz not null default now(),
  -- one seat per device per room, so a refresh rejoins instead of duplicating
  unique (room_id, auth_user_id)
);

create table if not exists public.consumption_events (
  id              uuid primary key default gen_random_uuid(),
  room_id         uuid not null references public.rooms (id) on delete cascade,
  participant_id  uuid not null references public.participants (id) on delete cascade,
  item            text not null check (item in ('beer', 'hotdog')),
  delta           smallint not null check (delta in (1, -1)),
  inning          int not null,
  -- generated per tap on the client; makes retries over flaky stadium wifi
  -- idempotent instead of double-counting
  client_event_id uuid not null unique,
  created_at      timestamptz not null default now()
);

create index if not exists consumption_events_room_created_idx
  on public.consumption_events (room_id, created_at);
create index if not exists participants_room_idx
  on public.participants (room_id);

-- rooms.host_participant_id is set after the host participant exists, so the FK
-- is added separately and left nullable.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'rooms_host_participant_id_fkey'
  ) then
    alter table public.rooms
      add constraint rooms_host_participant_id_fkey
      foreign key (host_participant_id)
      references public.participants (id) on delete set null;
  end if;
end $$;

-- ------------------------------------------------------------------- rls ----

alter table public.rooms              enable row level security;
alter table public.participants       enable row level security;
alter table public.consumption_events enable row level security;

drop policy if exists rooms_select              on public.rooms;
drop policy if exists participants_select       on public.participants;
drop policy if exists consumption_events_select on public.consumption_events;

create policy rooms_select on public.rooms
  for select to authenticated using (true);
create policy participants_select on public.participants
  for select to authenticated using (true);
create policy consumption_events_select on public.consumption_events
  for select to authenticated using (true);

-- No INSERT/UPDATE/DELETE policies exist, so direct writes are refused for
-- everyone. The RPCs below are the only write path.

-- -------------------------------------------------------------- realtime ----

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'rooms'
    ) then
      alter publication supabase_realtime add table public.rooms;
    end if;
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'participants'
    ) then
      alter publication supabase_realtime add table public.participants;
    end if;
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'consumption_events'
    ) then
      alter publication supabase_realtime add table public.consumption_events;
    end if;
  end if;
end $$;

-- ------------------------------------------------------------------ rpcs ----

-- Ambiguity-free alphabet: no I/O/0/1, because these get read aloud in a loud
-- stadium and typed by people several beers into a challenge.
create or replace function public.generate_room_code()
returns text
language plpgsql
volatile
as $$
declare
  v_alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_code text := '';
  i int;
begin
  for i in 1..6 loop
    v_code := v_code || substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::int, 1);
  end loop;
  return v_code;
end;
$$;

create or replace function public.create_room(
  p_name         text,
  p_display_name text
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid            uuid := auth.uid();
  v_code           text;
  v_room_id        uuid;
  v_participant_id uuid;
  v_attempt        int := 0;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if length(btrim(coalesce(p_display_name, ''))) = 0 then
    raise exception 'display name is required' using errcode = '22023';
  end if;

  loop
    v_attempt := v_attempt + 1;
    v_code := generate_room_code();
    exit when not exists (select 1 from rooms where code = v_code);
    if v_attempt > 20 then
      raise exception 'could not allocate a room code' using errcode = '55000';
    end if;
  end loop;

  insert into rooms (code, name)
  values (v_code, nullif(btrim(coalesce(p_name, '')), ''))
  returning id into v_room_id;

  insert into participants (room_id, auth_user_id, display_name)
  values (v_room_id, v_uid, btrim(p_display_name))
  returning id into v_participant_id;

  update rooms set host_participant_id = v_participant_id where id = v_room_id;

  return v_code;
end;
$$;

create or replace function public.join_room(
  p_code         text,
  p_display_name text
)
returns public.participants
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid         uuid := auth.uid();
  v_room_id     uuid;
  v_participant participants;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if length(btrim(coalesce(p_display_name, ''))) = 0 then
    raise exception 'display name is required' using errcode = '22023';
  end if;

  select id into v_room_id from rooms where code = upper(btrim(p_code));
  if v_room_id is null then
    raise exception 'room not found' using errcode = '42704';
  end if;

  insert into participants (room_id, auth_user_id, display_name)
  values (v_room_id, v_uid, btrim(p_display_name))
  on conflict (room_id, auth_user_id)
    do update set display_name = excluded.display_name
  returning * into v_participant;

  return v_participant;
end;
$$;

create or replace function public.log_consumption(
  p_code            text,
  p_item            text,
  p_delta           int,
  p_client_event_id uuid
)
returns public.consumption_events
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid    uuid := auth.uid();
  v_room   rooms;
  v_pid    uuid;
  v_total  int;
  v_event  consumption_events;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if p_delta not in (1, -1) then
    raise exception 'delta must be 1 or -1' using errcode = '22023';
  end if;
  if p_item not in ('beer', 'hotdog') then
    raise exception 'unknown item %', p_item using errcode = '22023';
  end if;

  -- Idempotency: a retried tap returns the original row instead of counting twice.
  select * into v_event from consumption_events where client_event_id = p_client_event_id;
  if found then
    return v_event;
  end if;

  select * into v_room from rooms where code = upper(btrim(p_code));
  if v_room.id is null then
    raise exception 'room not found' using errcode = '42704';
  end if;
  if v_room.status <> 'active' then
    raise exception 'this competition is already finished' using errcode = '22023';
  end if;

  -- FOR UPDATE serializes concurrent taps from the same participant, so two
  -- in-flight +1s at a total of 8 can't both pass the bounds check below.
  select id into v_pid
  from participants
  where room_id = v_room.id and auth_user_id = v_uid
  for update;

  if v_pid is null then
    raise exception 'you have not joined this room' using errcode = '42501';
  end if;

  select coalesce(sum(delta), 0) into v_total
  from consumption_events
  where participant_id = v_pid and item = p_item;

  if v_total + p_delta < 0 then
    raise exception 'you are already at zero %', p_item using errcode = '22023';
  end if;
  if v_total + p_delta > 9 then
    raise exception '9 is the target — no credit beyond that' using errcode = '22023';
  end if;

  begin
    insert into consumption_events (room_id, participant_id, item, delta, inning, client_event_id)
    values (v_room.id, v_pid, p_item, p_delta::smallint, v_room.current_inning, p_client_event_id)
    returning * into v_event;
  exception when unique_violation then
    select * into v_event from consumption_events where client_event_id = p_client_event_id;
  end;

  return v_event;
end;
$$;

create or replace function public.set_inning(
  p_code   text,
  p_inning int
)
returns public.rooms
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid  uuid := auth.uid();
  v_room rooms;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  select * into v_room from rooms where code = upper(btrim(p_code));
  if v_room.id is null then
    raise exception 'room not found' using errcode = '42704';
  end if;

  if not exists (
    select 1 from participants
    where id = v_room.host_participant_id and auth_user_id = v_uid
  ) then
    raise exception 'only the host can change the inning' using errcode = '42501';
  end if;

  update rooms
  set current_inning = least(greatest(p_inning, 1), 9)
  where id = v_room.id
  returning * into v_room;

  return v_room;
end;
$$;

create or replace function public.finish_room(p_code text)
returns public.rooms
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid  uuid := auth.uid();
  v_room rooms;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  select * into v_room from rooms where code = upper(btrim(p_code));
  if v_room.id is null then
    raise exception 'room not found' using errcode = '42704';
  end if;

  if not exists (
    select 1 from participants
    where id = v_room.host_participant_id and auth_user_id = v_uid
  ) then
    raise exception 'only the host can end the competition' using errcode = '42501';
  end if;

  update rooms
  set status = 'finished', finished_at = now()
  where id = v_room.id
  returning * into v_room;

  return v_room;
end;
$$;

-- ---------------------------------------------------------------- grants ----

revoke all on function public.generate_room_code()                        from public;
revoke all on function public.create_room(text, text)                     from public;
revoke all on function public.join_room(text, text)                       from public;
revoke all on function public.log_consumption(text, text, int, uuid)      from public;
revoke all on function public.set_inning(text, int)                       from public;
revoke all on function public.finish_room(text)                           from public;

grant execute on function public.create_room(text, text)                to authenticated;
grant execute on function public.join_room(text, text)                  to authenticated;
grant execute on function public.log_consumption(text, text, int, uuid) to authenticated;
grant execute on function public.set_inning(text, int)                  to authenticated;
grant execute on function public.finish_room(text)                      to authenticated;
