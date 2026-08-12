import { useState } from 'react'
import './TopHeader.css'

export default function TopHeader({ searchPlaceholder = 'Search orders, items...', pageTitle, pageIcon, right }) {
  const [searchVal, setSearchVal] = useState('')

  return (
    <header className="top-header">
      {/* Left: either search bar or page title */}
      {pageTitle ? (
        <div className="top-header__page-title">
          {pageIcon && <span className="top-header__page-icon">{pageIcon}</span>}
          <span className="top-header__page-name">{pageTitle}</span>
        </div>
      ) : (
        <div className="top-header__search">
          <span className="top-header__search-icon">
            <SearchIcon />
          </span>
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
          <button className="top-header__icon-btn" id="btn-notifications" aria-label="Notifications">
            <BellIcon />
          </button>
          <button className="top-header__avatar" id="btn-profile" aria-label="Profile">
            <img src="/logo.png" alt="Admin" />
          </button>
        </div>
      ) : (
        <div className="top-header__actions">
          <button className="top-header__icon-btn" id="btn-notifications" aria-label="Notifications">
            <BellIcon />
          </button>
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
