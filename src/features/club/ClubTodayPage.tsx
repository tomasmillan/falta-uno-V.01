import { useCallback, useEffect, useState } from 'react'
import type { Match, Profile } from '../../types/domain'
import Spinner from '../../components/Spinner'
import { matchErrorMessage, subscribeToMatches } from '../matches/matchesApi'
import { formatTime } from '../matches/format'
import { localDateKey } from '../matches/dateTime'
import { closeMatch, fetchDayMatches } from './clubApi'
import { useCourts } from './useCourts'

const STATUS_LABEL = { pending: 'Sin cerrar', played: 'Se jugó', not_played: 'No se jugó' } as const

/** Day view for staff: who played, and close each match (played / lights) for billing. */
export default function ClubTodayPage({ profile }: { profile: Profile }) {
  const [day, setDay] = useState(localDateKey(new Date()))
  const [matches, setMatches] = useState<Match[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [lights, setLights] = useState<Record<string, boolean>>({})
  const [busyId, setBusyId] = useState<string | null>(null)
  const [editing, setEditing] = useState<Set<string>>(new Set())
  const { courts } = useCourts(profile.clubId, false)

  const load = useCallback(async () => {
    try {
      setMatches(await fetchDayMatches(profile.clubId, day))
      setError(null)
    } catch {
      setError('No pudimos cargar los partidos del día.')
    }
  }, [profile.clubId, day])

  useEffect(() => {
    setMatches(null)
    load()
    return subscribeToMatches(load)
  }, [load])

  // Suggest lights for evening matches on courts that have them.
  const suggestedLights = (m: Match) => {
    const court = courts.find((c) => c.id === m.courtId)
    return m.lightsUsed || (!!court?.hasLights && new Date(m.startsAt).getHours() >= 19)
  }

  const close = async (m: Match, played: boolean) => {
    setBusyId(m.id)
    setError(null)
    try {
      await closeMatch(m.id, played, lights[m.id] ?? suggestedLights(m))
      setEditing((s) => {
        const next = new Set(s)
        next.delete(m.id)
        return next
      })
      await load()
    } catch (e) {
      setError(matchErrorMessage(e))
    } finally {
      setBusyId(null)
    }
  }

  const pending = matches?.filter((m) => m.playedStatus === 'pending').length ?? 0

  return (
    <section className="stack">
      <div className="field">
        <label htmlFor="club-day">Día</label>
        <input id="club-day" type="date" value={day} onChange={(e) => e.target.value && setDay(e.target.value)} />
      </div>

      {matches && matches.length > 0 && (
        <p className="muted">
          {matches.length} partido{matches.length === 1 ? '' : 's'} · {pending === 0 ? 'todos cerrados' : `${pending} sin cerrar`}
        </p>
      )}
      {error && <p className="error card" role="alert">{error}</p>}
      {!matches && !error && <Spinner label="Cargando el día…" />}
      {matches?.length === 0 && (
        <div className="card empty-state">
          <h3>No hay partidos este día</h3>
          <p className="muted">Si alguien jugó sin anotarse, cargalo desde "Cargar partido".</p>
        </div>
      )}

      {matches?.map((m) => {
        const open = m.playedStatus === 'pending' || editing.has(m.id)
        const people = [
          ...m.players.map((p) => p.fullName),
          ...m.guests.map((g) => `${g.name} (invitado)`),
          ...Array.from({ length: Math.max(0, m.guestCount - m.guests.length) }, () => 'Invitado sin nombre'),
        ]
        return (
          <article key={m.id} className={`card stack-tight day-match is-${m.playedStatus}`}>
            <div className="detail-head">
              <div>
                <strong className="day-time">{formatTime(m.startsAt)}</strong>{' '}
                <span>{m.courtLabel ?? 'Sin cancha'}</span>
                {m.source === 'manual' && <span className="pill">Cargado a mano</span>}
              </div>
              <span className={`status-chip status-${m.playedStatus}`}>
                {STATUS_LABEL[m.playedStatus]}
                {m.playedStatus === 'played' && m.lightsUsed ? ' · con luz' : ''}
              </span>
            </div>
            <p className="muted day-people">{people.join(' · ') || 'Sin jugadores'}</p>

            {open ? (
              <>
                <label className="check">
                  <input
                    type="checkbox"
                    checked={lights[m.id] ?? suggestedLights(m)}
                    onChange={(e) => setLights((s) => ({ ...s, [m.id]: e.target.checked }))}
                  />
                  Usaron luces
                </label>
                <div className="btn-row">
                  <button type="button" className="btn btn-ghost btn-small" disabled={busyId === m.id} onClick={() => close(m, false)}>
                    No se jugó
                  </button>
                  <button type="button" className="btn btn-primary btn-small" disabled={busyId === m.id} onClick={() => close(m, true)}>
                    Se jugó
                  </button>
                </div>
              </>
            ) : (
              <button
                type="button"
                className="link-button"
                onClick={() => setEditing((s) => new Set(s).add(m.id))}
              >
                Corregir
              </button>
            )}
          </article>
        )
      })}
    </section>
  )
}
