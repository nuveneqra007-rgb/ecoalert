// src/components/UI.jsx
// Shared atomic components

export function Spinner({ size = 24, color = 'var(--green)' }) {
  return (
    <div style={{
      width: size, height: size,
      border: `3px solid var(--border)`,
      borderTopColor: color,
      borderRadius: '50%',
      animation: 'spin .7s linear infinite',
      flexShrink: 0,
    }} />
  )
}

export function PageLoader() {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', gap:12, padding:48 }}>
      <Spinner size={28} />
      <span style={{ color:'var(--muted)', fontSize:14 }}>Cargando...</span>
    </div>
  )
}

export function StatusBadge({ status }) {
  const map = {
    pending:    { label:'Pendiente',  color:'var(--pending)',    bg:'var(--pending-bg)' },
    processing: { label:'En proceso', color:'var(--processing)', bg:'var(--processing-bg)' },
    resolved:   { label:'Resuelto',   color:'var(--resolved)',   bg:'var(--resolved-bg)' },
    rejected:   { label:'Rechazado',  color:'var(--rejected)',   bg:'var(--rejected-bg)' },
  }
  const s = map[status] || { label: status, color:'var(--muted)', bg:'var(--border)' }
  return (
    <span style={{
      display:'inline-flex', alignItems:'center', gap:5,
      padding:'3px 10px', borderRadius:20,
      fontSize:11, fontWeight:700, whiteSpace:'nowrap',
      color: s.color, backgroundColor: s.bg,
    }}>
      <span style={{ width:6, height:6, borderRadius:'50%', background:s.color, flexShrink:0 }} />
      {s.label}
    </span>
  )
}

export function TypeChip({ type }) {
  const map = {
    plastico:    { label:'♻️ Plástico',     color:'#1d4ed8', bg:'#eff6ff' },
    organico:    { label:'🌿 Orgánico',     color:'#15803d', bg:'#f0fdf4' },
    electronico: { label:'💻 Electrónico',  color:'#7e22ce', bg:'#faf5ff' },
    escombros:   { label:'🏗️ Escombros',   color:'#c2410c', bg:'#fff7ed' },
    papel:       { label:'📄 Papel',        color:'#a16207', bg:'#fefce8' },
    mixto:       { label:'🗑️ Mixto',        color:'#475569', bg:'#f8fafc' },
  }
  const t = map[type] || { label: type || 'Mixto', color:'#475569', bg:'#f8fafc' }
  return (
    <span style={{
      padding:'2px 9px', borderRadius:6,
      fontSize:11, fontWeight:700,
      color: t.color, backgroundColor: t.bg,
    }}>
      {t.label}
    </span>
  )
}

export function ConfBar({ value = 0 }) {
  const pct = Math.round(value * 100)
  const color = value > .8 ? 'var(--resolved)' : value > .6 ? 'var(--processing)' : 'var(--pending)'
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
      <div style={{ flex:1, height:5, background:'var(--border)', borderRadius:3, overflow:'hidden', maxWidth:80 }}>
        <div style={{ height:'100%', width:`${pct}%`, background:color, borderRadius:3, transition:'width .4s' }} />
      </div>
      <span style={{ fontSize:11, fontWeight:700, color:'var(--muted)', minWidth:30 }}>{pct}%</span>
    </div>
  )
}

export function Card({ children, style, onClick, className }) {
  return (
    <div
      className={className}
      onClick={onClick}
      style={{
        background:'var(--card)', borderRadius:'var(--radius-lg)',
        border:'1px solid var(--border)', boxShadow:'var(--shadow-sm)',
        cursor: onClick ? 'pointer' : undefined,
        transition: onClick ? 'var(--transition)' : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  )
}

export function Button({ children, variant='primary', size='md', disabled, loading, onClick, type='button', style }) {
  const heights = { sm:32, md:40, lg:48 }
  const pads    = { sm:'0 12px', md:'0 18px', lg:'0 24px' }
  const fonts   = { sm:12, md:13, lg:15 }

  const variants = {
    primary:   { background:'var(--green)', color:'#fff', border:'none' },
    secondary: { background:'transparent', color:'var(--text)', border:'1.5px solid var(--border)' },
    danger:    { background:'var(--pending)', color:'#fff', border:'none' },
    ghost:     { background:'transparent', color:'var(--green)', border:'none' },
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        height: heights[size],
        padding: pads[size],
        borderRadius: 10,
        fontSize: fonts[size],
        fontWeight: 700,
        display:'inline-flex', alignItems:'center', gap:7,
        transition: 'var(--transition)',
        opacity: (disabled || loading) ? .65 : 1,
        ...variants[variant],
        ...style,
      }}
    >
      {loading ? <Spinner size={14} color={variant==='primary'?'#fff':'var(--green)'} /> : null}
      {children}
    </button>
  )
}

export function Toast({ toasts }) {
  return (
    <div style={{ position:'fixed', bottom:24, right:24, zIndex:9999, display:'flex', flexDirection:'column', gap:8 }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          background: t.type==='error'?'#7f1d1d': t.type==='success'?'#14532d':'#1e293b',
          color:'#fff', padding:'12px 18px', borderRadius:10,
          fontSize:13, fontWeight:600, boxShadow:'0 6px 24px rgba(0,0,0,.25)',
          animation:'fadeIn .3s ease',
          maxWidth:340,
        }}>
          {t.msg}
        </div>
      ))}
    </div>
  )
}

export function EmptyState({ icon='🌿', title, subtitle }) {
  return (
    <div style={{ textAlign:'center', padding:'52px 24px', color:'var(--muted)' }}>
      <div style={{ fontSize:52, marginBottom:14, opacity:.6 }}>{icon}</div>
      <div style={{ fontSize:16, fontWeight:700, color:'var(--text)', marginBottom:6 }}>{title}</div>
      {subtitle && <div style={{ fontSize:13 }}>{subtitle}</div>}
    </div>
  )
}

export function StatCard({ icon, label, value, color='var(--text)', bg='var(--green-light)' }) {
  return (
    <Card style={{ padding:'18px 20px', display:'flex', flexDirection:'column', gap:10, flex:1 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <span style={{ fontSize:12, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:.5 }}>{label}</span>
        <div style={{ width:34, height:34, borderRadius:9, background:bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:17 }}>{icon}</div>
      </div>
      <div style={{ fontSize:32, fontWeight:800, letterSpacing:-1.5, color }}>{value}</div>
    </Card>
  )
}
