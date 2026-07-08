'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import BuscadorColegio from './BuscadorColegio'
import { buscarOCrearColegio } from '@/lib/colegios'

export default function RegistroPage() {
  const router = useRouter()
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [colegio, setColegio] = useState(null) // { osm_place_id, nombre, direccion, lat, lon } | null
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [cargando, setCargando] = useState(false)
  const [aceptaPrivacidad, setAceptaPrivacidad] = useState(false)
  const [abrioPrivacidad, setAbrioPrivacidad] = useState(false)
  const [esMayor, setEsMayor] = useState(false)

  async function handleRegistro(e) {
    e.preventDefault()
    setError(null)

    if (!colegio) {
      setError('Elegí tu colegio de la lista para continuar.')
      return
    }

    const telefonoLimpio = telefono.replace(/[\s-]/g, '')
    if (!/^\d{10}$/.test(telefonoLimpio)) {
      setError(
        'El WhatsApp tiene que ser de 10 dígitos, sin 0 ni 15. Ej: 1155556666 (código de área + número).'
      )
      return
    }

    if (!aceptaPrivacidad) {
      setError('Tenés que aceptar la política de privacidad para registrarte.')
      return
    }

    if (!esMayor) {
      setError('Tenés que declarar que sos mayor de 18 años para registrarte.')
      return
    }

    setCargando(true)

    const supabase = createClient()
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nombre, telefono: telefonoLimpio, colegio: colegio.nombre },
      },
    })

    if (error) {
      console.error('Error de registro completo:', error)
      setError(error.message || JSON.stringify(error))
      setCargando(false)
      return
    }

    // Ya hay sesión: buscar-o-crear el colegio (dedup por place_id y coordenadas) y asociarlo
    if (data.user) {
      const colegioId = await buscarOCrearColegio(supabase, colegio)
      if (colegioId) {
        await supabase
          .from('perfiles')
          .update({ colegio_id: colegioId })
          .eq('id', data.user.id)
      }
    }

    router.push('/')
    router.refresh()
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow p-8">
        <h1 className="text-2xl font-bold mb-1">Crear cuenta</h1>
        <p className="text-gray-500 mb-6">
          Registrate para publicar y encontrar libros
        </p>

        <form onSubmit={handleRegistro} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nombre</label>
            <input
              type="text"
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="Tu nombre y apellido"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">WhatsApp</label>
            <input
              type="tel"
              required
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="Ej: 1155556666"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Colegio de tus hijos
            </label>
            <BuscadorColegio onSeleccionado={setColegio} />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="tu@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Contraseña</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="Mínimo 6 caracteres"
            />
          </div>

          <div className="flex items-start gap-2">
            <input
              type="checkbox"
              id="privacidad"
              checked={aceptaPrivacidad}
              disabled={!abrioPrivacidad}
              onChange={(e) => setAceptaPrivacidad(e.target.checked)}
              className="mt-1 disabled:opacity-40"
            />
            <label htmlFor="privacidad" className="text-sm text-gray-600">
              {abrioPrivacidad ? (
                <>Leí y acepto la </>
              ) : (
                <>Para continuar, abrí y leé la </>
              )}
              <Link
                href="/privacidad"
                target="_blank"
                onClick={() => setAbrioPrivacidad(true)}
                className="text-blue-600 hover:underline font-medium"
              >
                política de privacidad
              </Link>
              .
            </label>
          </div>

          <div className="flex items-start gap-2">
            <input
              type="checkbox"
              id="mayor"
              checked={esMayor}
              onChange={(e) => setEsMayor(e.target.checked)}
              className="mt-1"
            />
            <label htmlFor="mayor" className="text-sm text-gray-600">
              Declaro que soy mayor de 18 años.
            </label>
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={cargando}
            className="w-full bg-blue-600 text-white rounded-lg py-2 font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {cargando ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>
        </form>

        <p className="text-sm text-gray-500 mt-4 text-center">
          ¿Ya tenés cuenta?{' '}
          <Link href="/login" className="text-blue-600 hover:underline">
            Iniciá sesión
          </Link>
        </p>
      </div>
    </main>
  )
}