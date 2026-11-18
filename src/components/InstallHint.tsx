import { useEffect, useState } from 'react'

const DISMISS_KEY = 'falta-uno:install-hint-dismissed'

/** Chrome/Android event that lets us show our own "Install" button. Not in TS's DOM lib yet. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

type Platform = 'ios' | 'android' | 'other'

function detectPlatform(): Platform {
  const ua = navigator.userAgent
  // iPadOS reports itself as a Mac with touch support
  const isIOS = /iPhone|iPad|iPod/.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1)
  if (isIOS) return 'ios'
  if (/Android/.test(ua)) return 'android'
  return 'other'
}

function isInstalled(): boolean {
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true
  return iosStandalone || window.matchMedia('(display-mode: standalone)').matches
}

function wasDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === '1'
  } catch {
    return false
  }
}

/** One-time card explaining how to add the app to the home screen. Hidden once installed or dismissed. */
export default function InstallHint() {
  const [platform] = useState<Platform>(detectPlatform)
  const [hidden, setHidden] = useState(() => isInstalled() || wasDismissed())
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault()
      setInstallEvent(event as BeforeInstallPromptEvent)
    }
    const onInstalled = () => setHidden(true)
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const dismiss = () => {
    setHidden(true)
    try {
      localStorage.setItem(DISMISS_KEY, '1')
    } catch {
      // Storage blocked (private mode): the card just comes back next visit.
    }
  }

  const install = async () => {
    if (!installEvent) return
    await installEvent.prompt()
    const { outcome } = await installEvent.userChoice
    if (outcome === 'accepted') setHidden(true)
    setInstallEvent(null)
  }

  // Desktop browsers without an install prompt: nothing useful to say.
  if (hidden || (platform === 'other' && !installEvent)) return null

  return (
    <aside className="card install-hint" aria-label="Instalar la app">
      <div className="install-hint-head">
        <img src="/icons/icon-192.png" alt="" width={40} height={40} />
        <div>
          <strong>Tené Falta Uno en tu inicio</strong>
          <p className="muted">Se abre como una app, sin buscar el link.</p>
        </div>
        <button type="button" className="install-hint-close" onClick={dismiss} aria-label="Cerrar">×</button>
      </div>

      {installEvent ? (
        <button type="button" className="btn btn-primary" onClick={install}>Instalar app</button>
      ) : platform === 'ios' ? (
        <ol className="install-steps">
          <li>Tocá <strong>Compartir</strong> (el cuadrado con la flecha para arriba), abajo en Safari.</li>
          <li>Elegí <strong>Agregar a inicio</strong>.</li>
          <li>Tocá <strong>Agregar</strong>.</li>
        </ol>
      ) : (
        <ol className="install-steps">
          <li>Tocá el menú <strong>⋮</strong> arriba a la derecha en Chrome.</li>
          <li>Elegí <strong>Instalar app</strong> o <strong>Agregar a pantalla principal</strong>.</li>
        </ol>
      )}
    </aside>
  )
}
