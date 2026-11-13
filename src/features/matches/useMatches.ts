import { useCallback, useEffect, useState } from 'react'
import type { Match } from '../../types/domain'
import { fetchUpcomingMatches, subscribeToMatches } from './matchesApi'

/** Upcoming matches, kept fresh with Supabase Realtime. */
export function useMatches() {
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setMatches(await fetchUpcomingMatches())
      setError(null)
    } catch {
      setError('No pudimos cargar los partidos. Revisá tu conexión.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    return subscribeToMatches(load)
  }, [load])

  return { matches, loading, error, reload: load }
}
