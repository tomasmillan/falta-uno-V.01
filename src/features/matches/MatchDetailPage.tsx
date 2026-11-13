import { useCallback, useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import {
  CATEGORY_LABELS,
  categoryRangeLabel,
  isInCategoryRange,
  MATCH_SIZE,
  missingPlayers,
  type Match,
  type Profile,
} from '../../types/domain'
import Spinner from '../../components/Spinner'
import { MissingBadge } from './MatchCard'
import {
  cancelMatch,
  fetchContacts,
  fetchMatch,
  joinMatch,
  leaveMatch,
  matchErrorMessage,
  subscribeToMatches,
} from './matchesApi'
import { firstName, formatDay, formatDayInSentence, formatTime, initials, whatsappLink } from './format'

const SIDE_LABELS = { drive: 'Drive', backhand: 'Revés', either: 'Indistinto' } as const

function shareText(match: Match): string {
  const missing = missingPlayers(match)
  const head = missing === 1 ? 'Falta 1' : `Faltan ${missing}`
  return `🎾 ${head} para pádel ${formatDayInSentence(match.startsAt)} a las ${formatTime(match.startsAt)} – ${match.courtLabel} – ${categoryRangeLabel(match)}. Sumate acá: ${window.location.origin}/partidos/${match.id}`
}

export default function MatchDetailPage({ profile }: { profile: Profile }) {
  const { id = '' } = useParams()
  const [searchParams] = useSearchParams()
  const justCreated = searchParams.get('nuevo') === '1'
  const [match, setMatch] = useState<Match | null>(null)
  const [contacts, setContacts] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<'leave' | 'cancel' | null>(null)
  const [copied, setCopied] = useState(false)

  const load = useCallback(async () => {
    try {
      const m = await fetchMatch(id)
      setMatch(m)
      if (m && m.status === 'full') {
        setContacts(await fetchContacts(m.players.map((p) => p.id)))
      } else {
        setContacts({})
      }
    } catch {
      setError('No pudimos cargar el partido. Revisá tu conexión.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    load()
    return subscribeToMatches(load)
  }, [load])

  const run = async (action: () => Promise<void>) => {
    setBusy(true)
    setError(null)
    try {
      await action()
      setConfirm(null)
      await load()
    } catch (e) {
      setError(matchErrorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  const copyShare = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      setError('No pudimos copiar. Mantené apretado el texto para copiarlo.')
    }
  }

  if (loading) return <Spinner label="Cargando partido…" />
  if (!match) {
    return (
      <main className="card stack">
        <h2>No encontramos este partido</h2>
        <p className="muted">Puede que lo hayan borrado o que el link esté incompleto.</p>
        <Link to="/" className="btn btn-primary">Ver partidos</Link>
      </main>
    )
  }

  const imIn = match.players.some((p) => p.id === profile.id)
  const imCreator = match.createdBy === profile.id
  const missing = missingPlayers(match)
  const isFull = match.status === 'full'
  const isCancelled = match.status === 'cancelled'
  const hasStarted = new Date(match.startsAt).getTime() < Date.now()
  const outOfRange = !isInCategoryRange(profile.category, match)
  const text = !isFull && !isCancelled ? shareText(match) : ''

  return (
    <main className="stack">
      <Link to="/" className="back-link">← Partidos</Link>

      <section className="card stack">
        <div className="detail-head">
          <div>
            <h2>{formatDay(match.startsAt)} · {formatTime(match.startsAt)}</h2>
            <p className="muted">
              {match.courtLabel} · {categoryRangeLabel(match)} · {match.type === 'competitive' ? 'Competitivo' : 'Amistoso'}
            </p>
          </div>
          <MissingBadge match={match} />
        </div>

        {justCreated && !isFull && (
          <p className="notice notice-ok">¡Partido publicado! Compartilo para que se sumen más rápido.</p>
        )}
        {isCancelled && <p className="notice">Este partido fue cancelado.</p>}
      </section>

      <section className="card stack">
        <div className="detail-head">
          <h3>Jugadores</h3>
          <span className="muted">{MATCH_SIZE - missing}/{MATCH_SIZE}</span>
        </div>
        <ul className="player-list">
          {match.players.map((p) => (
            <li key={p.id} className="player-row">
              <span className={`dot dot-lg ${p.id === profile.id ? 'dot-me' : ''}`}>{initials(p.fullName)}</span>
              <div className="player-info">
                <strong>{p.fullName}</strong>
                <span className="muted">
                  {CATEGORY_LABELS[p.category]} · {SIDE_LABELS[p.preferredSide]}
                  {p.id === match.createdBy && ' · armó el partido'}
                </span>
              </div>
              {isFull && imIn && p.id !== profile.id && contacts[p.id] && (
                <a className="btn btn-small btn-ghost" href={whatsappLink(contacts[p.id])} target="_blank" rel="noreferrer">
                  WhatsApp
                </a>
              )}
            </li>
          ))}
          {Array.from({ length: match.guestCount }, (_, i) => (
            <li key={`g${i}`} className="player-row">
              <span className="dot dot-lg dot-guest">+</span>
              <div className="player-info">
                <strong>Invitado</strong>
                <span className="muted">Confirmado, no usa la app</span>
              </div>
            </li>
          ))}
          {Array.from({ length: missing }, (_, i) => (
            <li key={`e${i}`} className="player-row">
              <span className="dot dot-lg dot-empty" aria-hidden="true" />
              <span className="muted">Lugar libre</span>
            </li>
          ))}
        </ul>
        {isFull && imIn && (
          <p className="hint">Ya están los cuatro: coordinen por WhatsApp y reserven la cancha.</p>
        )}
        {!isFull && imIn && !isCancelled && (
          <p className="hint">Cuando estén los cuatro vas a ver el WhatsApp de cada uno.</p>
        )}
      </section>

      {error && <p className="error card" role="alert">{error}</p>}

      {!isCancelled && !hasStarted && (
        <section className="stack">
          {!imIn && !isFull && (
            <>
              {outOfRange && (
                <p className="notice">
                  Este partido es de {categoryRangeLabel(match)} y vos sos {CATEGORY_LABELS[profile.category]}.
                  Podés sumarte igual, pero avisale a {firstName(match.players.find((p) => p.id === match.createdBy)?.fullName ?? 'quien lo armó')}.
                </p>
              )}
              <button type="button" className="btn btn-primary" disabled={busy} onClick={() => run(() => joinMatch(match.id))}>
                {busy ? 'Sumándote…' : 'Sumarme'}
              </button>
            </>
          )}

          {text && (
            <div className="card stack">
              <h3>Compartir</h3>
              <p className="share-text">{text}</p>
              <div className="btn-row">
                <button type="button" className="btn btn-ghost" onClick={() => copyShare(text)}>
                  {copied ? 'Copiado' : 'Copiar texto'}
                </button>
                <a className="btn btn-whatsapp" href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer">
                  Enviar por WhatsApp
                </a>
              </div>
            </div>
          )}

          {imIn && !imCreator && (
            confirm === 'leave' ? (
              <div className="card stack">
                <p>¿Seguro que te bajás? Tu lugar queda libre para otro.</p>
                <div className="btn-row">
                  <button type="button" className="btn btn-ghost" onClick={() => setConfirm(null)}>Me quedo</button>
                  <button type="button" className="btn btn-danger" disabled={busy} onClick={() => run(() => leaveMatch(match.id))}>
                    Sí, bajarme
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" className="btn btn-ghost" onClick={() => setConfirm('leave')}>Bajarme del partido</button>
            )
          )}

          {imCreator && (
            confirm === 'cancel' ? (
              <div className="card stack">
                <p>¿Cancelar el partido? Los anotados lo van a ver como cancelado.</p>
                <div className="btn-row">
                  <button type="button" className="btn btn-ghost" onClick={() => setConfirm(null)}>Volver</button>
                  <button type="button" className="btn btn-danger" disabled={busy} onClick={() => run(() => cancelMatch(match.id))}>
                    Cancelar partido
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" className="btn btn-ghost" onClick={() => setConfirm('cancel')}>Cancelar mi partido</button>
            )
          )}
        </section>
      )}
    </main>
  )
}
