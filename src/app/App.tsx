import { Route, Routes } from 'react-router-dom'
import { isSupabaseConfigured } from '../lib/supabase'
import HomePage from './HomePage'

export default function App() {
  return (
    <div className="app-shell">
      <header>
        <h1>Falta Uno</h1>
        <p className="muted">Armá partidos de pádel con gente de tu nivel.</p>
      </header>

      {!isSupabaseConfigured && (
        <div className="card" role="status">
          <strong>Falta configurar Supabase.</strong>
          <p className="muted">
            Copiá <code>.env.example</code> a <code>.env.local</code> y completá las claves del proyecto.
          </p>
        </div>
      )}

      <Routes>
        <Route path="/" element={<HomePage />} />
      </Routes>
    </div>
  )
}
