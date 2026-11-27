import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { MATCH_SLOTS, MATCH_SIZE, type Profile } from '../../types/domain'
import { matchErrorMessage } from '../matches/matchesApi'
import { combineDateTime, localDateKey } from '../matches/dateTime'
import CourtField from '../matches/CourtField'
import { createManualMatch, fetchClubPlayers, type ClubPlayer } from './clubApi'
import { useCourts } from './useCourts'

interface GuestDraft {
  name: string
  hostPlayerId: string
}

/** Staff registers a walk-in match so it reaches billing. */
export default function ClubManualMatchPage({ profile }: { profile: Profile }) {
  const { courts } = useCourts(profile.clubId)
  const [players, setPlayers] = useState<ClubPlayer[]>([])
  const [day, setDay] = useState(localDateKey(new Date()))
  const [time, setTime] = useState('18:30')
  const [courtId, setCourtId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [guests, setGuests] = useState<GuestDraft[]>([])
  const [played, setPlayed] = useState(true)
  const [lights, setLights] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)

  useEffect(() => {
    fetchClubPlayers(profile.clubId).then(setPlayers).catch(() => setError('No pudimos cargar los socios.'))
  }, [profile.clubId])

  const total = selected.length + guests.length
  const full = total >= MATCH_SIZE
  const matches = useMemo(() => {
    const q = search.trim().toLowerCase()
    return players
      .filter((p) => !selected.includes(p.id))
      .filter((p) => !q || p.fullName.toLowerCase().includes(q) || (p.unitLabel ?? '').toLowerCase().includes(q))
      .slice(0, 8)
  }, [players, selected, search])
  const byId = (id: string) => players.find((p) => p.id === id)

  const reset = () => {
    setSelected([])
    setGuests([])
    setSearch('')
    setCourtId(null)
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setDone(null)
    if (total === 0) {
      setError('Agregá al menos un socio o un invitado.')
      return
    }
    if (guests.some((g) => g.name.trim().length < 2)) {
      setError('Escribí el nombre de cada invitado.')
      return
    }
    setSaving(true)
    try {
      await createManualMatch({
        startsAt: combineDateTime(day, time),
        courtId,
        playerIds: selected,
        guests: guests.map((g) => ({ name: g.name, hostPlayerId: g.hostPlayerId || null })),
        played,
        lights,
      })
      setDone(`Partido de las ${time} cargado.`)
      reset()
    } catch (e) {
      setError(matchErrorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="card stack" onSubmit={handleSubmit} noValidate>
      <h3>Cargar partido presencial</h3>
      <p className="hint">Para los que vienen a jugar sin anotarse en la app. Queda en el reporte de facturación.</p>

      <div className="grid-2">
        <div className="field">
          <label htmlFor="manual-day">Día</label>
          <input id="manual-day" type="date" value={day} onChange={(e) => e.target.value && setDay(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="manual-time">Turno</label>
          <select id="manual-time" value={time} onChange={(e) => setTime(e.target.value)}>
            {MATCH_SLOTS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      <CourtField idPrefix="manual" courts={courts} courtId={courtId} onChange={setCourtId} />

      <div className="field">
        <label htmlFor="manual-search">Socios ({selected.length})</label>
        {selected.length > 0 && (
          <div className="chips wrap">
            {selected.map((id) => (
              <button
                key={id}
                type="button"
                className="chip is-selected"
                onClick={() => setSelected((s) => s.filter((x) => x !== id))}
                aria-label={`Quitar a ${byId(id)?.fullName}`}
              >
                {byId(id)?.fullName} ×
              </button>
            ))}
          </div>
        )}
        {!full && (
          <>
            <input
              id="manual-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre o lote"
              autoComplete="off"
            />
            <ul className="pick-list">
              {matches.map((p) => (
                <li key={p.id}>
                  <button type="button" onClick={() => { setSelected((s) => [...s, p.id]); setSearch('') }}>
                    <strong>{p.fullName}</strong>
                    <span className="muted">{p.unitLabel ?? 'Sin lote'}</span>
                  </button>
                </li>
              ))}
              {matches.length === 0 && <li className="muted">No hay socios con ese nombre.</li>}
            </ul>
          </>
        )}
      </div>

      <div className="field">
        <span className="field-label">Invitados ({guests.length})</span>
        {guests.map((g, i) => (
          <div key={i} className="guest-row">
            <input
              aria-label={`Nombre del invitado ${i + 1}`}
              value={g.name}
              onChange={(e) => setGuests((list) => list.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
              placeholder="Nombre del invitado"
              maxLength={60}
            />
            <select
              aria-label={`Socio que invita al invitado ${i + 1}`}
              value={g.hostPlayerId}
              onChange={(e) => setGuests((list) => list.map((x, j) => (j === i ? { ...x, hostPlayerId: e.target.value } : x)))}
            >
              <option value="">Sin socio</option>
              {selected.map((id) => <option key={id} value={id}>Invitado de {byId(id)?.fullName.split(' ')[0]}</option>)}
            </select>
            <button type="button" className="install-hint-close" aria-label="Quitar invitado" onClick={() => setGuests((list) => list.filter((_, j) => j !== i))}>×</button>
          </div>
        ))}
        {!full && (
          <button
            type="button"
            className="btn btn-ghost btn-small"
            onClick={() => setGuests((list) => [...list, { name: '', hostPlayerId: selected[0] ?? '' }])}
          >
            + Agregar invitado
          </button>
        )}
      </div>

      <label className="check">
        <input type="checkbox" checked={played} onChange={(e) => setPlayed(e.target.checked)} />
        Ya se jugó
      </label>
      {played && (
        <label className="check">
          <input type="checkbox" checked={lights} onChange={(e) => setLights(e.target.checked)} />
          Usaron luces
        </label>
      )}

      {error && <p className="error" role="alert">{error}</p>}
      {done && <p className="success" role="status">{done}</p>}
      <button type="submit" className="btn btn-primary" disabled={saving}>
        {saving ? 'Guardando…' : 'Guardar partido'}
      </button>
    </form>
  )
}
