'use client'

import { useState, useEffect, useRef } from 'react'

export default function BuscadorColegio({ onSeleccionado }) {
  const [texto, setTexto] = useState('')
  const [resultados, setResultados] = useState([])
  const [buscando, setBuscando] = useState(false)
  const [elegido, setElegido] = useState(null)
  const [sinResultados, setSinResultados] = useState(false)
  const timeoutRef = useRef(null)

  useEffect(() => {
    if (elegido) return
    if (texto.trim().length < 4) {
      setResultados([])
      setSinResultados(false)
      return
    }

    if (timeoutRef.current) clearTimeout(timeoutRef.current)

    timeoutRef.current = setTimeout(async () => {
      setBuscando(true)
      setSinResultados(false)
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
            texto
          )}&format=json&countrycodes=ar&limit=6&addressdetails=1`
        )
        const data = await res.json()
        setResultados(data || [])
        setSinResultados((data || []).length === 0)
      } catch (e) {
        console.error('Error buscando colegio:', e)
        setResultados([])
      }
      setBuscando(false)
    }, 700)

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [texto, elegido])

  function elegirColegio(lugar) {
    setElegido(lugar)
    setResultados([])
    // Solo avisamos el lugar crudo del mapa; el guardado se hace al registrarse
    onSeleccionado({
      osm_place_id: lugar.place_id,
      nombre: lugar.name || lugar.display_name.split(',')[0],
      direccion: lugar.display_name,
      lat: parseFloat(lugar.lat),
      lon: parseFloat(lugar.lon),
    })
  }

  function reiniciar() {
    setElegido(null)
    setTexto('')
    setResultados([])
    setSinResultados(false)
    onSeleccionado(null)
  }

  if (elegido) {
    return (
      <div className="border rounded-lg px-3 py-2 bg-green-50 border-green-200 flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">
            {elegido.name || elegido.display_name.split(',')[0]}
          </p>
          <p className="text-xs text-gray-500 truncate">
            {elegido.display_name}
          </p>
        </div>
        <button
          type="button"
          onClick={reiniciar}
          className="text-xs text-blue-600 hover:underline whitespace-nowrap ml-2"
        >
          Cambiar
        </button>
      </div>
    )
  }

  return (
    <div>
      <input
        type="text"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        className="w-full border rounded-lg px-3 py-2"
        placeholder="Escribí el nombre del colegio"
      />
      {buscando && (
        <p className="text-xs text-gray-400 mt-1">Buscando colegios...</p>
      )}
      {resultados.length > 0 && (
        <ul className="border rounded-lg mt-1 divide-y max-h-60 overflow-y-auto">
          {resultados.map((lugar) => (
            <li key={lugar.place_id}>
              <button
                type="button"
                onClick={() => elegirColegio(lugar)}
                className="w-full text-left px-3 py-2 hover:bg-blue-50"
              >
                <p className="text-sm font-medium">
                  {lugar.name || lugar.display_name.split(',')[0]}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {lugar.display_name}
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}
      {sinResultados && (
        <p className="text-xs text-amber-600 mt-1">
          No encontramos ese colegio. Probá agregando el barrio (ej: &quot;San
          Martín Caballito&quot;) o revisá cómo lo escribiste.
        </p>
      )}
    </div>
  )
}