'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import EscanerIsbn from '../vender/EscanerIsbn'
import BotonContactar from './BotonContactar'

export default function BuscarPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [usuario, setUsuario] = useState(null)
  const [modo, setModo] = useState('titulo') // 'titulo' | 'isbn'
  const [escaneando, setEscaneando] = useState(false)
  const [isbn, setIsbn] = useState('')
  const [texto, setTexto] = useState('')
  const [candidatos, setCandidatos] = useState(null)
  const [buscando, setBuscando] = useState(false)
  const [libroElegido, setLibroElegido] = useState(null)
  const [manual, setManual] = useState(false)
  const [tituloManual, setTituloManual] = useState('')
  const [editorialManual, setEditorialManual] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [matches, setMatches] = useState(null)
  const [libroBuscado, setLibroBuscado] = useState(null)
  const [misBusquedas, setMisBusquedas] = useState(null)
  const [ofertasPorIsbn, setOfertasPorIsbn] = useState({})
  const [error, setError] = useState(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push('/login')
      } else {
        setUsuario(user)
        cargarMisBusquedas(user.id)

        // Si viene un ISBN en la URL (desde "Me interesa" de la home),
        // precargamos el modo ISBN y buscamos el libro para que el padre confirme
        const isbnUrl = searchParams.get('isbn')
        if (isbnUrl) {
          setModo('isbn')
          setIsbn(isbnUrl)
          buscarPorIsbn(isbnUrl.replace(/[-\s]/g, ''))
        }
      }
    })
  }, [])

  function normalizarIsbn(valor) {
    return valor.replace(/[-\s]/g, '')
  }

  function isbnValido(isbnLimpio) {
    if (/^\d{13}$/.test(isbnLimpio)) {
      const d = isbnLimpio.split('').map(Number)
      const suma = d
        .slice(0, 12)
        .reduce((acc, dig, i) => acc + dig * (i % 2 === 0 ? 1 : 3), 0)
      return (10 - (suma % 10)) % 10 === d[12]
    }
    if (/^\d{9}[\dXx]$/.test(isbnLimpio)) {
      const c = isbnLimpio.toUpperCase().split('')
      const suma = c.reduce(
        (acc, ch, i) => acc + (ch === 'X' ? 10 : Number(ch)) * (10 - i),
        0
      )
      return suma % 11 === 0
    }
    return false
  }

  async function buscarEnCatalogo(isbnLimpio) {
    const { data } = await supabase
      .from('libros')
      .select('isbn, titulo, autor, editorial, imagen_url')
      .eq('isbn', isbnLimpio)
      .maybeSingle()
    return data
  }

  async function buscarEnGoogleBooksPorIsbn(isbnLimpio) {
    try {
      const res = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbnLimpio}`
      )
      const data = await res.json()
      if (data.totalItems > 0) {
        const info = data.items[0].volumeInfo
        return {
          isbn: isbnLimpio,
          titulo: info.title || 'Sin título',
          autor: (info.authors || []).join(', '),
          editorial: info.publisher || '',
          imagen_url: info.imageLinks?.thumbnail || '',
        }
      }
    } catch (e) {
      console.error('Google Books falló:', e)
    }
    return null
  }

  async function buscarEnOpenLibrary(isbnLimpio) {
    try {
      const res = await fetch(
        `https://openlibrary.org/api/books?bibkeys=ISBN:${isbnLimpio}&format=json&jscmd=data`
      )
      const data = await res.json()
      const info = data[`ISBN:${isbnLimpio}`]
      if (info) {
        return {
          isbn: isbnLimpio,
          titulo: info.title || 'Sin título',
          autor: (info.authors || []).map((a) => a.name).join(', '),
          editorial: (info.publishers || []).map((p) => p.name).join(', '),
          imagen_url: info.cover?.medium || '',
        }
      }
    } catch (e) {
      console.error('OpenLibrary falló:', e)
    }
    return null
  }

  async function buscarPorIsbn(isbnLimpio) {
    setError(null)
    setBuscando(true)

    let encontrado = await buscarEnCatalogo(isbnLimpio)
    if (!encontrado) encontrado = await buscarEnGoogleBooksPorIsbn(isbnLimpio)
    if (!encontrado) encontrado = await buscarEnOpenLibrary(isbnLimpio)

    if (encontrado) {
      setLibroElegido(encontrado)
    } else {
      setManual(true)
    }
    setBuscando(false)
  }

  function submitIsbn(e) {
    e.preventDefault()
    const isbnLimpio = normalizarIsbn(isbn)
    if (!isbnValido(isbnLimpio)) {
      setError(
        'Ese ISBN no es válido (el dígito verificador no coincide). Revisalo, o buscá por título.'
      )
      return
    }
    buscarPorIsbn(isbnLimpio)
  }

  function procesarEscaneo(textoDetectado) {
    setEscaneando(false)
    const isbnLimpio = normalizarIsbn(textoDetectado)
    setIsbn(isbnLimpio)
    if (!isbnValido(isbnLimpio)) {
      setError('El código escaneado no parece un ISBN válido. Probá de nuevo.')
      return
    }
    buscarPorIsbn(isbnLimpio)
  }

  function confirmarManual(e) {
    e.preventDefault()
    setLibroElegido({
      isbn: normalizarIsbn(isbn),
      titulo: tituloManual,
      autor: '',
      editorial: editorialManual,
      imagen_url: '',
    })
    setManual(false)
  }

  async function buscarPorTexto(e) {
    e.preventDefault()
    setError(null)
    setCandidatos(null)
    setBuscando(true)

    const q = texto.trim()
    const resultados = []
    const isbnsVistos = new Set()

    const { data: propios } = await supabase
      .from('libros')
      .select('isbn, titulo, autor, editorial, imagen_url')
      .or(`titulo.ilike.%${q}%,editorial.ilike.%${q}%`)
      .limit(8)

    for (const libro of propios || []) {
      resultados.push({ ...libro, fuente: 'catalogo' })
      isbnsVistos.add(libro.isbn)
    }

    try {
      const res = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=8`
      )
      const data = await res.json()
      for (const item of data.items || []) {
        const info = item.volumeInfo
        const ids = info.industryIdentifiers || []
        const id13 = ids.find((i) => i.type === 'ISBN_13')
        const id10 = ids.find((i) => i.type === 'ISBN_10')
        const isbnItem = id13?.identifier || id10?.identifier
        if (!isbnItem || isbnsVistos.has(isbnItem)) continue
        isbnsVistos.add(isbnItem)
        resultados.push({
          isbn: isbnItem,
          titulo: info.title || 'Sin título',
          autor: (info.authors || []).join(', '),
          editorial: info.publisher || '',
          imagen_url: info.imageLinks?.thumbnail || '',
          fuente: 'google',
        })
      }
    } catch (e) {
      console.error('Google Books texto falló:', e)
    }

    setCandidatos(resultados)
    setBuscando(false)
  }

async function registrarBusqueda() {
    setError(null)
    setGuardando(true)

    const libro = {
      isbn: libroElegido.isbn,
      titulo: libroElegido.titulo,
      autor: libroElegido.autor,
      editorial: libroElegido.editorial,
      imagen_url: libroElegido.imagen_url,
    }

    const { error: errorLibro } = await supabase
      .from('libros')
      .upsert(libro, { onConflict: 'isbn', ignoreDuplicates: true })

    if (errorLibro) {
      console.error('Error guardando libro:', errorLibro)
      setError('No pudimos guardar el libro. Probá de nuevo.')
      setGuardando(false)
      return
    }

    const { error: errorBusqueda } = await supabase.from('busquedas').insert({
      comprador_id: usuario.id,
      isbn: libro.isbn,
    })

    if (errorBusqueda) {
      if (errorBusqueda.code === '23505') {
        setError('Ya estás buscando este libro — está en tu lista de abajo.')
      } else {
        console.error('Error registrando búsqueda:', errorBusqueda)
        setError('No pudimos registrar la búsqueda. Probá de nuevo.')
      }
      setGuardando(false)
      return
    }

    // Traemos ofertas y, aparte, los nombres/colegios de sus vendedores (vía vista pública)
    const { data: ofertas } = await supabase
      .from('ofertas')
      .select('id, vendedor_id, precio, estado_libro')
      .eq('isbn', libro.isbn)
      .eq('estado', 'disponible')
      .order('precio', { ascending: true })

    let ofertasConVendedor = ofertas || []
    if (ofertasConVendedor.length > 0) {
      const vendedorIds = [...new Set(ofertasConVendedor.map((o) => o.vendedor_id))]
      const { data: perfiles } = await supabase
        .from('perfiles_publicos')
        .select('id, nombre, colegio_id')
        .in('id', vendedorIds)

      const colegioIds = [
        ...new Set((perfiles || []).map((p) => p.colegio_id).filter(Boolean)),
      ]
      let nombresColegios = {}
      if (colegioIds.length > 0) {
        const { data: cols } = await supabase
          .from('colegios')
          .select('id, nombre')
          .in('id', colegioIds)
        for (const c of cols || []) nombresColegios[c.id] = c.nombre
      }

      const perfilPorId = {}
      for (const p of perfiles || []) {
        perfilPorId[p.id] = {
          nombre: p.nombre,
          colegio: nombresColegios[p.colegio_id] || null,
        }
      }

      ofertasConVendedor = ofertasConVendedor.map((o) => ({
        ...o,
        perfiles: perfilPorId[o.vendedor_id] || { nombre: '', colegio: null },
      }))
    }

    setLibroBuscado(libro)
    setMatches(ofertasConVendedor)
    setLibroElegido(null)
    setGuardando(false)
    cargarMisBusquedas(usuario.id)
  }

  async function cargarMisBusquedas(usuarioId) {
    const { data } = await supabase
      .from('busquedas')
      .select('id, estado, creado_en, libros (isbn, titulo, editorial, imagen_url)')
      .eq('comprador_id', usuarioId)
      .order('creado_en', { ascending: false })

    setMisBusquedas(data || [])

    const isbns = (data || [])
      .filter((b) => b.estado === 'activa')
      .map((b) => b.libros?.isbn)
      .filter(Boolean)

    if (isbns.length > 0) {
      const { data: ofertas } = await supabase
        .from('ofertas')
        .select('isbn')
        .in('isbn', isbns)
        .eq('estado', 'disponible')

      const conteo = {}
      for (const o of ofertas || []) {
        conteo[o.isbn] = (conteo[o.isbn] || 0) + 1
      }
      setOfertasPorIsbn(conteo)
    } else {
      setOfertasPorIsbn({})
    }
  }

  async function marcarConseguida(busquedaId) {
    const { error } = await supabase
      .from('busquedas')
      .update({ estado: 'conseguida' })
      .eq('id', busquedaId)
    if (error) {
      console.error('Error marcando conseguida:', error)
      return
    }
    cargarMisBusquedas(usuario.id)
  }

  async function eliminarBusqueda(busquedaId) {
    if (!confirm('¿Eliminar esta búsqueda?')) return
    const { error } = await supabase
      .from('busquedas')
      .delete()
      .eq('id', busquedaId)
    if (error) {
      console.error('Error eliminando búsqueda:', error)
      return
    }
    cargarMisBusquedas(usuario.id)
  }

  function nuevaBusqueda() {
    setMatches(null)
    setLibroBuscado(null)
    setLibroElegido(null)
    setCandidatos(null)
    setTexto('')
    setIsbn('')
    setManual(false)
    setTituloManual('')
    setEditorialManual('')
    setError(null)
  }

  if (!usuario) return null

  return (
    <main className="flex-1 bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto mt-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Buscar un libro</h1>
          <Link href="/" className="text-sm text-blue-600 hover:underline">
            ← Volver al inicio
          </Link>
        </div>

        {matches !== null ? (
          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex gap-4 items-start mb-4">
              {libroBuscado?.imagen_url ? (
                <img
                  src={libroBuscado.imagen_url}
                  alt={libroBuscado.titulo}
                  className="w-14 rounded"
                />
              ) : (
                <div className="w-14 h-20 bg-gray-100 rounded flex items-center justify-center text-2xl">
                  📖
                </div>
              )}
              <div>
                <p className="font-medium">{libroBuscado?.titulo}</p>
                <p className="text-sm text-gray-500">
                  {libroBuscado?.editorial}
                </p>
              </div>
            </div>

            {matches.length > 0 ? (
              <>
                <p className="text-green-700 font-bold text-lg mb-3">
                  🎉 ¡{matches.length}{' '}
                  {matches.length === 1
                    ? 'padre está vendiendo'
                    : 'padres están vendiendo'}{' '}
                  este libro!
                </p>
                <ul className="space-y-2 mb-4">
                  {matches.map((oferta) => (
                    <li
                      key={oferta.id}
                      className="border rounded-lg p-3 flex items-center justify-between"
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {oferta.perfiles?.nombre}
                          {oferta.perfiles?.colegio &&
                            ` · ${oferta.perfiles.colegio}`}
                        </p>
                        <p className="text-xs text-gray-500">
                          {oferta.estado_libro === 'como_nuevo'
                            ? 'Como nuevo'
                            : oferta.estado_libro === 'bueno'
                              ? 'Bueno'
                              : 'Con uso'}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="font-bold text-green-700">
                          ${oferta.precio.toLocaleString('es-AR')}
                        </p>
                        <BotonContactar
                          ofertaId={oferta.id}
                          titulo={libroBuscado?.titulo}
                          vendedorNombre={oferta.perfiles?.nombre}
                          esPropia={oferta.vendedor_id === usuario.id}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="text-gray-600 mb-4">
                Nadie está vendiendo este libro todavía. Tu búsqueda quedó
                registrada — revisá tu lista cada tanto, los libros aparecen
                a medida que otros padres los publican.
              </p>
            )}

            <button
              onClick={nuevaBusqueda}
              className="w-full bg-blue-600 text-white rounded-lg py-2 font-medium hover:bg-blue-700"
            >
              Buscar otro libro
            </button>
          </div>
        ) : libroElegido ? (
          <div className="bg-white rounded-xl shadow p-6 space-y-4">
            <div className="flex gap-4 items-start bg-gray-50 rounded-lg p-4">
              {libroElegido.imagen_url ? (
                <img
                  src={libroElegido.imagen_url}
                  alt={libroElegido.titulo}
                  className="w-16 rounded"
                />
              ) : (
                <div className="w-16 h-22 bg-gray-100 rounded flex items-center justify-center text-2xl">
                  📖
                </div>
              )}
              <div>
                <p className="font-medium">{libroElegido.titulo}</p>
                <p className="text-sm text-gray-500">{libroElegido.autor}</p>
                <p className="text-sm text-gray-500">
                  {libroElegido.editorial}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  ISBN {libroElegido.isbn}
                </p>
              </div>
            </div>
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <button
              onClick={registrarBusqueda}
              disabled={guardando}
              className="w-full bg-green-600 text-white rounded-lg py-2 font-medium hover:bg-green-700 disabled:opacity-50"
            >
              {guardando ? 'Registrando...' : '🔎 Buscar este libro'}
            </button>
            <button
              onClick={nuevaBusqueda}
              className="w-full text-sm text-gray-500 hover:text-gray-700"
            >
              ← No es este, volver
            </button>
          </div>
        ) : manual ? (
          <form
            onSubmit={confirmarManual}
            className="bg-white rounded-xl shadow p-6 space-y-4"
          >
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
              No encontramos ese ISBN en los catálogos. Completá los datos
              como figuran en tu lista del colegio.
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Título</label>
              <input
                type="text"
                required
                value={tituloManual}
                onChange={(e) => setTituloManual(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Editorial
              </label>
              <input
                type="text"
                required
                value={editorialManual}
                onChange={(e) => setEditorialManual(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
                placeholder="Ej: Santillana"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 text-white rounded-lg py-2 font-medium hover:bg-blue-700"
            >
              Continuar
            </button>
            <button
              type="button"
              onClick={nuevaBusqueda}
              className="w-full text-sm text-gray-500 hover:text-gray-700"
            >
              ← Volver
            </button>
          </form>
        ) : (
          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex rounded-lg border overflow-hidden mb-5">
              <button
                onClick={() => {
                  setModo('titulo')
                  setError(null)
                }}
                className={`flex-1 py-2 text-sm font-medium ${
                  modo === 'titulo'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-600'
                }`}
              >
                Por título
              </button>
              <button
                onClick={() => {
                  setModo('isbn')
                  setError(null)
                }}
                className={`flex-1 py-2 text-sm font-medium ${
                  modo === 'isbn'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-600'
                }`}
              >
                Por ISBN
              </button>
            </div>

            {modo === 'isbn' ? (
              escaneando ? (
                <EscanerIsbn
                  onDetectado={procesarEscaneo}
                  onError={(msj) => {
                    setEscaneando(false)
                    setError(msj)
                  }}
                  onCerrar={() => setEscaneando(false)}
                />
              ) : (
                <form onSubmit={submitIsbn} className="space-y-4">
                  <button
                    type="button"
                    onClick={() => {
                      setError(null)
                      setEscaneando(true)
                    }}
                    className="w-full bg-blue-600 text-white rounded-lg py-3 font-medium hover:bg-blue-700"
                  >
                    📷 Escanear código de barras
                  </button>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 border-t" />
                    <span className="text-xs text-gray-400">o tipealo</span>
                    <div className="flex-1 border-t" />
                  </div>
                  <input
                    type="text"
                    value={isbn}
                    onChange={(e) => setIsbn(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="Ej: 9789504657378"
                    inputMode="numeric"
                  />
                  <button
                    type="submit"
                    disabled={buscando || !isbn}
                    className="w-full bg-gray-800 text-white rounded-lg py-2 font-medium hover:bg-gray-900 disabled:opacity-50"
                  >
                    {buscando ? 'Buscando...' : 'Buscar libro'}
                  </button>
                </form>
              )
            ) : (
              <form onSubmit={buscarPorTexto} className="space-y-4">
                <input
                  type="text"
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="Ej: Matemática 5 Santillana"
                />
                <button
                  type="submit"
                  disabled={buscando || texto.trim().length < 3}
                  className="w-full bg-gray-800 text-white rounded-lg py-2 font-medium hover:bg-gray-900 disabled:opacity-50"
                >
                  {buscando ? 'Buscando...' : 'Buscar'}
                </button>
              </form>
            )}

            {error && <p className="text-red-600 text-sm mt-3">{error}</p>}

            {candidatos !== null && modo === 'titulo' && (
              <div className="mt-5">
                {candidatos.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    No encontramos candidatos. Probá con menos palabras, o si
                    tenés el ISBN en la lista del colegio, usá la pestaña
                    &quot;Por ISBN&quot;.
                  </p>
                ) : (
                  <>
                    <p className="text-sm text-gray-500 mb-2">
                      ¿Cuál de estos es? Tocá el tuyo:
                    </p>
                    <ul className="space-y-2">
                      {candidatos.map((c) => (
                        <li key={c.isbn}>
                          <button
                            onClick={() => {
                              setLibroElegido(c)
                              setError(null)
                            }}
                            className="w-full text-left border rounded-lg p-3 flex items-center gap-3 hover:border-blue-400 hover:bg-blue-50"
                          >
                            {c.imagen_url ? (
                              <img
                                src={c.imagen_url}
                                alt={c.titulo}
                                className="w-10 h-14 object-cover rounded"
                              />
                            ) : (
                              <div className="w-10 h-14 bg-gray-100 rounded flex items-center justify-center">
                                📖
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {c.titulo}
                              </p>
                              <p className="text-xs text-gray-500 truncate">
                                {c.editorial}
                                {c.autor && ` · ${c.autor}`}
                              </p>
                            </div>
                            {c.fuente === 'catalogo' && (
                              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full whitespace-nowrap">
                                En Libracos
                              </span>
                            )}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        <div className="mt-8">
          <h2 className="text-lg font-bold mb-3">Mis búsquedas</h2>
          {misBusquedas === null ? (
            <p className="text-gray-500 text-sm">Cargando...</p>
          ) : misBusquedas.length === 0 ? (
            <p className="text-gray-500 text-sm bg-white rounded-xl shadow p-4">
              Todavía no estás buscando ningún libro.
            </p>
          ) : (
            <ul className="space-y-2">
              {misBusquedas.map((b) => (
                <li
                  key={b.id}
                  className={`bg-white rounded-xl shadow p-3 flex items-center gap-3 ${
                    b.estado === 'conseguida' ? 'opacity-60' : ''
                  }`}
                >
                  {b.libros?.imagen_url ? (
                    <img
                      src={b.libros.imagen_url}
                      alt={b.libros.titulo}
                      className="w-10 h-14 object-cover rounded"
                    />
                  ) : (
                    <div className="w-10 h-14 bg-gray-100 rounded flex items-center justify-center">
                      📖
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {b.libros?.titulo}
                      {b.estado === 'conseguida' && (
                        <span className="ml-2 text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
                          Conseguido
                        </span>
                      )}
                    </p>
                    {b.estado === 'activa' &&
                      (ofertasPorIsbn[b.libros?.isbn] ? (
                        <p className="text-xs text-green-700 font-medium">
                          🎉 {ofertasPorIsbn[b.libros.isbn]}{' '}
                          {ofertasPorIsbn[b.libros.isbn] === 1
                            ? 'padre lo vende'
                            : 'padres lo venden'}
                        </p>
                      ) : (
                        <p className="text-xs text-gray-400">
                          Sin ofertas por ahora
                        </p>
                      ))}
                  </div>
                  <div className="flex gap-3 text-xs whitespace-nowrap">
                    {b.estado === 'activa' && (
                      <button
                        onClick={() => marcarConseguida(b.id)}
                        className="text-green-700 font-medium hover:underline"
                      >
                        ✓ Lo conseguí
                      </button>
                    )}
                    <button
                      onClick={() => eliminarBusqueda(b.id)}
                      className="text-red-500 hover:underline"
                    >
                      Eliminar
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  )
}