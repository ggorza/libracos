'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import EscanerIsbn from './EscanerIsbn'
import MisOfertas from './MisOfertas'


export default function VenderPage() {
  const router = useRouter()
  const supabase = createClient()

  const [usuario, setUsuario] = useState(null)
  const [isbn, setIsbn] = useState('')
  const [libro, setLibro] = useState(null)
  const [precio, setPrecio] = useState('')
  const [estadoLibro, setEstadoLibro] = useState('bueno')
  const [buscando, setBuscando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)
  const [exito, setExito] = useState(false)
  const [manual, setManual] = useState(false)
  const [isbnManual, setIsbnManual] = useState('')
  const [tituloManual, setTituloManual] = useState('')
  const [autorManual, setAutorManual] = useState('')
  const [editorialManual, setEditorialManual] = useState('')
  const [imagenManual, setImagenManual] = useState('')
  const [errorManual, setErrorManual] = useState(null)
  const [escaneando, setEscaneando] = useState(false)


  // Solo usuarios logueados pueden vender
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push('/login')
      } else {
        setUsuario(user)
      }
    })
  }, [])

  function normalizarIsbn(valor) {
    return valor.replace(/[-\s]/g, '')
  }

   function procesarEscaneo(texto) {
    setEscaneando(false)
    const isbnLimpio = normalizarIsbn(texto)
    setIsbn(isbnLimpio)
    if (!isbnValido(isbnLimpio)) {
      setError(
        'El código escaneado no parece un ISBN válido. Probá escanear de nuevo o tipealo a mano.'
      )
      return
    }
    buscarLibroPorIsbn(isbnLimpio)
  }



  // Valida el dígito verificador (ISBN-13 e ISBN-10)
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

  // Parada 1: nuestro propio catálogo
  async function buscarEnCatalogo(isbnLimpio) {
    const { data, error } = await supabase
      .from('libros')
      .select('isbn, titulo, autor, editorial, imagen_url')
      .eq('isbn', isbnLimpio)
      .maybeSingle()
    if (error) {
      console.error('Catálogo propio falló:', error)
      return null
    }
    return data
  }

  // Parada 2: Google Books
  async function buscarEnGoogleBooks(isbnLimpio) {
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

  // Parada 3: OpenLibrary
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

    async function buscarLibroPorIsbn(isbnLimpio) {
    setError(null)
    setLibro(null)
    setBuscando(true)

    let encontrado = await buscarEnCatalogo(isbnLimpio)
    if (!encontrado) encontrado = await buscarEnGoogleBooks(isbnLimpio)
    if (!encontrado) encontrado = await buscarEnOpenLibrary(isbnLimpio)

    if (encontrado) {
      setLibro(encontrado)
    } else {
      setIsbnManual(isbnLimpio)
      setManual(true)
    }
    setBuscando(false)
  }

  async function buscarLibro(e) {
    e.preventDefault()
    setError(null)
    setLibro(null)

    const isbnLimpio = normalizarIsbn(isbn)

    if (!isbnValido(isbnLimpio)) {
      setError(
        'Ese ISBN no es válido (el dígito verificador no coincide). Revisá que esté bien tipeado, es el número junto al código de barras.'
      )
      return
    }

    await buscarLibroPorIsbn(isbnLimpio)
  }






  function confirmarManual(e) {
    e.preventDefault()
    setErrorManual(null)

    const isbnLimpio = normalizarIsbn(isbnManual)
    if (!isbnValido(isbnLimpio)) {
      setErrorManual(
        'Ese ISBN no es válido (el dígito verificador no coincide). Fijate en la contratapa del libro, junto al código de barras.'
      )
      return
    }

    setLibro({
      isbn: isbnLimpio,
      titulo: tituloManual,
      autor: autorManual,
      editorial: editorialManual,
      imagen_url: imagenManual.trim(),
    })
    setManual(false)
  }

  async function publicarOferta() {
    setError(null)
    setGuardando(true)

    // 1. Aseguramos que el libro exista en el catálogo compartido
    const { error: errorLibro } = await supabase
      .from('libros')
      .upsert(libro, { onConflict: 'isbn', ignoreDuplicates: true })

    if (errorLibro) {
      console.error('Error guardando libro:', errorLibro)
      setError('No pudimos guardar el libro. Probá de nuevo.')
      setGuardando(false)
      return
    }

    // 2. Creamos la oferta
    const { error: errorOferta } = await supabase.from('ofertas').insert({
      vendedor_id: usuario.id,
      isbn: libro.isbn,
      precio: parseInt(precio, 10),
      estado_libro: estadoLibro,
    })

    if (errorOferta) {
      console.error('Error creando oferta:', errorOferta)
      setError('No pudimos publicar la oferta. Probá de nuevo.')
      setGuardando(false)
      return
    }

    setExito(true)
    setGuardando(false)
  }

  function reiniciar() {
    setIsbn('')
    setLibro(null)
    setPrecio('')
    setEstadoLibro('bueno')
    setExito(false)
    setError(null)
    setManual(false)
    setIsbnManual('')
    setTituloManual('')
    setAutorManual('')
    setEditorialManual('')
    setImagenManual('')
    setErrorManual(null)
  }

  if (!usuario) return null

  return (
    <main className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto bg-white rounded-xl shadow p-6 mt-8">
        <h1 className="text-2xl font-bold mb-1">Vender un libro</h1>
        <p className="text-gray-500 mb-6">
          Ingresá el ISBN y completamos los datos por vos
        </p>

        {exito ? (
          <div className="text-center py-6">
            <p className="text-3xl mb-2">🎉</p>
            <p className="font-medium mb-4">¡Libro publicado!</p>
            <button
              onClick={reiniciar}
              className="w-full bg-blue-600 text-white rounded-lg py-2 font-medium hover:bg-blue-700"
            >
              Publicar otro libro
            </button>
            <Link
              href="/"
              className="block mt-3 text-sm text-gray-500 hover:text-gray-700"
            >
              ← Volver al inicio
            </Link>
          </div>
        ) : manual ? (
          <form onSubmit={confirmarManual} className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
              No encontramos ese ISBN en los catálogos (pasa seguido con
              libros escolares argentinos). Cargá los datos mirando la tapa,
              es un minuto.
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">ISBN</label>
              <input
                type="text"
                required
                value={isbnManual}
                onChange={(e) => setIsbnManual(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
                inputMode="numeric"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Título</label>
              <input
                type="text"
                required
                value={tituloManual}
                onChange={(e) => setTituloManual(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
                placeholder="Como figura en la tapa"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Autor (opcional)
              </label>
              <input
                type="text"
                value={autorManual}
                onChange={(e) => setAutorManual(e.target.value)}
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
            <div>
              <label className="block text-sm font-medium mb-1">
                URL de la imagen de tapa (opcional)
              </label>
              <input
                type="url"
                value={imagenManual}
                onChange={(e) => setImagenManual(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
                placeholder="https://..."
              />
              <p className="text-xs text-gray-400 mt-1">
                Tip: buscá el libro en Google Imágenes, click derecho en la
                tapa → &quot;Copiar dirección de la imagen&quot;.
              </p>
            </div>
            {errorManual && (
              <p className="text-red-600 text-sm">{errorManual}</p>
            )}
            <button
              type="submit"
              className="w-full bg-blue-600 text-white rounded-lg py-2 font-medium hover:bg-blue-700"
            >
              Continuar
            </button>
            <button
              type="button"
              onClick={reiniciar}
              className="w-full text-sm text-gray-500 hover:text-gray-700"
            >
              ← Probar con otro ISBN
            </button>
          </form>
        
        ) : !libro ? (
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
            <form onSubmit={buscarLibro} className="space-y-4">
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
              <div>
                <label className="block text-sm font-medium mb-1">ISBN</label>
                <input
                  type="text"
                  value={isbn}
                  onChange={(e) => setIsbn(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="Ej: 9789504657378"
                  inputMode="numeric"
                />
              </div>
              <button
                type="submit"
                disabled={buscando || !isbn}
                className="w-full bg-gray-800 text-white rounded-lg py-2 font-medium hover:bg-gray-900 disabled:opacity-50"
              >
                {buscando ? 'Buscando...' : 'Buscar libro'}
              </button>
              {error && <p className="text-red-600 text-sm">{error}</p>}
            </form>
          )
        ) : (
        






          <div className="space-y-4">
            <div className="flex gap-4 items-start bg-gray-50 rounded-lg p-4">
              {libro.imagen_url && (
                <img
                  src={libro.imagen_url}
                  alt={libro.titulo}
                  className="w-16 rounded"
                />
              )}
              <div>
                <p className="font-medium">{libro.titulo}</p>
                <p className="text-sm text-gray-500">{libro.autor}</p>
                <p className="text-sm text-gray-500">{libro.editorial}</p>
                <p className="text-xs text-gray-400 mt-1">ISBN {libro.isbn}</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Precio (en pesos)
              </label>
              <input
                type="number"
                required
                min="0"
                value={precio}
                onChange={(e) => setPrecio(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
                placeholder="Ej: 8000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Estado del libro
              </label>
              <select
                value={estadoLibro}
                onChange={(e) => setEstadoLibro(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 bg-white"
              >
                <option value="como_nuevo">Como nuevo</option>
                <option value="bueno">Bueno (usado, cuidado)</option>
                <option value="con_uso">Con uso (escrito, gastado)</option>
              </select>
            </div>

            {error && <p className="text-red-600 text-sm">{error}</p>}

            <button
              onClick={publicarOferta}
              disabled={guardando || precio === ''}
              className="w-full bg-green-600 text-white rounded-lg py-2 font-medium hover:bg-green-700 disabled:opacity-50"
            >
              {guardando ? 'Publicando...' : 'Publicar oferta'}
            </button>
            <button
              onClick={reiniciar}
              className="w-full text-sm text-gray-500 hover:text-gray-700"
            >
              ← Buscar otro ISBN
            </button>
          </div>
        )}
      </div>

      <div className="max-w-md mx-auto mt-8 pb-8">
        <MisOfertas usuario={usuario} refrescar={exito} />
      </div>

      

    </main>
  )
}