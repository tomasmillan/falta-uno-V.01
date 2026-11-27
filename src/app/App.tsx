import type { ReactNode } from 'react'
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { isSupabaseConfigured } from '../lib/supabase'
import { useAuth } from '../features/auth/useAuth'
import LoginPage from '../features/auth/LoginPage'
import OnboardingPage from '../features/profile/OnboardingPage'
import ProfilePage from '../features/profile/ProfilePage'
import { useProfile } from '../features/profile/useProfile'
import { CATEGORY_LABELS, type Profile } from '../types/domain'
import Spinner from '../components/Spinner'
import InvitationsPage from '../features/invitations/InvitationsPage'
import { useInvitations } from '../features/invitations/useInvitations'
import MatchListPage from '../features/matches/MatchListPage'
import CreateMatchPage from '../features/matches/CreateMatchPage'
import MatchDetailPage from '../features/matches/MatchDetailPage'
import PrivacyPage from '../features/legal/PrivacyPage'
import TermsPage from '../features/legal/TermsPage'
import ClubLayout from '../features/club/ClubLayout'
import { useClubRole } from '../features/club/useClubRole'

const PUBLIC_PATHS = ['/privacidad', '/terminos']

export default function App() {
  const { session, loading: authLoading, signOut } = useAuth()
  const { profile, setProfile, loading: profileLoading, error } = useProfile(session?.user.id)

  const { pathname } = useLocation()
  const invitationsState = useInvitations(profile ? session?.user.id : undefined)
  const clubRole = useClubRole(!!profile)

  let content: ReactNode
  if (PUBLIC_PATHS.includes(pathname)) {
    content = (
      <Routes>
        <Route path="/privacidad" element={<PrivacyPage />} />
        <Route path="/terminos" element={<TermsPage />} />
      </Routes>
    )
  } else if (!isSupabaseConfigured) {
    content = (
      <div className="card" role="status">
        <strong>Falta configurar Supabase.</strong>
        <p className="muted">
          Copiá <code>.env.example</code> a <code>.env.local</code> y completá las claves del proyecto.
        </p>
      </div>
    )
  } else if (authLoading) {
    content = <Spinner />
  } else if (!session) {
    content = <LoginPage />
  } else if (profileLoading) {
    content = <Spinner label="Cargando tu perfil…" />
  } else if (error) {
    content = <p className="error card" role="alert">{error}</p>
  } else if (!profile) {
    content = <OnboardingPage session={session} onDone={setProfile} />
  } else {
    content = (
      <Routes>
        <Route path="/" element={<MatchListPage profile={profile} />} />
        <Route path="/partidos/nuevo" element={<CreateMatchPage profile={profile} />} />
        <Route path="/partidos/:id" element={<MatchDetailPage profile={profile} />} />
        <Route
          path="/invitaciones"
          element={
            <InvitationsPage
              profile={profile}
              invitations={invitationsState.invitations}
              loading={invitationsState.loading}
              error={invitationsState.error}
              onChange={invitationsState.reload}
            />
          }
        />
        {clubRole && <Route path="/club/*" element={<ClubLayout profile={profile} role={clubRole} />} />}
        <Route
          path="/perfil"
          element={<ProfilePage profile={profile} onSaved={setProfile} onSignOut={signOut} />}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    )
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <Link to="/" className="brand">
          <span className="ball" aria-hidden="true" />
          <h1>Falta Uno</h1>
        </Link>
        {session && profile && (
          <div className="header-actions">
            {clubRole && (
              <Link to="/club" className="club-link">Club</Link>
            )}
            <InvitationsBell count={invitationsState.invitations.length} />
            <ProfileBadge profile={profile} />
          </div>
        )}
      </header>
      {content}
      <footer className="app-footer">
        <Link to="/privacidad">Privacidad</Link>
        <span aria-hidden="true">·</span>
        <Link to="/terminos">Términos</Link>
      </footer>
    </div>
  )
}

function InvitationsBell({ count }: { count: number }) {
  return (
    <Link
      to="/invitaciones"
      className="bell"
      aria-label={count > 0 ? `Tenés ${count} invitación${count === 1 ? '' : 'es'}` : 'Invitaciones'}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 4h16v12H5.2L4 17.2V4z" />
        <path d="M8 9h8M8 12h5" />
      </svg>
      {count > 0 && <span className="bell-count">{count > 9 ? '9+' : count}</span>}
    </Link>
  )
}

function ProfileBadge({ profile }: { profile: Profile }) {
  const initials = profile.fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join('')
  return (
    <Link to="/perfil" className="avatar-link" aria-label="Mi perfil">
      <span className="avatar">{initials}</span>
      <span className="avatar-cat">{CATEGORY_LABELS[profile.category]}</span>
    </Link>
  )
}
