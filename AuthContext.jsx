// src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { authAPI } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(() => JSON.parse(localStorage.getItem('eco_user') || 'null'))
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  // Verify token on mount
  useEffect(() => {
    const token = localStorage.getItem('eco_access')
    if (!token) { setLoading(false); return }

    authAPI.me()
      .then(data => { setUser(data.user); localStorage.setItem('eco_user', JSON.stringify(data.user)) })
      .catch(() => { localStorage.clear(); setUser(null) })
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (email, password) => {
    setError(null)
    try {
      const data = await authAPI.login({ email, password })
      localStorage.setItem('eco_access',  data.accessToken)
      localStorage.setItem('eco_refresh', data.refreshToken)
      localStorage.setItem('eco_user',    JSON.stringify(data.user))
      setUser(data.user)
      return { ok: true }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Error al iniciar sesión'
      setError(msg)
      return { ok: false, error: msg }
    }
  }, [])

  const register = useCallback(async (name, email, password) => {
    setError(null)
    try {
      const data = await authAPI.register({ name, email, password, role: 'user' })
      localStorage.setItem('eco_access',  data.accessToken)
      localStorage.setItem('eco_refresh', data.refreshToken)
      localStorage.setItem('eco_user',    JSON.stringify(data.user))
      setUser(data.user)
      return { ok: true }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Error al registrarse'
      setError(msg)
      return { ok: false, error: msg }
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      const rt = localStorage.getItem('eco_refresh')
      if (rt) await authAPI.logout(rt)
    } catch (_) {}
    localStorage.clear()
    setUser(null)
  }, [])

  const isAdmin  = user?.role === 'admin'
  const isStaff  = user?.role === 'admin' || user?.role === 'worker'
  const isLogged = !!user

  return (
    <AuthContext.Provider value={{ user, loading, error, isAdmin, isStaff, isLogged, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
