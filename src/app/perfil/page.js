'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import BuscadorColegio from '../registro/BuscadorColegio'

export default function PerfilPage() {
  const router = useRouter()
  const supabase = createClient()

  const [usuario, setUsuario] = useState(null)
  const [cargandoInicial, setCargandoInicial] = useState(true)

  // Datos del perfil
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [colegioActual, setColegioActual] = useState(null) // { nombre } del colegio ya guardado
  const [colegioNuevo, setColegioNuevo] = useState(null) // si elige uno nuevo del buscador
  const [cambiarColegio, setCambiarColegio] = useState(false)

  const [guardando, setGuardando] = useState(false)
  const [okDatos, setOkDatos] = useState(false)
  const [errorDatos, setErrorDatos] = useState(null)

  // Contraseña
  const [pass1, setPass1] = useState('')
  const [pass2, setPass2] = useState('')
  const [guardandoPass, setGuardandoPass] = useState(false)
  const [okPass, setOkPass] = useState(false)
  const [errorPass, setErrorPass] = useState(null)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        router.push('/login')
        return
      }
      setUsuario(user)

      const { data: perfil } = await supabase
        .from('perfiles')
        .select('nombre, telefono, colegios (nombre)')
        .eq('id', user.id)
        .maybeSingle()

      if (perfil) {
        setNombre(perfil.nombre || '')
        setTelefono(perfil.telefono || '')
        setColegioActual(perfil.colegios || null)
      }
      setCargandoInicial(false)
    })
  }, [])

  async function guardarDatos(e) {
    e.preventDefault()
    setErrorDatos(null)
    setOkDatos(false)
    setGuardando(true)

    const cambios = { nombre, telefono }

    // Si eligió un colegio nuevo, lo buscamos-o-creamos y lo asociamos
    if (cambiarColegio && colegioNuevo) {
      let colegioId
      const { data: existente } = await supabase
        .from('colegios')
        .select('id')
        .eq('osm_place_id', colegioNuevo.osm_place_id)
        .maybeSingle()

      if (existente) {
        colegioId = existente.id
      } else {
        const { data: nuevo, error: errorCrear } = await supabase
          .from('colegios')
          .insert({
            osm_place_id: colegioNuevo.osm_place_id,
            nombre: colegioNuevo.nombre,
            direccion: colegioNuevo.direccion,
            lat: colegioNuevo.lat,
            lon: colegioNuevo.lon,
          })
          .select('id')
          .single()

        if (errorCrear) {
          const { data: reintento } = await supabase
            .from('colegios')
            .select('id')
            .eq('osm_place_id', colegioNuevo.osm_place_id)
            .maybeSingle()
          colegioId = reintento?.id
        } else {
          colegioId = nuevo.id
        }
      }

      if (colegioId) {
        cambios.colegio_id = colegioId
        cambios.colegio = colegioNuevo.nombre // mantenemos el texto sincronizado
      }
    }

    const { error } = await supabase
      .from('perfiles')
      .update(cambios)
      .eq('id', usuario.id)

    setGuardando(false)

    if (error) {
      console.error('Error guardando perfil:', error)
      setErrorDatos('No pudimos guardar los cambios. Probá de nuevo.')
      return
    }

    // Reflejar el cambio de colegio en pantalla
    if (cambios.colegio_id && colegioNuevo) {
      setColegioActual({ nombre: colegioNuevo.nombre })
      setCambiarColegio(false)
      setColegioNuevo(null)
    }
    setOkDatos(true)
  }

  async function guardarPassword(e) {
    e.preventDefault()
    setErrorPass(null)
    setOkPass(false)

    if (pass1.length < 6) {
      setErrorPass('La contraseña debe tener al menos 6 caracteres.')
      return
    }
    if (pass1 !== pass2) {
      setErrorPass('Las contraseñas no coinciden.')
      return
    }

    setGuardandoPass(true)
    const { error } = await supabase.auth.updateUser({ password: pass1 })
    setGuardandoPass(false)

    if (error) {
      console.error('Error cambiando contraseña:', error)
      setErrorPass('No pudimos cambiar la contraseña. Probá de nuevo.')
      return
    }

    setPass1('')
    setPass2('')
    setOkPass(true)
  }

  if (cargandoInicial) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Cargando...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto mt-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Mi perfil</h1>
          <Link href="/" className="text-sm text-blue-600 hover:underline">
            ← Volver al inicio
          </Link>
        </div>

        {/* Datos personales */}
        <form
          onSubmit={guardarDatos}
          className="bg-white rounded-xl shadow p-6 space-y-4 mb-6"
        >
          <h2 className="font-bold">Datos personales</h2>

          <div>
            <label className="block text-sm font-medium mb-1">Nombre</label>
            <input
              type="text"
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
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
            <label className="block text-sm font-medium mb-1">Colegio</label>
            {!cambiarColegio ? (
              <div className="flex items-center justify-between border rounded-lg px-3 py-2 bg-gray-50">
                <span className="text-sm">
                  {colegioActual?.nombre || 'Sin colegio asignado'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setCambiarColegio(true)
                    setOkDatos(false)
                  }}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Cambiar
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <BuscadorColegio onSeleccionado={setColegioNuevo} />
                <button
                  type="button"
                  onClick={() => {
                    setCambiarColegio(false)
                    setColegioNuevo(null)
                  }}
                  className="text-xs text-gray-500 hover:underline"
                >
                  Cancelar cambio de colegio
                </button>
              </div>
            )}
          </div>

          {errorDatos && (
            <p className="text-red-600 text-sm">{errorDatos}</p>
          )}
          {okDatos && (
            <p className="text-green-700 text-sm">✓ Cambios guardados.</p>
          )}

          <button
            type="submit"
            disabled={guardando}
            className="w-full bg-blue-600 text-white rounded-lg py-2 font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {guardando ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </form>

        {/* Contraseña */}
        <form
          onSubmit={guardarPassword}
          className="bg-white rounded-xl shadow p-6 space-y-4"
        >
          <h2 className="font-bold">Cambiar contraseña</h2>

          <div>
            <label className="block text-sm font-medium mb-1">
              Nueva contraseña
            </label>
            <input
              type="password"
              value={pass1}
              onChange={(e) => setPass1(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="Mínimo 6 caracteres"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Repetir contraseña
            </label>
            <input
              type="password"
              value={pass2}
              onChange={(e) => setPass2(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>

          {errorPass && <p className="text-red-600 text-sm">{errorPass}</p>}
          {okPass && (
            <p className="text-green-700 text-sm">
              ✓ Contraseña actualizada.
            </p>
          )}

          <button
            type="submit"
            disabled={guardandoPass || !pass1}
            className="w-full bg-gray-800 text-white rounded-lg py-2 font-medium hover:bg-gray-900 disabled:opacity-50"
          >
            {guardandoPass ? 'Guardando...' : 'Cambiar contraseña'}
          </button>
        </form>
      </div>
    </main>
  )
}