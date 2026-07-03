'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function BotonContactar({ ofertaId, titulo, vendedorNombre, esPropia }) {
  const supabase = createClient()
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState(null)

  async function contactar() {
    setError(null)
    setCargando(true)

    const { data: telefono, error } = await supabase.rpc(
      'contactar_vendedor',
      { oferta: ofertaId }
    )

    setCargando(false)

    if (error || !telefono) {
      console.error('Error contactando:', error?.message || JSON.stringify(error))
      setError(error?.message || 'No pudimos obtener el contacto. Probá de nuevo.')
      return
    }

    // Armar el link de WhatsApp con mensaje pre-cargado
    const numero = telefono.replace(/[^\d]/g, '')
    const mensaje = encodeURIComponent(
      `¡Hola ${vendedorNombre}! Vi en Libracos que estás vendiendo "${titulo}". ¿Sigue disponible?`
    )
    window.open(`https://wa.me/549${numero}?text=${mensaje}`, '_blank')
  }

  if (esPropia) {
    return (
      <span className="text-sm text-gray-400 px-3 py-1.5 border border-gray-200 rounded-lg whitespace-nowrap">
        Publicación propia
      </span>
    )
  }

  return (
    <div className="text-right">
      <button
        onClick={contactar}
        disabled={cargando}
        className="text-sm bg-green-600 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 whitespace-nowrap"
      >
        {cargando ? '...' : '💬 Contactar'}
      </button>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  )
}