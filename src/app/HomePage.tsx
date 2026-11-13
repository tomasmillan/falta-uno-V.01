import type { Profile } from '../types/domain'
import { CATEGORY_LABELS } from '../types/domain'

/** Placeholder home. Replaced by the open-matches list in step 4 of the v0.1 plan. */
export default function HomePage({ profile }: { profile: Profile }) {
  const firstName = profile.fullName.split(' ')[0]
  return (
    <main className="card stack">
      <h2>¡Hola, {firstName}!</h2>
      <p className="muted">
        Ya estás adentro como {CATEGORY_LABELS[profile.category]}. Muy pronto vas a ver acá los
        partidos a los que les falta uno.
      </p>
    </main>
  )
}
