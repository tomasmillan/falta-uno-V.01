const TZ = 'America/Argentina/Buenos_Aires'

const dayKey = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: TZ })

/** "Hoy", "Mañana" or "Sáb 15". */
export function formatDay(iso: string): string {
  const date = new Date(iso)
  const today = new Date()
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000)
  if (dayKey(date) === dayKey(today)) return 'Hoy'
  if (dayKey(date) === dayKey(tomorrow)) return 'Mañana'
  const weekday = date.toLocaleDateString('es-AR', { weekday: 'short', timeZone: TZ }).replace('.', '')
  const day = date.toLocaleDateString('es-AR', { day: 'numeric', timeZone: TZ })
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)} ${day}`
}

/** "18:30" */
export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: TZ })
}

/** "el sábado 15" / "hoy" / "mañana", for sentences. */
export function formatDayInSentence(iso: string): string {
  const label = formatDay(iso)
  if (label === 'Hoy' || label === 'Mañana') return label.toLowerCase()
  const date = new Date(iso)
  const weekday = date.toLocaleDateString('es-AR', { weekday: 'long', timeZone: TZ })
  const day = date.toLocaleDateString('es-AR', { day: 'numeric', timeZone: TZ })
  return `el ${weekday} ${day}`
}

export const initials = (fullName: string) =>
  fullName.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('')

export const firstName = (fullName: string) => fullName.split(' ')[0]

/** Normalizes an Argentine mobile number for wa.me links (adds 549 when missing). */
export function whatsappLink(number: string, text?: string): string {
  let digits = number.replace(/\D/g, '')
  if (digits.startsWith('0')) digits = digits.slice(1)
  if (!digits.startsWith('54')) digits = `549${digits}`
  const query = text ? `?text=${encodeURIComponent(text)}` : ''
  return `https://wa.me/${digits}${query}`
}
