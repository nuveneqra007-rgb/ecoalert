// src/pages/Reports.jsx
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { reportsAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import {
  Card, StatusBadge, TypeChip, ConfBar,
  Button, PageLoader, EmptyState, Toast,
} from '../components/UI'
import { useToast } from '../hooks/useToast'
import styles from './Reports.module.css'

const STATUS_OPTS = [
  { value:'all',        label:'Todos' },
  { value:'pending',    label:'🔴 Pendientes' },
  { value:'processing', label:'🟡 En proceso' },
  { value:'resolved',   label:'🟢 Resueltos' },
  { value:'rejected',   label:'⛔ Rechazados' },
]

export default function Reports() {
  const navigate  = useNavigate()
  const { isStaff } = useAuth()
  const { toasts, toast } = useToast()

  const [reports,  setReports]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [filter,   setFilter]   = useState('all')
  const [search,   setSearch]   = useState('')
  const [deleting, setDeleting] = useState(null)
  const [updating, setUpdating] = useState(null)

  const fetchReports = useCallback(async () => {
    try {
      const params = { limit: 200 }
      if (filter !== 'all') params.status = filter
      const data = await reportsAPI.getAll(params)
      setReports(Array.isArray(data) ? data : (data.data || []))
    } catch (err) {
      toast(err.response?.data?.message || err.message, 'error')
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    setLoading(true)
    fetchReports()
  }, [fetchReports])

  // Client-side search
  const filtered = useMemo(() => {
    if (!search.trim()) return reports
    const q = search.toLowerCase()
    return reports.filter(r =>
      (r.address || '').toLowerCase().includes(q) ||
      (r.user    || '').toLowerCase().includes(q) ||
      (r.type    || '').toLowerCase().includes(q)
    )
  }, [reports, search])

  const handleUpdate = async (id, status, e) => {
    e.stopPropagation()
    setUpdating(id)
    try {
      await reportsAPI.update(id, { status })
      toast('Estado actualizado', 'success')
      fetchReports()
    } catch (err) {
      toast(err.response?.data?.message || err.message, 'error')
    } finally {
      setUpdating(null)
    }
  }

  const handleDelete = async (id, e) => {
    e.stopPropagation()
    if (!window.confirm('¿Eliminar este reporte permanentemente?')) return
    setDeleting(id)
    try {
      await reportsAPI.delete(id)
      toast('Reporte eliminado', 'success')
      setReports(prev => prev.filter(r => r._id !== id))
    } catch (err) {
      toast(err.response?.data?.message || err.message, 'error')
    } finally {
      setDeleting(null)
    }
  }

  if (loading) return <PageLoader />

  return (
    <div className={styles.page}>
      <Toast toasts={toasts} />

      {/* HEADER */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Reportes</h1>
          <p className={styles.subtitle}>{filtered.length} resultado{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <Button variant="secondary" size="sm" onClick={fetchReports}>↻</Button>
          <Button size="sm" onClick={() => navigate('/reports/new')}>+ Nuevo</Button>
        </div>
      </div>

      {/* FILTERS */}
      <div className={styles.filters}>
        <div className={styles.searchWrap}>
          <span className={styles.searchIcon}>🔍</span>
          <input
            className={styles.searchInput}
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por dirección, usuario, tipo..."
          />
          {search && (
            <button className={styles.clearBtn} onClick={() => setSearch('')}>✕</button>
          )}
        </div>

        <div className={styles.filterTabs}>
          {STATUS_OPTS.map(o => (
            <button
              key={o.value}
              className={`${styles.filterTab} ${filter === o.value ? styles.filterTabActive : ''}`}
              onClick={() => setFilter(o.value)}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* TABLE */}
      <Card>
        {filtered.length === 0 ? (
          <EmptyState
            icon="🗑️"
            title={search ? 'Sin resultados' : 'Sin reportes'}
            subtitle={search ? `No hay resultados para "${search}"` : 'Aún no hay reportes con este filtro'}
          />
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Reporte</th>
                  <th>Tipo IA</th>
                  <th>Confianza</th>
                  <th>Estado</th>
                  <th>Fecha</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => {
                  const imgUrl = r.image?.url
                    ? (r.image.url.startsWith('http') ? r.image.url : `http://localhost:3000/${r.image.url}`)
                    : null
                  const [lng, lat] = r.location?.coordinates || []
                  const date = new Date(r.createdAt).toLocaleDateString('es-DO', {
                    day:'2-digit', month:'short', year:'numeric',
                  })

                  return (
                    <tr key={r._id} onClick={() => navigate(`/reports/${r._id}`)}>
                      <td>
                        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                          {imgUrl
                            ? <img src={imgUrl} alt="" className={styles.thumb} />
                            : <div className={styles.thumbPh}>📷</div>
                          }
                          <div>
                            <div className={styles.addr}>{r.address}</div>
                            <div className={styles.meta}>
                              {r._id.slice(-6)} · {r.user || 'Anónimo'}
                              {lat && lng ? ` · 📍 ${parseFloat(lat).toFixed(4)}, ${parseFloat(lng).toFixed(4)}` : ''}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td><TypeChip type={r.type} /></td>
                      <td><ConfBar value={r.confidence} /></td>
                      <td><StatusBadge status={r.status} /></td>
                      <td><span className={styles.meta}>{date}</span></td>
                      <td onClick={e => e.stopPropagation()}>
                        <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                          {isStaff && r.status === 'pending' && (
                            <button
                              className={styles.actionBtn}
                              style={{ background:'#fffbeb', color:'var(--processing)' }}
                              onClick={e => handleUpdate(r._id, 'processing', e)}
                              disabled={updating === r._id}
                            >▶</button>
                          )}
                          {isStaff && r.status === 'processing' && (
                            <button
                              className={styles.actionBtn}
                              style={{ background:'var(--resolved-bg)', color:'var(--resolved)' }}
                              onClick={e => handleUpdate(r._id, 'resolved', e)}
                              disabled={updating === r._id}
                            >✓</button>
                          )}
                          <button
                            className={styles.actionBtn}
                            style={{ background:'var(--bg)', color:'var(--muted)' }}
                            onClick={e => { e.stopPropagation(); navigate(`/reports/${r._id}`) }}
                          >🔍</button>
                          {isStaff && (
                            <button
                              className={styles.actionBtn}
                              style={{ background:'var(--pending-bg)', color:'var(--pending)' }}
                              onClick={e => handleDelete(r._id, e)}
                              disabled={deleting === r._id}
                            >🗑</button>
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
    </div>
  )
}
