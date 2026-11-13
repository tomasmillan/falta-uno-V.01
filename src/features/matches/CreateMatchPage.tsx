import { useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CATEGORY_LABELS, type Category, type MatchType, type Profile } from '../../types/domain'
import { createMatch, matchErrorMessage } from './matchesApi'
import { formatDay } from './format'

const CATEGORIES = (Object.keys(CATEGORY_LABELS).map(Number) as Category[]).sort((a, b) => b - a)
const TIMES = Array.from({ length: 33 }, (_, i) => {
  const minutes = 7 * 60 + i * 30 // 07:00 … 23:00
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
})
const COURT_SUGGESTIONS = ['Cancha 1', 'Cancha 2', 'Cancha 3']

const localDateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export default function CreateMatchPage({ profile }: { profile: Profile }) {
  const navigate = useNavigate()
  const days = useMemo(
    () => Array.from({ length: 14 }, (_, i) => localDateKey(new Date(Date.now() + i * 86400000))),
    [],
  )
  const [day, setDay] = useState(days[0])
  const [time, setTime] = useState('18:30')
  const [courtLabel, setCourtLabel] = useState('Cancha 1')
  const [catA, setCatA] = useState<Category>(profile.category)
  const [catB, setCatB] = useState<Category>(profile.category)
  const [type, setType] = useState<MatchType>('friendly')
  const [missing, setMissing] = useState(3)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const categoryMax = Math.min(catA, catB) as Category
  const categoryMin = Math.max(catA, catB) as Category
  const includesMe = profile.category >= categoryMax && profile.category <= categoryMin

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const [y, m, d] = day.split('-').map(Number)
    const [hh, mm] = time.split(':').map(Number)
    const startsAt = new Date(y, m - 1, d, hh, mm)
    if (startsAt.getTime() < Date.now()) {
      setError('Ese horario ya pasó. Elegí uno más tarde.')
      return
    }
    if (!courtLabel.trim()) {
      setError('Indicá en qué cancha se juega.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const id = await createMatch({
        startsAt,
        courtLabel,
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
            <select id="match-day" value={day} onChange={(e) => setDay(e.target.value)}>
              {days.map((d) => (
                <option key={d} value={d}>{formatDay(`${d}T12:00:00`)}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="match-time">Hora</label>
            <select id="match-time" value={time} onChange={(e) => setTime(e.target.value)}>
              {TIMES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <div className="field">
          <label htmlFor="match-court">Cancha</label>
          <input
            id="match-court"
            list="court-suggestions"
            value={courtLabel}
            onChange={(e) => setCourtLabel(e.target.value)}
            maxLength={40}
          />
          <datalist id="court-suggestions">
            {COURT_SUGGESTIONS.map((c) => <option key={c} value={c} />)}
          </datalist>
          <span className="hint">Reservala como siempre (por ejemplo, en OpenKey) cuando estén los cuatro.</span>
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

        {error && <p className="error" role="alert">{error}</p>}
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Publicando…' : 'Publicar partido'}
        </button>
      </form>
    </main>
  )
}
