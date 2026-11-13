import type { Session } from '@supabase/supabase-js'
import type { Profile } from '../../types/domain'
import ProfileForm from './ProfileForm'

interface Props {
  session: Session
  onDone: (profile: Profile) => void
}

export default function OnboardingPage({ session, onDone }: Props) {
  const googleName = (session.user.user_metadata?.full_name as string | undefined) ?? ''
  return (
    <main className="card stack">
      <h2>Armá tu perfil</h2>
      <p className="muted">Con tu categoría te mostramos los partidos que te convienen.</p>
      <ProfileForm
        userId={session.user.id}
        initial={{ fullName: googleName }}
        submitLabel="Listo, empezar"
        onSaved={onDone}
      />
    </main>
  )
}
