// src/pages/NewReport.jsx
// Full flow: photo → AI detection → GPS → save report
import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { reportsAPI, aiAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { Card, Button, Toast, Spinner } from '../components/UI'
import { useToast } from '../hooks/useToast'
import styles from './NewReport.module.css'

const PRIORITY_OPTS = [
  { value:'low',      label:'🟢 Baja' },
  { value:'medium',   label:'🟡 Media' },
  { value:'high',     label:'🔴 Alta' },
  { value:'critical', label:'🚨 Crítica' },
]

const TYPE_LABELS = {
  plastico:'Plástico', organico:'Orgánico', electronico:'Electrónico',
  escombros:'Escombros', papel:'Papel', mixto:'Mixto',
}

export default function NewReport() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { toasts, toast } = useToast()
  const fileRef = useRef(null)

  // Form state
  const [address,     setAddress]     = useState('')
  const [description, setDescription] = useState('')
  const [lat,         setLat]         = useState('')
  const [lng,         setLng]         = useState('')
  const [priority,    setPriority]    = useState('medium')
  const [imageFile,   setImageFile]   = useState(null)
  const [imagePreview,setImagePreview]= useState(null)

  // Status state
  const [geoLoading,  setGeoLoading]  = useState(false)
  const [aiLoading,   setAiLoading]   = useState(false)
  const [aiResult,    setAiResult]    = useState(null)
  const [aiError,     setAiError]     = useState(null)
  const [submitting,  setSubmitting]  = useState(false)
  const [error,       setError]       = useState('')

  // ── IMAGE SELECTION ────────────────────────
  const handleImageChange = useCallback((e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) { toast('Imagen demasiado grande. Máx 10MB.', 'error'); return }

    setImageFile(file)
    setAiResult(null)
    setAiError(null)

    const reader = new FileReader()
    reader.onload = ev => setImagePreview(ev.target.result)
    reader.readAsDataURL(file)
  }, [toast])

  // ── AI DETECTION ───────────────────────────
  const runAIDetection = useCallback(async () => {
    if (!imageFile) { toast('Primero selecciona una imagen', 'warn'); return }
    setAiLoading(true)
    setAiResult(null)
    setAiError(null)

    try {
      const form = new FormData()
      form.append('image', imageFile)
      const data = await aiAPI.detectTrash(form)
      setAiResult(data)

      if (data.basura) {
        toast(`✅ Basura detectada: ${TYPE_LABELS[data.tipo] || data.tipo} (${Math.round(data.confianza * 100)}%)`, 'success')
        // Auto-get location if not set
        if (!lat && !lng) getLocation()
      } else {
        toast('ℹ️ No se detectó basura en la imagen', 'info')
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Error en análisis IA'
      setAiError(msg)
      toast(msg, 'error')
    } finally {
      setAiLoading(false)
    }
  }, [imageFile, lat, lng, toast])

  // ── GEOLOCATION ────────────────────────────
  const getLocation = useCallback(() => {
    if (!navigator.geolocation) { toast('Geolocalización no disponible', 'error'); return }
    setGeoLoading(true)

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        setLat(latitude.toFixed(6))
        setLng(longitude.toFixed(6))

        // Reverse geocode via Nominatim (free, no API key needed)
        if (!address.trim()) {
          try {
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
              { headers: { 'Accept-Language': 'es' } }
            )
            const geo = await res.json()
            if (geo?.display_name) setAddress(geo.display_name.split(',').slice(0,3).join(',').trim())
          } catch (_) {}
        }

        toast('📍 Ubicación obtenida', 'success')
        setGeoLoading(false)
      },
      (err) => {
        toast(`Error de ubicación: ${err.message}`, 'error')
        setGeoLoading(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }, [address, toast])

  // ── SUBMIT ─────────────────────────────────
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault()
    setError('')

    if (!address.trim()) { setError('La dirección es obligatoria.'); return }
    if (!imageFile && !aiResult) { setError('Agrega una imagen del reporte.'); return }

    setSubmitting(true)
    try {
      const form = new FormData()
      form.append('address',  address.trim())
      if (description.trim()) form.append('description', description.trim())
      if (lat)  form.append('lat', lat)
      if (lng)  form.append('lng', lng)
      form.append('priority', priority)
      if (imageFile) form.append('image', imageFile)

      // If AI already ran, pass its results
      if (aiResult?.basura) {
        form.append('aiType',       aiResult.tipo       || 'mixto')
        form.append('aiConfidence', String(aiResult.confianza || 0))
      }

      const data = await reportsAPI.create(form)
      toast('✅ Reporte creado exitosamente', 'success')

      // Small delay to show the toast, then navigate
      setTimeout(() => navigate(`/reports/${data.data?._id || ''}`), 800)

    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Error al crear reporte')
    } finally {
      setSubmitting(false)
    }
  }, [address, description, lat, lng, priority, imageFile, aiResult, navigate, toast])

  return (
    <div className={styles.page}>
      <Toast toasts={toasts} />

      {/* HEADER */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Nuevo Reporte</h1>
          <p className={styles.subtitle}>La IA analizará la imagen automáticamente</p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => navigate(-1)}>← Volver</Button>
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.grid}>

          {/* LEFT: IMAGE + AI */}
          <div className={styles.leftCol}>

            {/* IMAGE PICKER */}
            <Card style={{ overflow:'hidden' }}>
              <div className={styles.panelHeader}>
                <span>📷 Imagen del reporte</span>
              </div>

              <div
                className={`${styles.dropZone} ${imagePreview ? styles.hasImage : ''}`}
                onClick={() => fileRef.current?.click()}
                onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add(styles.dragOver) }}
                onDragLeave={e => e.currentTarget.classList.remove(styles.dragOver)}
                onDrop={e => {
                  e.preventDefault()
                  e.currentTarget.classList.remove(styles.dragOver)
                  const file = e.dataTransfer.files?.[0]
                  if (file) { const evt = { target:{ files:[file] } }; handleImageChange(evt) }
                }}
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleImageChange}
                  style={{ display:'none' }}
                />

                {imagePreview ? (
                  <>
                    <img src={imagePreview} className={styles.preview} alt="Preview" />
                    <div className={styles.previewOverlay}>
                      <span>✏️ Cambiar imagen</span>
                    </div>
                  </>
                ) : (
                  <div className={styles.dropContent}>
                    <div className={styles.dropIcon}>📷</div>
                    <div className={styles.dropLabel}>Toca para agregar imagen</div>
                    <div className={styles.dropSub}>Cámara, galería o arrastra aquí · JPEG/PNG · máx 10MB</div>
                  </div>
                )}
              </div>
            </Card>

            {/* AI ANALYSIS */}
            <Card style={{ overflow:'hidden' }}>
              <div className={styles.panelHeader}>
                <span>🤖 Análisis con IA</span>
                {aiResult && (
                  <span style={{
                    fontSize:11, fontWeight:700,
                    color: aiResult.basura ? 'var(--resolved)' : 'var(--muted)',
                    background: aiResult.basura ? 'var(--resolved-bg)' : 'var(--bg)',
                    padding:'2px 8px', borderRadius:20,
                  }}>
                    {aiResult.basura ? '✅ Basura detectada' : 'ℹ️ Sin basura'}
                  </span>
                )}
              </div>

              <div style={{ padding:'16px 18px', display:'flex', flexDirection:'column', gap:12 }}>
                <Button
                  type="button"
                  onClick={runAIDetection}
                  loading={aiLoading}
                  disabled={!imageFile || aiLoading}
                  style={{ width:'100%', justifyContent:'center' }}
                >
                  {aiLoading ? 'Analizando imagen...' : '🤖 Detectar basura con IA'}
                </Button>

                {aiError && (
                  <div className={styles.aiError}>⚠️ {aiError}</div>
                )}

                {aiResult && (
                  <div className={`${styles.aiResult} ${aiResult.basura ? styles.aiResultPositive : styles.aiResultNegative}`}>
                    {aiResult.basura ? (
                      <>
                        <div className={styles.aiResultRow}>
                          <span>Tipo detectado:</span>
                          <strong>{TYPE_LABELS[aiResult.tipo] || aiResult.tipo}</strong>
                        </div>
                        <div className={styles.aiResultRow}>
                          <span>Confianza:</span>
                          <strong style={{ color:'var(--resolved)' }}>{Math.round(aiResult.confianza * 100)}%</strong>
                        </div>
                        {aiResult.descripcion && (
                          <div className={styles.aiResultRow}>
                            <span>Observación:</span>
                            <span style={{ fontStyle:'italic' }}>{aiResult.descripcion}</span>
                          </div>
                        )}
                      </>
                    ) : (
                      <div style={{ fontSize:13, color:'var(--muted)' }}>
                        {aiResult.mensaje || 'No se detectó basura en la imagen. Verifica que la imagen sea clara.'}
                      </div>
                    )}
                  </div>
                )}

                <p style={{ fontSize:11, color:'var(--muted)', textAlign:'center', lineHeight:1.6 }}>
                  Powered by OpenAI Vision. Detecta plástico, orgánico, electrónico, escombros, papel y mixto.
                </p>
              </div>
            </Card>
          </div>

          {/* RIGHT: FORM FIELDS */}
          <div className={styles.rightCol}>
            <Card style={{ overflow:'hidden' }}>
              <div className={styles.panelHeader}>
                <span>📝 Detalles del reporte</span>
              </div>

              <div style={{ padding:'16px 18px', display:'flex', flexDirection:'column', gap:14 }}>

                {/* ADDRESS */}
                <div className={styles.field}>
                  <label>Dirección / Ubicación *</label>
                  <div className={styles.addressRow}>
                    <input
                      type="text"
                      value={address}
                      onChange={e => setAddress(e.target.value)}
                      placeholder="Ej: Av. Churchill esq. Calle 5, Santo Domingo"
                      required
                    />
                    <button
                      type="button"
                      className={styles.geoBtn}
                      onClick={getLocation}
                      disabled={geoLoading}
                      title="Usar mi ubicación actual"
                    >
                      {geoLoading ? <Spinner size={16} color="#fff" /> : '📍'}
                    </button>
                  </div>
                </div>

                {/* COORDINATES */}
                <div className={styles.row2}>
                  <div className={styles.field}>
                    <label>Latitud</label>
                    <input
                      type="number" value={lat} onChange={e => setLat(e.target.value)}
                      placeholder="18.4861" step="0.000001" min="-90" max="90"
                    />
                  </div>
                  <div className={styles.field}>
                    <label>Longitud</label>
                    <input
                      type="number" value={lng} onChange={e => setLng(e.target.value)}
                      placeholder="-69.9312" step="0.000001" min="-180" max="180"
                    />
                  </div>
                </div>

                {lat && lng && (
                  <div className={styles.coordsBadge}>
                    📍 {parseFloat(lat).toFixed(5)}, {parseFloat(lng).toFixed(5)}
                    {' '}·{' '}
                    <a
                      href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`}
                      target="_blank" rel="noreferrer"
                      style={{ color:'var(--green)', fontWeight:700 }}
                    >
                      Ver en mapa →
                    </a>
                  </div>
                )}

                {/* DESCRIPTION */}
                <div className={styles.field}>
                  <label>Descripción (opcional)</label>
                  <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Describe el problema con más detalle..."
                    rows={3}
                  />
                </div>

                {/* PRIORITY */}
                <div className={styles.field}>
                  <label>Prioridad</label>
                  <div className={styles.priorityGrid}>
                    {PRIORITY_OPTS.map(p => (
                      <button
                        key={p.value}
                        type="button"
                        className={`${styles.priorityBtn} ${priority === p.value ? styles.priorityActive : ''}`}
                        onClick={() => setPriority(p.value)}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* AI TYPE OVERRIDE */}
                {aiResult?.basura && (
                  <div className={styles.aiAutofill}>
                    <span>🤖</span>
                    <span>
                      IA detectó: <strong>{TYPE_LABELS[aiResult.tipo] || aiResult.tipo}</strong>
                      {' '}con <strong>{Math.round(aiResult.confianza * 100)}%</strong> de confianza.
                      Se guardará automáticamente.
                    </span>
                  </div>
                )}

                {/* ERROR */}
                {error && <div className={styles.errorBox}>⚠️ {error}</div>}

                {/* SUBMIT */}
                <Button
                  type="submit"
                  loading={submitting}
                  style={{ width:'100%', justifyContent:'center', height:46, fontSize:14 }}
                >
                  {submitting ? 'Guardando reporte...' : '📤 Enviar Reporte'}
                </Button>

              </div>
            </Card>
          </div>

        </div>
      </form>
    </div>
  )
}
