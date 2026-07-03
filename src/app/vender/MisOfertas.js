'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

const ETIQUETA_ESTADO = {
  como_nuevo: 'Como nuevo',
  bueno: 'Bueno',
  con_uso: 'Con uso',
}

export default function MisOfertas({ usuario, refrescar }) {
  const supabase = createClient()

  const [ofertas, setOfertas] = useState(null)
  const [editando, setEditando] = useState(null)
  const [nuevoPrecio, setNuevoPrecio] = useState('')
  const [editandoTapa, setEditandoTapa] = useState(null)
  const [nuevaTapa, setNuevaTapa] = useState('')
  const [error, setError] = useState(null)

  useEffect(() => {
    if (usuario) cargarOfertas(usuario.id)
  }, [usuario, refrescar])

  async function cargarOfertas(usuarioId) {
    const { data, error } = await supabase
      .from('ofertas')
      .select(
        'id, precio, estado_libro, estado, creado_en, libros (isbn, titulo, editorial, imagen_url)'
      )
      .eq('vendedor_id', usuarioId)
      .order('creado_en', { ascending: false })

    if (error) {
      console.error('Error cargando ofertas:', error)
      setError('No pudimos cargar tus libros. Refrescá la página.')
      return
    }
    setOfertas(data)
  }

  async function marcarVendido(ofertaId) {
    setError(null)
    const { error } = await supabase
      .from('ofertas')
      .update({ estado: 'vendido' })
      .eq('id', ofertaId)

    if (error) {
      console.error('Error marcando vendido:', error)
      setError('No pudimos marcar la venta. Probá de nuevo.')
      return
    }
    cargarOfertas(usuario.id)
  }

  async function volverAPublicar(ofertaId) {
    setError(null)
    const { error } = await supabase
      .from('ofertas')
      .update({ estado: 'disponible' })
      .eq('id', ofertaId)

    if (error) {
      console.error('Error republicando:', error)
      setError('No pudimos volver a publicar. Probá de nuevo.')
      return
    }
    cargarOfertas(usuario.id)
  }

  async function eliminarOferta(ofertaId) {
    setError(null)
    if (!confirm('¿Seguro que querés eliminar esta publicación?')) return

    const { error } = await supabase
      .from('ofertas')
      .delete()
      .eq('id', ofertaId)

    if (error) {
      console.error('Error eliminando:', error)
      setError('No pudimos eliminar la publicación. Probá de nuevo.')
      return
    }
    cargarOfertas(usuario.id)
  }

  function abrirEdicion(oferta) {
    setEditando(oferta.id)
    setNuevoPrecio(String(oferta.precio))
    setEditandoTapa(null)
    setError(null)
  }

  async function guardarPrecio(ofertaId) {
    setError(null)
    const precioNum = parseInt(nuevoPrecio, 10)
    if (isNaN(precioNum) || precioNum < 0) {
      setError('Ingresá un precio válido.')
      return
    }

    const { error } = await supabase
      .from('ofertas')
      .update({ precio: precioNum })
      .eq('id', ofertaId)

    if (error) {
      console.error('Error actualizando precio:', error)
      setError('No pudimos actualizar el precio. Probá de nuevo.')
      return
    }
    setEditando(null)
    cargarOfertas(usuario.id)
  }

  function abrirEdicionTapa(isbn) {
    setEditandoTapa(isbn)
    setNuevaTapa('')
    setEditando(null)
    setError(null)
  }

  async function guardarTapa(isbn) {
    setError(null)
    const url = nuevaTapa.trim()
    if (!url) {
      setError('Pegá la URL de la imagen.')
      return
    }

    const { error } = await supabase
      .from('libros')
      .update({ imagen_url: url })
      .eq('isbn', isbn)

    if (error) {
      console.error('Error actualizando tapa:', error)
      setError('No pudimos guardar la imagen. Probá de nuevo.')
      return
    }
    setEditandoTapa(null)
    cargarOfertas(usuario.id)
  }

  return (
    <div>
      <h2 className="text-lg font-bold mb-3">Mis publicaciones</h2>

      {error && (
        <p className="text-red-600 text-sm mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
          {error}
        </p>
      )}

      {ofertas === null ? (
        <p className="text-gray-500 text-sm">Cargando...</p>
      ) : ofertas.length === 0 ? (
        <p className="text-gray-500 text-sm bg-white rounded-xl shadow p-4">
          Todavía no publicaste ningún libro.
        </p>
      ) : (
        <ul className="space-y-3">
          {ofertas.map((oferta) => (
            <li
              key={oferta.id}
              className={`bg-white rounded-xl shadow p-4 ${
                oferta.estado === 'vendido' ? 'opacity-60' : ''
              }`}
            >
              <div className="flex items-center gap-4">
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
                    {oferta.estado === 'vendido' && (
                      <span className="ml-2 text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
                        Vendido
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-gray-500">
                    {ETIQUETA_ESTADO[oferta.estado_libro]}
                  </p>
                </div>
                {editando !== oferta.id && (
                  <p className="font-bold text-green-700 whitespace-nowrap">
                    ${oferta.precio.toLocaleString('es-AR')}
                  </p>
                )}
              </div>

              {editando === oferta.id ? (
                <div className="flex gap-2 mt-3">
                  <input
                    type="number"
                    min="0"
                    value={nuevoPrecio}
                    onChange={(e) => setNuevoPrecio(e.target.value)}
                    className="flex-1 border rounded-lg px-3 py-1.5 text-sm"
                    autoFocus
                  />
                  <button
                    onClick={() => guardarPrecio(oferta.id)}
                    className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700"
                  >
                    Guardar
                  </button>
                  <button
                    onClick={() => setEditando(null)}
                    className="text-sm text-gray-500 px-2 hover:text-gray-700"
                  >
                    Cancelar
                  </button>
                </div>
              ) : editandoTapa === oferta.libros?.isbn ? (
                <div className="mt-3">
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={nuevaTapa}
                      onChange={(e) => setNuevaTapa(e.target.value)}
                      className="flex-1 border rounded-lg px-3 py-1.5 text-sm"
                      placeholder="https://... (URL de la imagen)"
                      autoFocus
                    />
                    <button
                      onClick={() => guardarTapa(oferta.libros.isbn)}
                      className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700"
                    >
                      Guardar
                    </button>
                    <button
                      onClick={() => setEditandoTapa(null)}
                      className="text-sm text-gray-500 px-2 hover:text-gray-700"
                    >
                      Cancelar
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Tip: buscá el libro en Google Imágenes, click derecho en
                    la tapa → &quot;Copiar dirección de la imagen&quot;.
                  </p>
                </div>
              ) : (
                <div className="flex gap-4 mt-3 text-sm flex-wrap">
                  {oferta.estado === 'disponible' ? (
                    <>
                      <button
                        onClick={() => marcarVendido(oferta.id)}
                        className="text-green-700 font-medium hover:underline"
                      >
                        ✓ Lo vendí
                      </button>
                      <button
                        onClick={() => abrirEdicion(oferta)}
                        className="text-blue-600 hover:underline"
                      >
                        Editar precio
                      </button>
                      {!oferta.libros?.imagen_url && (
                        <button
                          onClick={() => abrirEdicionTapa(oferta.libros.isbn)}
                          className="text-blue-600 hover:underline"
                        >
                          Agregar tapa
                        </button>
                      )}
                    </>
                  ) : (
                    <button
                      onClick={() => volverAPublicar(oferta.id)}
                      className="text-blue-600 hover:underline"
                    >
                      ↩ Volver a publicar
                    </button>
                  )}
                  <button
                    onClick={() => eliminarOferta(oferta.id)}
                    className="text-red-500 hover:underline ml-auto"
                  >
                    Eliminar
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}