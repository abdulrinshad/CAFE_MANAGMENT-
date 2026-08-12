import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminLayout from '../layouts/AdminLayout'
import './SettingsProfilePage.css'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const DEFAULT_HOURS = {
  Monday:    { open: '07:00', close: '19:00' },
  Tuesday:   { open: '07:00', close: '19:00' },
  Wednesday: { open: '07:00', close: '19:00' },
  Thursday:  { open: '07:00', close: '19:00' },
  Friday:    { open: '07:00', close: '21:00' },
  Saturday:  { open: '08:00', close: '21:00' },
  Sunday:    { open: '08:00', close: '17:00' },
}

const DEFAULT_PROFILE = {
  name: 'Artisan Brew Café',
  address: '123 Barista Lane, Espresso City',
  phone: '+1 (555) 123-4567',
  email: 'hello@artisanbrew.com',
  logo: null,
}

function formatTime(t) {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour  = ((h % 12) || 12).toString().padStart(2, '0')
  return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`
}

export default function SettingsProfilePage() {
  const navigate = useNavigate()
  const fileRef  = useRef(null)

  const [profile, setProfile] = useState(DEFAULT_PROFILE)
  const [saved,   setSaved]   = useState({ ...DEFAULT_PROFILE })
  const [hours,   setHours]   = useState({ ...DEFAULT_HOURS })
  const [savedH,  setSavedH]  = useState({ ...DEFAULT_HOURS })
  const [toast,   setToast]   = useState(false)

  const handleLogoChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    setProfile((p) => ({ ...p, logo: url }))
  }

  const handleSave = () => {
    setSaved({ ...profile })
    setSavedH({ ...hours })
    setToast(true)
    setTimeout(() => setToast(false), 2500)
  }

  const handleCancel = () => {
    setProfile({ ...saved })
    setHours({ ...savedH })
  }

  const updateHour = (day, field, value) => {
    setHours((h) => ({ ...h, [day]: { ...h[day], [field]: value } }))
  }

  return (
    <AdminLayout
      pageTitle="Café Profile"
      pageIcon={<ProfileIcon />}
      searchPlaceholder="Search settings..."
    >
      {/* Settings sub-nav */}
      <SettingsSubNav active="profile" />

      <div className="settings-page">
        <div className="settings-page__header">
          <h1 className="settings-page__title">Café Profile</h1>
          <p className="settings-page__sub">Manage your establishment's core details and operating hours.</p>
        </div>

        {/* Basic Information */}
        <div className="settings-card">
          <h2 className="settings-card__title">Basic Information</h2>
          <hr className="settings-card__divider" />

          <div className="profile-basic">
            {/* Logo */}
            <div className="profile-logo-col">
              <div className="profile-logo-wrap">
                {profile.logo ? (
                  <img src={profile.logo} alt="Café logo" className="profile-logo-img" />
                ) : (
                  <div className="profile-logo-placeholder">
                    <CafeLogoDefault />
                  </div>
                )}
              </div>
              <button
                className="profile-change-logo"
                onClick={() => fileRef.current?.click()}
                id="change-logo"
              >
                Change Logo
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleLogoChange}
              />
            </div>

            {/* Fields */}
            <div className="profile-fields">
              <div className="form-group">
                <label className="form-label" htmlFor="cafe-name">Café Name</label>
                <input
                  id="cafe-name"
                  className="form-input"
                  value={profile.name}
                  onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="cafe-address">Address</label>
                <input
                  id="cafe-address"
                  className="form-input"
                  value={profile.address}
                  onChange={(e) => setProfile((p) => ({ ...p, address: e.target.value }))}
                />
              </div>
              <div className="profile-fields-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="cafe-phone">Phone Number</label>
                  <input
                    id="cafe-phone"
                    className="form-input"
                    value={profile.phone}
                    onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="cafe-email">Email Address</label>
                  <input
                    id="cafe-email"
                    className="form-input"
                    value={profile.email}
                    onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Operating Hours */}
        <div className="settings-card">
          <h2 className="settings-card__title">Operating Hours</h2>
          <hr className="settings-card__divider" />

          <div className="hours-list">
            {DAYS.map((day) => (
              <div key={day} className={`hours-row${day === 'Sunday' ? ' hours-row--sunday' : ''}`}>
                <span className="hours-row__day">{day}</span>
                <div className="hours-row__times">
                  <div className="hours-time-input-wrap">
                    <input
                      type="time"
                      className="hours-time-input"
                      value={hours[day].open}
                      onChange={(e) => updateHour(day, 'open', e.target.value)}
                      id={`open-${day.toLowerCase()}`}
                    />
                  </div>
                  <span className="hours-row__to">to</span>
                  <div className="hours-time-input-wrap">
                    <input
                      type="time"
                      className="hours-time-input"
                      value={hours[day].close}
                      onChange={(e) => updateHour(day, 'close', e.target.value)}
                      id={`close-${day.toLowerCase()}`}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer buttons */}
        <div className="settings-footer">
          <button className="btn-outline" onClick={handleCancel} id="profile-cancel">Cancel</button>
          <button className="btn-primary settings-save-btn" onClick={handleSave} id="profile-save">
            <SaveIcon /> Save Changes
          </button>
        </div>
      </div>

      {/* Success toast */}
      {toast && (
        <div className="toast-success">
          <CheckCircleIcon /> Profile saved successfully!
        </div>
      )}
    </AdminLayout>
  )
}

/* ── Settings Sub-Nav ── */
export function SettingsSubNav({ active }) {
  const navigate = useNavigate()
  const tabs = [
    { key: 'profile', label: 'Café Profile',     path: '/settings/profile'  },
    { key: 'billing', label: 'Billing Settings',  path: '/settings/billing'  },
    { key: 'menu',    label: 'Menu Settings',     path: '/settings/menu'     },
  ]
  return (
    <div className="settings-subnav">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          className={`settings-subnav__tab${active === tab.key ? ' settings-subnav__tab--active' : ''}`}
          onClick={() => navigate(tab.path)}
          id={`settings-tab-${tab.key}`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

/* ── Placeholder logo SVG ── */
function CafeLogoDefault() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--color-tan-dark)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/>
      </svg>
      <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--color-espresso)', textAlign: 'center', lineHeight: 1.2 }}>
        THE DAILY<br/>GRIND
      </span>
    </div>
  )
}

/* ── Icons ── */
function ProfileIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
}
function SaveIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
}
function CheckCircleIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
}
