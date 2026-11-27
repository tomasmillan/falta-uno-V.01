import { useState, type FormEvent } from 'react'
import type { Profile } from '../../types/domain'
import { matchErrorMessage } from '../matches/matchesApi'
import { addCourt, updateCourt } from './clubApi'
import { useCourts } from './useCourts'

/** Admin: the club's fixed list of courts. */
export default function ClubCourtsPage({ profile }: { profile: Profile }) {
  const { courts, loading, reload } = useCourts(profile.clubId, false)
  const [name, setName] = useState('')
  const [hasLights, setHasLights] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const run = async (action: () => Promise<void>) => {
    setBusy(true)
    setError(null)
    try {
      await action()
      await reload()
    } catch (e) {
      setError(matchErrorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  const handleAdd = (event: FormEvent) => {
    event.preventDefault()
    if (!name.trim()) return setError('Escribí el nombre de la cancha.')
    run(async () => {
      await addCourt(profile.clubId, name, hasLights)
      setName('')
    })
  }

  return (
    <section className="stack">
      <form className="card stack" onSubmit={handleAdd} noValidate>
        <h3>Agregar cancha</h3>
        <div className="field">
          <label htmlFor="court-name">Nombre</label>
          <input id="court-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej.: Cancha 1" maxLength={40} />
        </div>
        <label className="check">
          <input type="checkbox" checked={hasLights} onChange={(e) => setHasLights(e.target.checked)} />
          Tiene luces
        </label>
        <button type="submit" className="btn btn-primary" disabled={busy}>Agregar</button>
        <span className="hint">Los partidos viejos con ese mismo nombre de cancha se asocian solos.</span>
      </form>

      {error && <p className="error card" role="alert">{error}</p>}
      {!loading && courts.length === 0 && <p className="muted">Todavía no hay canchas cargadas.</p>}

      {courts.length > 0 && (
        <ul className="card court-list">
          {courts.map((c) => (
            <li key={c.id} className={c.active ? '' : 'is-inactive'}>
              <div>
                <strong>{c.name}</strong>
                <span className="muted">{c.hasLights ? 'Con luces' : 'Sin luces'}{c.active ? '' : ' · desactivada'}</span>
              </div>
              <div className="court-actions">
                <button type="button" className="btn btn-ghost btn-small" disabled={busy} onClick={() => run(() => updateCourt(c.id, { hasLights: !c.hasLights }))}>
                  {c.hasLights ? 'Sin luz' : 'Con luz'}
                </button>
                <button type="button" className="btn btn-ghost btn-small" disabled={busy} onClick={() => run(() => updateCourt(c.id, { active: !c.active }))}>
                  {c.active ? 'Desactivar' : 'Activar'}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
