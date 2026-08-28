import { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { branchManagerService } from '../services/branchManagerService';
import './AdminLayout.css';
import '../components/Sidebar.css';
import '../components/TopHeader.css';

export default function BranchManagerLayout({
  children,
  searchPlaceholder = 'Search Kochi branch...',
  pageTitle,
  pageIcon,
  headerRight,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useApp();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchVal, setSearchVal] = useState('');
  
  const branchInfo = branchManagerService.getBranchInfo();

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setIsSidebarOpen(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    { path: '/branch/dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
    { path: '/branch/messages', label: 'Contact Owner', icon: <RequestsIcon /> },
    { path: '/branch/staff', label: 'Staff', icon: <StaffIcon /> },
    { path: '/branch/pos', label: 'POS Terminals', icon: <POSIcon /> },
    { path: '/branch/tables', label: 'Tables', icon: <TablesIcon /> },
    { path: '/branch/orders', label: 'Orders', icon: <OrdersIcon /> },
    { path: '/branch/menu', label: 'Menu', icon: <MenuIcon /> },
    { path: '/branch/inventory', label: 'Inventory', icon: <InventoryIcon /> },
    { path: '/branch/expenses', label: 'Expenses', icon: <ExpensesIcon /> },
    { path: '/branch/customers', label: 'Customers', icon: <StaffIcon /> },
    { path: '/branch/reports', label: 'Reports', icon: <ReportsIcon /> },
    { path: '/branch/settings', label: 'Branch Settings', icon: <SettingsIcon /> },
  ];

  return (
    <div className={`admin-layout ${isSidebarOpen ? 'sidebar-open' : ''}`}>
      {/* Mobile Drawer Overlay */}
      {isSidebarOpen && (
        <div className="sidebar-overlay" onClick={closeSidebar} />
      )}

      {/* Branch Manager Sidebar */}
      <aside className={`sidebar ${isSidebarOpen ? 'sidebar--open' : ''}`}>
        <button className="sidebar__close-btn" onClick={closeSidebar} aria-label="Close sidebar">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>

        {/* Brand */}
        <div className="sidebar__brand">
          <div className="sidebar__logo">
            <img src="/logo.png" alt="Artisan Brew Logo" />
          </div>
          <div className="sidebar__brand-text">
            <span className="sidebar__brand-name">Artisan Brew</span>
            <span className="sidebar__brand-sub">Branch Manager</span>
          </div>
        </div>

        {/* Branch Info Badge */}
        <div style={{ padding: '0 20px 15px 20px', borderBottom: '1px solid var(--color-border-light)' }}>
          <div style={{
            background: 'rgba(74,44,26,0.06)',
            padding: '8px 12px',
            borderRadius: '8px',
            fontSize: '12px',
            fontWeight: '600',
            color: 'var(--color-espresso)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-green)' }}></span>
            {branchInfo.city} Branch
          </div>
        </div>

        {/* Navigation */}
        <nav className="sidebar__nav" style={{ marginTop: '15px' }}>
          {menuItems.map((item) => {
            const active = location.pathname === item.path;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`sidebar__nav-item ${active ? 'sidebar__nav-item--active' : ''}`}
                onClick={closeSidebar}
              >
                <span className="sidebar__nav-icon">{item.icon}</span>
                <span className="sidebar__nav-label">{item.label}</span>
              </NavLink>
            );
          })}
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

      {/* Main Content Area */}
      <div className="admin-layout__main">
        {/* Top Header */}
        <header className="top-header">
          <div className="top-header__row-primary">
            <button className="top-header__menu-toggle" onClick={toggleSidebar} aria-label="Toggle Sidebar">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            </button>

            <div className="top-header__brand-mobile">
              <span className="brand-name-mobile">Artisan Brew</span>
            </div>

            {pageTitle ? (
              <div className="top-header__page-title">
                {pageIcon && <span className="top-header__page-icon">{pageIcon}</span>}
                <span className="top-header__page-name">{pageTitle}</span>
              </div>
            ) : (
              <div className="top-header__search desktop-only-search">
                <span className="top-header__search-icon"><SearchIcon /></span>
                <input
                  type="text"
                  className="top-header__search-input"
                  placeholder={searchPlaceholder}
                  value={searchVal}
                  onChange={(e) => setSearchVal(e.target.value)}
                />
              </div>
            )}

            <div className="top-header__actions-wrap">
              {headerRight && <div className="top-header__right-slot-content">{headerRight}</div>}
              
              <div style={{ marginRight: '8px', textAlign: 'right' }} className="desktop-only-help">
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Role</div>
                <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--color-espresso)' }}>Branch Manager</div>
              </div>

              <button className="top-header__avatar" id="btn-profile" aria-label="Profile">
                <img src="/logo.png" alt="Manager Profile" />
              </button>
            </div>
          </div>
        </header>

        <main className="admin-layout__content">
          {children}
        </main>
      </div>
    </div>
  );
}

/* ── Icons ── */
function DashboardIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1"/>
      <rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/>
      <rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  );
}
function StaffIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
function TablesIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="7" width="18" height="3" rx="1"/>
      <line x1="8" y1="10" x2="8" y2="20"/>
      <line x1="16" y1="10" x2="16" y2="20"/>
      <line x1="5" y1="20" x2="19" y2="20"/>
    </svg>
  );
}
function OrdersIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
      <rect x="9" y="3" width="6" height="4" rx="1"/>
      <line x1="9" y1="12" x2="15" y2="12"/>
      <line x1="9" y1="16" x2="13" y2="16"/>
    </svg>
  );
}
function KitchenIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 18H18" />
      <path d="M6 12H18" />
      <path d="M6 6H18" />
    </svg>
  );
}
function MenuIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a7 7 0 0 1 7 7c0 4-3.5 8-7 11C8.5 17 5 13 5 9a7 7 0 0 1 7-7z"/>
      <circle cx="12" cy="9" r="2.5"/>
    </svg>
  );
}
function InventoryIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
    </svg>
  );
}
function ExpensesIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23"/>
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
    </svg>
  );
}
function ReportsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/>
      <line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  );
}
function SettingsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  );
}
function SupportIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  );
}
function LogoutIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  );
}
function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  );
}

function POSIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="12" rx="2" ry="2" />
      <line x1="12" y1="15" x2="12" y2="21" />
      <line x1="8" y1="21" x2="16" y2="21" />
    </svg>
  );
}

function RequestsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  );
}
