import { supabase } from '../../lib/supabase'
import type { BillingRow, Category, ClubRole, Court, Match, MatchSource, PlayedStatus, Profile } from '../../types/domain'
import { MATCH_SELECT, toMatch, type MatchRow } from '../matches/matchesApi'

function client() {
  if (!supabase) throw new Error('Supabase is not configured')
  return supabase
}

interface CourtRow {
  id: string
  club_id: string
  name: string
  has_lights: boolean
  active: boolean
}

const toCourt = (r: CourtRow): Court => ({ id: r.id, clubId: r.club_id, name: r.name, hasLights: r.has_lights, active: r.active })

/** All courts of a club, active first, then by name. */
export async function fetchCourts(clubId: string): Promise<Court[]> {
  const { data, error } = await client()
    .from('courts')
    .select('id, club_id, name, has_lights, active')
    .eq('club_id', clubId)
    .order('active', { ascending: false })
    .order('name')
    .returns<CourtRow[]>()
  if (error) throw error
  return data.map(toCourt)
}

export async function addCourt(clubId: string, name: string, hasLights: boolean) {
  const { error } = await client().from('courts').insert({ club_id: clubId, name: name.trim(), has_lights: hasLights })
  if (error) throw error
}

export async function updateCourt(id: string, changes: Partial<Pick<Court, 'name' | 'hasLights' | 'active'>>) {
  const row: Record<string, unknown> = {}
  if (changes.name !== undefined) row.name = changes.name.trim()
  if (changes.hasLights !== undefined) row.has_lights = changes.hasLights
  if (changes.active !== undefined) row.active = changes.active
  const { error } = await client().from('courts').update(row).eq('id', id)
  if (error) throw error
}

export async function fetchMyClubRole(): Promise<ClubRole | null> {
  const { data, error } = await client().rpc('my_club_role')
  if (error) throw error
  return (data as ClubRole | null) ?? null
}

export interface ClubPlayer extends Pick<Profile, 'id' | 'fullName' | 'unitLabel' | 'category'> {
  role: ClubRole | null
}

/** Everyone in the club with their staff role (if any). Staff only sees roles. */
export async function fetchClubPlayers(clubId: string): Promise<ClubPlayer[]> {
  const [players, members] = await Promise.all([
    client().from('profiles').select('id, full_name, unit_label, category').eq('club_id', clubId).order('full_name'),
    client().from('club_members').select('profile_id, role').eq('club_id', clubId),
  ])
  if (players.error) throw players.error
  if (members.error) throw members.error
  const roles = new Map(members.data.map((m) => [m.profile_id as string, m.role as ClubRole]))
  return players.data.map((p) => ({
    id: p.id,
    fullName: p.full_name,
    unitLabel: p.unit_label,
    category: p.category as Category,
    role: roles.get(p.id) ?? null,
  }))
}

export async function setClubRole(profileId: string, role: ClubRole | null) {
  const { error } = await client().rpc('set_club_role', { p_profile_id: profileId, p_role: role })
  if (error) throw error
}

/** Non-cancelled matches of the club on a local day ("YYYY-MM-DD"). */
export async function fetchDayMatches(clubId: string, day: string): Promise<Match[]> {
  const [y, m, d] = day.split('-').map(Number)
  const from = new Date(y, m - 1, d)
  const to = new Date(y, m - 1, d + 1)
  const { data, error } = await client()
    .from('matches')
    .select(MATCH_SELECT)
    .eq('club_id', clubId)
    .neq('status', 'cancelled')
    .gte('starts_at', from.toISOString())
    .lt('starts_at', to.toISOString())
    .order('starts_at')
    .returns<MatchRow[]>()
  if (error) throw error
  return data.map(toMatch)
}

export async function closeMatch(matchId: string, played: boolean, lights: boolean) {
  const { error } = await client().rpc('staff_close_match', { p_match_id: matchId, p_played: played, p_lights: lights })
  if (error) throw error
}

export interface ManualMatchInput {
  startsAt: Date
  courtId: string | null
  playerIds: string[]
  guests: { name: string; hostPlayerId: string | null }[]
  played: boolean
  lights: boolean
}

export async function createManualMatch(input: ManualMatchInput): Promise<string> {
  const { data, error } = await client().rpc('staff_create_manual_match', {
    p_starts_at: input.startsAt.toISOString(),
    p_court_id: input.courtId,
    p_player_ids: input.playerIds,
    p_guests: input.guests.map((g) => ({ name: g.name.trim(), host_player_id: g.hostPlayerId ?? '' })),
    p_played: input.played,
    p_lights: input.lights,
  })
  if (error) throw error
  return data as string
}

interface BillingRowDb {
  match_id: string
  starts_at: string
  court: string
  person_name: string
  unit_label: string | null
  person_type: 'Socio' | 'Invitado'
  host_name: string | null
  host_unit: string | null
  lights_used: boolean
  played_status: PlayedStatus
  source: MatchSource
}

/** One row per person per match between two local dates (inclusive). */
export async function fetchBillingReport(from: string, to: string): Promise<BillingRow[]> {
  const { data, error } = await client().rpc('billing_report', { p_from: from, p_to: to })
  if (error) throw error
  return ((data ?? []) as BillingRowDb[]).map((r) => ({
    matchId: r.match_id,
    startsAt: r.starts_at,
    court: r.court,
    personName: r.person_name,
    unitLabel: r.unit_label,
    personType: r.person_type,
    hostName: r.host_name,
    hostUnit: r.host_unit,
    lightsUsed: r.lights_used,
    playedStatus: r.played_status,
    source: r.source,
  }))
}
