// src/components/Layout.jsx
import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import styles from './Layout.module.css'

const NAV = [
  { to: '/',        icon: '📊', label: 'Dashboard' },
  { to: '/reports', icon: '📍', label: 'Reportes' },
  { to: '/map',     icon: '🗺️', label: 'Mapa' },
]

const ADMIN_NAV = [
  { to: '/admin', icon: '⚙️', label: 'Administración' },
]

export default function Layout() {
  const { user, isAdmin, logout } = useAuth()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className={styles.shell} data-collapsed={collapsed}>
      {/* SIDEBAR */}
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <div className={styles.brandIcon}>🌱</div>
          {!collapsed && (
            <div>
              <div className={styles.brandName}>EcoAlert</div>
              <div className={styles.brandSub}>Admin Panel</div>
            </div>
          )}
          <button className={styles.collapseBtn} onClick={() => setCollapsed(p => !p)}>
            {collapsed ? '›' : '‹'}
          </button>
        </div>

        <nav className={styles.nav}>
          <div className={styles.navSection}>{!collapsed && 'PRINCIPAL'}</div>
          {NAV.map(({ to, icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => `${styles.navItem} ${isActive ? styles.navActive : ''}`}
            >
              <span className={styles.navIcon}>{icon}</span>
              {!collapsed && <span>{label}</span>}
            </NavLink>
          ))}

          {isAdmin && (
            <>
              <div className={styles.navSection}>{!collapsed && 'GESTIÓN'}</div>
              {ADMIN_NAV.map(({ to, icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) => `${styles.navItem} ${isActive ? styles.navActive : ''}`}
                >
                  <span className={styles.navIcon}>{icon}</span>
                  {!collapsed && <span>{label}</span>}
                </NavLink>
              ))}
            </>
          )}
        </nav>

        <div className={styles.sidebarFooter}>
          <NavLink to="/profile" className={styles.userCard}>
            <div className={styles.avatar}>{(user?.name || 'U')[0].toUpperCase()}</div>
            {!collapsed && (
              <div className={styles.userInfo}>
                <div className={styles.userName}>{user?.name}</div>
                <div className={styles.userRole}>{user?.role}</div>
              </div>
            )}
          </NavLink>
          <button className={styles.logoutBtn} onClick={handleLogout} title="Cerrar sesión">⏻</button>
        </div>
      </aside>

      {/* MAIN */}
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  )
}
