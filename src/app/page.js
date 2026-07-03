import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import BotonSalir from './BotonSalir'

const ETIQUETA_ESTADO = {
  como_nuevo: 'Como nuevo',
  bueno: 'Bueno',
  con_uso: 'Con uso',
}

function formatearFecha(fechaIso) {
  return new Date(fechaIso).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: ultimasOfertas } = await supabase
    .from('ofertas')
    .select(
      'id, precio, estado_libro, creado_en, libros (titulo, editorial, imagen_url), perfiles (nombre, colegio)'
    )
    .eq('estado', 'disponible')
    .order('creado_en', { ascending: false })
    .limit(10)

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-blue-600">📚 Libracos</h1>
          <nav className="flex items-center gap-3">
            <a
              href="https://cafecito.app/ggorza"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-amber-600 hover:text-amber-700"
              title="Si Libracos te sirvió, invitame un cafecito"
            >
              ☕ Apoyá el proyecto
            </a>
            {user ? (
              <>
               
               
                <span className="text-sm text-gray-600">
                  Hola, {user.user_metadata?.nombre || user.email}
                </span>
                <BotonSalir />
              </>
            ) : (
              <>
                <Link href="/login" className="text-sm text-blue-600 hover:underline">
                  Iniciar sesión
                </Link>
                <Link
                  href="/registro"
                  className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700"
                >
                  Crear cuenta
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <section className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h2 className="text-3xl font-bold mb-3">
          Libros escolares usados, entre familias del colegio
        </h2>
        <p className="text-gray-600">
          Publicá los libros que necesitás, ofrecé los que ya no usás.
        </p>
        <div className="mt-8 flex gap-3 justify-center">

           <Link
            href="/buscar"
            className="bg-blue-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-blue-700"
          >
            Buscar un libro
          </Link>
          
          <Link
            href="/vender"
            className="bg-green-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-green-700"
          >
            Vender un libro
          </Link>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-4 pb-16">
        <h3 className="text-xl font-bold mb-4">Últimos libros publicados</h3>

        {!ultimasOfertas || ultimasOfertas.length === 0 ? (
          <p className="text-gray-500 bg-white rounded-xl shadow p-6 text-center">
            Todavía no hay libros publicados. ¡Sé el primero!
          </p>
        ) : (
          <ul className="space-y-3">
            {ultimasOfertas.map((oferta) => (
              <li
                key={oferta.id}
                className="bg-white rounded-xl shadow p-4 flex items-center gap-4"
              >
                {oferta.libros?.imagen_url ? (
                  <img
                    src={oferta.libros.imagen_url}
                    alt={oferta.libros.titulo}
                    className="w-12 h-16 object-cover rounded"
                  />
                ) : (
                  <div className="w-12 h-16 bg-gray-100 rounded flex items-center justify-center text-2xl">
                    📖
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">
                    {oferta.libros?.titulo}
                  </p>
                  <p className="text-sm text-gray-500">
                    {oferta.libros?.editorial}
                    {oferta.libros?.editorial && ' · '}
                    {ETIQUETA_ESTADO[oferta.estado_libro]}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {user ? (
                      <>
                        Ofrecido por {oferta.perfiles?.nombre}
                        {oferta.perfiles?.colegio &&
                          `, del ${oferta.perfiles.colegio}`}
                        , el {formatearFecha(oferta.creado_en)}
                      </>
                    ) : (
                      <>Publicado el {formatearFecha(oferta.creado_en)}</>
                    )}
                  </p>
                </div>
                <p className="font-bold text-green-700 whitespace-nowrap">
                  ${oferta.precio.toLocaleString('es-AR')}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}