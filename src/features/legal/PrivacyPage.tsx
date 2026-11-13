import { Link } from 'react-router-dom'
import LegalLayout from './LegalLayout'
import { LEGAL } from './legalConfig'

export default function PrivacyPage() {
  return (
    <LegalLayout title="Política de privacidad">
      <p>
        Esta política explica qué datos personales recopila {LEGAL.appName}, para qué los usa y qué derechos
        tenés sobre ellos. El responsable de los datos es {LEGAL.owner}, con domicilio en la {LEGAL.country}.
      </p>

      <h3>Qué datos recopilamos</h3>
      <ul>
        <li><strong>De tu cuenta de Google:</strong> nombre, dirección de email y foto de perfil. No accedemos a tus contactos, archivos ni a ningún otro dato de Google.</li>
        <li><strong>Los que cargás en tu perfil:</strong> nombre, categoría de juego, lado preferido y, si querés, tu número de WhatsApp.</li>
        <li><strong>Tu actividad en la app:</strong> los partidos que creás, a los que te sumás y de los que te bajás.</li>
      </ul>

      <h3>Para qué los usamos</h3>
      <ul>
        <li>Para que puedas iniciar sesión y tener un perfil.</li>
        <li>Para mostrarte partidos acordes a tu categoría y que otros jugadores vean quién está anotado.</li>
        <li>Para que los integrantes de un partido completo puedan contactarse por WhatsApp.</li>
        <li>Para mejorar la app, con estadísticas de uso generales.</li>
      </ul>
      <p>No vendemos tus datos ni los usamos para publicidad de terceros.</p>

      <h3>Quién puede ver tus datos</h3>
      <ul>
        <li>Los usuarios con sesión iniciada ven tu nombre, categoría y lado preferido.</li>
        <li>Tu WhatsApp solo se muestra a tus compañeros cuando el partido está completo.</li>
        <li>Tu email no se muestra a otros usuarios.</li>
      </ul>

      <h3>Dónde se guardan</h3>
      <p>
        Los datos se almacenan en servidores de Supabase y la app se aloja en Vercel. Estos proveedores pueden
        procesar datos fuera de Argentina, con medidas de seguridad adecuadas.
      </p>

      <h3>Cuánto tiempo los guardamos</h3>
      <p>Mientras tengas una cuenta. Si pedís darte de baja, borramos tus datos en un plazo de 30 días.</p>

      <h3>Tus derechos</h3>
      <p>
        Podés pedir acceder, corregir o eliminar tus datos escribiendo a <strong>{LEGAL.contactEmail}</strong>.
        También podés corregir tu perfil desde la app en cualquier momento.
      </p>
      <p>
        El titular de los datos personales tiene la facultad de ejercer el derecho de acceso a los mismos en forma
        gratuita a intervalos no inferiores a seis meses, salvo que se acredite un interés legítimo al efecto,
        conforme lo establecido en el artículo 14, inciso 3 de la Ley Nº 25.326. La Agencia de Acceso a la
        Información Pública, en su carácter de Órgano de Control de la Ley Nº 25.326, tiene la atribución de
        atender las denuncias y reclamos que interpongan quienes resulten afectados en sus derechos por
        incumplimiento de las normas vigentes en materia de protección de datos personales.
      </p>

      <h3>Cambios</h3>
      <p>
        Si cambiamos esta política, actualizamos la fecha de arriba y, si el cambio es importante, te avisamos
        en la app. Ver también los <Link to="/terminos">Términos y condiciones</Link>.
      </p>
    </LegalLayout>
  )
}
