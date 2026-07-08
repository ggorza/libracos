'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function Header() {
  const router = useRouter()
  const supabase = createClient()
  const [usuario, setUsuario] = useState(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    // Estado inicial
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUsuario(user)
      setCargando(false)
    })

    // Escuchar cambios de sesión (login/logout) para actualizar el header solo
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUsuario(session?.user || null)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function salir() {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <header className="bg-white shadow-sm sticky top-0 z-10">
      <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-blue-600">
          📚 Libracos
        </Link>
        <nav className="flex items-center gap-3">
         <a 
            href="https://cafecito.app/ggorza"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-amber-600 hover:text-amber-700 hidden sm:inline"
            title="Si Libracos te sirvió, invitame un cafecito"
          >
            ☕ Apoyar
          </a>

          {cargando ? null : usuario ? (
            <>
              <Link
                href="/buscar"
                className="text-sm text-blue-600 hover:underline"
              >
                Buscar
              </Link>
              <Link
                href="/vender"
                className="text-sm text-blue-600 hover:underline"
              >
                Vender
              </Link>
              <Link
                href="/perfil"
                className="text-sm text-blue-600 hover:underline"
              >
                Mi perfil
              </Link>
              <button
                onClick={salir}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Salir
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm text-blue-600 hover:underline"
              >
                Iniciar sesión
              </Link>
              <Link
                href="/registro"
                className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700"
              >
                Crear cuenta
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}