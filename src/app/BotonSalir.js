'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function BotonSalir() {
  const router = useRouter()

  async function handleSalir() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <button
      onClick={handleSalir}
      className="text-sm text-gray-500 hover:text-gray-700"
    >
      Salir
    </button>
  )
}