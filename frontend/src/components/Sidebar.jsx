import { NavLink, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import './Sidebar.css'

const NAV_ITEMS = [
  { path: '/dashboard',       label: 'Dashboard',  icon: <DashboardIcon />, exact: true },
  { path: '/menu',            label: 'Menu',        icon: <MenuIcon /> },
  { path: '/categories',      label: 'Categories',  icon: <CategoriesIcon /> },
  { path: '/orders',          label: 'Orders',      icon: <OrdersIcon /> },
  { path: '/tables',          label: 'Tables',      icon: <TablesIcon /> },
  { path: '/qr-codes',        label: 'QR Codes',    icon: <QRIcon /> },
  { path: '/reports',         label: 'Reports',     icon: <ReportsIcon /> },
  { path: '/settings/profile',label: 'Settings',    icon: <SettingsIcon />, matchPath: '/settings' },
]

export default function Sidebar() {
  const navigate = useNavigate()
  const { currentRole, currentWaiter, setCurrentRole, setCurrentWaiter, waiterRequests } = useApp()

  const handleLogout = () => {
    setCurrentRole('admin')
    setCurrentWaiter(null)
    navigate('/login')
  }

  const activeRequestsCount = waiterRequests ? waiterRequests.filter(r => r.status === 'new').length : 0

  const items = currentRole === 'waiter'
    ? [
        { path: '/dashboard', label: 'Dashboard', icon: <DashboardIcon />, exact: true },
        { path: '/tables',    label: 'Tables',    icon: <TablesIcon /> },
        { path: '/requests',  label: 'Requests',  icon: <RequestsIcon />, badge: activeRequestsCount > 0 ? activeRequestsCount : null },
        { path: '/settings/profile', label: 'Settings', icon: <SettingsIcon />, matchPath: '/settings' },
      ]
    : NAV_ITEMS

  return (
    <aside className="sidebar">
      {/* Brand */}
      <div className="sidebar__brand">
        <div className="sidebar__logo">
          <img src="/logo.png" alt="Artisan Brew Logo" />
        </div>
        <div className="sidebar__brand-text">
          <span className="sidebar__brand-name">
            {currentRole === 'waiter' ? 'Artisan POS' : 'Artisan Brew'}
          </span>
          <span className="sidebar__brand-sub">
            {currentRole === 'waiter' ? 'Waiter Terminal' : 'Management Suite'}
          </span>
        </div>
      </div>

      {/* Waiter Details & Profile Badge (if logged in as waiter) */}
      {currentRole === 'waiter' && currentWaiter && (
        <div className="sidebar__waiter-session">
          <div className="sidebar__station-badge">{currentWaiter.station}</div>
          <div className="sidebar__waiter-profile">
            <span className="sidebar__waiter-avatar">{currentWaiter.avatar}</span>
            <div className="sidebar__waiter-info">
              <span className="sidebar__waiter-role">Waiter</span>
              <span className="sidebar__waiter-name">{currentWaiter.name}</span>
            </div>
          </div>
        </div>
      )}

      {/* New Order Button */}
      <div className="sidebar__new-order">
        <button className="btn-new-order" id="btn-new-order" onClick={() => navigate('/orders/new')}>
          <span className="btn-new-order__plus">+</span>
          New Order
        </button>
      </div>

      {/* Navigation */}
      <nav className="sidebar__nav">
        {items.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.exact}
            className={({ isActive }) => {
              const active = isActive ||
                (item.matchPath && window.location.pathname.startsWith(item.matchPath))
              return `sidebar__nav-item${active ? ' sidebar__nav-item--active' : ''}`
            }}
            id={`nav-${item.label.toLowerCase().replace(/\s/g, '-')}`}
          >
            <span className="sidebar__nav-icon">{item.icon}</span>
            <span className="sidebar__nav-label">{item.label}</span>
            {item.badge !== undefined && item.badge !== null && (
              <span className="sidebar__nav-badge">{item.badge}</span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom */}
      <div className="sidebar__bottom">
        <button className="sidebar__bottom-item" id="btn-support">
          <span className="sidebar__nav-icon"><SupportIcon /></span>
          <span>Support</span>
        </button>
        <button className="sidebar__bottom-item sidebar__bottom-item--logout" onClick={handleLogout} id="btn-logout">
          <span className="sidebar__nav-icon"><LogoutIcon /></span>
          <span>Logout</span>
        </button>
      </div>
    </aside>
  )
}

/* ── Inline SVG Icons ── */
function DashboardIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1"/>
      <rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/>
      <rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  )
}
function MenuIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a7 7 0 0 1 7 7c0 4-3.5 8-7 11C8.5 17 5 13 5 9a7 7 0 0 1 7-7z"/>
      <circle cx="12" cy="9" r="2.5"/>
    </svg>
  )
}
function CategoriesIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1"/>
      <rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/>
      <rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  )
}
function OrdersIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
      <rect x="9" y="3" width="6" height="4" rx="1"/>
      <line x1="9" y1="12" x2="15" y2="12"/>
      <line x1="9" y1="16" x2="13" y2="16"/>
    </svg>
  )
}
function TablesIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="7" width="18" height="3" rx="1"/>
      <line x1="8" y1="10" x2="8" y2="20"/>
      <line x1="16" y1="10" x2="16" y2="20"/>
      <line x1="5" y1="20" x2="19" y2="20"/>
    </svg>
  )
}
function QRIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1"/>
      <rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/>
      <line x1="14" y1="14" x2="14" y2="14.01"/>
      <line x1="18" y1="14" x2="18" y2="14.01"/>
      <line x1="21" y1="14" x2="21" y2="18"/>
      <line x1="14" y1="18" x2="18" y2="18"/>
      <line x1="14" y1="21" x2="21" y2="21"/>
    </svg>
  )
}
function ReportsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/>
      <line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  )
}
function SettingsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  )
}
function SupportIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  )
}
function LogoutIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  )
}
function RequestsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  )
}
