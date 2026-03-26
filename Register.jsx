// src/pages/Register.jsx
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Button } from '../components/UI'
import styles from './Auth.module.css'

export default function Register() {
  const { register } = useAuth()
  const navigate     = useNavigate()

  const [name,     setName]     = useState('')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!name || !email || !password) { setError('Completa todos los campos.'); return }
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres.'); return }

    setLoading(true)
    const result = await register(name.trim(), email.trim(), password)
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

        <h1 className={styles.title}>Crear cuenta</h1>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label>Nombre completo</label>
            <input
              type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder="Tu nombre" autoComplete="name" required
            />
          </div>
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
              placeholder="Mínimo 6 caracteres" autoComplete="new-password" required
            />
          </div>

          {error && <div className={styles.error}>⚠️ {error}</div>}

          <Button type="submit" loading={loading} style={{ width:'100%', justifyContent:'center', height:44 }}>
            {loading ? 'Creando cuenta...' : 'Registrarse'}
          </Button>
        </form>

        <p className={styles.switch}>
          ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
        </p>
      </div>
    </div>
  )
}
