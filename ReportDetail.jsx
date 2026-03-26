// src/pages/ReportDetail.jsx
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker } from 'react-leaflet'
import L from 'leaflet'
import { reportsAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import {
  Card, StatusBadge, TypeChip, ConfBar,
  Button, PageLoader, Toast,
} from '../components/UI'
import { useToast } from '../hooks/useToast'
import styles from './ReportDetail.module.css'

export default function ReportDetail() {
  const { id }  = useParams()
  const nav     = useNavigate()
  const { isStaff, isAdmin } = useAuth()
  const { toasts, toast }    = useToast()

  const [report,   setReport]   = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [updating, setUpdating] = useState(false)
  const [error,    setError]    = useState('')

  useEffect(() => {
    reportsAPI.getOne(id)
      .then(d => setReport(d.data || d))
      .catch(e => setError(e.response?.data?.message || e.message))
      .finally(() => setLoading(false))
  }, [id])

  const handleStatus = async (status) => {
    if (!window.confirm(`¿Cambiar estado a "${status}"?`)) return
    setUpdating(true)
    try {
      const d = await reportsAPI.update(id, { status })
      setReport(d.data || d)
      toast('Estado actualizado', 'success')
    } catch (e) {
      toast(e.response?.data?.message || e.message, 'error')
    } finally { setUpdating(false) }
  }

  const handleDelete = async () => {
    if (!window.confirm('¿Eliminar este reporte?')) return
    try {
      await reportsAPI.delete(id)
      toast('Reporte eliminado', 'success')
      setTimeout(() => nav('/reports'), 600)
    } catch (e) { toast(e.response?.data?.message || e.message, 'error') }
  }

  const handleUpvote = async () => {
    try {
      const d = await reportsAPI.upvote(id)
      setReport(prev => ({ ...prev, upvotes: d.upvotes }))
    } catch (e) { toast(e.message, 'error') }
  }

  if (loading) return <PageLoader />
  if (error)   return (
    <div style={{ padding:48, textAlign:'center' }}>
      <div style={{ fontSize:48, marginBottom:16 }}>❌</div>
      <div style={{ fontWeight:700, marginBottom:16 }}>{error}</div>
      <Button variant="secondary" onClick={() => nav('/reports')}>← Volver</Button>
    </div>
  )
  if (!report) return null

  const [lngVal, latVal] = report.location?.coordinates || []
  const hasCoords = latVal && lngVal
  const imgUrl = report.image?.url
    ? (report.image.url.startsWith('http') ? report.image.url : `http://localhost:3000/${report.image.url}`)
    : null
  const date = new Date(report.createdAt).toLocaleString('es-DO', { dateStyle:'medium', timeStyle:'short' })

  const redIcon = L.divIcon({
    className:'',
    html:`<div style="width:22px;height:22px;border-radius:50% 50% 50% 0;background:#dc2626;border:3px solid #fff;transform:rotate(-45deg);box-shadow:0 2px 6px rgba(0,0,0,.3)"></div>`,
    iconSize:[22,22], iconAnchor:[11,22],
  })

  return (
    <div className={styles.page}>
      <Toast toasts={toasts} />

      {/* BREADCRUMB */}
      <div className={styles.breadcrumb}>
        <button onClick={() => nav('/reports')} className={styles.back}>← Reportes</button>
        <span>/</span>
        <span>{report._id.slice(-8)}</span>
      </div>

      <div className={styles.grid}>

        {/* LEFT */}
        <div className={styles.left}>

          {/* IMAGE */}
          <Card style={{ overflow:'hidden' }}>
            {imgUrl ? (
              <img src={imgUrl} alt="" className={styles.image} />
            ) : (
              <div className={styles.imagePh}>
                <span style={{ fontSize:52 }}>📷</span>
                <span style={{ fontSize:14, color:'var(--muted)' }}>Sin imagen</span>
              </div>
            )}
          </Card>

          {/* MAP */}
          {hasCoords && (
            <Card style={{ overflow:'hidden' }}>
              <div className={styles.panelHeader}>
                📍 Ubicación
                <a
                  href={`https://www.openstreetmap.org/?mlat=${latVal}&mlon=${lngVal}#map=16/${latVal}/${lngVal}`}
                  target="_blank" rel="noreferrer"
                  style={{ fontSize:12, color:'var(--green)', fontWeight:700 }}
                >
                  Abrir en mapa →
                </a>
              </div>
              <MapContainer
                center={[latVal, lngVal]}
                zoom={15}
                style={{ height:220 }}
                zoomControl
                scrollWheelZoom={false}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; OpenStreetMap'
                />
                <Marker position={[latVal, lngVal]} icon={redIcon} />
              </MapContainer>
              <div style={{ padding:'8px 14px', fontSize:12, color:'var(--muted)', fontFamily:'monospace' }}>
                {latVal.toFixed(6)}, {lngVal.toFixed(6)}
              </div>
            </Card>
          )}
        </div>

        {/* RIGHT */}
        <div className={styles.right}>

          {/* HEADER CARD */}
          <Card style={{ padding:'20px 22px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14, flexWrap:'wrap' }}>
              <StatusBadge status={report.status} />
              <TypeChip type={report.type} />
              {report.priority && (
                <span style={{
                  padding:'3px 9px', borderRadius:20,
                  fontSize:11, fontWeight:700,
                  background: report.priority==='critical'?'#1e0505':report.priority==='high'?'var(--pending-bg)':'var(--processing-bg)',
                  color: report.priority==='critical'?'#fca5a5':report.priority==='high'?'var(--pending)':'var(--processing)',
                }}>
                  {report.priority.toUpperCase()}
                </span>
              )}
            </div>

            <h1 className={styles.address}>{report.address}</h1>
            <p className={styles.meta}>#{report._id.slice(-8)} · {report.user || 'Anónimo'} · {date}</p>

            {report.description && (
              <p style={{ marginTop:12, fontSize:13, color:'var(--text-sub)', lineHeight:1.7 }}>
                {report.description}
              </p>
            )}

            <div style={{ marginTop:16 }}>
              <div style={{ fontSize:11, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:.5, marginBottom:6 }}>
                Confianza IA
              </div>
              <ConfBar value={report.confidence} />
            </div>

            {/* UPVOTE */}
            <div style={{ marginTop:14, display:'flex', gap:10 }}>
              <button onClick={handleUpvote} style={{
                display:'flex', alignItems:'center', gap:6,
                padding:'7px 14px', borderRadius:9,
                border:'1.5px solid var(--border)', background:'var(--bg)',
                fontSize:13, fontWeight:700, cursor:'pointer', color:'var(--muted)',
              }}>
                👍 {report.upvotes || 0} votos
              </button>
            </div>
          </Card>

          {/* STATUS HISTORY */}
          {report.statusHistory?.length > 0 && (
            <Card style={{ overflow:'hidden' }}>
              <div className={styles.panelHeader}>📋 Historial de estados</div>
              <div style={{ padding:'4px 0' }}>
                {[...report.statusHistory].reverse().map((h, i) => (
                  <div key={i} className={styles.histRow}>
                    <StatusBadge status={h.status} />
                    <div>
                      <div style={{ fontSize:12, fontWeight:600 }}>{h.changedBy || 'Sistema'}</div>
                      <div style={{ fontSize:11, color:'var(--muted)' }}>
                        {new Date(h.changedAt).toLocaleString('es-DO', { dateStyle:'short', timeStyle:'short' })}
                      </div>
                      {h.note && <div style={{ fontSize:11, color:'var(--muted)', fontStyle:'italic', marginTop:2 }}>{h.note}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* STAFF ACTIONS */}
          {isStaff && report.status !== 'resolved' && report.status !== 'rejected' && (
            <Card style={{ padding:'16px 18px' }}>
              <div style={{ fontSize:13, fontWeight:700, marginBottom:12 }}>⚙️ Acciones de staff</div>
              <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
                {report.status === 'pending' && (
                  <Button
                    variant="secondary"
                    loading={updating}
                    onClick={() => handleStatus('processing')}
                    style={{ background:'#fffbeb', color:'var(--processing)', border:'1.5px solid #fef3c7' }}
                  >
                    ▶ Marcar En Proceso
                  </Button>
                )}
                <Button loading={updating} onClick={() => handleStatus('resolved')}>
                  ✅ Marcar Resuelto
                </Button>
                <Button
                  variant="secondary"
                  loading={updating}
                  onClick={() => handleStatus('rejected')}
                  style={{ color:'var(--muted)' }}
                >
                  ✕ Rechazar
                </Button>
              </div>
            </Card>
          )}

          {/* DELETE */}
          {isAdmin && (
            <Button variant="danger" onClick={handleDelete} size="sm">
              🗑️ Eliminar reporte
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
