-- Clubs, optional court and match editing.
-- Run in Supabase: SQL Editor → New query → paste → Run. Requires 001 and 002.

-- 1) Clubs -----------------------------------------------------------------------
-- Every match and player belongs to a club, so the app can serve several clubs later.
-- For the pilot there is a single club; rename it from the Table Editor if needed.

create table public.clubs (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 80),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,40}$'),
  created_at timestamptz not null default now()
);

alter table public.clubs enable row level security;

create policy "Signed-in users can read clubs"
  on public.clubs for select to authenticated using (true);

insert into public.clubs (name, slug) values ('Club piloto', 'pilot');

-- Default club for new rows during the pilot.
create function public.pilot_club_id() returns uuid
language sql stable as $$ select id from public.clubs where slug = 'pilot' $$;

alter table public.profiles add column club_id uuid references public.clubs (id);
update public.profiles set club_id = public.pilot_club_id();
alter table public.profiles alter column club_id set default public.pilot_club_id();
alter table public.profiles alter column club_id set not null;

alter table public.matches add column club_id uuid references public.clubs (id);
update public.matches set club_id = public.pilot_club_id();
alter table public.matches alter column club_id set not null;

create index matches_club_starts_at_idx on public.matches (club_id, starts_at);

-- 2) Court is optional: with OpenKey the court is booked once the four players are in.
alter table public.matches alter column court_label drop not null;
alter table public.matches drop constraint matches_court_label_check;
alter table public.matches add constraint matches_court_label_check
  check (court_label is null or char_length(court_label) between 1 and 40);

-- 3) create_match: court optional, club taken from the creator's profile ------------
drop function public.create_match(timestamptz, text, smallint, smallint, public.match_type, smallint);

create function public.create_match(
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

  insert into matches (club_id, created_by, starts_at, court_label, category_max, category_min, match_type, guest_count)
  values (v_club, auth.uid(), p_starts_at, nullif(trim(p_court_label), ''), p_category_max, p_category_min, p_match_type, p_guest_count)
  returning id into v_id;

  insert into match_players (match_id, player_id) values (v_id, auth.uid());
  perform refresh_match_status(v_id);
  return v_id;
end;
$$;

grant execute on function public.create_match(timestamptz, text, smallint, smallint, public.match_type, smallint) to authenticated;

-- 4) update_match: the creator can change time and court before the match -------------
create function public.update_match(
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

  update matches
  set starts_at = p_starts_at,
      court_label = nullif(trim(p_court_label), '')
  where id = p_match_id;
end;
$$;

grant execute on function public.update_match(uuid, timestamptz, text) to authenticated;
