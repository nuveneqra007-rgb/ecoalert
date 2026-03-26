// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import Login    from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Reports   from './pages/Reports'
import ReportDetail from './pages/ReportDetail'
import NewReport from './pages/NewReport'
import MapPage   from './pages/MapPage'
import AdminPanel from './pages/AdminPanel'
import Profile   from './pages/Profile'

// ── Route guard ──────────────────────────────
function Protected({ children, adminOnly = false }) {
  const { isLogged, isAdmin, loading } = useAuth()

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', gap:12 }}>
      <div style={{ width:24, height:24, border:'3px solid #e2e8f0', borderTopColor:'#2d9e5f', borderRadius:'50%', animation:'spin .7s linear infinite' }} />
      <span style={{ color:'#64748b', fontFamily:'sans-serif' }}>Cargando...</span>
    </div>
  )

  if (!isLogged) return <Navigate to="/login" replace />
  if (adminOnly && !isAdmin) return <Navigate to="/" replace />
  return children
}

function GuestOnly({ children }) {
  const { isLogged, loading } = useAuth()
  if (loading) return null
  if (isLogged) return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login"    element={<GuestOnly><Login /></GuestOnly>} />
          <Route path="/register" element={<GuestOnly><Register /></GuestOnly>} />

          {/* Protected */}
          <Route path="/" element={<Protected><Layout /></Protected>}>
            <Route index                   element={<Dashboard />} />
            <Route path="reports"          element={<Reports />} />
            <Route path="reports/:id"      element={<ReportDetail />} />
            <Route path="reports/new"      element={<NewReport />} />
            <Route path="map"              element={<MapPage />} />
            <Route path="profile"          element={<Profile />} />
            <Route path="admin"            element={<Protected adminOnly><AdminPanel /></Protected>} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
