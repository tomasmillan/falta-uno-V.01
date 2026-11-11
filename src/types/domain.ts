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
  whatsapp: string | null
  createdAt: string
}

export interface Match {
  id: string
  createdBy: string
  /** ISO date-time of the match start, in the club's local time zone. */
  startsAt: string
  /** Free text for v0.1 (e.g. "Cancha 2"); becomes a foreign key when courts are modeled. */
  courtLabel: string
  /** Strongest category allowed (e.g. 5 for "5ta"). */
  categoryMax: Category
  /** Weakest category allowed (e.g. 6 for "6ta"). */
  categoryMin: Category
  type: MatchType
  status: MatchStatus
  /** Always 4 for padel doubles. */
  capacity: number
  createdAt: string
}

export interface MatchPlayer {
  matchId: string
  playerId: string
  joinedAt: string
}
