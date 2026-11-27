import { useCallback, useEffect, useState } from 'react'
import type { Court } from '../../types/domain'
import { fetchCourts } from './clubApi'

/** Courts of a club. `active` = only the ones players can pick. */
export function useCourts(clubId: string | undefined, onlyActive = true) {
  const [courts, setCourts] = useState<Court[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!clubId) return
    try {
      const list = await fetchCourts(clubId)
      setCourts(onlyActive ? list.filter((c) => c.active) : list)
    } catch {
      setCourts([])
    } finally {
      setLoading(false)
    }
  }, [clubId, onlyActive])

  useEffect(() => {
    load()
  }, [load])

  return { courts, loading, reload: load }
}
