// src/pages/Login.jsx
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Button } from '../components/UI'
import styles from './Auth.module.css'

export default function Login() {
  const { login } = useAuth()
  const navigate  = useNavigate()

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!email || !password) { setError('Completa todos los campos.'); return }

    setLoading(true)
    const result = await login(email.trim(), password)
    setLoading(false)

    if (result.ok) navigate('/')
    else setError(result.error)
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo}>
          <div className={styles.logoIcon}>🌱</div>
          <div>
            <div className={styles.logoName}>EcoAlert</div>
            <div className={styles.logoSub}>Sistema de Reportes</div>
          </div>
        </div>

        <h1 className={styles.title}>Iniciar sesión</h1>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label>Correo electrónico</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="correo@ejemplo.com" autoComplete="email" required
            />
          </div>
          <div className={styles.field}>
            <label>Contraseña</label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••" autoComplete="current-password" required
            />
          </div>

          {error && <div className={styles.error}>⚠️ {error}</div>}

          <Button type="submit" loading={loading} style={{ width:'100%', justifyContent:'center', height:44 }}>
            {loading ? 'Ingresando...' : 'Iniciar sesión'}
          </Button>
        </form>

        <p className={styles.switch}>
          ¿No tienes cuenta? <Link to="/register">Regístrate</Link>
        </p>
      </div>
    </div>
  )
}
