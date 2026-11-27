/**
 * Core domain types for Falta Uno v0.1 (match-making only; no bookings or payments yet).
 * UI copy is in Argentine Spanish; code, types and identifiers are in English.
 */

/** Argentine padel categories, from 8th (beginner) to 1st (top). Lower number = stronger player. */
export type Category = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8

export const CATEGORY_LABELS: Record<Category, string> = {
  8: '8va', 7: '7ma', 6: '6ta', 5: '5ta', 4: '4ta', 3: '3ra', 2: '2da', 1: '1ra',
}

export type PreferredSide = 'drive' | 'backhand' | 'either'

export type MatchType = 'friendly' | 'competitive'

export type MatchStatus = 'open' | 'full' | 'cancelled'

export interface Profile {
  id: string
  clubId: string
  fullName: string
  /** Lote / unidad funcional, used by the club to bill the member. */
  unitLabel: string | null
  category: Category
  preferredSide: PreferredSide
  createdAt: string
}

export interface MatchPlayer {
  id: string
  fullName: string
  category: Category
  preferredSide: PreferredSide
  joinedAt: string
}

export interface MatchGuest {
  id: string
  name: string
  hostPlayerId: string | null
}

export type PlayedStatus = 'pending' | 'played' | 'not_played'
export type MatchSource = 'app' | 'manual'

export interface Match {
  id: string
  clubId: string
  /** Court from the club's list, or null while it's "a definir". */
  courtId: string | null
  createdBy: string
  /** ISO date-time of the match start. */
  startsAt: string
  /** Free text (e.g. "Cancha 2"), or null while the court is not booked yet. Becomes a foreign key when courts are modeled. */
  courtLabel: string | null
  /** Strongest category allowed (e.g. 5 for "5ta"). */
  categoryMax: Category
  /** Weakest category allowed (e.g. 6 for "6ta"). */
  categoryMin: Category
  type: MatchType
  status: MatchStatus
  /** Confirmed players who don't use the app (e.g. the creator's friends). */
  guestCount: number
  /** Named guests (older matches may have guestCount > guests.length). */
  guests: MatchGuest[]
  players: MatchPlayer[]
  /** Set by club staff when closing the day. */
  playedStatus: PlayedStatus
  lightsUsed: boolean
  /** 'manual' = registered by staff (walk-in). */
  source: MatchSource
  createdAt: string
}

/** Padel doubles always needs four players. */
export const MATCH_SIZE = 4

export const missingPlayers = (match: Match) =>
  Math.max(0, MATCH_SIZE - match.players.length - match.guestCount)

export const categoryRangeLabel = (match: Pick<Match, 'categoryMax' | 'categoryMin'>) =>
  match.categoryMax === match.categoryMin
    ? CATEGORY_LABELS[match.categoryMax]
    : `${CATEGORY_LABELS[match.categoryMin]} a ${CATEGORY_LABELS[match.categoryMax]}`

export const isInCategoryRange = (category: Category, match: Pick<Match, 'categoryMax' | 'categoryMin'>) =>
  category >= match.categoryMax && category <= match.categoryMin

export const courtLabelOrPending = (match: Pick<Match, 'courtLabel'>) => match.courtLabel ?? 'Cancha a definir'

/** Club booking slots: 90-minute turns from 08:00 to 23:00. */
export const MATCH_SLOTS = ['08:00', '09:30', '11:00', '12:30', '14:00', '15:30', '17:00', '18:30', '20:00', '21:30', '23:00']

export type InvitationStatus = 'pending' | 'accepted' | 'declined'

export interface Invitation {
  id: string
  status: InvitationStatus
  createdAt: string
  inviterName: string
  match: Match
}

/** A player the user has already shared a match with. */
export interface Teammate {
  id: string
  fullName: string
  category: Category
  preferredSide: PreferredSide
  matchesTogether: number
}

export type ClubRole = 'admin' | 'staff'

export interface Court {
  id: string
  clubId: string
  name: string
  hasLights: boolean
  active: boolean
}

/** One person in one match, as returned by billing_report(). */
export interface BillingRow {
  matchId: string
  startsAt: string
  court: string
  personName: string
  unitLabel: string | null
  personType: 'Socio' | 'Invitado'
  hostName: string | null
  hostUnit: string | null
  lightsUsed: boolean
  playedStatus: PlayedStatus
  source: MatchSource
}

export const MAX_GUESTS_PER_MATCH = 2
