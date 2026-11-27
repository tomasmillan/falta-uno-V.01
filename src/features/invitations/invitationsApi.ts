import { supabase } from '../../lib/supabase'
import type { Category, Invitation, InvitationStatus, PreferredSide, Teammate } from '../../types/domain'
import { MATCH_SELECT, toMatch, type MatchRow } from '../matches/matchesApi'

function client() {
  if (!supabase) throw new Error('Supabase is not configured')
  return supabase
}

interface InvitationRow {
  id: string
  status: InvitationStatus
  created_at: string
  inviter: { full_name: string } | null
  matches: MatchRow | null
}

/** Pending invitations the user received, for matches that haven't started. */
export async function fetchReceivedInvitations(userId: string): Promise<Invitation[]> {
  const { data, error } = await client()
    .from('match_invitations')
    .select(`id, status, created_at, inviter:profiles!match_invitations_invited_by_fkey ( full_name ), matches ( ${MATCH_SELECT} )`)
    .eq('invited_player', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .returns<InvitationRow[]>()
  if (error) throw error
  const now = Date.now()
  return data
    .filter((row) => row.matches && new Date(row.matches.starts_at).getTime() > now)
    .map((row) => ({
      id: row.id,
      status: row.status,
      createdAt: row.created_at,
      inviterName: row.inviter?.full_name ?? 'Un jugador',
      match: toMatch(row.matches!),
    }))
}

/** Invitation status per invited player for one match (only the ones this user can see). */
export async function fetchMatchInvitations(matchId: string): Promise<Record<string, InvitationStatus>> {
  const { data, error } = await client()
    .from('match_invitations')
    .select('invited_player, status')
    .eq('match_id', matchId)
  if (error) throw error
  return Object.fromEntries(data.map((row) => [row.invited_player, row.status as InvitationStatus]))
}

interface TeammateRow {
  id: string
  full_name: string
  category: number
  preferred_side: PreferredSide
  matches_together: number
}

export async function fetchTeammates(): Promise<Teammate[]> {
  const { data, error } = await client().rpc('my_teammates')
  if (error) throw error
  return ((data ?? []) as TeammateRow[]).map((row) => ({
    id: row.id,
    fullName: row.full_name,
    category: row.category as Category,
    preferredSide: row.preferred_side,
    matchesTogether: Number(row.matches_together),
  }))
}

export async function inviteToMatch(matchId: string, playerId: string) {
  const { error } = await client().rpc('invite_to_match', { p_match_id: matchId, p_player_id: playerId })
  if (error) throw error
}

export async function respondInvitation(invitationId: string, accept: boolean) {
  const { error } = await client().rpc('respond_invitation', { p_invitation_id: invitationId, p_accept: accept })
  if (error) throw error
}

/** Calls `onChange` when any invitation visible to this user changes. Returns an unsubscribe function. */
export function subscribeToInvitations(onChange: () => void): () => void {
  const sb = supabase
  if (!sb) return () => undefined
  const channel = sb
    .channel(`invitations-${crypto.randomUUID()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'match_invitations' }, onChange)
    .subscribe()
  return () => {
    sb.removeChannel(channel)
  }
}
