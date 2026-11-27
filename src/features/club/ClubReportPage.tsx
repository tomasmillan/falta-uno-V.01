import { useEffect, useMemo, useState } from 'react'
import type { BillingRow } from '../../types/domain'
import Spinner from '../../components/Spinner'
import { matchErrorMessage } from '../matches/matchesApi'
import { localDateKey } from '../matches/dateTime'
import { fetchBillingReport } from './clubApi'
import { downloadCsv } from './csv'

type Preset = 'today' | 'yesterday' | 'week' | 'month' | 'lastMonth' | 'custom'

const PRESETS: { key: Preset; label: string }[] = [
  { key: 'today', label: 'Hoy' },
  { key: 'yesterday', label: 'Ayer' },
  { key: 'week', label: 'Esta semana' },
  { key: 'month', label: 'Este mes' },
  { key: 'lastMonth', label: 'Mes pasado' },
  { key: 'custom', label: 'Elegir fechas' },
]

function presetRange(preset: Preset): [string, string] {
  const now = new Date()
  const d = (y: number, m: number, day: number) => localDateKey(new Date(y, m, day))
  const y = now.getFullYear()
  const m = now.getMonth()
  switch (preset) {
    case 'yesterday': return [d(y, m, now.getDate() - 1), d(y, m, now.getDate() - 1)]
    case 'week': {
      const monday = now.getDate() - ((now.getDay() + 6) % 7)
      return [d(y, m, monday), localDateKey(now)]
    }
    case 'month': return [d(y, m, 1), localDateKey(now)]
    case 'lastMonth': return [d(y, m - 1, 1), d(y, m, 0)]
    default: return [localDateKey(now), localDateKey(now)]
  }
}

const STATUS = { played: 'Jugado', not_played: 'No se jugó', pending: 'Sin cerrar' } as const
const dateFmt = (iso: string) =>
  new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Argentina/Buenos_Aires' })
const timeFmt = (iso: string) =>
  new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Argentina/Buenos_Aires' })

/** Billing report for the club: totals, per-member summary and a CSV for the billing office. */
export default function ClubReportPage() {
  const [preset, setPreset] = useState<Preset>('today')
  const [[from, to], setRange] = useState<[string, string]>(presetRange('today'))
  const [onlyPlayed, setOnlyPlayed] = useState(true)
  const [rows, setRows] = useState<BillingRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    setRows(null)
    fetchBillingReport(from, to)
      .then((r) => alive && (setRows(r), setError(null)))
      .catch((e) => alive && setError(matchErrorMessage(e)))
    return () => {
      alive = false
    }
  }, [from, to])

  const choosePreset = (p: Preset) => {
    setPreset(p)
    if (p !== 'custom') setRange(presetRange(p))
  }

  const visible = useMemo(() => (rows ?? []).filter((r) => !onlyPlayed || r.playedStatus === 'played'), [rows, onlyPlayed])

  const totals = useMemo(() => {
    const all = rows ?? []
    const matchIds = new Set(all.map((r) => r.matchId))
    const played = new Set(all.filter((r) => r.playedStatus === 'played').map((r) => r.matchId))
    const pending = new Set(all.filter((r) => r.playedStatus === 'pending').map((r) => r.matchId))
    const lights = new Set(all.filter((r) => r.playedStatus === 'played' && r.lightsUsed).map((r) => r.matchId))
    const members = new Set(visible.filter((r) => r.personType === 'Socio').map((r) => `${r.personName}|${r.unitLabel}`))
    const guests = visible.filter((r) => r.personType === 'Invitado').length
    return { matches: matchIds.size, played: played.size, pending: pending.size, lights: lights.size, members: members.size, guests }
  }, [rows, visible])

  // Per member: matches played and guests brought (what billing charges for).
  const perMember = useMemo(() => {
    const map = new Map<string, { name: string; unit: string | null; matches: Set<string>; guests: number; lights: Set<string> }>()
    for (const r of visible) {
      const isGuest = r.personType === 'Invitado'
      const name = isGuest ? r.hostName : r.personName
      if (!name) continue
      const unit = isGuest ? r.hostUnit : r.unitLabel
      const key = `${name}|${unit ?? ''}`
      const entry = map.get(key) ?? { name, unit, matches: new Set<string>(), guests: 0, lights: new Set<string>() }
      if (isGuest) entry.guests += 1
      else {
        entry.matches.add(r.matchId)
        if (r.lightsUsed) entry.lights.add(r.matchId)
      }
      map.set(key, entry)
    }
    return [...map.values()].sort((a, b) => b.matches.size - a.matches.size || a.name.localeCompare(b.name))
  }, [visible])

  const exportCsv = () => {
    downloadCsv(
      `falta-uno-facturacion-${from}_${to}.csv`,
      ['Fecha', 'Hora', 'Cancha', 'Nombre', 'Lote/UF', 'Tipo', 'Invitado de', 'Lote/UF del socio', 'Luces', 'Estado', 'Origen'],
      visible.map((r) => [
        dateFmt(r.startsAt), timeFmt(r.startsAt), r.court, r.personName, r.unitLabel, r.personType,
        r.hostName, r.hostUnit, r.lightsUsed ? 'Sí' : 'No', STATUS[r.playedStatus], r.source === 'manual' ? 'Cargado a mano' : 'App',
      ]),
    )
  }

  return (
    <section className="stack">
      <div className="chips wrap" role="group" aria-label="Período">
        {PRESETS.map((p) => (
          <button key={p.key} type="button" className={`chip ${preset === p.key ? 'is-selected' : ''}`} aria-pressed={preset === p.key} onClick={() => choosePreset(p.key)}>
            {p.label}
          </button>
        ))}
      </div>
      {preset === 'custom' && (
        <div className="grid-2">
          <div className="field">
            <label htmlFor="report-from">Desde</label>
            <input id="report-from" type="date" value={from} onChange={(e) => e.target.value && setRange([e.target.value, to < e.target.value ? e.target.value : to])} />
          </div>
          <div className="field">
            <label htmlFor="report-to">Hasta</label>
            <input id="report-to" type="date" value={to} min={from} onChange={(e) => e.target.value && setRange([from, e.target.value])} />
          </div>
        </div>
      )}

      {error && <p className="error card" role="alert">{error}</p>}
      {!rows && !error && <Spinner label="Armando el reporte…" />}

      {rows && (
        <>
          <div className="kpi-grid">
            <div className="kpi-tile"><strong>{totals.played}</strong><span>partidos jugados</span></div>
            <div className="kpi-tile"><strong>{totals.members}</strong><span>socios distintos</span></div>
            <div className="kpi-tile"><strong>{totals.guests}</strong><span>invitados</span></div>
            <div className="kpi-tile"><strong>{totals.lights}</strong><span>con luces</span></div>
          </div>
          {totals.pending > 0 && (
            <p className="notice">
              Hay {totals.pending} partido{totals.pending === 1 ? '' : 's'} sin cerrar en este período. Cerralos en "Hoy" para que entren a facturación.
            </p>
          )}

          <div className="detail-head">
            <label className="check">
              <input type="checkbox" checked={onlyPlayed} onChange={(e) => setOnlyPlayed(e.target.checked)} />
              Solo partidos jugados
            </label>
            <button type="button" className="btn btn-primary btn-small" onClick={exportCsv} disabled={visible.length === 0}>
              Descargar Excel (CSV)
            </button>
          </div>

          {visible.length === 0 ? (
            <div className="card empty-state"><p className="muted">No hay partidos para mostrar en este período.</p></div>
          ) : (
            <>
              <h3>Por socio</h3>
              <div className="table-wrap">
                <table className="report">
                  <thead><tr><th>Socio</th><th>Lote/UF</th><th className="num">Partidos</th><th className="num">Con luz</th><th className="num">Invitados</th></tr></thead>
                  <tbody>
                    {perMember.map((m) => (
                      <tr key={`${m.name}|${m.unit}`}>
                        <td>{m.name}</td><td>{m.unit ?? '—'}</td>
                        <td className="num">{m.matches.size}</td><td className="num">{m.lights.size}</td><td className="num">{m.guests}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <h3>Detalle</h3>
              <div className="table-wrap">
                <table className="report">
                  <thead><tr><th>Fecha</th><th>Hora</th><th>Cancha</th><th>Nombre</th><th>Lote/UF</th><th>Tipo</th><th>Luces</th><th>Estado</th></tr></thead>
                  <tbody>
                    {visible.map((r, i) => (
                      <tr key={`${r.matchId}-${i}`}>
                        <td>{dateFmt(r.startsAt)}</td><td>{timeFmt(r.startsAt)}</td><td>{r.court}</td>
                        <td>{r.personName}{r.hostName ? <span className="muted"> · de {r.hostName.split(' ')[0]}</span> : null}</td>
                        <td>{r.unitLabel ?? r.hostUnit ?? '—'}</td><td>{r.personType}</td>
                        <td>{r.lightsUsed ? 'Sí' : 'No'}</td><td>{STATUS[r.playedStatus]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </section>
  )
}
