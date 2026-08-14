-- Live MLB game sync
--
-- The host's browser polls MLB's public Stats API and writes the result here;
-- Realtime fans it out to everyone else, so non-host phones make no external
-- requests and every player sees the same score.

alter table public.rooms
  add column if not exists mlb_game_pk     bigint,
  add column if not exists mlb_status      text,
  add column if not exists mlb_inning      int,
  add column if not exists mlb_inning_state text,
  add column if not exists mlb_away_team   text,
  add column if not exists mlb_home_team   text,
  add column if not exists mlb_away_score  int,
  add column if not exists mlb_home_score  int,
  add column if not exists mlb_updated_at  timestamptz,
  -- When true the challenge inning follows the real game. Tapping the manual
  -- arrows turns it off, so a host can always take back control.
  add column if not exists auto_inning     boolean not null default true;

-- Writes the polled game state. Only the host calls this (only the host polls).
create or replace function public.sync_game_state(
  p_code         text,
  p_game_pk      bigint,
  p_status       text,
  p_inning       int,
  p_inning_state text,
  p_away_team    text,
  p_home_team    text,
  p_away_score   int,
  p_home_score   int
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
    raise exception 'only the host can sync the game' using errcode = '42501';
  end if;

  update rooms
  set mlb_game_pk      = p_game_pk,
      mlb_status       = p_status,
      mlb_inning       = p_inning,
      mlb_inning_state = p_inning_state,
      mlb_away_team    = p_away_team,
      mlb_home_team    = p_home_team,
      mlb_away_score   = p_away_score,
      mlb_home_score   = p_home_score,
      mlb_updated_at   = now(),
      -- The challenge is defined over nine innings, so extras clamp to 9
      -- rather than violating the current_inning check constraint.
      current_inning   = case
        when auto_inning and p_inning is not null
          then least(greatest(p_inning, 1), 9)
        else current_inning
      end
  where id = v_room.id
  returning * into v_room;

  return v_room;
end;
$$;

-- Lets the host hand inning control back to the live feed after taking it.
create or replace function public.set_auto_inning(
  p_code    text,
  p_enabled boolean
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
    raise exception 'only the host can change this' using errcode = '42501';
  end if;

  update rooms set auto_inning = p_enabled where id = v_room.id
  returning * into v_room;

  return v_room;
end;
$$;

-- Moving the inning by hand is an explicit override: stop following the feed.
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
  set current_inning = least(greatest(p_inning, 1), 9),
      auto_inning    = false
  where id = v_room.id
  returning * into v_room;

  return v_room;
end;
$$;

revoke all on function public.sync_game_state(text, bigint, text, int, text, text, text, int, int) from public;
revoke all on function public.set_auto_inning(text, boolean) from public;

grant execute on function public.sync_game_state(text, bigint, text, int, text, text, text, int, int) to authenticated;
grant execute on function public.set_auto_inning(text, boolean) to authenticated;
grant execute on function public.set_inning(text, int) to authenticated;
