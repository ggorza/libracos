import Link from 'next/link'

export const metadata = {
  title: 'Política de privacidad — Libracos',
}

export default function PrivacidadPage() {
  return (
    <main className="flex-1 bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto mt-8 bg-white rounded-xl shadow p-8">
        <h1 className="text-2xl font-bold mb-2">Política de privacidad</h1>
        <p className="text-sm text-gray-500 mb-6">
          Última actualización: {new Date().toLocaleDateString('es-AR')}
        </p>

        <div className="space-y-6 text-sm text-gray-700 leading-relaxed">
          <p>
            Libracos es una plataforma hecha por y para familias, que conecta a
            quienes buscan libros escolares usados con quienes los tienen para
            vender. Nos tomamos en serio el cuidado de tus datos. Acá te
            explicamos, en lenguaje claro, qué información guardamos y cómo la
            usamos.
          </p>

          <div>
            <h2 className="font-bold text-base mb-2 text-gray-900">
              Qué datos guardamos
            </h2>
            <p>
              Cuando te registrás, guardamos tu nombre, tu email, tu número de
              WhatsApp y el colegio de tus hijos. También guardamos los libros
              que publicás para vender y los que buscás.
            </p>
          </div>

          <div>
            <h2 className="font-bold text-base mb-2 text-gray-900">
              Para qué los usamos
            </h2>
            <p>
              Usamos tus datos únicamente para que Libracos funcione: conectar a
              las familias que compran y venden libros. Tu nombre y colegio son
              visibles para otras familias registradas, así saben con quién
              estarían tratando. Tu número de WhatsApp{' '}
              <strong>no es público</strong>: solo se le revela a otra persona
              cuando ella toca el botón de contacto sobre una de tus
              publicaciones, y ese contacto queda registrado.
            </p>
          </div>

          <div>
            <h2 className="font-bold text-base mb-2 text-gray-900">
              Qué NO hacemos
            </h2>
            <p>
              No vendemos ni cedemos tus datos a terceros. No mostramos
              publicidad. No usamos tu información para ningún fin ajeno al
              funcionamiento de Libracos.
            </p>
          </div>

          <div>
            <h2 className="font-bold text-base mb-2 text-gray-900">
              Dónde se guardan
            </h2>
            <p>
              Los datos se almacenan de forma segura en Supabase, un servicio de
              base de datos que cifra la información. El acceso está protegido
              para que cada persona solo pueda ver lo que le corresponde.
            </p>
          </div>

          <div>
            <h2 className="font-bold text-base mb-2 text-gray-900">
              Tus derechos
            </h2>
            <p>
              Podés ver y editar tus datos en cualquier momento desde tu perfil.
              También podés eliminar tu cuenta de forma permanente desde la
              sección &quot;Mi perfil&quot;: al hacerlo, se borran definitivamente
              tu perfil, tus publicaciones, tus búsquedas y tus contactos. Si
              tenés cualquier duda o pedido sobre tus datos, escribinos a{' '}
              <a
                href="mailto:ggorza@msn.com"
                className="text-blue-600 hover:underline"
              >
                ggorza@msn.com
              </a>
              .
            </p>
          </div>

          <div>
            <h2 className="font-bold text-base mb-2 text-gray-900">
              Sobre los menores
            </h2>
            <p>
              Libracos está pensado para ser usado por adultos (madres, padres y
              tutores). No solicitamos ni buscamos datos de menores de edad.
            </p>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t">
          <Link href="/" className="text-blue-600 hover:underline text-sm">
            ← Volver al inicio
          </Link>
        </div>
      </div>
    </main>
  )
}