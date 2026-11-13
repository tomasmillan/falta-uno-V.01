import { Link } from 'react-router-dom'
import LegalLayout from './LegalLayout'
import { LEGAL } from './legalConfig'

export default function TermsPage() {
  return (
    <LegalLayout title="Términos y condiciones">
      <p>
        Al usar {LEGAL.appName} aceptás estos términos. La app es ofrecida por {LEGAL.owner}, en la{' '}
        {LEGAL.country}.
      </p>

      <h3>Qué es {LEGAL.appName}</h3>
      <p>
        Una herramienta para que jugadores de pádel publiquen partidos con lugares libres y se sumen a partidos
        de su nivel. Por ahora no gestiona reservas de canchas ni cobros: la reserva y el pago de la cancha se
        hacen por el sistema que use cada club.
      </p>

      <h3>Versión de prueba</h3>
      <p>
        La app está en una etapa de prueba piloto. Puede tener errores, cambiar o dejar de estar disponible sin
        aviso previo. Su uso es gratuito durante esta etapa.
      </p>

      <h3>Tu cuenta</h3>
      <ul>
        <li>Iniciás sesión con tu cuenta de Google y sos responsable de la actividad que se haga con ella.</li>
        <li>Los datos de tu perfil tienen que ser reales. Tu categoría es autodeclarada; tratá de que refleje tu nivel.</li>
      </ul>

      <h3>Uso correcto</h3>
      <ul>
        <li>Si te sumás a un partido, comprometete a ir. Si no podés, bajate con anticipación.</li>
        <li>Tratá con respeto a los demás jugadores.</li>
        <li>No uses la app para spam, publicidad no solicitada ni para obtener datos de otros usuarios.</li>
      </ul>
      <p>Podemos suspender cuentas que no respeten estas reglas.</p>

      <h3>Responsabilidad</h3>
      <p>
        {LEGAL.appName} solo conecta a jugadores. No somos responsables por lo que ocurra en los partidos, en las
        canchas ni entre jugadores, ni por las reservas o pagos hechos fuera de la app.
      </p>

      <h3>Cambios</h3>
      <p>
        Podemos actualizar estos términos. Si el cambio es importante, te avisamos en la app. Seguir usándola
        implica que aceptás la versión nueva.
      </p>

      <h3>Contacto</h3>
      <p>
        Para cualquier consulta, escribí a <strong>{LEGAL.contactEmail}</strong>. Ver también la{' '}
        <Link to="/privacidad">Política de privacidad</Link>.
      </p>
    </LegalLayout>
  )
}
