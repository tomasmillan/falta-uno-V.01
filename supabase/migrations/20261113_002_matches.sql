-- Matches, players and private contacts for v0.1 match-making.
-- Run in Supabase: SQL Editor → New query → paste → Run. Requires 001_profiles.

-- 1) Private contacts --------------------------------------------------------
-- WhatsApp numbers move out of the public profiles table so they are only
-- visible to the owner and to teammates of a full match (enforced by RLS).

create table public.player_contacts (
  player_id uuid primary key references public.profiles (id) on delete cascade,
  whatsapp text not null check (char_length(whatsapp) between 8 and 20),
  updated_at timestamptz not null default now()
);

insert into public.player_contacts (player_id, whatsapp)
select id, whatsapp from public.profiles where whatsapp is not null;

alter table public.profiles drop column whatsapp;

create trigger player_contacts_set_updated_at
before update on public.player_contacts
for each row execute function public.set_updated_at();

-- 2) Matches -----------------------------------------------------------------

create type public.match_type as enum ('friendly', 'competitive');
create type public.match_status as enum ('open', 'full', 'cancelled');

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles (id) on delete cascade,
  starts_at timestamptz not null,
  court_label text not null check (char_length(court_label) between 1 and 40),
  -- Categories: 1 = 1ra (strongest) … 8 = 8va. category_max is the strongest allowed.
  category_max smallint not null check (category_max between 1 and 8),
  category_min smallint not null check (category_min between 1 and 8),
  match_type public.match_type not null default 'friendly',
  -- Players already confirmed who don't use the app (e.g. the creator's friends).
  guest_count smallint not null default 0 check (guest_count between 0 and 2),
  status public.match_status not null default 'open',
  created_at timestamptz not null default now(),
  check (category_max <= category_min)
);

create index matches_starts_at_idx on public.matches (starts_at);

create table public.match_players (
  match_id uuid not null references public.matches (id) on delete cascade,
  player_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (match_id, player_id)
);

create index match_players_player_idx on public.match_players (player_id);

-- 3) Row-level security --------------------------------------------------------

alter table public.matches enable row level security;
alter table public.match_players enable row level security;
alter table public.player_contacts enable row level security;

create policy "Signed-in users can read matches"
  on public.matches for select to authenticated using (true);

create policy "Signed-in users can read match players"
  on public.match_players for select to authenticated using (true);

-- Creating, joining, leaving and cancelling go through the functions below,
-- which check capacity atomically. No direct insert/update/delete policies.

create policy "Owner can read own contact"
  on public.player_contacts for select to authenticated
  using (player_id = auth.uid());

create policy "Teammates in a full match can read contacts"
  on public.player_contacts for select to authenticated
  using (
    exists (
      select 1
      from public.match_players me
      join public.match_players them on them.match_id = me.match_id
      join public.matches m on m.id = me.match_id
      where me.player_id = auth.uid()
        and them.player_id = player_contacts.player_id
        and m.status = 'full'
    )
  );

create policy "Owner can insert own contact"
  on public.player_contacts for insert to authenticated
  with check (player_id = auth.uid());

create policy "Owner can update own contact"
  on public.player_contacts for update to authenticated
  using (player_id = auth.uid()) with check (player_id = auth.uid());

create policy "Owner can delete own contact"
  on public.player_contacts for delete to authenticated
  using (player_id = auth.uid());

-- 4) Functions -----------------------------------------------------------------

-- Recomputes open/full from players + guests. Never touches cancelled matches.
create function public.refresh_match_status(p_match_id uuid) returns void
language sql security definer set search_path = public as $$
  update matches m
  set status = case
    when (select count(*) from match_players mp where mp.match_id = m.id) + m.guest_count >= 4 then 'full'::match_status
    else 'open'::match_status
  end
  where m.id = p_match_id and m.status <> 'cancelled';
$$;

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
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if not exists (select 1 from profiles where id = auth.uid()) then raise exception 'profile_required'; end if;
  if p_starts_at < now() then raise exception 'starts_in_past'; end if;

  insert into matches (created_by, starts_at, court_label, category_max, category_min, match_type, guest_count)
  values (auth.uid(), p_starts_at, trim(p_court_label), p_category_max, p_category_min, p_match_type, p_guest_count)
  returning id into v_id;

  insert into match_players (match_id, player_id) values (v_id, auth.uid());
  perform refresh_match_status(v_id);
  return v_id;
end;
$$;

create function public.join_match(p_match_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_match matches%rowtype;
  v_taken int;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if not exists (select 1 from profiles where id = auth.uid()) then raise exception 'profile_required'; end if;

  -- Lock the match row so two players can't take the last spot at the same time.
  select * into v_match from matches where id = p_match_id for update;
  if not found then raise exception 'match_not_found'; end if;
  if v_match.status = 'cancelled' then raise exception 'match_cancelled'; end if;
  if v_match.starts_at < now() then raise exception 'match_started'; end if;
  if exists (select 1 from match_players where match_id = p_match_id and player_id = auth.uid()) then
    return; -- already in
  end if;

  select count(*) into v_taken from match_players where match_id = p_match_id;
  if v_taken + v_match.guest_count >= 4 then raise exception 'match_full'; end if;

  insert into match_players (match_id, player_id) values (p_match_id, auth.uid());
  perform refresh_match_status(p_match_id);
end;
$$;

create function public.leave_match(p_match_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_match matches%rowtype;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  select * into v_match from matches where id = p_match_id for update;
  if not found then raise exception 'match_not_found'; end if;
  if v_match.created_by = auth.uid() then raise exception 'creator_cannot_leave'; end if;

  delete from match_players where match_id = p_match_id and player_id = auth.uid();
  perform refresh_match_status(p_match_id);
end;
$$;

create function public.cancel_match(p_match_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update matches set status = 'cancelled'
  where id = p_match_id and created_by = auth.uid();
  if not found then raise exception 'not_match_creator'; end if;
end;
$$;

revoke all on function public.refresh_match_status(uuid) from public, anon, authenticated;
grant execute on function public.create_match(timestamptz, text, smallint, smallint, public.match_type, smallint) to authenticated;
grant execute on function public.join_match(uuid) to authenticated;
grant execute on function public.leave_match(uuid) to authenticated;
grant execute on function public.cancel_match(uuid) to authenticated;

-- 5) Realtime: push changes to open screens ------------------------------------
alter publication supabase_realtime add table public.matches, public.match_players;
