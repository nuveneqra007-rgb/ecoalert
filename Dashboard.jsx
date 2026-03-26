// src/pages/Dashboard.jsx
import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { reportsAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { StatCard, Card, StatusBadge, TypeChip, PageLoader, Button } from '../components/UI'
import { useToast } from '../hooks/useToast'
import { Toast } from '../components/UI'
import styles from './Dashboard.module.css'

const STATUS_LABELS = { pending:'Pendiente', processing:'En proceso', resolved:'Resuelto', rejected:'Rechazado' }

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { toasts, toast } = useToast()

  const [reports,  setReports]  = useState([])
  const [stats,    setStats]    = useState({})
  const [loading,  setLoading]  = useState(true)
  const [updating, setUpdating] = useState(null)

  const fetchData = useCallback(async () => {
    try {
      const [rData, sData] = await Promise.all([
        reportsAPI.getAll({ limit: 10, sortBy: 'createdAt', sortDir: 'desc' }),
        reportsAPI.stats(),
      ])
      setReports(Array.isArray(rData) ? rData : (rData.data || []))
      if (sData.success) setStats(sData.data || {})
    } catch (err) {
      toast(err.message || 'Error cargando datos', 'error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const timer = setInterval(fetchData, 30_000)
    return () => clearInterval(timer)
  }, [fetchData])

  const handleStatusChange = async (id, newStatus) => {
    setUpdating(id)
    try {
      await reportsAPI.update(id, { status: newStatus })
      toast(`Estado actualizado: ${STATUS_LABELS[newStatus]}`, 'success')
      fetchData()
    } catch (err) {
      toast(err.response?.data?.message || err.message, 'error')
    } finally {
      setUpdating(null)
    }
  }

  if (loading) return <PageLoader />

  const pending    = stats.pending    ?? reports.filter(r => r.status === 'pending').length
  const processing = stats.processing ?? reports.filter(r => r.status === 'processing').length
  const resolved   = stats.resolved   ?? reports.filter(r => r.status === 'resolved').length
  const total      = stats.total      ?? reports.length

  return (
    <div className={styles.page}>
      <Toast toasts={toasts} />

      {/* HEADER */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Dashboard</h1>
          <p className={styles.subtitle}>Bienvenido, {user?.name} 👋</p>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <Button variant="secondary" size="sm" onClick={fetchData}>↻ Actualizar</Button>
          <Button onClick={() => navigate('/reports/new')} icon="+" size="sm">Nuevo Reporte</Button>
        </div>
      </div>

      {/* STAT CARDS */}
      <div className={styles.statsGrid}>
        <StatCard icon="📍" label="Total Reportes"  value={total}      />
        <StatCard icon="🔴" label="Pendientes"      value={pending}    color="var(--pending)"    bg="var(--pending-bg)" />
        <StatCard icon="🟡" label="En proceso"      value={processing} color="var(--processing)" bg="var(--processing-bg)" />
        <StatCard icon="✅" label="Resueltos"        value={resolved}   color="var(--resolved)"   bg="var(--resolved-bg)" />
      </div>

      {/* RESOLUTION RATE */}
      {total > 0 && (
        <Card style={{ padding:'16px 20px', display:'flex', alignItems:'center', gap:16 }}>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:12, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:.5, marginBottom:8 }}>
              Tasa de Resolución
            </div>
            <div style={{ height:8, background:'var(--border)', borderRadius:4, overflow:'hidden' }}>
              <div style={{
                height:'100%', width:`${stats.resolutionRate ?? Math.round(resolved/total*100)}%`,
                background:'var(--green)', borderRadius:4,
                transition:'width .6s ease',
              }} />
            </div>
          </div>
          <div style={{ fontSize:28, fontWeight:800, color:'var(--green)', minWidth:64, textAlign:'right' }}>
            {stats.resolutionRate ?? Math.round(resolved / total * 100)}%
          </div>
        </Card>
      )}

      {/* RECENT REPORTS */}
      <Card>
        <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--border-light)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <span style={{ fontSize:14, fontWeight:700 }}>Reportes recientes</span>
          <Link to="/reports" style={{ fontSize:12, fontWeight:700, color:'var(--green)' }}>Ver todos →</Link>
        </div>

        {reports.length === 0 ? (
          <div style={{ padding:'40px 24px', textAlign:'center', color:'var(--muted)' }}>
            <div style={{ fontSize:40, marginBottom:12 }}>🌿</div>
            <div style={{ fontWeight:700 }}>Sin reportes aún</div>
            <div style={{ fontSize:13, marginTop:6 }}>
              <Link to="/reports/new" style={{ color:'var(--green)', fontWeight:700 }}>Crear el primer reporte →</Link>
            </div>
          </div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Reporte</th>
                  <th>Tipo</th>
                  <th>Estado</th>
                  <th>Fecha</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {reports.map(r => {
                  const imgUrl = r.image?.url
                    ? (r.image.url.startsWith('http') ? r.image.url : `http://localhost:3000/${r.image.url}`)
                    : null
                  const date = new Date(r.createdAt).toLocaleDateString('es-DO', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })

                  return (
                    <tr key={r._id} onClick={() => navigate(`/reports/${r._id}`)} style={{ cursor:'pointer' }}>
                      <td>
                        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                          {imgUrl
                            ? <img src={imgUrl} alt="" style={{ width:36, height:36, borderRadius:7, objectFit:'cover', border:'1px solid var(--border)', flexShrink:0 }} />
                            : <div style={{ width:36, height:36, borderRadius:7, background:'var(--bg)', border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:17, flexShrink:0 }}>📷</div>
                          }
                          <div>
                            <div style={{ fontWeight:600, fontSize:13, maxWidth:220, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.address}</div>
                            <div style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>{r._id.slice(-6)} · {r.user || 'Anónimo'}</div>
                          </div>
                        </div>
                      </td>
                      <td><TypeChip type={r.type} /></td>
                      <td><StatusBadge status={r.status} /></td>
                      <td><span style={{ fontSize:12, color:'var(--muted)' }}>{date}</span></td>
                      <td onClick={e => e.stopPropagation()}>
                        <div style={{ display:'flex', gap:4 }}>
                          {r.status === 'pending' && (
                            <button
                              className={styles.actionBtn}
                              style={{ background:'#fffbeb', color:'var(--processing)' }}
                              onClick={() => handleStatusChange(r._id, 'processing')}
                              disabled={updating === r._id}
                            >
                              ▶ Procesar
                            </button>
                          )}
                          {r.status === 'processing' && (
                            <button
                              className={styles.actionBtn}
                              style={{ background:'var(--resolved-bg)', color:'var(--resolved)' }}
                              onClick={() => handleStatusChange(r._id, 'resolved')}
                              disabled={updating === r._id}
                            >
                              ✓ Resolver
                            </button>
                          )}
                          {r.status === 'resolved' && (
                            <span style={{ fontSize:11, color:'var(--resolved)', fontWeight:700 }}>✓ Listo</span>
                          )}
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

      {/* QUICK LINKS */}
      <div className={styles.quickGrid}>
        <Link to="/reports/new" className={styles.quickCard}>
          <span style={{ fontSize:28 }}>📷</span>
          <div>
            <div style={{ fontWeight:700 }}>Nuevo Reporte</div>
            <div style={{ fontSize:12, color:'var(--muted)' }}>Foto + ubicación + IA</div>
          </div>
        </Link>
        <Link to="/map" className={styles.quickCard}>
          <span style={{ fontSize:28 }}>🗺️</span>
          <div>
            <div style={{ fontWeight:700 }}>Ver en Mapa</div>
            <div style={{ fontSize:12, color:'var(--muted)' }}>Reportes geolocalizados</div>
          </div>
        </Link>
        <Link to="/reports" className={styles.quickCard}>
          <span style={{ fontSize:28 }}>📋</span>
          <div>
            <div style={{ fontWeight:700 }}>Todos los Reportes</div>
            <div style={{ fontSize:12, color:'var(--muted)' }}>Lista completa + filtros</div>
          </div>
        </Link>
      </div>
    </div>
  )
}
