import { useEffect, useState } from 'react'
import type { ClubRole } from '../../types/domain'
import { fetchMyClubRole } from './clubApi'

/** The signed-in user's staff role in their club, or null for regular players. */
export function useClubRole(enabled: boolean) {
  const [role, setRole] = useState<ClubRole | null>(null)
  useEffect(() => {
    if (!enabled) return
    fetchMyClubRole().then(setRole).catch(() => setRole(null))
  }, [enabled])
  return enabled ? role : null
}
