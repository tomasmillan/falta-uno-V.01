import { useCallback, useEffect, useState } from 'react'
import { CATEGORY_LABELS, type InvitationStatus, type Match, type Teammate } from '../../types/domain'
import { matchErrorMessage } from '../matches/matchesApi'
import { firstName, formatDayInSentence, formatTime } from '../matches/format'
import { fetchMatchInvitations, fetchTeammates, inviteToMatch, subscribeToInvitations } from './invitationsApi'

function inviteText(match: Match): string {
  return `🎾 Te invité a un partido de pádel ${formatDayInSentence(match.startsAt)} a las ${formatTime(match.startsAt)}. Entrá a Falta Uno para sumarte: ${window.location.origin}/invitaciones`
}

/** Invite past teammates to a match. Shown to players of an open match. */
export default function InvitePlayers({ match }: { match: Match }) {
  const [open, setOpen] = useState(false)
  const [teammates, setTeammates] = useState<Teammate[] | null>(null)
  const [statuses, setStatuses] = useState<Record<string, InvitationStatus>>({})
  const [busyId, setBusyId] = useState<string | null>(null)
  const [justInvited, setJustInvited] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const [list, invites] = await Promise.all([fetchTeammates(), fetchMatchInvitations(match.id)])
      setTeammates(list)
      setStatuses(invites)
    } catch {
      setError('No pudimos cargar tus compañeros. Revisá tu conexión.')
    }
  }, [match.id])

  useEffect(() => {
    if (!open) return
    load()
    return subscribeToInvitations(load)
  }, [open, load])

  const invite = async (player: Teammate) => {
    setBusyId(player.id)
    setError(null)
    try {
      await inviteToMatch(match.id, player.id)
      setStatuses((s) => ({ ...s, [player.id]: 'pending' }))
      setJustInvited(player.fullName)
    } catch (e) {
      setError(matchErrorMessage(e))
    } finally {
      setBusyId(null)
    }
  }

  if (!open) {
    return (
      <button type="button" className="btn btn-ghost" onClick={() => setOpen(true)}>
        Invitar jugadores
      </button>
    )
  }

  const inMatch = new Set(match.players.map((p) => p.id))

  return (
    <section className="card stack">
      <div className="detail-head">
        <h3>Invitar jugadores</h3>
        <button type="button" className="install-hint-close" onClick={() => setOpen(false)} aria-label="Cerrar">×</button>
      </div>
      <p className="hint">Jugadores con los que ya compartiste un partido. Les aparece la invitación en la app.</p>

      {teammates === null && !error && <p className="muted">Cargando…</p>}
      {error && <p className="error" role="alert">{error}</p>}

      {teammates?.length === 0 && (
        <p className="muted">Todavía no jugaste con nadie en la app. Compartí el partido por WhatsApp para que se sumen.</p>
      )}

      {teammates && teammates.length > 0 && (
        <ul className="player-list">
          {teammates.map((t) => {
            const status = inMatch.has(t.id) ? 'in' : statuses[t.id]
            return (
              <li key={t.id} className="player-row">
                <span className="dot dot-lg">{t.fullName.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('')}</span>
                <div className="player-info">
                  <strong>{t.fullName}</strong>
                  <span className="muted">
                    {CATEGORY_LABELS[t.category]} · {t.matchesTogether === 1 ? '1 partido juntos' : `${t.matchesTogether} partidos juntos`}
                  </span>
                </div>
                {status === 'in' ? (
                  <span className="pill">Ya está</span>
                ) : status === 'pending' ? (
                  <span className="pill">Invitado</span>
                ) : status === 'accepted' ? (
                  <span className="pill">Aceptó</span>
                ) : (
                  <button
                    type="button"
                    className="btn btn-small btn-primary"
                    disabled={busyId === t.id}
                    onClick={() => invite(t)}
                  >
                    {status === 'declined' ? 'Reinvitar' : 'Invitar'}
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {justInvited && (
        <div className="notice notice-ok stack-tight" role="status">
          <span>Listo, invitaste a {firstName(justInvited)}. ¿Le avisás por WhatsApp para que lo vea antes?</span>
          <a
            className="btn btn-small btn-whatsapp"
            href={`https://wa.me/?text=${encodeURIComponent(inviteText(match))}`}
            target="_blank"
            rel="noreferrer"
          >
            Avisar por WhatsApp
          </a>
        </div>
      )}
    </section>
  )
}
