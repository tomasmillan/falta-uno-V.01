-- Schedule conflicts: a player can't be in two matches at the same time,
-- and a court can't hold two matches in the same slot.
-- Run in Supabase: SQL Editor → New query → paste → Run. Requires 001–003.

-- 1) Clean up existing clashes so the unique index below can be created.
--    Keeps the earliest-created match and cancels the later ones.
update public.matches m
set status = 'cancelled'
where m.status <> 'cancelled'
  and m.court_label is not null
  and exists (
    select 1 from public.matches older
    where older.status <> 'cancelled'
      and older.club_id = m.club_id
      and older.starts_at = m.starts_at
      and lower(trim(older.court_label)) = lower(trim(m.court_label))
      and (older.created_at, older.id) < (m.created_at, m.id)
  );

-- 2) Database-level guarantee: one active match per court and slot in each club.
create unique index matches_court_slot_unique
  on public.matches (club_id, lower(trim(court_label)), starts_at)
  where status <> 'cancelled' and court_label is not null;

-- 3) Helpers ------------------------------------------------------------------------

-- True if the player is already in an active match starting at that time (optionally ignoring one match).
create function public.player_has_match_at(p_player_id uuid, p_starts_at timestamptz, p_except_match uuid default null)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from match_players mp
    join matches m on m.id = mp.match_id
    where mp.player_id = p_player_id
      and m.starts_at = p_starts_at
      and m.status <> 'cancelled'
      and (p_except_match is null or m.id <> p_except_match)
  );
$$;

-- True if another active match in the club already uses that court in that slot.
create function public.court_is_taken(p_club_id uuid, p_court_label text, p_starts_at timestamptz, p_except_match uuid default null)
returns boolean
language sql stable security definer set search_path = public as $$
  select nullif(trim(p_court_label), '') is not null and exists (
    select 1 from matches m
    where m.club_id = p_club_id
      and m.starts_at = p_starts_at
      and m.status <> 'cancelled'
      and m.court_label is not null
      and lower(trim(m.court_label)) = lower(trim(p_court_label))
      and (p_except_match is null or m.id <> p_except_match)
  );
$$;

revoke all on function public.player_has_match_at(uuid, timestamptz, uuid) from public, anon, authenticated;
revoke all on function public.court_is_taken(uuid, text, timestamptz, uuid) from public, anon, authenticated;

-- 4) create_match ------------------------------------------------------------------
create or replace function public.create_match(
  p_starts_at timestamptz,
  p_court_label text,
  p_category_max smallint,
  p_category_min smallint,
  p_match_type public.match_type,
  p_guest_count smallint
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
  v_club uuid;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  select club_id into v_club from profiles where id = auth.uid();
  if v_club is null then raise exception 'profile_required'; end if;
  if p_starts_at < now() then raise exception 'starts_in_past'; end if;
  if player_has_match_at(auth.uid(), p_starts_at) then raise exception 'player_time_conflict'; end if;
  if court_is_taken(v_club, p_court_label, p_starts_at) then raise exception 'court_taken'; end if;

  insert into matches (club_id, created_by, starts_at, court_label, category_max, category_min, match_type, guest_count)
  values (v_club, auth.uid(), p_starts_at, nullif(trim(p_court_label), ''), p_category_max, p_category_min, p_match_type, p_guest_count)
  returning id into v_id;

  insert into match_players (match_id, player_id) values (v_id, auth.uid());
  perform refresh_match_status(v_id);
  return v_id;
end;
$$;

-- 5) join_match --------------------------------------------------------------------
create or replace function public.join_match(p_match_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_match matches%rowtype;
  v_taken int;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if not exists (select 1 from profiles where id = auth.uid()) then raise exception 'profile_required'; end if;

  select * into v_match from matches where id = p_match_id for update;
  if not found then raise exception 'match_not_found'; end if;
  if v_match.status = 'cancelled' then raise exception 'match_cancelled'; end if;
  if v_match.starts_at < now() then raise exception 'match_started'; end if;
  if exists (select 1 from match_players where match_id = p_match_id and player_id = auth.uid()) then
    return;
  end if;
  if player_has_match_at(auth.uid(), v_match.starts_at) then raise exception 'player_time_conflict'; end if;

  select count(*) into v_taken from match_players where match_id = p_match_id;
  if v_taken + v_match.guest_count >= 4 then raise exception 'match_full'; end if;

  insert into match_players (match_id, player_id) values (p_match_id, auth.uid());
  perform refresh_match_status(p_match_id);
end;
$$;

-- 6) update_match: every player must be free at the new time, and the court free in the new slot.
create or replace function public.update_match(
  p_match_id uuid,
  p_starts_at timestamptz,
  p_court_label text
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_match matches%rowtype;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  select * into v_match from matches where id = p_match_id for update;
  if not found then raise exception 'match_not_found'; end if;
  if v_match.created_by <> auth.uid() then raise exception 'not_match_creator'; end if;
  if v_match.status = 'cancelled' then raise exception 'match_cancelled'; end if;
  if p_starts_at < now() then raise exception 'starts_in_past'; end if;
  if exists (
    select 1 from match_players mp
    where mp.match_id = p_match_id and player_has_match_at(mp.player_id, p_starts_at, p_match_id)
  ) then
    raise exception 'player_time_conflict';
  end if;
  if court_is_taken(v_match.club_id, p_court_label, p_starts_at, p_match_id) then raise exception 'court_taken'; end if;

  update matches
  set starts_at = p_starts_at,
      court_label = nullif(trim(p_court_label), '')
  where id = p_match_id;
end;
$$;
