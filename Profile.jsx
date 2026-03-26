// src/pages/Profile.jsx
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { Card, Button } from '../components/UI'

export default function Profile() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const roleStyles = {
    admin:  { color:'#7e22ce', bg:'#faf5ff' },
    worker: { color:'#1d4ed8', bg:'#eff6ff' },
    user:   { color:'#475569', bg:'#f8fafc' },
  }
  const rs = roleStyles[user?.role] || roleStyles.user

  return (
    <div style={{ padding:24, maxWidth:520, margin:'0 auto', display:'flex', flexDirection:'column', gap:18 }}>
      <h1 style={{ fontSize:26, fontWeight:800, letterSpacing:'-.5px' }}>Mi Perfil</h1>

      <Card style={{ padding:28, display:'flex', flexDirection:'column', alignItems:'center', gap:16, textAlign:'center' }}>
        <div style={{
          width:80, height:80, borderRadius:'50%',
          background:'linear-gradient(135deg, #2d9e5f, #0f7490)',
          display:'flex', alignItems:'center', justifyContent:'center',
          fontWeight:800, fontSize:30, color:'#fff',
          boxShadow:'0 4px 14px rgba(45,158,95,.4)',
        }}>
          {(user?.name || 'U')[0].toUpperCase()}
        </div>
        <div>
          <div style={{ fontSize:22, fontWeight:800, color:'var(--text)' }}>{user?.name}</div>
          <div style={{ fontSize:14, color:'var(--muted)', marginTop:4 }}>{user?.email}</div>
        </div>
        <span style={{ padding:'5px 16px', borderRadius:20, fontSize:13, fontWeight:800, color:rs.color, background:rs.bg }}>
          {user?.role?.toUpperCase()}
        </span>
      </Card>

      <Card style={{ padding:20, display:'flex', flexDirection:'column', gap:12 }}>
        <div style={{ fontSize:13, fontWeight:700, color:'var(--text)', marginBottom:4 }}>Estadísticas</div>
        <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, borderBottom:'1px solid var(--border-light)', paddingBottom:10 }}>
          <span style={{ color:'var(--muted)' }}>Reportes creados</span>
          <strong>{user?.reportsCount || 0}</strong>
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, borderBottom:'1px solid var(--border-light)', paddingBottom:10 }}>
          <span style={{ color:'var(--muted)' }}>Miembro desde</span>
          <strong>{user?.createdAt ? new Date(user.createdAt).toLocaleDateString('es-DO') : '—'}</strong>
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', fontSize:13 }}>
          <span style={{ color:'var(--muted)' }}>Último acceso</span>
          <strong>{user?.lastLogin ? new Date(user.lastLogin).toLocaleDateString('es-DO') : '—'}</strong>
        </div>
      </Card>

      <Button variant="danger" onClick={handleLogout} style={{ width:'100%', justifyContent:'center', height:44 }}>
        ⏻ Cerrar sesión
      </Button>
    </div>
  )
}
