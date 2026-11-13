import { supabase } from '../../lib/supabase'
import type { Category, Match, MatchStatus, MatchType, PreferredSide } from '../../types/domain'

interface MatchRow {
  id: string
  created_by: string
  starts_at: string
  court_label: string
  category_max: number
  category_min: number
  match_type: MatchType
  status: MatchStatus
  guest_count: number
  created_at: string
  match_players: {
    joined_at: string
    profiles: { id: string; full_name: string; category: number; preferred_side: PreferredSide } | null
  }[]
}

const MATCH_SELECT = `
  id, created_by, starts_at, court_label, category_max, category_min, match_type, status, guest_count, created_at,
  match_players ( joined_at, profiles ( id, full_name, category, preferred_side ) )
`

const toMatch = (row: MatchRow): Match => ({
  id: row.id,
  createdBy: row.created_by,
  startsAt: row.starts_at,
  courtLabel: row.court_label,
  categoryMax: row.category_max as Category,
  categoryMin: row.category_min as Category,
  type: row.match_type,
  status: row.status,
  guestCount: row.guest_count,
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
  courtLabel: string
  categoryMax: Category
  categoryMin: Category
  type: MatchType
  guestCount: number
}

export async function createMatch(input: NewMatchInput): Promise<string> {
  const { data, error } = await client().rpc('create_match', {
    p_starts_at: input.startsAt.toISOString(),
    p_court_label: input.courtLabel,
    p_category_max: input.categoryMax,
    p_category_min: input.categoryMin,
    p_match_type: input.type,
    p_guest_count: input.guestCount,
  })
  if (error) throw error
  return data as string
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
    .channel('matches-feed')
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
  }
  const code = Object.keys(known).find((k) => message.includes(k))
  return code ? known[code] : 'Algo falló. Revisá tu conexión y probá de nuevo.'
}
