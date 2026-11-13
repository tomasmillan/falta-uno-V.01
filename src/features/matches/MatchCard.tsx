import { Link } from 'react-router-dom'
import { categoryRangeLabel, MATCH_SIZE, missingPlayers, type Match } from '../../types/domain'
import { firstName, formatDay, formatTime, initials } from './format'

export function MissingBadge({ match }: { match: Match }) {
  if (match.status === 'cancelled') return <span className="badge badge-cancelled">Cancelado</span>
  const missing = missingPlayers(match)
  if (missing === 0) return <span className="badge badge-full">Completo</span>
  return <span className="badge">{missing === 1 ? 'Falta 1' : `Faltan ${missing}`}</span>
}

export function PlayerDots({ match, currentUserId }: { match: Match; currentUserId: string }) {
  const empty = Math.max(0, MATCH_SIZE - match.players.length - match.guestCount)
  return (
    <div className="dots" aria-label={`${MATCH_SIZE - empty} de ${MATCH_SIZE} jugadores`}>
      {match.players.map((p) => (
        <span key={p.id} className={`dot ${p.id === currentUserId ? 'dot-me' : ''}`} title={p.fullName}>
          {initials(p.fullName)}
        </span>
      ))}
      {Array.from({ length: match.guestCount }, (_, i) => (
        <span key={`g${i}`} className="dot dot-guest" title="Invitado">+</span>
      ))}
      {Array.from({ length: empty }, (_, i) => (
        <span key={`e${i}`} className="dot dot-empty" aria-hidden="true" />
      ))}
    </div>
  )
}

export default function MatchCard({ match, currentUserId }: { match: Match; currentUserId: string }) {
  const creator = match.players.find((p) => p.id === match.createdBy)
  const imIn = match.players.some((p) => p.id === currentUserId)
  return (
    <Link to={`/partidos/${match.id}`} className="match-card">
      <div className="match-time">
        <strong>{formatTime(match.startsAt)}</strong>
        <span>{formatDay(match.startsAt)}</span>
      </div>
      <div className="match-body">
        <span className="match-title">{match.courtLabel} · {categoryRangeLabel(match)}</span>
        <span className="match-meta">
          {match.type === 'competitive' ? 'Competitivo' : 'Amistoso'}
          {creator && ` · armado por ${firstName(creator.fullName)}`}
        </span>
        <div className="match-row">
          <PlayerDots match={match} currentUserId={currentUserId} />
          {imIn && <span className="pill">Estás anotado</span>}
        </div>
      </div>
      <MissingBadge match={match} />
    </Link>
  )
}
