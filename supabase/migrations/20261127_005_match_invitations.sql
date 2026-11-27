-- Match invitations: invite players you've already played with.
-- Run in Supabase: SQL Editor → New query → paste → Run. Requires 001–004.

create type public.invitation_status as enum ('pending', 'accepted', 'declined');

create table public.match_invitations (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches (id) on delete cascade,
  invited_by uuid not null references public.profiles (id) on delete cascade,
  invited_player uuid not null references public.profiles (id) on delete cascade,
  status public.invitation_status not null default 'pending',
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  unique (match_id, invited_player),
  check (invited_by <> invited_player)
);

create index match_invitations_invited_player_idx on public.match_invitations (invited_player, status);

-- Only the two people involved can see an invitation. Writes go through the functions below.
alter table public.match_invitations enable row level security;

create policy "Inviter and invitee can read invitations"
  on public.match_invitations for select to authenticated
  using (invited_by = auth.uid() or invited_player = auth.uid());

-- Players who shared at least one non-cancelled match with the caller, in the caller's club.
-- This is the "network" for v0.1.3: no friend requests needed.
create function public.my_teammates()
returns table (id uuid, full_name text, category smallint, preferred_side public.preferred_side, matches_together bigint)
language sql stable security definer set search_path = public as $$
  select p.id, p.full_name, p.category, p.preferred_side, count(distinct mine.match_id) as matches_together
  from match_players mine
  join matches m on m.id = mine.match_id and m.status <> 'cancelled'
  join match_players theirs on theirs.match_id = mine.match_id and theirs.player_id <> mine.player_id
  join profiles p on p.id = theirs.player_id
  join profiles me on me.id = mine.player_id
  where mine.player_id = auth.uid()
    and p.club_id = me.club_id
  group by p.id, p.full_name, p.category, p.preferred_side
  order by matches_together desc, p.full_name;
$$;

grant execute on function public.my_teammates() to authenticated;

create function public.invite_to_match(p_match_id uuid, p_player_id uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_match matches%rowtype;
  v_existing match_invitations%rowtype;
  v_id uuid;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  select * into v_match from matches where id = p_match_id;
  if not found then raise exception 'match_not_found'; end if;
  if v_match.status = 'cancelled' then raise exception 'match_cancelled'; end if;
  if v_match.status = 'full' then raise exception 'match_full'; end if;
  if v_match.starts_at < now() then raise exception 'match_started'; end if;
  if not exists (select 1 from match_players where match_id = p_match_id and player_id = auth.uid()) then
    raise exception 'not_in_match';
  end if;
  if exists (select 1 from match_players where match_id = p_match_id and player_id = p_player_id) then
    raise exception 'already_in_match';
  end if;
  -- Only players you've already played with, from the match's club.
  if not exists (select 1 from my_teammates() t where t.id = p_player_id)
     or not exists (select 1 from profiles where id = p_player_id and club_id = v_match.club_id) then
    raise exception 'not_a_teammate';
  end if;

  select * into v_existing from match_invitations where match_id = p_match_id and invited_player = p_player_id;
  if found then
    if v_existing.status = 'pending' then raise exception 'already_invited'; end if;
    -- A declined invitation can be sent again.
    update match_invitations
    set status = 'pending', invited_by = auth.uid(), created_at = now(), responded_at = null
    where id = v_existing.id;
    return v_existing.id;
  end if;

  insert into match_invitations (match_id, invited_by, invited_player)
  values (p_match_id, auth.uid(), p_player_id)
  returning id into v_id;
  return v_id;
end;
$$;

grant execute on function public.invite_to_match(uuid, uuid) to authenticated;

-- Accepting joins the match with the same rules as joining (capacity, schedule conflicts).
create function public.respond_invitation(p_invitation_id uuid, p_accept boolean) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_inv match_invitations%rowtype;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  select * into v_inv from match_invitations where id = p_invitation_id for update;
  if not found or v_inv.invited_player <> auth.uid() then raise exception 'invitation_not_found'; end if;
  if v_inv.status <> 'pending' then raise exception 'invitation_already_answered'; end if;

  if p_accept then
    perform join_match(v_inv.match_id);
  end if;

  update match_invitations
  set status = case when p_accept then 'accepted'::invitation_status else 'declined'::invitation_status end,
      responded_at = now()
  where id = p_invitation_id;
end;
$$;

grant execute on function public.respond_invitation(uuid, boolean) to authenticated;

alter publication supabase_realtime add table public.match_invitations;
