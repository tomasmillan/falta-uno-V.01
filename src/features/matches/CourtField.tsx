interface Props {
  idPrefix: string
  hasCourt: boolean
  courtLabel: string
  onHasCourtChange: (value: boolean) => void
  onCourtLabelChange: (value: string) => void
}

const COURT_SUGGESTIONS = ['Cancha 1', 'Cancha 2', 'Cancha 3']

/** "A definir" or a specific court. Used when creating and editing a match. */
export default function CourtField({ idPrefix, hasCourt, courtLabel, onHasCourtChange, onCourtLabelChange }: Props) {
  return (
    <fieldset className="field">
      <legend>Cancha</legend>
      <div className="segmented">
        <label className={!hasCourt ? 'is-selected' : ''}>
          <input type="radio" name={`${idPrefix}-has-court`} checked={!hasCourt} onChange={() => onHasCourtChange(false)} />
          A definir
        </label>
        <label className={hasCourt ? 'is-selected' : ''}>
          <input type="radio" name={`${idPrefix}-has-court`} checked={hasCourt} onChange={() => onHasCourtChange(true)} />
          Ya tengo cancha
        </label>
      </div>
      {hasCourt ? (
        <>
          <label htmlFor={`${idPrefix}-court`} className="sr-only">Nombre de la cancha</label>
          <input
            id={`${idPrefix}-court`}
            list={`${idPrefix}-court-suggestions`}
            value={courtLabel}
            onChange={(e) => onCourtLabelChange(e.target.value)}
            placeholder="Ej.: Cancha 2"
            maxLength={40}
          />
          <datalist id={`${idPrefix}-court-suggestions`}>
            {COURT_SUGGESTIONS.map((c) => <option key={c} value={c} />)}
          </datalist>
        </>
      ) : (
        <span className="hint">Reservala en OpenKey cuando estén los cuatro y cargala acá.</span>
      )}
    </fieldset>
  )
}
