import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CATEGORY_LABELS, isInCategoryRange, missingPlayers, type Profile } from '../../types/domain'
import Spinner from '../../components/Spinner'
import MatchCard from './MatchCard'
import { formatDay } from './format'
import { useMatches } from './useMatches'

type Filter = 'all' | 'mine' | 'open'

export default function MatchListPage({ profile }: { profile: Profile }) {
  const { matches, loading, error } = useMatches()
  const [filter, setFilter] = useState<Filter>('open')

  const visible = matches
    .filter((m) => m.status !== 'cancelled' || m.players.some((p) => p.id === profile.id))
    .filter((m) => {
      if (filter === 'mine') return isInCategoryRange(profile.category, m)
      if (filter === 'open') return m.status === 'open' && missingPlayers(m) > 0
      return true
    })

  const filters: { key: Filter; label: string }[] = [
    { key: 'open', label: 'Con lugar' },
    { key: 'mine', label: `Mi categoría (${CATEGORY_LABELS[profile.category]})` },
    { key: 'all', label: 'Todos' },
  ]

  let lastDay = ''
  return (
    <main className="stack">
      <h2>Partidos</h2>
      <div className="chips" role="group" aria-label="Filtrar partidos">
        {filters.map((f) => (
          <button
            key={f.key}
            type="button"
            className={`chip ${filter === f.key ? 'is-selected' : ''}`}
            aria-pressed={filter === f.key}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading && <Spinner label="Buscando partidos…" />}
      {error && <p className="error card" role="alert">{error}</p>}

      {!loading && !error && visible.length === 0 && (
        <div className="card empty-state">
          <h3>No hay partidos {filter === 'open' ? 'con lugar' : 'acá'} por ahora</h3>
          <p className="muted">¿Armás uno? Publicalo y que se sumen los que faltan.</p>
          <Link to="/partidos/nuevo" className="btn btn-primary">+ Crear partido</Link>
        </div>
      )}

      <div className="match-list">
        {visible.map((m) => {
          const day = formatDay(m.startsAt)
          const header = day !== lastDay ? <h3 className="day-header">{day}</h3> : null
          lastDay = day
          return (
            <div key={m.id} className="stack-tight">
              {header}
              <MatchCard match={m} currentUserId={profile.id} />
            </div>
          )
        })}
      </div>

      <Link to="/partidos/nuevo" className="fab">+ Crear partido</Link>
    </main>
  )
}
