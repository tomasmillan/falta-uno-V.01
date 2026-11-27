import { useMemo, useState, type FormEvent } from 'react'
import { MATCH_SLOTS, type Match } from '../../types/domain'
import { matchErrorMessage, updateMatch } from './matchesApi'
import { formatDay } from './format'
import { combineDateTime, localDateKey, localTimeKey, nextDays } from './dateTime'
import CourtField from './CourtField'
import { useCourts } from '../club/useCourts'

interface Props {
  match: Match
  onDone: () => void
  onCancel: () => void
}

/** Creator-only form to change the day, slot and court of a match. */
export default function EditMatchForm({ match, onDone, onCancel }: Props) {
  const start = useMemo(() => new Date(match.startsAt), [match.startsAt])
  const days = useMemo(() => {
    const list = nextDays(14)
    const current = localDateKey(start)
    return list.includes(current) ? list : [current, ...list]
  }, [start])
  const currentTime = localTimeKey(start)
  const slots = MATCH_SLOTS.includes(currentTime) ? MATCH_SLOTS : [...MATCH_SLOTS, currentTime].sort()

  const [day, setDay] = useState(localDateKey(start))
  const [time, setTime] = useState(currentTime)
  const { courts } = useCourts(match.clubId)
  const [courtId, setCourtId] = useState<string | null>(match.courtId)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const startsAt = combineDateTime(day, time)
    if (startsAt.getTime() < Date.now()) {
      setError('Ese turno ya pasó. Elegí uno más tarde.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await updateMatch(match.id, startsAt, courtId)
      onDone()
    } catch (e) {
      setError(matchErrorMessage(e))
      setSaving(false)
    }
  }

  return (
    <form className="card stack" onSubmit={handleSubmit} noValidate>
      <h3>Editar partido</h3>
      <div className="grid-2">
        <div className="field">
          <label htmlFor="edit-day">Día</label>
          <select id="edit-day" value={day} onChange={(e) => setDay(e.target.value)}>
            {days.map((d) => <option key={d} value={d}>{formatDay(`${d}T12:00:00`)}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="edit-time">Turno</label>
          <select id="edit-time" value={time} onChange={(e) => setTime(e.target.value)}>
            {slots.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>
      <CourtField idPrefix="edit" courts={courts} courtId={courtId} onChange={setCourtId} />
      {error && <p className="error" role="alert">{error}</p>}
      <div className="btn-row">
        <button type="button" className="btn btn-ghost" onClick={onCancel}>Volver</button>
        <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</button>
      </div>
    </form>
  )
}
