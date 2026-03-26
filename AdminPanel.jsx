// src/pages/AdminPanel.jsx
import { useState, useEffect, useCallback } from 'react'
import { usersAPI, reportsAPI, aiAPI } from '../services/api'
import { Card, Button, StatusBadge, PageLoader, Toast, EmptyState } from '../components/UI'
import { useToast } from '../hooks/useToast'
import styles from './AdminPanel.module.css'

export default function AdminPanel() {
  const { toasts, toast } = useToast()

  const [tab,     setTab]     = useState('users')
  const [users,   setUsers]   = useState([])
  const [stats,   setStats]   = useState({})
  const [aiStatus,setAiStatus]= useState({})
  const [loading, setLoading] = useState(true)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [uData, sData, aiData] = await Promise.all([
        usersAPI.getAll({ limit: 100 }),
        reportsAPI.stats(),
        aiAPI.status(),
      ])
      setUsers(uData.data || [])
      if (sData.success) setStats(sData.data || {})
      setAiStatus(aiData)
    } catch (e) {
      toast(e.response?.data?.message || e.message, 'error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const handleRoleChange = async (id, role) => {
    try {
      await usersAPI.update(id, { role })
      toast(`Rol cambiado a: ${role}`, 'success')
      fetchAll()
    } catch (e) { toast(e.response?.data?.message || e.message, 'error') }
  }

  const handleToggleActive = async (id, isActive) => {
    try {
      await usersAPI.update(id, { isActive: !isActive })
      toast(isActive ? 'Usuario desactivado' : 'Usuario activado', 'success')
      fetchAll()
    } catch (e) { toast(e.response?.data?.message || e.message, 'error') }
  }

  const handleDeleteUser = async (id) => {
    if (!window.confirm('¿Eliminar este usuario?')) return
    try {
      await usersAPI.delete(id)
      toast('Usuario eliminado', 'success')
      fetchAll()
    } catch (e) { toast(e.response?.data?.message || e.message, 'error') }
  }

  if (loading) return <PageLoader />

  const ROLE_STYLES = {
    admin:  { color:'#7e22ce', bg:'#faf5ff' },
    worker: { color:'#1d4ed8', bg:'#eff6ff' },
    user:   { color:'#475569', bg:'#f8fafc' },
  }

  return (
    <div className={styles.page}>
      <Toast toasts={toasts} />

      <div className={styles.header}>
        <h1 className={styles.title}>Panel de Administración</h1>
        <Button variant="secondary" size="sm" onClick={fetchAll}>↻ Actualizar</Button>
      </div>

      {/* STATS */}
      <div className={styles.statsRow}>
        {[
          { label:'Total', value:stats.total??0,      color:'var(--text)',       bg:'var(--green-light)' },
          { label:'Pendientes', value:stats.pending??0, color:'var(--pending)',   bg:'var(--pending-bg)' },
          { label:'En proceso', value:stats.processing??0, color:'var(--processing)', bg:'var(--processing-bg)' },
          { label:'Resueltos',  value:stats.resolved??0, color:'var(--resolved)', bg:'var(--resolved-bg)' },
          { label:'Usuarios',   value:users.length,     color:'var(--blue)',      bg:'#eff6ff' },
        ].map(s => (
          <div key={s.label} className={styles.statCard} style={{ background:s.bg }}>
            <span style={{ fontSize:24, fontWeight:800, color:s.color }}>{s.value}</span>
            <span style={{ fontSize:11, fontWeight:700, color:s.color, opacity:.8, textTransform:'uppercase', letterSpacing:.4 }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* TABS */}
      <div className={styles.tabs}>
        {['users','ai'].map(t => (
          <button
            key={t}
            className={`${styles.tab} ${tab===t ? styles.tabActive : ''}`}
            onClick={() => setTab(t)}
          >
            {t === 'users' ? '👥 Usuarios' : '🤖 Estado IA'}
          </button>
        ))}
      </div>

      {/* USERS TAB */}
      {tab === 'users' && (
        <Card>
          {users.length === 0 ? (
            <EmptyState icon="👥" title="Sin usuarios" />
          ) : (
            <div style={{ overflowX:'auto' }}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Usuario</th>
                    <th>Rol</th>
                    <th>Estado</th>
                    <th>Reportes</th>
                    <th>Registro</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => {
                    const rs = ROLE_STYLES[u.role] || ROLE_STYLES.user
                    return (
                      <tr key={u._id}>
                        <td>
                          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                            <div style={{
                              width:34, height:34, borderRadius:'50%',
                              background: u.role==='admin'?'#ede9fe':u.role==='worker'?'#dbeafe':'var(--green-light)',
                              display:'flex', alignItems:'center', justifyContent:'center',
                              fontWeight:800, fontSize:13, flexShrink:0,
                              color: u.role==='admin'?'#7e22ce':u.role==='worker'?'#1d4ed8':'var(--green-dark)',
                            }}>
                              {(u.name||'U')[0].toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontWeight:600, fontSize:13 }}>{u.name}</div>
                              <div style={{ fontSize:11, color:'var(--muted)' }}>{u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span style={{
                            padding:'2px 9px', borderRadius:20,
                            fontSize:11, fontWeight:800,
                            color:rs.color, background:rs.bg,
                          }}>
                            {u.role}
                          </span>
                        </td>
                        <td>
                          <span style={{
                            padding:'2px 9px', borderRadius:20, fontSize:11, fontWeight:700,
                            color: u.isActive?'var(--resolved)':'var(--muted)',
                            background: u.isActive?'var(--resolved-bg)':'var(--bg)',
                          }}>
                            {u.isActive ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td style={{ fontSize:13, fontWeight:600 }}>{u.reportsCount || 0}</td>
                        <td style={{ fontSize:12, color:'var(--muted)' }}>
                          {new Date(u.createdAt).toLocaleDateString('es-DO')}
                        </td>
                        <td>
                          <div style={{ display:'flex', gap:4 }}>
                            <select
                              value={u.role}
                              onChange={e => handleRoleChange(u._id, e.target.value)}
                              className={styles.roleSelect}
                            >
                              <option value="user">user</option>
                              <option value="worker">worker</option>
                              <option value="admin">admin</option>
                            </select>
                            <button
                              className={styles.actionBtn}
                              style={{ background:u.isActive?'var(--pending-bg)':'var(--resolved-bg)', color:u.isActive?'var(--pending)':'var(--resolved)' }}
                              onClick={() => handleToggleActive(u._id, u.isActive)}
                            >
                              {u.isActive ? 'Desact.' : 'Activar'}
                            </button>
                            <button
                              className={styles.actionBtn}
                              style={{ background:'var(--pending-bg)', color:'var(--pending)' }}
                              onClick={() => handleDeleteUser(u._id)}
                            >
                              🗑
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* AI TAB */}
      {tab === 'ai' && (
        <Card style={{ overflow:'hidden' }}>
          <div style={{ padding:'14px 20px', borderBottom:'1px solid var(--border-light)', fontSize:14, fontWeight:700 }}>
            Estado del sistema de IA
          </div>
          <div style={{ padding:'0' }}>
            {[
              { icon:'🤖', name:'OpenAI Vision', sub: aiStatus.openai_vision || 'Verificando...', active: aiStatus.openai_configured },
              { icon:'G',  name:'Google Vision', sub: aiStatus.google_vision || 'No configurado',  active: false },
              { icon:'C',  name:'Clarifai',      sub: aiStatus.clarifai || 'No configurado',        active: false },
            ].map((p, i) => (
              <div key={i} style={{
                padding:'14px 20px', borderBottom:'1px solid var(--border-light)',
                display:'flex', alignItems:'center', gap:14,
              }}>
                <div style={{
                  width:38, height:38, borderRadius:10,
                  background: i===0?'#f0fdf4':i===1?'#e8f0fe':'#fff1e6',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:18, fontWeight:800, flexShrink:0,
                }}>
                  {p.icon}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:700, fontSize:13 }}>{p.name}</div>
                  <div style={{ fontSize:11, color:'var(--muted)' }}>{p.sub}</div>
                </div>
                <div style={{
                  width:10, height:10, borderRadius:'50%',
                  background: p.active ? 'var(--resolved)' : 'var(--border)',
                  boxShadow: p.active ? '0 0 0 3px rgba(22,163,74,.2)' : 'none',
                }} />
              </div>
            ))}
            <div style={{ padding:'14px 20px', background:'#f8fafc', display:'flex', justifyContent:'space-between' }}>
              <span style={{ fontSize:13, color:'var(--muted)', fontWeight:600 }}>Modo activo:</span>
              <span style={{ fontSize:13, fontWeight:800, color: aiStatus.openai_configured ? 'var(--resolved)' : 'var(--processing)' }}>
                {aiStatus.mode || 'Demo simulado'}
              </span>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
