import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import type { ClubRole, Profile } from '../../types/domain'
import ClubTodayPage from './ClubTodayPage'
import ClubManualMatchPage from './ClubManualMatchPage'
import ClubReportPage from './ClubReportPage'
import ClubCourtsPage from './ClubCourtsPage'
import ClubTeamPage from './ClubTeamPage'

/** Staff area. Every action is also checked by the database. */
export default function ClubLayout({ profile, role }: { profile: Profile; role: ClubRole }) {
  const tabs = [
    { to: '/club', label: 'Hoy', end: true },
    { to: '/club/cargar', label: 'Cargar partido' },
    { to: '/club/reporte', label: 'Reporte' },
    ...(role === 'admin'
      ? [
          { to: '/club/canchas', label: 'Canchas' },
          { to: '/club/equipo', label: 'Equipo' },
        ]
      : []),
  ]
  return (
    <main className="stack">
      <div className="club-head">
        <h2>Panel del club</h2>
        <span className="pill">{role === 'admin' ? 'Administrador' : 'Canchero'}</span>
      </div>
      <nav className="chips" aria-label="Secciones del club">
        {tabs.map((t) => (
          <NavLink key={t.to} to={t.to} end={t.end} className={({ isActive }) => `chip ${isActive ? 'is-selected' : ''}`}>
            {t.label}
          </NavLink>
        ))}
      </nav>
      <Routes>
        <Route index element={<ClubTodayPage profile={profile} />} />
        <Route path="cargar" element={<ClubManualMatchPage profile={profile} />} />
        <Route path="reporte" element={<ClubReportPage />} />
        {role === 'admin' && <Route path="canchas" element={<ClubCourtsPage profile={profile} />} />}
        {role === 'admin' && <Route path="equipo" element={<ClubTeamPage profile={profile} />} />}
        <Route path="*" element={<Navigate to="/club" replace />} />
      </Routes>
    </main>
  )
}
