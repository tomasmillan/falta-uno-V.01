import { supabase } from '../../lib/supabase'
import type { Category, PreferredSide, Profile } from '../../types/domain'

interface ProfileRow {
  id: string
  full_name: string
  category: number
  preferred_side: PreferredSide
  whatsapp: string | null
  created_at: string
}

const toProfile = (row: ProfileRow): Profile => ({
  id: row.id,
  fullName: row.full_name,
  category: row.category as Category,
  preferredSide: row.preferred_side,
  whatsapp: row.whatsapp,
  createdAt: row.created_at,
})

export type ProfileInput = Pick<Profile, 'fullName' | 'category' | 'preferredSide' | 'whatsapp'>

/** Returns the user's profile, or null if they haven't created one yet. */
export async function fetchProfile(userId: string): Promise<Profile | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, category, preferred_side, whatsapp, created_at')
    .eq('id', userId)
    .maybeSingle<ProfileRow>()
  if (error) throw error
  return data ? toProfile(data) : null
}

export async function saveProfile(userId: string, input: ProfileInput): Promise<Profile> {
  if (!supabase) throw new Error('Supabase is not configured')
  const { data, error } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      full_name: input.fullName.trim(),
      category: input.category,
      preferred_side: input.preferredSide,
      whatsapp: input.whatsapp?.trim() || null,
    })
    .select('id, full_name, category, preferred_side, whatsapp, created_at')
    .single<ProfileRow>()
  if (error) throw error
  return toProfile(data)
}
