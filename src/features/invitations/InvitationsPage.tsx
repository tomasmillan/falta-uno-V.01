import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { Invitation, Profile } from '../../types/domain'
import { missingPlayers } from '../../types/domain'
import Spinner from '../../components/Spinner'
import MatchCard from '../matches/MatchCard'
import { matchErrorMessage } from '../matches/matchesApi'
import { firstName } from '../matches/format'
import { respondInvitation } from './invitationsApi'

interface Props {
  profile: Profile
  invitations: Invitation[]
  loading: boolean
  error: string | null
  onChange: () => void
}

export default function InvitationsPage({ profile, invitations, loading, error, onChange }: Props) {
  const navigate = useNavigate()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const respond = async (invitation: Invitation, accept: boolean) => {
    setBusyId(invitation.id)
    setActionError(null)
    try {
      await respondInvitation(invitation.id, accept)
      onChange()
      if (accept) navigate(`/partidos/${invitation.match.id}`)
    } catch (e) {
      setActionError(matchErrorMessage(e))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <main className="stack">
      <Link to="/" className="back-link">← Partidos</Link>
      <h2>Te invitaron</h2>

      {loading && <Spinner label="Buscando invitaciones…" />}
      {error && <p className="error card" role="alert">{error}</p>}
      {actionError && <p className="error card" role="alert">{actionError}</p>}

      {!loading && !error && invitations.length === 0 && (
        <div className="card empty-state">
          <h3>No tenés invitaciones</h3>
          <p className="muted">Cuando alguien con quien jugaste te invite a un partido, lo vas a ver acá.</p>
          <Link to="/" className="btn btn-primary">Ver partidos</Link>
        </div>
      )}

      {invitations.map((inv) => {
        const closed = inv.match.status !== 'open' || missingPlayers(inv.match) === 0
        return (
          <section key={inv.id} className="card stack invitation">
            <p className="invitation-from">
              <strong>{firstName(inv.inviterName)}</strong> te invitó a jugar
            </p>
            <MatchCard match={inv.match} currentUserId={profile.id} />
            {closed ? (
              <p className="notice">
                {inv.match.status === 'cancelled' ? 'Este partido se canceló.' : 'Este partido ya se completó.'}
              </p>
            ) : (
              <div className="btn-row">
                <button type="button" className="btn btn-ghost" disabled={busyId === inv.id} onClick={() => respond(inv, false)}>
                  No puedo
                </button>
                <button type="button" className="btn btn-primary" disabled={busyId === inv.id} onClick={() => respond(inv, true)}>
                  {busyId === inv.id ? 'Sumándote…' : 'Sumarme'}
                </button>
              </div>
            )}
          </section>
        )
      })}
    </main>
  )
}
