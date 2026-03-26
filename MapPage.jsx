// src/pages/MapPage.jsx
// Live map with Leaflet — real report markers from backend
import { useState, useEffect, useCallback, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import { useNavigate } from 'react-router-dom'
import { reportsAPI } from '../services/api'
import { StatusBadge, TypeChip, Button, Spinner } from '../components/UI'
import { useToast } from '../hooks/useToast'
import { Toast } from '../components/UI'
import styles from './MapPage.module.css'

// Fix Leaflet default icon path for Vite
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// Custom colored marker icons
const createIcon = (color) => L.divIcon({
  className: '',
  html: `<div style="
    width:26px; height:26px; border-radius:50% 50% 50% 0;
    background:${color}; border:3px solid #fff;
    transform:rotate(-45deg);
    box-shadow:0 2px 8px rgba(0,0,0,.3);
  "></div>`,
  iconSize:   [26, 26],
  iconAnchor: [13, 26],
  popupAnchor:[0, -28],
})

const ICONS = {
  pending:    createIcon('#dc2626'),
  processing: createIcon('#d97706'),
  resolved:   createIcon('#16a34a'),
  rejected:   createIcon('#6b7280'),
}

const DEFAULT_CENTER = [18.4861, -69.9312] // Santo Domingo

// ── FlyTo helper component ──────────────────────
function FlyTo({ coords }) {
  const map = useMap()
  useEffect(() => {
    if (coords) map.flyTo(coords, 15, { duration: 1.2 })
  }, [coords, map])
  return null
}

const STATUS_FILTERS = [
  { key:'all',        label:'Todos' },
  { key:'pending',    label:'🔴 Pendientes' },
  { key:'processing', label:'🟡 En proceso' },
  { key:'resolved',   label:'🟢 Resueltos' },
]

export default function MapPage() {
  const navigate = useNavigate()
  const { toasts, toast } = useToast()

  const [reports,   setReports]   = useState([])
  const [loading,   setLoading]   = useState(true)
  const [filter,    setFilter]    = useState('all')
  const [flyTo,     setFlyTo]     = useState(null)
  const [userPos,   setUserPos]   = useState(null)
  const [locLoading,setLocLoading]= useState(false)

  const fetchReports = useCallback(async () => {
    try {
      const data = await reportsAPI.getAll({ limit: 500 })
      const list = Array.isArray(data) ? data : (data.data || [])
      // Only reports with valid coordinates
      const withCoords = list.filter(r => r.location?.coordinates?.length === 2)
      setReports(withCoords)
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchReports()
    const timer = setInterval(fetchReports, 30_000)
    return () => clearInterval(timer)
  }, [fetchReports])

  const getMyLocation = () => {
    if (!navigator.geolocation) { toast('Geolocalización no disponible', 'error'); return }
    setLocLoading(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = [pos.coords.latitude, pos.coords.longitude]
        setUserPos(coords)
        setFlyTo(coords)
        toast('📍 Centrado en tu ubicación', 'success')
        setLocLoading(false)
      },
      (err) => { toast(err.message, 'error'); setLocLoading(false) },
      { enableHighAccuracy: true, timeout: 8000 }
    )
  }

  const filtered = filter === 'all'
    ? reports
    : reports.filter(r => r.status === filter)

  const STATUS_LABELS = {
    pending:'Pendiente', processing:'En proceso', resolved:'Resuelto', rejected:'Rechazado'
  }

  return (
    <div className={styles.page}>
      <Toast toasts={toasts} />

      {/* HEADER */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Mapa en vivo</h1>
          <p className={styles.subtitle}>{filtered.length} reportes mostrados</p>
        </div>
        <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
          <Button variant="secondary" size="sm" onClick={fetchReports}>↻ Actualizar</Button>
          <Button
            variant="secondary" size="sm"
            onClick={getMyLocation}
            loading={locLoading}
          >
            📍 Mi ubicación
          </Button>
          <Button size="sm" onClick={() => navigate('/reports/new')}>+ Nuevo Reporte</Button>
        </div>
      </div>

      {/* FILTER PILLS */}
      <div className={styles.filterRow}>
        {STATUS_FILTERS.map(f => (
          <button
            key={f.key}
            className={`${styles.filterPill} ${filter === f.key ? styles.filterActive : ''}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
        <div className={styles.legend}>
          <span style={{ color:'var(--pending)' }}>● Pendiente</span>
          <span style={{ color:'var(--processing)' }}>● En proceso</span>
          <span style={{ color:'var(--resolved)' }}>● Resuelto</span>
        </div>
      </div>

      {/* MAP */}
      <div className={styles.mapWrap}>
        {loading && (
          <div className={styles.mapOverlay}>
            <Spinner size={32} />
            <span>Cargando reportes...</span>
          </div>
        )}

        <MapContainer
          center={DEFAULT_CENTER}
          zoom={13}
          className={styles.map}
          zoomControl
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {flyTo && <FlyTo coords={flyTo} />}

          {/* User location marker */}
          {userPos && (
            <Marker
              position={userPos}
              icon={L.divIcon({
                className: '',
                html: `<div style="
                  width:16px; height:16px; border-radius:50%;
                  background:#2d9e5f; border:3px solid #fff;
                  box-shadow:0 0 0 4px rgba(45,158,95,.3),0 2px 6px rgba(0,0,0,.2);
                "></div>`,
                iconSize:   [16, 16],
                iconAnchor: [8, 8],
              })}
            >
              <Popup>
                <strong>Tu ubicación</strong>
              </Popup>
            </Marker>
          )}

          {/* Report markers */}
          {filtered.map(r => {
            const [lngVal, latVal] = r.location.coordinates
            const imgUrl = r.image?.url
              ? (r.image.url.startsWith('http') ? r.image.url : `http://localhost:3000/${r.image.url}`)
              : null
            const date = new Date(r.createdAt).toLocaleDateString('es-DO', { day:'2-digit', month:'short', year:'numeric' })

            return (
              <Marker
                key={r._id}
                position={[latVal, lngVal]}
                icon={ICONS[r.status] || ICONS.pending}
              >
                <Popup maxWidth={260}>
                  <div style={{ fontFamily:'var(--font)', minWidth:200 }}>
                    {imgUrl && (
                      <img
                        src={imgUrl}
                        alt=""
                        style={{ width:'100%', height:120, objectFit:'cover', borderRadius:8, marginBottom:10 }}
                      />
                    )}
                    <div style={{ fontWeight:700, fontSize:13, marginBottom:4, lineHeight:1.4 }}>
                      {r.address}
                    </div>
                    <div style={{ fontSize:11, color:'#64748b', marginBottom:8 }}>
                      {r.user || 'Anónimo'} · {date}
                    </div>
                    <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:10 }}>
                      <StatusBadge status={r.status} />
                      <TypeChip type={r.type} />
                    </div>
                    {r.confidence > 0 && (
                      <div style={{ fontSize:11, color:'#64748b', marginBottom:8 }}>
                        Confianza IA: <strong style={{ color:'#16a34a' }}>{Math.round(r.confidence * 100)}%</strong>
                      </div>
                    )}
                    <button
                      onClick={() => navigate(`/reports/${r._id}`)}
                      style={{
                        width:'100%', height:32, borderRadius:8,
                        background:'#2d9e5f', color:'#fff', border:'none',
                        fontSize:12, fontWeight:700, cursor:'pointer',
                      }}
                    >
                      Ver detalle →
                    </button>
                  </div>
                </Popup>
              </Marker>
            )
          })}
        </MapContainer>
      </div>

      {/* REPORT COUNT BY STATUS */}
      <div className={styles.statsRow}>
        {['pending','processing','resolved'].map(s => {
          const count = reports.filter(r => r.status === s).length
          const colors = { pending:'var(--pending)', processing:'var(--processing)', resolved:'var(--resolved)' }
          const bgs    = { pending:'var(--pending-bg)', processing:'var(--processing-bg)', resolved:'var(--resolved-bg)' }
          return (
            <div key={s} className={styles.statChip} style={{ background:bgs[s] }}>
              <span style={{ fontWeight:800, fontSize:18, color:colors[s] }}>{count}</span>
              <span style={{ fontSize:11, color:colors[s], fontWeight:700 }}>{STATUS_LABELS[s]}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
