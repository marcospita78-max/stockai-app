import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [comercio, setComercio] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Verificar sesión activa al iniciar
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) cargarComercio(session.user.id)
      else setLoading(false)
    })

    // Escuchar cambios de sesión
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) cargarComercio(session.user.id)
      else { setComercio(null); setLoading(false) }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function cargarComercio(userId) {
    const { data } = await supabase
      .from('comercios')
      .select('*, localidades(nombre, provincia_id, provincias(nombre))')
      .eq('user_id', userId)
      .single()
    setComercio(data)
    setLoading(false)
  }

  async function signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  async function signUp(email, password) {
    const { error } = await supabase.auth.signUp({ email, password })
    return { error }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, comercio, setComercio, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
