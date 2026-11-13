import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { Profile } from '../../types/domain'
import ProfileForm from './ProfileForm'

interface Props {
  profile: Profile
  onSaved: (profile: Profile) => void
  onSignOut: () => void
}

export default function ProfilePage({ profile, onSaved, onSignOut }: Props) {
  const [saved, setSaved] = useState(false)
  return (
    <main className="stack">
      <Link to="/" className="back-link">← Volver</Link>
      <section className="card stack">
        <h2>Mi perfil</h2>
        <ProfileForm
          userId={profile.id}
          initial={profile}
          submitLabel="Guardar cambios"
          onSaved={(p) => {
            onSaved(p)
            setSaved(true)
          }}
        />
        {saved && <p className="success" role="status">Perfil guardado.</p>}
      </section>
      <button type="button" className="btn btn-ghost" onClick={onSignOut}>Cerrar sesión</button>
    </main>
  )
}
