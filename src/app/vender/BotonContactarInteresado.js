'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function BotonContactarInteresado({
  contactoId,
  titulo,
  compradorNombre,
}) {
  const supabase = createClient()
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState(null)

  async function contactar() {
    setError(null)
    setCargando(true)

    const { data: telefono, error } = await supabase.rpc(
      'contactar_interesado',
      { contacto: contactoId }
    )

    setCargando(false)

    if (error || !telefono) {
      console.error('Error:', error?.message || JSON.stringify(error))
      setError(error?.message || 'No pudimos obtener el contacto.')
      return
    }

    const numero = telefono.replace(/[^\d]/g, '')
    const mensaje = encodeURIComponent(
      `¡Hola ${compradorNombre}! Vi que te interesó mi libro "${titulo}" en Libracos. ¿Lo seguís buscando?`
    )
    window.open(`https://wa.me/549${numero}?text=${mensaje}`, '_blank')
  }

  return (
    <>
      <button
        onClick={contactar}
        disabled={cargando}
        className="text-xs bg-green-600 text-white px-2.5 py-1 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 whitespace-nowrap"
      >
        {cargando ? '...' : '💬 Escribir'}
      </button>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </>
  )
}