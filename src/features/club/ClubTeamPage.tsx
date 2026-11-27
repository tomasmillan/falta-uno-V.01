import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ClubRole, Profile } from '../../types/domain'
import Spinner from '../../components/Spinner'
import { matchErrorMessage } from '../matches/matchesApi'
import { fetchClubPlayers, setClubRole, type ClubPlayer } from './clubApi'

const ROLE_LABEL = { none: 'Jugador', staff: 'Canchero', admin: 'Administrador' } as const

/** Admin: who can use the club panel. */
export default function ClubTeamPage({ profile }: { profile: Profile }) {
  const [players, setPlayers] = useState<ClubPlayer[] | null>(null)
  const [search, setSearch] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setPlayers(await fetchClubPlayers(profile.clubId))
    } catch {
      setError('No pudimos cargar los socios.')
    }
  }, [profile.clubId])

  useEffect(() => {
    load()
  }, [load])

  const change = async (id: string, value: string) => {
    setBusyId(id)
    setError(null)
    try {
      await setClubRole(id, value === 'none' ? null : (value as ClubRole))
      await load()
    } catch (e) {
      setError(matchErrorMessage(e))
    } finally {
      setBusyId(null)
    }
  }

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    const list = (players ?? []).filter((p) => !q || p.fullName.toLowerCase().includes(q) || (p.unitLabel ?? '').toLowerCase().includes(q))
    // Staff first
    return list.sort((a, b) => Number(!!b.role) - Number(!!a.role) || a.fullName.localeCompare(b.fullName))
  }, [players, search])

  if (!players && !error) return <Spinner label="Cargando socios…" />

  return (
    <section className="stack">
      <p className="hint">Los cancheros pueden cerrar el día, cargar partidos y ver el reporte. Los administradores además manejan canchas y equipo.</p>
      <div className="field">
        <label htmlFor="team-search">Buscar socio</label>
        <input id="team-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nombre o lote" />
      </div>
      {error && <p className="error card" role="alert">{error}</p>}
      <ul className="card court-list">
        {visible.map((p) => (
          <li key={p.id}>
            <div>
              <strong>{p.fullName}</strong>
              <span className="muted">{p.unitLabel ?? 'Sin lote'}</span>
            </div>
            <select
              aria-label={`Rol de ${p.fullName}`}
              value={p.role ?? 'none'}
              disabled={busyId === p.id || p.id === profile.id}
              onChange={(e) => change(p.id, e.target.value)}
            >
              {(['none', 'staff', 'admin'] as const).map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
            </select>
          </li>
        ))}
      </ul>
    </section>
  )
}
