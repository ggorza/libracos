'use client'

import { useEffect, useRef } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

export default function EscanerIsbn({ onDetectado, onError, onCerrar }) {
  const escanerRef = useRef(null)
  const yaDetectoRef = useRef(false)

  useEffect(() => {
    const escaner = new Html5Qrcode('lector-isbn')
    escanerRef.current = escaner

    escaner
      .start(
        { facingMode: 'environment' }, // cámara trasera
        {
          fps: 10,
          qrbox: { width: 250, height: 150 }, // ventana apaisada, forma de código de barras
        },
        (textoDetectado) => {
          // Evita detecciones múltiples del mismo código
          if (yaDetectoRef.current) return
          yaDetectoRef.current = true
          onDetectado(textoDetectado)
        },
        () => {
          // Errores de frame individual: ignorar, es el escaneo intentando
        }
      )
      .catch((err) => {
        console.error('No se pudo iniciar la cámara:', err)
        onError(
          'No pudimos acceder a la cámara. Fijate de darle permiso al navegador, o tipeá el ISBN a mano.'
        )
      })

    // Limpieza al desmontar el componente
    return () => {
      if (escanerRef.current?.isScanning) {
        escanerRef.current.stop().catch(() => {})
      }
    }
  }, [])

  return (
    <div className="space-y-3">
      <div
        id="lector-isbn"
        className="rounded-lg overflow-hidden bg-black"
      />
      <p className="text-xs text-gray-500 text-center">
        Apuntá al código de barras de la contratapa
      </p>
      <button
        type="button"
        onClick={onCerrar}
        className="w-full text-sm text-gray-500 hover:text-gray-700"
      >
        Cancelar y tipear a mano
      </button>
    </div>
  )
}