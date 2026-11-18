import { useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  CATEGORY_LABELS,
  categoryRangeLabel,
  MATCH_SLOTS,
  missingPlayers,
  type Category,
  type MatchType,
  type Profile,
} from '../../types/domain'
import { createMatch, matchErrorMessage } from './matchesApi'
import { formatDay, formatDayInSentence, formatTime } from './format'
import { combineDateTime, localDateKey, nextDays } from './dateTime'
import { useMatches } from './useMatches'
import CourtField from './CourtField'

const CATEGORIES = (Object.keys(CATEGORY_LABELS).map(Number) as Category[]).sort((a, b) => b - a)

/** First slot today that hasn't started yet, or the evening default. */
function defaultSlot(day: string): string {
  if (day !== localDateKey(new Date())) return '18:30'
  return MATCH_SLOTS.find((t) => combineDateTime(day, t).getTime() > Date.now()) ?? MATCH_SLOTS[MATCH_SLOTS.length - 1]
}

export default function CreateMatchPage({ profile }: { profile: Profile }) {
  const navigate = useNavigate()
  const { matches } = useMatches()
  const days = useMemo(() => nextDays(14), [])
  const [day, setDay] = useState(days[0])
  const [time, setTime] = useState(() => defaultSlot(days[0]))
  const [hasCourt, setHasCourt] = useState(false)
  const [courtLabel, setCourtLabel] = useState('')
  const [catA, setCatA] = useState<Category>(profile.category)
  const [catB, setCatB] = useState<Category>(profile.category)
  const [type, setType] = useState<MatchType>('friendly')
  const [missing, setMissing] = useState(3)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ignoreDuplicate, setIgnoreDuplicate] = useState(false)

  const categoryMax = Math.min(catA, catB) as Category
  const categoryMin = Math.max(catA, catB) as Category
  const includesMe = profile.category >= categoryMax && profile.category <= categoryMin
  const startsAt = combineDateTime(day, time)
  const slotPassed = startsAt.getTime() < Date.now()

  const sameSlot = matches.filter(
    (m) => m.status !== 'cancelled' && new Date(m.startsAt).getTime() === startsAt.getTime(),
  )
  // The player can't be in two matches at the same time (also enforced by the database).
  const myConflict = sameSlot.find((m) => m.players.some((p) => p.id === profile.id))
  // A court can hold one match per slot (also enforced by the database).
  const normalizedCourt = courtLabel.trim().toLowerCase()
  const courtTaken =
    hasCourt && normalizedCourt !== '' && sameSlot.some((m) => m.courtLabel?.trim().toLowerCase() === normalizedCourt)

  // An open match at the same time whose category range overlaps: better to join it than split players.
  const duplicate = myConflict ? undefined : matches.find(
    (m) =>
      m.status === 'open' &&
      missingPlayers(m) > 0 &&
      new Date(m.startsAt).getTime() === startsAt.getTime() &&
      m.categoryMax <= categoryMin &&
      m.categoryMin >= categoryMax,
  )

  const handleDayChange = (value: string) => {
    setDay(value)
    if (combineDateTime(value, time).getTime() < Date.now()) setTime(defaultSlot(value))
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (slotPassed) {
      setError('Ese turno ya pasó. Elegí uno más tarde.')
      return
    }
    if (hasCourt && !courtLabel.trim()) {
      setError('Escribí qué cancha tenés o elegí "A definir".')
      return
    }
    if (myConflict || courtTaken) return
    if (duplicate && !ignoreDuplicate) return
    setSaving(true)
    setError(null)
    try {
      const id = await createMatch({
        startsAt,
        courtLabel: hasCourt ? courtLabel : null,
        categoryMax,
        categoryMin,
        type,
        guestCount: 3 - missing,
      })
      navigate(`/partidos/${id}?nuevo=1`, { replace: true })
    } catch (e) {
      setError(matchErrorMessage(e))
      setSaving(false)
    }
  }

  return (
    <main className="stack">
      <Link to="/" className="back-link">← Volver</Link>
      <form className="card stack" onSubmit={handleSubmit} noValidate>
        <h2>Crear partido</h2>

        <div className="grid-2">
          <div className="field">
            <label htmlFor="match-day">Día</label>
            <select id="match-day" value={day} onChange={(e) => handleDayChange(e.target.value)}>
              {days.map((d) => (
                <option key={d} value={d}>{formatDay(`${d}T12:00:00`)}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="match-time">Turno</label>
            <select id="match-time" value={time} onChange={(e) => setTime(e.target.value)}>
              {MATCH_SLOTS.map((t) => (
                <option key={t} value={t} disabled={combineDateTime(day, t).getTime() < Date.now()}>{t}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid-2">
          <div className="field">
            <label htmlFor="match-cat-a">Categoría desde</label>
            <select id="match-cat-a" value={catA} onChange={(e) => setCatA(Number(e.target.value) as Category)}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="match-cat-b">hasta</label>
            <select id="match-cat-b" value={catB} onChange={(e) => setCatB(Number(e.target.value) as Category)}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
            </select>
          </div>
        </div>
        {!includesMe && (
          <p className="notice">Ojo: vos sos {CATEGORY_LABELS[profile.category]} y no entrás en ese rango.</p>
        )}

        <fieldset className="field">
          <legend>¿Cuántos faltan?</legend>
          <div className="segmented">
            {[1, 2, 3].map((n) => (
              <label key={n} className={missing === n ? 'is-selected' : ''}>
                <input type="radio" name="match-missing" checked={missing === n} onChange={() => setMissing(n)} />
                {n === 1 ? 'Falta 1' : `Faltan ${n}`}
              </label>
            ))}
          </div>
          <span className="hint">
            {missing === 3
              ? 'Solo vos estás confirmado.'
              : `Vos y ${3 - missing} amigo${3 - missing === 1 ? '' : 's'} ya ocupan lugar.`}
          </span>
        </fieldset>

        <CourtField
          idPrefix="create"
          hasCourt={hasCourt}
          courtLabel={courtLabel}
          onHasCourtChange={setHasCourt}
          onCourtLabelChange={setCourtLabel}
        />
        {courtTaken && (
          <p className="error" role="alert">Esa cancha ya está ocupada en ese turno. Elegí otra o dejala "A definir".</p>
        )}

        <fieldset className="field">
          <legend>Tipo</legend>
          <div className="segmented">
            {(['friendly', 'competitive'] as MatchType[]).map((t) => (
              <label key={t} className={type === t ? 'is-selected' : ''}>
                <input type="radio" name="match-type" checked={type === t} onChange={() => setType(t)} />
                {t === 'friendly' ? 'Amistoso' : 'Competitivo'}
              </label>
            ))}
          </div>
        </fieldset>

        {myConflict && (
          <div className="notice stack-tight" role="status">
            <strong>Ya estás anotado a esa hora</strong>
            <span>
              Tenés un partido {formatDayInSentence(myConflict.startsAt)} a las {formatTime(myConflict.startsAt)}. Elegí otro turno.
            </span>
            <div className="btn-row">
              <Link to={`/partidos/${myConflict.id}`} className="btn btn-ghost btn-small">Ver mi partido</Link>
            </div>
          </div>
        )}

        {duplicate && !ignoreDuplicate && (
          <div className="notice stack-tight" role="status">
            <strong>Ya hay un partido parecido</strong>
            <span>
              {formatDay(duplicate.startsAt)} a las {formatTime(duplicate.startsAt)}, {categoryRangeLabel(duplicate)},{' '}
              {missingPlayers(duplicate) === 1 ? 'le falta 1' : `le faltan ${missingPlayers(duplicate)}`}. ¿Te sumás a ese?
            </span>
            <div className="btn-row">
              <Link to={`/partidos/${duplicate.id}`} className="btn btn-primary btn-small">Ver ese partido</Link>
              <button type="button" className="btn btn-ghost btn-small" onClick={() => setIgnoreDuplicate(true)}>
                Crear el mío igual
              </button>
            </div>
          </div>
        )}

        {error && <p className="error" role="alert">{error}</p>}
        <button type="submit" className="btn btn-primary" disabled={saving || !!myConflict || courtTaken || (!!duplicate && !ignoreDuplicate)}>
          {saving ? 'Publicando…' : 'Publicar partido'}
        </button>
      </form>
    </main>
  )
}
