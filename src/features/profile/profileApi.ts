import { supabase } from '../../lib/supabase'
import type { Category, PreferredSide, Profile } from '../../types/domain'

interface ProfileRow {
  id: string
  full_name: string
  category: number
  preferred_side: PreferredSide
  created_at: string
}

const toProfile = (row: ProfileRow): Profile => ({
  id: row.id,
  fullName: row.full_name,
  category: row.category as Category,
  preferredSide: row.preferred_side,
  createdAt: row.created_at,
})

const PROFILE_COLUMNS = 'id, full_name, category, preferred_side, created_at'

export type ProfileInput = Pick<Profile, 'fullName' | 'category' | 'preferredSide'> & {
  whatsapp: string
}

/** Returns the user's profile, or null if they haven't created one yet. */
export async function fetchProfile(userId: string): Promise<Profile | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .eq('id', userId)
    .maybeSingle<ProfileRow>()
  if (error) throw error
  return data ? toProfile(data) : null
}

/** The user's own WhatsApp (private table; only teammates of full matches can read it). */
export async function fetchOwnWhatsapp(userId: string): Promise<string> {
  if (!supabase) return ''
  const { data, error } = await supabase
    .from('player_contacts')
    .select('whatsapp')
    .eq('player_id', userId)
    .maybeSingle<{ whatsapp: string }>()
  if (error) throw error
  return data?.whatsapp ?? ''
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
    })
    .select(PROFILE_COLUMNS)
    .single<ProfileRow>()
  if (error) throw error

  const whatsapp = input.whatsapp.trim()
  const contact = whatsapp
    ? await supabase.from('player_contacts').upsert({ player_id: userId, whatsapp })
    : await supabase.from('player_contacts').delete().eq('player_id', userId)
  if (contact.error) throw contact.error

  return toProfile(data)
}
