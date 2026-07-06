'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

function formatearFecha(iso) {
  return new Date(iso).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export default function AdminPage() {
  const router = useRouter()
  const supabase = createClient()

  const [autorizado, setAutorizado] = useState(null) // null = verificando
  const [datos, setDatos] = useState(null)

  useEffect(() => {
    verificarYcargar()
  }, [])

  async function verificarYcargar() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    // ¿Es admin?
    const { data: perfil } = await supabase
      .from('perfiles')
      .select('es_admin')
      .eq('id', user.id)
      .maybeSingle()

    if (!perfil?.es_admin) {
      setAutorizado(false)
      return
    }
    setAutorizado(true)

    // Cargar todo en paralelo
    const [perfiles, libros, ofertas, busquedas, contactos, colegios] =
      await Promise.all([
        supabase
          .from('perfiles')
          .select('id, nombre, telefono, colegio, creado_en')
          .order('creado_en', { ascending: false }),
        supabase.from('libros').select('isbn, titulo, editorial'),
        supabase
          .from('ofertas')
          .select(
            'id, precio, estado, creado_en, libros (titulo), perfiles (nombre)'
          )
          .order('creado_en', { ascending: false }),
        supabase.from('busquedas').select('id, estado'),
        supabase
          .from('contactos')
          .select(
            'id, creado_en, perfiles (nombre, telefono, colegio), ofertas (libros (titulo), perfiles (nombre))'
          )
          .order('creado_en', { ascending: false }),
        supabase
          .from('colegios')
          .select('id, nombre, direccion, creado_en')
          .order('creado_en', { ascending: false }),
      ])

    setDatos({
      perfiles: perfiles.data || [],
      libros: libros.data || [],
      ofertas: ofertas.data || [],
      busquedas: busquedas.data || [],
      contactos: contactos.data || [],
      colegios: colegios.data || [],
    })
  }

  if (autorizado === null) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Verificando acceso...</p>
      </main>
    )
  }

  if (autorizado === false) {
    return (
      <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
        <p className="text-gray-600">No tenés acceso a esta sección.</p>
        <Link href="/" className="text-blue-600 hover:underline">
          ← Volver al inicio
        </Link>
      </main>
    )
  }

  if (!datos) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Cargando datos...</p>
      </main>
    )
  }

  const ofertasDisponibles = datos.ofertas.filter(
    (o) => o.estado === 'disponible'
  ).length
  const ofertasVendidas = datos.ofertas.filter(
    (o) => o.estado === 'vendido'
  ).length
  const busquedasActivas = datos.busquedas.filter(
    (b) => b.estado === 'activa'
  ).length

  const metricas = [
    { label: 'Colegios activos', valor: datos.colegios.length },
    { label: 'Padres registrados', valor: datos.perfiles.length },
    { label: 'Libros en catálogo', valor: datos.libros.length },
    { label: 'Ofertas disponibles', valor: ofertasDisponibles },
    { label: 'Ofertas vendidas', valor: ofertasVendidas },
    { label: 'Búsquedas activas', valor: busquedasActivas },
    { label: 'Contactos generados', valor: datos.contactos.length },
  ]

  return (
    <main className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto mt-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Panel de administración</h1>
          <Link href="/" className="text-sm text-blue-600 hover:underline">
            ← Volver al inicio
          </Link>
        </div>

        {/* Métricas */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
          {metricas.map((m) => (
            <div key={m.label} className="bg-white rounded-xl shadow p-4">
              <p className="text-3xl font-bold text-blue-600">{m.valor}</p>
              <p className="text-sm text-gray-500">{m.label}</p>
            </div>
          ))}
        </div>

        {/* Contactos: la métrica de oro */}
        <section className="mb-8">
          <h2 className="text-lg font-bold mb-3">
            Contactos ({datos.contactos.length})
          </h2>
          <div className="bg-white rounded-xl shadow overflow-x-auto">
            {datos.contactos.length === 0 ? (
              <p className="text-gray-500 text-sm p-4">
                Todavía no hubo contactos.
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-gray-500">
                  <tr>
                    <th className="p-3">Fecha</th>
                    <th className="p-3">Interesado</th>
                    <th className="p-3">Teléfono</th>
                    <th className="p-3">Libro</th>
                    <th className="p-3">Vendedor</th>
                  </tr>
                </thead>
                <tbody>
                  {datos.contactos.map((c) => (
                    <tr key={c.id} className="border-t">
                      <td className="p-3 whitespace-nowrap">
                        {formatearFecha(c.creado_en)}
                      </td>
                      <td className="p-3">
                        {c.perfiles?.nombre}
                        {c.perfiles?.colegio && (
                          <span className="text-gray-400">
                            {' '}· {c.perfiles.colegio}
                          </span>
                        )}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        {c.perfiles?.telefono}
                      </td>
                      <td className="p-3">{c.ofertas?.libros?.titulo}</td>
                      <td className="p-3">{c.ofertas?.perfiles?.nombre}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        {/* Colegios */}
        <section className="mb-8">
          <h2 className="text-lg font-bold mb-3">
            Colegios activos ({datos.colegios.length})
          </h2>
          <div className="bg-white rounded-xl shadow overflow-x-auto">
            {datos.colegios.length === 0 ? (
              <p className="text-gray-500 text-sm p-4">
                Todavía no hay colegios registrados.
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-gray-500">
                  <tr>
                    <th className="p-3">Alta</th>
                    <th className="p-3">Nombre</th>
                    <th className="p-3">Dirección</th>
                  </tr>
                </thead>
                <tbody>
                  {datos.colegios.map((c) => (
                    <tr key={c.id} className="border-t">
                      <td className="p-3 whitespace-nowrap">
                        {formatearFecha(c.creado_en)}
                      </td>
                      <td className="p-3">{c.nombre}</td>
                      <td className="p-3 text-gray-500">{c.direccion}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        {/* Padres */}
        <section className="mb-8">
          <h2 className="text-lg font-bold mb-3">
            Padres registrados ({datos.perfiles.length})
          </h2>
          <div className="bg-white rounded-xl shadow overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-500">
                <tr>
                  <th className="p-3">Alta</th>
                  <th className="p-3">Nombre</th>
                  <th className="p-3">Teléfono</th>
                  <th className="p-3">Colegio</th>
                </tr>
              </thead>
              <tbody>
                {datos.perfiles.map((p) => (
                  <tr key={p.id} className="border-t">
                    <td className="p-3 whitespace-nowrap">
                      {formatearFecha(p.creado_en)}
                    </td>
                    <td className="p-3">{p.nombre}</td>
                    <td className="p-3 whitespace-nowrap">{p.telefono}</td>
                    <td className="p-3">{p.colegio}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Ofertas */}
        <section className="mb-8">
          <h2 className="text-lg font-bold mb-3">
            Últimas ofertas ({datos.ofertas.length})
          </h2>
          <div className="bg-white rounded-xl shadow overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-500">
                <tr>
                  <th className="p-3">Fecha</th>
                  <th className="p-3">Libro</th>
                  <th className="p-3">Vendedor</th>
                  <th className="p-3">Precio</th>
                  <th className="p-3">Estado</th>
                </tr>
              </thead>
              <tbody>
                {datos.ofertas.slice(0, 50).map((o) => (
                  <tr key={o.id} className="border-t">
                    <td className="p-3 whitespace-nowrap">
                      {formatearFecha(o.creado_en)}
                    </td>
                    <td className="p-3">{o.libros?.titulo}</td>
                    <td className="p-3">{o.perfiles?.nombre}</td>
                    <td className="p-3 whitespace-nowrap">
                      ${o.precio?.toLocaleString('es-AR')}
                    </td>
                    <td className="p-3">
                      {o.estado === 'vendido' ? (
                        <span className="text-gray-500">Vendido</span>
                      ) : (
                        <span className="text-green-700">Disponible</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  )
}