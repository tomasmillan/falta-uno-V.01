import { useCallback, useEffect, useState } from 'react'
import type { Profile } from '../../types/domain'
import { fetchProfile } from './profileApi'

/** Loads the signed-in user's profile. `profile` is null when they still need to create one. */
export function useProfile(userId: string | undefined) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!userId) {
      setProfile(null)
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      setProfile(await fetchProfile(userId))
    } catch {
      setError('No pudimos cargar tu perfil. Revisá tu conexión y recargá la página.')
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    load()
  }, [load])

  return { profile, setProfile, loading, error, reload: load }
}
