'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

// Colegios disponibles en el desplegable.
// A medida que Libracos crezca, se suman acá (y en el futuro, F-2: tabla en la base)
const COLEGIOS = ['Norbridge Sede Saavedra']

const OTRO = 'otro'

export default function RegistroPage() {
  const router = useRouter()
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [colegioSeleccion, setColegioSeleccion] = useState(COLEGIOS[0])
  const [colegioOtro, setColegioOtro] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [cargando, setCargando] = useState(false)

  const esOtro = colegioSeleccion === OTRO

  async function handleRegistro(e) {
    e.preventDefault()
    setError(null)

    const colegio = esOtro ? colegioOtro.trim() : colegioSeleccion
    if (!colegio) {
      setError('Contanos el nombre de tu colegio.')
      return
    }

    setCargando(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nombre, telefono, colegio },
      },
    })

    if (error) {
      console.error('Error de registro completo:', error)
      setError(error.message || JSON.stringify(error))
      setCargando(false)
      return
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
            <label className="block text-sm font-medium mb-1">
              WhatsApp
            </label>
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
            <select
              value={colegioSeleccion}
              onChange={(e) => setColegioSeleccion(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 bg-white"
            >
              {COLEGIOS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
              <option value={OTRO}>Otro colegio...</option>
            </select>
          </div>

          {esOtro && (
            <div>
              <label className="block text-sm font-medium mb-1">
                ¿Cuál es tu colegio?
              </label>
              <input
                type="text"
                required
                value={colegioOtro}
                onChange={(e) => setColegioOtro(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
                placeholder="Ej: San José de Flores"
              />
            </div>
          )}

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
            <label className="block text-sm font-medium mb-1">
              Contraseña
            </label>
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

          {error && (
            <p className="text-red-600 text-sm">{error}</p>
          )}

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