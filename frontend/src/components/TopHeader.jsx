import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import './TopHeader.css'

export default function TopHeader({ searchPlaceholder = 'Search orders, items...', pageTitle, pageIcon, right }) {
  const navigate = useNavigate()
  const { notifications, unreadCount, markNotificationRead, markAllNotificationsRead } = useApp()

  const [searchVal,   setSearchVal]   = useState('')
  const [bellOpen,    setBellOpen]    = useState(false)
  const bellRef = useRef(null)

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) {
        setBellOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleBellClick = () => {
    setBellOpen((prev) => !prev)
  }

  const handleMarkAll = async (e) => {
    e.stopPropagation()
    await markAllNotificationsRead()
  }

  const handleNotifClick = async (notif) => {
    if (!notif.is_read) {
      await markNotificationRead(notif.id)
    }
    setBellOpen(false)
    if (notif.order) {
      navigate(`/orders/${notif.order}`)
    }
  }

  const typeIcon = (type) => {
    switch (type) {
      case 'new_order':         return '🛎️'
      case 'status_changed':    return '🔄'
      case 'payment_completed': return '✅'
      case 'bill_requested':    return '💵'
      case 'table_attention':   return '⚠️'
      default:                  return '🔔'
    }
  }

  const timeAgo = (iso) => {
    if (!iso) return ''
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
    if (diff < 60)    return `${diff}s ago`
    if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return new Date(iso).toLocaleDateString('en-IN')
  }

  return (
    <header className="top-header">
      {/* Left: search bar or page title */}
      {pageTitle ? (
        <div className="top-header__page-title">
          {pageIcon && <span className="top-header__page-icon">{pageIcon}</span>}
          <span className="top-header__page-name">{pageTitle}</span>
        </div>
      ) : (
        <div className="top-header__search">
          <span className="top-header__search-icon"><SearchIcon /></span>
          <input
            type="text"
            className="top-header__search-input"
            placeholder={searchPlaceholder}
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            id="header-search"
            aria-label="Search"
          />
        </div>
      )}

      {/* Right: optional slot OR default icons */}
      {right ? (
        <div className="top-header__right-slot">
          {right}
          {/* Notification Bell */}
          <div className="notif-bell-wrap" ref={bellRef}>
            <button
              className="top-header__icon-btn"
              id="btn-notifications"
              aria-label="Notifications"
              onClick={handleBellClick}
            >
              <BellIcon />
              {unreadCount > 0 && (
                <span className="notif-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
              )}
            </button>
            {bellOpen && (
              <NotifDropdown
                notifications={notifications}
                onMarkAll={handleMarkAll}
                onNotifClick={handleNotifClick}
                typeIcon={typeIcon}
                timeAgo={timeAgo}
              />
            )}
          </div>
          <button className="top-header__avatar" id="btn-profile" aria-label="Profile">
            <img src="/logo.png" alt="Admin" />
          </button>
        </div>
      ) : (
        <div className="top-header__actions">
          {/* Notification Bell */}
          <div className="notif-bell-wrap" ref={bellRef}>
            <button
              className="top-header__icon-btn"
              id="btn-notifications"
              aria-label="Notifications"
              onClick={handleBellClick}
            >
              <BellIcon />
              {unreadCount > 0 && (
                <span className="notif-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
              )}
            </button>
            {bellOpen && (
              <NotifDropdown
                notifications={notifications}
                onMarkAll={handleMarkAll}
                onNotifClick={handleNotifClick}
                typeIcon={typeIcon}
                timeAgo={timeAgo}
              />
            )}
          </div>
          <button className="top-header__icon-btn" id="btn-help" aria-label="Help">
            <HelpIcon />
          </button>
          <button className="top-header__avatar" id="btn-profile" aria-label="Profile">
            <img src="/logo.png" alt="Admin" />
          </button>
        </div>
      )}
    </header>
  )
}

/* ── Notification Dropdown ── */
function NotifDropdown({ notifications, onMarkAll, onNotifClick, typeIcon, timeAgo }) {
  return (
    <div className="notif-dropdown" onClick={(e) => e.stopPropagation()}>
      <div className="notif-dropdown__header">
        <span className="notif-dropdown__title">Notifications</span>
        <button className="notif-dropdown__mark-all" onClick={onMarkAll}>
          Mark all read
        </button>
      </div>
      <div className="notif-dropdown__list">
        {notifications.length === 0 ? (
          <div className="notif-dropdown__empty">No notifications yet.</div>
        ) : (
          notifications.slice(0, 15).map((n) => (
            <div
              key={n.id}
              className={`notif-item${n.is_read ? '' : ' notif-item--unread'}`}
              onClick={() => onNotifClick(n)}
              role="button"
              tabIndex={0}
              id={`notif-${n.id}`}
            >
              <span className="notif-item__icon">{typeIcon(n.type)}</span>
              <div className="notif-item__body">
                <div className="notif-item__title">{n.title}</div>
                <div className="notif-item__msg">{n.message}</div>
                <div className="notif-item__time">{timeAgo(n.created_at)}</div>
              </div>
              {!n.is_read && <span className="notif-item__dot" />}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

/* ── Icons ── */
function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  )
}
function BellIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  )
}
function HelpIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  )
}
