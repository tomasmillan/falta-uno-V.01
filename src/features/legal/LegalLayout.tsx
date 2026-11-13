import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { LEGAL } from './legalConfig'

export default function LegalLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="card legal">
      <Link to="/" className="back-link">← Volver a {LEGAL.appName}</Link>
      <h2>{title}</h2>
      <p className="muted">Última actualización: {LEGAL.lastUpdated}</p>
      {children}
    </main>
  )
}
