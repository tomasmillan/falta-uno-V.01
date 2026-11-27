-- Club tools for billing: staff roles, courts, member unit, named guests,
-- end-of-day close (played / lights), manual matches and the billing report.
-- Run in Supabase: SQL Editor → New query → paste → Run. Requires 001–005.

-- 1) Staff roles -------------------------------------------------------------------
create type public.club_role as enum ('admin', 'staff');

create table public.club_members (
  club_id uuid not null references public.clubs (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  role public.club_role not null,
  created_at timestamptz not null default now(),
  primary key (club_id, profile_id)
);

create function public.is_club_staff(p_club_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from club_members where club_id = p_club_id and profile_id = auth.uid());
$$;

create function public.is_club_admin(p_club_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from club_members where club_id = p_club_id and profile_id = auth.uid() and role = 'admin');
$$;

grant execute on function public.is_club_staff(uuid) to authenticated;
grant execute on function public.is_club_admin(uuid) to authenticated;

alter table public.club_members enable row level security;

create policy "Members see their own role; staff see the club team"
  on public.club_members for select to authenticated
  using (profile_id = auth.uid() or public.is_club_staff(club_id));

-- Role of the current user in their own club, or null.
create function public.my_club_role() returns public.club_role
language sql stable security definer set search_path = public as $$
  select cm.role from club_members cm join profiles p on p.club_id = cm.club_id
  where p.id = auth.uid() and cm.profile_id = auth.uid();
$$;
grant execute on function public.my_club_role() to authenticated;

-- Admin only: give or remove a staff role (null removes). An admin can't demote themselves.
create function public.set_club_role(p_profile_id uuid, p_role public.club_role) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_club uuid;
begin
  select club_id into v_club from profiles where id = auth.uid();
  if v_club is null or not is_club_admin(v_club) then raise exception 'not_club_admin'; end if;
  if not exists (select 1 from profiles where id = p_profile_id and club_id = v_club) then raise exception 'player_not_in_club'; end if;
  if p_profile_id = auth.uid() and (p_role is null or p_role <> 'admin') then raise exception 'cannot_demote_self'; end if;

  if p_role is null then
    delete from club_members where club_id = v_club and profile_id = p_profile_id;
  else
    insert into club_members (club_id, profile_id, role) values (v_club, p_profile_id, p_role)
    on conflict (club_id, profile_id) do update set role = excluded.role;
  end if;
end;
$$;
grant execute on function public.set_club_role(uuid, public.club_role) to authenticated;

-- 2) Courts -------------------------------------------------------------------------
create table public.courts (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  has_lights boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index courts_club_name_unique on public.courts (club_id, lower(trim(name)));

alter table public.courts enable row level security;

create policy "Signed-in users can read courts"
  on public.courts for select to authenticated using (true);
create policy "Club admins can add courts"
  on public.courts for insert to authenticated with check (public.is_club_admin(club_id));
create policy "Club admins can edit courts"
  on public.courts for update to authenticated
  using (public.is_club_admin(club_id)) with check (public.is_club_admin(club_id));

alter table public.matches add column court_id uuid references public.courts (id);

-- When a court is added or renamed, link past matches typed with the same name.
create function public.link_matches_to_court() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update matches set court_id = new.id, court_label = new.name
  where club_id = new.club_id and court_id is null
    and court_label is not null and lower(trim(court_label)) = lower(trim(new.name));
  return new;
end;
$$;

create trigger courts_link_matches
after insert or update of name on public.courts
for each row execute function public.link_matches_to_court();

-- 3) Member unit (lote / UF) for billing ---------------------------------------------
alter table public.profiles add column unit_label text
  check (unit_label is null or char_length(unit_label) between 1 and 20);

-- 4) Named guests --------------------------------------------------------------------
create table public.match_guests (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 60),
  host_player_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index match_guests_match_idx on public.match_guests (match_id);

alter table public.match_guests enable row level security;
create policy "Signed-in users can read guests"
  on public.match_guests for select to authenticated using (true);

-- 5) End-of-day close and manual matches ---------------------------------------------
create type public.played_status as enum ('pending', 'played', 'not_played');
create type public.match_source as enum ('app', 'manual');

alter table public.matches
  add column played_status public.played_status not null default 'pending',
  add column lights_used boolean not null default false,
  add column source public.match_source not null default 'app',
  add column closed_by uuid references public.profiles (id),
  add column closed_at timestamptz;

-- Manual matches can hold up to 4 guests (e.g. walk-ins).
alter table public.matches drop constraint matches_guest_count_check;
alter table public.matches add constraint matches_guest_count_check check (guest_count between 0 and 4);

alter publication supabase_realtime add table public.match_guests;

-- 6) Court helpers ---------------------------------------------------------------------
-- Validates the court for the caller's club and returns its name (null court = "a definir").
create function public.resolve_court(p_club_id uuid, p_court_id uuid) returns text
language plpgsql stable security definer set search_path = public as $$
declare
  v_name text;
begin
  if p_court_id is null then return null; end if;
  select name into v_name from courts where id = p_court_id and club_id = p_club_id and active;
  if v_name is null then raise exception 'court_not_found'; end if;
  return v_name;
end;
$$;

-- 7) create_match_v2: court from the club list, guests with names -------------------
create function public.create_match_v2(
  p_starts_at timestamptz,
  p_court_id uuid,
  p_category_max smallint,
  p_category_min smallint,
  p_match_type public.match_type,
  p_guest_names text[]
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
  v_club uuid;
  v_court text;
  v_guests text[] := coalesce(array(select trim(g) from unnest(p_guest_names) g where trim(g) <> ''), '{}');
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  select club_id into v_club from profiles where id = auth.uid();
  if v_club is null then raise exception 'profile_required'; end if;
  if p_starts_at < now() then raise exception 'starts_in_past'; end if;
  if cardinality(v_guests) > 2 then raise exception 'too_many_guests'; end if;
  v_court := resolve_court(v_club, p_court_id);
  if player_has_match_at(auth.uid(), p_starts_at) then raise exception 'player_time_conflict'; end if;
  if court_is_taken(v_club, v_court, p_starts_at) then raise exception 'court_taken'; end if;

  insert into matches (club_id, created_by, starts_at, court_id, court_label, category_max, category_min, match_type, guest_count)
  values (v_club, auth.uid(), p_starts_at, p_court_id, v_court, p_category_max, p_category_min, p_match_type, cardinality(v_guests))
  returning id into v_id;

  insert into match_players (match_id, player_id) values (v_id, auth.uid());
  insert into match_guests (match_id, name, host_player_id) select v_id, g, auth.uid() from unnest(v_guests) g;
  perform refresh_match_status(v_id);
  return v_id;
end;
$$;
grant execute on function public.create_match_v2(timestamptz, uuid, smallint, smallint, public.match_type, text[]) to authenticated;

-- 8) update_match_v2: creator (or club staff) changes time and court from the list -----
create function public.update_match_v2(p_match_id uuid, p_starts_at timestamptz, p_court_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_match matches%rowtype;
  v_court text;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  select * into v_match from matches where id = p_match_id for update;
  if not found then raise exception 'match_not_found'; end if;
  if v_match.created_by <> auth.uid() and not is_club_staff(v_match.club_id) then raise exception 'not_match_creator'; end if;
  if v_match.status = 'cancelled' then raise exception 'match_cancelled'; end if;
  if p_starts_at < now() then raise exception 'starts_in_past'; end if;
  v_court := resolve_court(v_match.club_id, p_court_id);
  if exists (
    select 1 from match_players mp
    where mp.match_id = p_match_id and player_has_match_at(mp.player_id, p_starts_at, p_match_id)
  ) then raise exception 'player_time_conflict'; end if;
  if court_is_taken(v_match.club_id, v_court, p_starts_at, p_match_id) then raise exception 'court_taken'; end if;

  update matches set starts_at = p_starts_at, court_id = p_court_id, court_label = v_court where id = p_match_id;
end;
$$;
grant execute on function public.update_match_v2(uuid, timestamptz, uuid) to authenticated;

-- 9) Staff: close a match at the end of the day ----------------------------------------
create function public.staff_close_match(p_match_id uuid, p_played boolean, p_lights boolean) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_match matches%rowtype;
begin
  select * into v_match from matches where id = p_match_id for update;
  if not found then raise exception 'match_not_found'; end if;
  if not is_club_staff(v_match.club_id) then raise exception 'not_club_staff'; end if;
  if v_match.status = 'cancelled' then raise exception 'match_cancelled'; end if;

  update matches
  set played_status = case when p_played then 'played'::played_status else 'not_played'::played_status end,
      lights_used = p_played and p_lights,
      closed_by = auth.uid(),
      closed_at = now()
  where id = p_match_id;
end;
$$;
grant execute on function public.staff_close_match(uuid, boolean, boolean) to authenticated;

-- 10) Staff: register a walk-in match. p_guests = [{"name": "...", "host_player_id": "..."}]
create function public.staff_create_manual_match(
  p_starts_at timestamptz,
  p_court_id uuid,
  p_player_ids uuid[],
  p_guests jsonb,
  p_played boolean,
  p_lights boolean
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_club uuid;
  v_court text;
  v_id uuid;
  v_players uuid[] := coalesce(array(select distinct x from unnest(p_player_ids) x), '{}');
  v_guest_count int := coalesce(jsonb_array_length(p_guests), 0);
begin
  select club_id into v_club from profiles where id = auth.uid();
  if v_club is null or not is_club_staff(v_club) then raise exception 'not_club_staff'; end if;
  if cardinality(v_players) + v_guest_count not between 1 and 4 then raise exception 'invalid_player_count'; end if;
  if exists (select 1 from unnest(v_players) x where not exists (select 1 from profiles where id = x and club_id = v_club)) then
    raise exception 'player_not_in_club';
  end if;
  if exists (select 1 from jsonb_array_elements(coalesce(p_guests, '[]')) g where char_length(trim(g->>'name')) < 2) then
    raise exception 'guest_name_required';
  end if;
  v_court := resolve_court(v_club, p_court_id);
  if court_is_taken(v_club, v_court, p_starts_at) then raise exception 'court_taken'; end if;

  insert into matches (club_id, created_by, starts_at, court_id, court_label, category_max, category_min, match_type,
                       guest_count, source, played_status, lights_used, closed_by, closed_at)
  values (v_club, auth.uid(), p_starts_at, p_court_id, v_court, 1, 8, 'friendly', v_guest_count, 'manual',
          case when p_played then 'played'::played_status else 'pending'::played_status end,
          p_played and p_lights,
          case when p_played then auth.uid() end,
          case when p_played then now() end)
  returning id into v_id;

  insert into match_players (match_id, player_id) select v_id, x from unnest(v_players) x;
  insert into match_guests (match_id, name, host_player_id)
  select v_id, trim(g->>'name'), nullif(g->>'host_player_id', '')::uuid
  from jsonb_array_elements(coalesce(p_guests, '[]')) g;
  perform refresh_match_status(v_id);
  return v_id;
end;
$$;
grant execute on function public.staff_create_manual_match(timestamptz, uuid, uuid[], jsonb, boolean, boolean) to authenticated;

-- 11) Billing report: one row per person per match, for the caller's club ---------------
-- Dates are local (Argentina). Includes every non-cancelled match in the range; the
-- played_status column tells billing which ones were confirmed as played.
create function public.billing_report(p_from date, p_to date)
returns table (
  match_id uuid,
  starts_at timestamptz,
  court text,
  person_name text,
  unit_label text,
  person_type text,
  host_name text,
  host_unit text,
  lights_used boolean,
  played_status public.played_status,
  source public.match_source
)
language plpgsql stable security definer set search_path = public as $$
declare
  v_club uuid;
begin
  select club_id into v_club from profiles where id = auth.uid();
  if v_club is null or not is_club_staff(v_club) then raise exception 'not_club_staff'; end if;

  return query
  with ms as (
    select m.* from matches m
    where m.club_id = v_club
      and m.status <> 'cancelled'
      and m.starts_at >= (p_from::timestamp at time zone 'America/Argentina/Buenos_Aires')
      and m.starts_at < ((p_to + 1)::timestamp at time zone 'America/Argentina/Buenos_Aires')
  )
  select ms.id, ms.starts_at, coalesce(ms.court_label, 'Sin cancha'), p.full_name, p.unit_label, 'Socio'::text,
         null::text, null::text, ms.lights_used, ms.played_status, ms.source
  from ms join match_players mp on mp.match_id = ms.id join profiles p on p.id = mp.player_id
  union all
  select ms.id, ms.starts_at, coalesce(ms.court_label, 'Sin cancha'), g.name, null::text, 'Invitado'::text,
         h.full_name, h.unit_label, ms.lights_used, ms.played_status, ms.source
  from ms join match_guests g on g.match_id = ms.id left join profiles h on h.id = g.host_player_id
  union all
  -- Guests counted before names existed (older matches)
  select ms.id, ms.starts_at, coalesce(ms.court_label, 'Sin cancha'), 'Invitado sin nombre', null::text, 'Invitado'::text,
         c.full_name, c.unit_label, ms.lights_used, ms.played_status, ms.source
  from ms
  join profiles c on c.id = ms.created_by
  cross join lateral generate_series(1, greatest(0, ms.guest_count - (select count(*) from match_guests g2 where g2.match_id = ms.id))::int)
  order by 2, 3, 6, 4;
end;
$$;
grant execute on function public.billing_report(date, date) to authenticated;
