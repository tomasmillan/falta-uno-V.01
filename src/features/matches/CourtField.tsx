import type { Court } from '../../types/domain'

interface Props {
  idPrefix: string
  courts: Court[]
  /** null = "A definir". */
  courtId: string | null
  onChange: (courtId: string | null) => void
  /** Courts already used in the chosen slot (shown as taken). */
  takenCourtIds?: Set<string>
}

/** Court picker from the club's list, with "A definir" for courts not booked yet. */
export default function CourtField({ idPrefix, courts, courtId, onChange, takenCourtIds }: Props) {
  return (
    <div className="field">
      <label htmlFor={`${idPrefix}-court`}>Cancha</label>
      <select
        id={`${idPrefix}-court`}
        value={courtId ?? ''}
        onChange={(e) => onChange(e.target.value || null)}
      >
        <option value="">A definir</option>
        {courts.map((c) => {
          const taken = takenCourtIds?.has(c.id) && c.id !== courtId
          return (
            <option key={c.id} value={c.id} disabled={taken}>
              {c.name}{c.hasLights ? ' · con luz' : ''}{taken ? ' (ocupada)' : ''}
            </option>
          )
        })}
      </select>
      <span className="hint">
        {courts.length === 0
          ? 'El club todavía no cargó sus canchas. Dejala "A definir".'
          : courtId
            ? 'La cancha queda reservada para este turno.'
            : 'Elegila cuando estén los cuatro y la tengan confirmada.'}
      </span>
    </div>
  )
}
