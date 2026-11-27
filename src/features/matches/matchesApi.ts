import { supabase } from '../../lib/supabase'
import type { Category, Match, MatchSource, MatchStatus, MatchType, PlayedStatus, PreferredSide } from '../../types/domain'

export interface MatchRow {
  id: string
  club_id: string
  created_by: string
  starts_at: string
  court_id: string | null
  court_label: string | null
  category_max: number
  category_min: number
  match_type: MatchType
  status: MatchStatus
  guest_count: number
  played_status: PlayedStatus
  lights_used: boolean
  source: MatchSource
  created_at: string
  match_guests: { id: string; name: string; host_player_id: string | null }[]
  match_players: {
    joined_at: string
    profiles: { id: string; full_name: string; category: number; preferred_side: PreferredSide } | null
  }[]
}

export const MATCH_SELECT = `
  id, club_id, created_by, starts_at, court_id, court_label, category_max, category_min, match_type, status, guest_count,
  played_status, lights_used, source, created_at,
  match_guests ( id, name, host_player_id ),
  match_players ( joined_at, profiles ( id, full_name, category, preferred_side ) )
`

export const toMatch = (row: MatchRow): Match => ({
  id: row.id,
  clubId: row.club_id,
  courtId: row.court_id,
  createdBy: row.created_by,
  startsAt: row.starts_at,
  courtLabel: row.court_label,
  categoryMax: row.category_max as Category,
  categoryMin: row.category_min as Category,
  type: row.match_type,
  status: row.status,
  guestCount: row.guest_count,
  guests: (row.match_guests ?? []).map((g) => ({ id: g.id, name: g.name, hostPlayerId: g.host_player_id })),
  playedStatus: row.played_status,
  lightsUsed: row.lights_used,
  source: row.source,
  createdAt: row.created_at,
  players: row.match_players
    .filter((mp) => mp.profiles)
    .map((mp) => ({
      id: mp.profiles!.id,
      fullName: mp.profiles!.full_name,
      category: mp.profiles!.category as Category,
      preferredSide: mp.profiles!.preferred_side,
      joinedAt: mp.joined_at,
    }))
    .sort((a, b) => a.joinedAt.localeCompare(b.joinedAt)),
})

function client() {
  if (!supabase) throw new Error('Supabase is not configured')
  return supabase
}

/** Matches from 2 hours ago onwards (so a match in progress still shows), soonest first. */
export async function fetchUpcomingMatches(): Promise<Match[]> {
  const since = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
  const { data, error } = await client()
    .from('matches')
    .select(MATCH_SELECT)
    .gte('starts_at', since)
    .order('starts_at', { ascending: true })
    .returns<MatchRow[]>()
  if (error) throw error
  return data.map(toMatch)
}

export async function fetchMatch(id: string): Promise<Match | null> {
  const { data, error } = await client()
    .from('matches')
    .select(MATCH_SELECT)
    .eq('id', id)
    .maybeSingle<MatchRow>()
  if (error) throw error
  return data ? toMatch(data) : null
}

export interface NewMatchInput {
  startsAt: Date
  /** Court from the club's list; null = "a definir". */
  courtId: string | null
  categoryMax: Category
  categoryMin: Category
  type: MatchType
  /** Names of friends who are already confirmed but don't use the app. */
  guestNames: string[]
}

export async function createMatch(input: NewMatchInput): Promise<string> {
  const { data, error } = await client().rpc('create_match_v2', {
    p_starts_at: input.startsAt.toISOString(),
    p_court_id: input.courtId,
    p_category_max: input.categoryMax,
    p_category_min: input.categoryMin,
    p_match_type: input.type,
    p_guest_names: input.guestNames,
  })
  if (error) throw error
  return data as string
}

/** Creator or club staff: change time and/or court. */
export async function updateMatch(id: string, startsAt: Date, courtId: string | null) {
  const { error } = await client().rpc('update_match_v2', {
    p_match_id: id,
    p_starts_at: startsAt.toISOString(),
    p_court_id: courtId,
  })
  if (error) throw error
}

export async function joinMatch(id: string) {
  const { error } = await client().rpc('join_match', { p_match_id: id })
  if (error) throw error
}

export async function leaveMatch(id: string) {
  const { error } = await client().rpc('leave_match', { p_match_id: id })
  if (error) throw error
}

export async function cancelMatch(id: string) {
  const { error } = await client().rpc('cancel_match', { p_match_id: id })
  if (error) throw error
}

/** WhatsApp numbers the database lets this user see (own + teammates of full matches). */
export async function fetchContacts(playerIds: string[]): Promise<Record<string, string>> {
  if (playerIds.length === 0) return {}
  const { data, error } = await client()
    .from('player_contacts')
    .select('player_id, whatsapp')
    .in('player_id', playerIds)
  if (error) throw error
  return Object.fromEntries(data.map((c) => [c.player_id, c.whatsapp]))
}

/** Calls `onChange` whenever any match or match player changes. Returns an unsubscribe function. */
export function subscribeToMatches(onChange: () => void): () => void {
  const sb = supabase
  if (!sb) return () => undefined
  const channel = sb
    // Unique name per subscriber: several screens can listen at the same time.
    .channel(`matches-feed-${crypto.randomUUID()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'match_players' }, onChange)
    .subscribe()
  return () => {
    sb.removeChannel(channel)
  }
}

/** Maps database error codes raised by our SQL functions to Spanish messages. */
export function matchErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String((error as { message?: string })?.message ?? '')
  const known: Record<string, string> = {
    match_full: 'Llegaste tarde: el partido ya se completó.',
    match_cancelled: 'Este partido fue cancelado.',
    match_started: 'Este partido ya empezó.',
    match_not_found: 'No encontramos el partido.',
    creator_cannot_leave: 'Armaste este partido: si no podés ir, cancelalo.',
    not_match_creator: 'Solo quien armó el partido puede cancelarlo.',
    starts_in_past: 'Elegí un horario que todavía no haya pasado.',
    profile_required: 'Completá tu perfil antes de sumarte.',
    already_invited: 'Ya lo invitaste a este partido.',
    already_in_match: 'Ya está anotado en este partido.',
    not_a_teammate: 'Solo podés invitar a jugadores con los que ya jugaste.',
    not_in_match: 'Tenés que estar anotado para invitar.',
    invitation_not_found: 'No encontramos esa invitación.',
    invitation_already_answered: 'Ya respondiste esta invitación.',
    court_not_found: 'Esa cancha ya no está disponible. Elegí otra.',
    too_many_guests: 'Podés anotar hasta 2 amigos.',
    not_club_staff: 'Solo el equipo del club puede hacer esto.',
    not_club_admin: 'Solo el administrador del club puede hacer esto.',
    cannot_demote_self: 'No podés quitarte el rol de administrador.',
    player_not_in_club: 'Ese jugador no es de este club.',
    invalid_player_count: 'Un partido tiene entre 1 y 4 personas.',
    guest_name_required: 'Escribí el nombre de cada invitado.',
    courts_club_name_unique: 'Ya hay una cancha con ese nombre.',
    player_time_conflict: 'Ya estás anotado en un partido a esa hora.',
    court_taken: 'Esa cancha ya está ocupada en ese turno. Elegí otra o dejala "A definir".',
    matches_court_slot_unique: 'Esa cancha ya está ocupada en ese turno. Elegí otra o dejala "A definir".',
  }
  const code = Object.keys(known).find((k) => message.includes(k))
  return code ? known[code] : 'Algo falló. Revisá tu conexión y probá de nuevo.'
}
