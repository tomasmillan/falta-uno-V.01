import { useCallback, useEffect, useState } from 'react'
import type { Invitation } from '../../types/domain'
import { subscribeToMatches } from '../matches/matchesApi'
import { fetchReceivedInvitations, subscribeToInvitations } from './invitationsApi'

/** Pending invitations for the signed-in user, kept fresh in real time. */
export function useInvitations(userId: string | undefined) {
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!userId) {
      setInvitations([])
      setLoading(false)
      return
    }
    try {
      setInvitations(await fetchReceivedInvitations(userId))
      setError(null)
    } catch {
      setError('No pudimos cargar tus invitaciones. Revisá tu conexión.')
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    load()
    if (!userId) return
    // Matches changing (someone joins, a match fills up) also changes what an invitation shows.
    const offInvitations = subscribeToInvitations(load)
    const offMatches = subscribeToMatches(load)
    return () => {
      offInvitations()
      offMatches()
    }
  }, [load, userId])

  return { invitations, loading, error, reload: load }
}
