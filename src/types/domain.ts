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
  fullName: string
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

export interface Match {
  id: string
  createdBy: string
  /** ISO date-time of the match start. */
  startsAt: string
  /** Free text for v0.1 (e.g. "Cancha 2"); becomes a foreign key when courts are modeled. */
  courtLabel: string
  /** Strongest category allowed (e.g. 5 for "5ta"). */
  categoryMax: Category
  /** Weakest category allowed (e.g. 6 for "6ta"). */
  categoryMin: Category
  type: MatchType
  status: MatchStatus
  /** Confirmed players who don't use the app (e.g. the creator's friends). */
  guestCount: number
  players: MatchPlayer[]
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
