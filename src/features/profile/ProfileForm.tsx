import { useEffect, useState, type FormEvent } from 'react'
import { CATEGORY_LABELS, type Category, type PreferredSide, type Profile } from '../../types/domain'
import { fetchOwnWhatsapp, saveProfile } from './profileApi'

const CATEGORIES = (Object.keys(CATEGORY_LABELS).map(Number) as Category[]).sort((a, b) => b - a)

const SIDE_LABELS: Record<PreferredSide, string> = {
  drive: 'Drive',
  backhand: 'Revés',
  either: 'Indistinto',
}

interface Props {
  userId: string
  /** Pre-fill: existing profile, or the name from the Google account for new users. */
  initial?: Partial<Profile>
  submitLabel: string
  onSaved: (profile: Profile) => void
}

export default function ProfileForm({ userId, initial, submitLabel, onSaved }: Props) {
  const [fullName, setFullName] = useState(initial?.fullName ?? '')
  const [category, setCategory] = useState<Category>(initial?.category ?? 6)
  const [preferredSide, setPreferredSide] = useState<PreferredSide>(initial?.preferredSide ?? 'either')
  const [whatsapp, setWhatsapp] = useState('')

  // WhatsApp lives in a private table; load it for existing profiles.
  useEffect(() => {
    if (!initial?.id) return
    fetchOwnWhatsapp(userId).then(setWhatsapp).catch(() => undefined)
  }, [initial?.id, userId])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (fullName.trim().length < 2) {
      setError('Escribí tu nombre (al menos 2 letras).')
      return
    }
    const digits = whatsapp.replace(/\D/g, '')
    if (whatsapp && (digits.length < 8 || digits.length > 15)) {
      setError('El WhatsApp no parece válido. Escribilo con código de área, por ejemplo 11 5555 1234.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      onSaved(await saveProfile(userId, { fullName, category, preferredSide, whatsapp }))
    } catch {
      setError('No pudimos guardar tu perfil. Probá de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="stack" onSubmit={handleSubmit} noValidate>
      <div className="field">
        <label htmlFor="profile-name">Nombre y apellido</label>
        <input
          id="profile-name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          autoComplete="name"
          maxLength={80}
          required
        />
      </div>

      <div className="field">
        <label htmlFor="profile-category">Categoría</label>
        <select
          id="profile-category"
          value={category}
          onChange={(e) => setCategory(Number(e.target.value) as Category)}
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
          ))}
        </select>
        <span className="hint">Si no sabés, elegí la que te parezca. La podés cambiar cuando quieras.</span>
      </div>

      <fieldset className="field">
        <legend>Lado preferido</legend>
        <div className="segmented">
          {(Object.keys(SIDE_LABELS) as PreferredSide[]).map((side) => (
            <label key={side} className={preferredSide === side ? 'is-selected' : ''}>
              <input
                type="radio"
                name="preferred-side"
                value={side}
                checked={preferredSide === side}
                onChange={() => setPreferredSide(side)}
              />
              {SIDE_LABELS[side]}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="field">
        <label htmlFor="profile-whatsapp">WhatsApp</label>
        <input
          id="profile-whatsapp"
          type="tel"
          inputMode="tel"
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
          placeholder="11 5555 1234"
          autoComplete="tel"
          maxLength={20}
        />
        <span className="hint">Solo lo ven tus compañeros cuando el partido está completo.</span>
      </div>

      {error && <p className="error" role="alert">{error}</p>}

      <button type="submit" className="btn btn-primary" disabled={saving}>
        {saving ? 'Guardando…' : submitLabel}
      </button>
    </form>
  )
}
