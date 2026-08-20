import { useState } from 'react'
import AdminLayout from '../../layouts/AdminLayout'
import './owner.css'

const SETTINGS_SECTIONS = [
  { key: 'business',   label: 'Business Profile',  icon: '🏢' },
  { key: 'branches',   label: 'Branches',          icon: '🏪' },
  { key: 'users',      label: 'Users & Roles',     icon: '👥' },
  { key: 'permissions',label: 'Permissions',       icon: '🔐' },
  { key: 'tax',        label: 'Tax & Billing',     icon: '🧾' },
  { key: 'payments',   label: 'Payment Methods',   icon: '💳' },
  { key: 'notifs',     label: 'Notifications',     icon: '🔔' },
  { key: 'security',   label: 'Security',          icon: '🛡️' },
]

/* ── Setting Toggle ── */
function Toggle({ checked, onChange, id }) {
  return (
    <label htmlFor={id} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
      <input type="checkbox" id={id} checked={checked} onChange={e => onChange(e.target.checked)} style={{ display: 'none' }} />
      <div style={{
        width: 38, height: 22, borderRadius: 11,
        background: checked ? 'var(--color-espresso)' : 'var(--color-cream-dark)',
        position: 'relative', transition: 'background 0.2s ease',
      }}>
        <div style={{
          position: 'absolute', top: 3, left: checked ? 18 : 3,
          width: 16, height: 16, borderRadius: '50%', background: '#fff',
          transition: 'left 0.2s ease', boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
        }} />
      </div>
    </label>
  )
}

export default function OwnerSettingsPage() {
  const [section, setSection] = useState('business')
  const [businessForm, setBusinessForm] = useState({
    businessName:  'Artisan Brew',
    ownerName:     'Dilfa',
    email:         'dilfa@artisanbrew.com',
    phone:         '+91 98765 43200',
    gstin:         '29ARTBR1234F1Z9',
    address:       'Bengaluru, Karnataka',
    website:       'www.artisanbrew.com',
    currency:      'INR',
  })
  const [notifSettings, setNotifSettings] = useState({
    newOrder:      true,
    paymentDone:   true,
    lowStock:      true,
    expenseAdded:  false,
    branchReport:  true,
    emailDigest:   false,
  })
  const [secSettings, setSecSettings] = useState({
    twoFA:          false,
    loginAlerts:    true,
    sessionTimeout: '60',
  })

  const bf = (key) => (e) => setBusinessForm(prev => ({ ...prev, [key]: e.target.value }))

  return (
    <AdminLayout pageTitle="Settings" pageIcon="⚙️">
      <div className="owner-page">

        <div className="owner-page-header">
          <div className="owner-page-header__left">
            <h1 className="owner-page-header__title">Settings</h1>
            <p className="owner-page-header__sub">Manage your business configuration and system preferences.</p>
          </div>
        </div>

        <div className="owner-settings-layout">
          {/* Nav */}
          <div className="owner-section-card">
            <div className="owner-section-card__body" style={{ padding: 8 }}>
              <div className="owner-settings-nav">
                {SETTINGS_SECTIONS.map(s => (
                  <button
                    key={s.key}
                    className={`owner-settings-nav-item${section === s.key ? ' owner-settings-nav-item--active' : ''}`}
                    onClick={() => setSection(s.key)}
                    id={`settings-nav-${s.key}`}
                  >
                    <span>{s.icon}</span> {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="owner-settings-section">

            {/* Business Profile */}
            {section === 'business' && (
              <div className="owner-settings-block">
                <div className="owner-settings-block__title">Business Profile</div>
                <div className="owner-form-grid">
                  <div className="form-group">
                    <label className="form-label">Business Name</label>
                    <input className="form-input" value={businessForm.businessName} onChange={bf('businessName')} id="settings-business-name" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Owner Name</label>
                    <input className="form-input" value={businessForm.ownerName} onChange={bf('ownerName')} id="settings-owner-name" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input className="form-input" type="email" value={businessForm.email} onChange={bf('email')} id="settings-email" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone</label>
                    <input className="form-input" value={businessForm.phone} onChange={bf('phone')} id="settings-phone" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">GSTIN</label>
                    <input className="form-input" value={businessForm.gstin} onChange={bf('gstin')} id="settings-gstin" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Currency</label>
                    <select className="form-select" value={businessForm.currency} onChange={bf('currency')} id="settings-currency">
                      <option value="INR">INR — Indian Rupee</option>
                      <option value="USD">USD — US Dollar</option>
                      <option value="EUR">EUR — Euro</option>
                    </select>
                  </div>
                  <div className="form-group owner-form-grid--full">
                    <label className="form-label">Address</label>
                    <input className="form-input" value={businessForm.address} onChange={bf('address')} id="settings-address" />
                  </div>
                  <div className="form-group owner-form-grid--full">
                    <label className="form-label">Website</label>
                    <input className="form-input" value={businessForm.website} onChange={bf('website')} id="settings-website" />
                  </div>
                </div>
                <div style={{ marginTop: 20 }}>
                  <button className="btn-primary" id="settings-save-business">Save Changes</button>
                </div>
              </div>
            )}

            {/* Branches */}
            {section === 'branches' && (
              <div className="owner-settings-block">
                <div className="owner-settings-block__title">Branch Settings</div>
                <div className="owner-settings-row">
                  <div>
                    <div className="owner-settings-row__label">Auto-disable inactive branches</div>
                    <div className="owner-settings-row__sub">Automatically mark branches as inactive after 30 days of no activity.</div>
                  </div>
                  <Toggle checked={false} onChange={() => {}} id="toggle-auto-disable" />
                </div>
                <div className="owner-settings-row">
                  <div>
                    <div className="owner-settings-row__label">Cross-branch inventory sharing</div>
                    <div className="owner-settings-row__sub">Allow branches to share inventory records.</div>
                  </div>
                  <Toggle checked={true} onChange={() => {}} id="toggle-inv-share" />
                </div>
                <div className="owner-settings-row">
                  <div>
                    <div className="owner-settings-row__label">Unified menu across branches</div>
                    <div className="owner-settings-row__sub">Changes to the menu apply to all branches by default.</div>
                  </div>
                  <Toggle checked={false} onChange={() => {}} id="toggle-unified-menu" />
                </div>
              </div>
            )}

            {/* Users & Roles */}
            {section === 'users' && (
              <div className="owner-settings-block">
                <div className="owner-settings-block__title">Users &amp; Roles</div>
                <div className="owner-settings-row">
                  <div>
                    <div className="owner-settings-row__label">Require email verification for new staff</div>
                  </div>
                  <Toggle checked={true} onChange={() => {}} id="toggle-email-verify" />
                </div>
                <div className="owner-settings-row">
                  <div>
                    <div className="owner-settings-row__label">Allow managers to create staff accounts</div>
                  </div>
                  <Toggle checked={true} onChange={() => {}} id="toggle-manager-create-staff" />
                </div>
                <div className="owner-settings-row">
                  <div>
                    <div className="owner-settings-row__label">Allow managers to view financial reports</div>
                  </div>
                  <Toggle checked={false} onChange={() => {}} id="toggle-manager-reports" />
                </div>
              </div>
            )}

            {/* Permissions */}
            {section === 'permissions' && (
              <div className="owner-settings-block">
                <div className="owner-settings-block__title">Permissions Matrix</div>
                <div className="owner-table-wrap">
                  <table className="owner-table" style={{ minWidth: 400 }}>
                    <thead><tr><th>Permission</th><th>Owner</th><th>Manager</th><th>POS</th><th>Waiter</th></tr></thead>
                    <tbody>
                      {[
                        ['View All Branches', '✅', '✅', '—', '—'],
                        ['Edit Branch Settings', '✅', '—', '—', '—'],
                        ['Manage Staff', '✅', '✅', '—', '—'],
                        ['View Reports', '✅', '✅', '—', '—'],
                        ['Edit Menu', '✅', '✅', '—', '—'],
                        ['Process Orders', '✅', '✅', '✅', '✅'],
                        ['View Expenses', '✅', '✅', '—', '—'],
                        ['Add Expenses', '✅', '✅', '—', '—'],
                      ].map(([perm, ...roles]) => (
                        <tr key={perm}>
                          <td className="td-name">{perm}</td>
                          {roles.map((v, i) => <td key={i} style={{ textAlign: 'center' }}>{v}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Tax & Billing */}
            {section === 'tax' && (
              <div className="owner-settings-block">
                <div className="owner-settings-block__title">Tax &amp; Billing</div>
                <div className="owner-form-grid">
                  <div className="form-group">
                    <label className="form-label">Default Tax Rate (%)</label>
                    <input className="form-input" type="number" defaultValue="5" id="settings-tax-rate" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Service Charge (%)</label>
                    <input className="form-input" type="number" defaultValue="0" id="settings-service-charge" />
                  </div>
                  <div className="form-group owner-form-grid--full">
                    <label className="form-label">Invoice Footer Text</label>
                    <textarea className="form-textarea" defaultValue="Thank you for visiting Artisan Brew! Your satisfaction is our priority." id="settings-invoice-footer" />
                  </div>
                </div>
                <div style={{ marginTop: 20 }}>
                  <button className="btn-primary" id="settings-save-tax">Save Tax Settings</button>
                </div>
              </div>
            )}

            {/* Payment Methods */}
            {section === 'payments' && (
              <div className="owner-settings-block">
                <div className="owner-settings-block__title">Accepted Payment Methods</div>
                {[
                  { id: 'pm-cash',   label: 'Cash',          sub: 'Accept cash payments at POS' },
                  { id: 'pm-upi',    label: 'UPI',           sub: 'GPay, PhonePe, Paytm, etc.' },
                  { id: 'pm-card',   label: 'Debit/Credit Card', sub: 'Visa, Mastercard, RuPay' },
                  { id: 'pm-swiggy', label: 'Swiggy Online', sub: 'Online payments from Swiggy orders' },
                  { id: 'pm-zomato', label: 'Zomato Online', sub: 'Online payments from Zomato orders' },
                ].map(pm => (
                  <div key={pm.id} className="owner-settings-row">
                    <div>
                      <div className="owner-settings-row__label">{pm.label}</div>
                      <div className="owner-settings-row__sub">{pm.sub}</div>
                    </div>
                    <Toggle checked={true} onChange={() => {}} id={pm.id} />
                  </div>
                ))}
              </div>
            )}

            {/* Notifications */}
            {section === 'notifs' && (
              <div className="owner-settings-block">
                <div className="owner-settings-block__title">Notification Preferences</div>
                {[
                  { key: 'newOrder',     label: 'New Orders',          sub: 'Get notified when a new order is placed' },
                  { key: 'paymentDone',  label: 'Payment Completed',   sub: 'Alert when payment is confirmed' },
                  { key: 'lowStock',     label: 'Low Stock Alerts',    sub: 'Notify when stock falls below minimum' },
                  { key: 'expenseAdded', label: 'Expense Added',       sub: 'When a branch manager adds an expense' },
                  { key: 'branchReport', label: 'Daily Branch Report', sub: 'End-of-day summary from each branch' },
                  { key: 'emailDigest',  label: 'Weekly Email Digest', sub: 'Summary sent every Monday morning' },
                ].map(n => (
                  <div key={n.key} className="owner-settings-row">
                    <div>
                      <div className="owner-settings-row__label">{n.label}</div>
                      <div className="owner-settings-row__sub">{n.sub}</div>
                    </div>
                    <Toggle
                      checked={notifSettings[n.key]}
                      onChange={v => setNotifSettings(prev => ({ ...prev, [n.key]: v }))}
                      id={`notif-${n.key}`}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Security */}
            {section === 'security' && (
              <div className="owner-settings-block">
                <div className="owner-settings-block__title">Security Settings</div>
                <div className="owner-settings-row">
                  <div>
                    <div className="owner-settings-row__label">Two-Factor Authentication</div>
                    <div className="owner-settings-row__sub">Require OTP at every login</div>
                  </div>
                  <Toggle checked={secSettings.twoFA} onChange={v => setSecSettings(p => ({ ...p, twoFA: v }))} id="toggle-2fa" />
                </div>
                <div className="owner-settings-row">
                  <div>
                    <div className="owner-settings-row__label">Login Alerts</div>
                    <div className="owner-settings-row__sub">Email alert on new login from unknown device</div>
                  </div>
                  <Toggle checked={secSettings.loginAlerts} onChange={v => setSecSettings(p => ({ ...p, loginAlerts: v }))} id="toggle-login-alerts" />
                </div>
                <div className="owner-settings-row">
                  <div>
                    <div className="owner-settings-row__label">Session Timeout</div>
                    <div className="owner-settings-row__sub">Automatically log out after inactivity</div>
                  </div>
                  <select className="form-select" style={{ width: 'auto' }} value={secSettings.sessionTimeout} onChange={e => setSecSettings(p => ({ ...p, sessionTimeout: e.target.value }))} id="settings-session-timeout">
                    <option value="30">30 minutes</option>
                    <option value="60">1 hour</option>
                    <option value="240">4 hours</option>
                    <option value="0">Never</option>
                  </select>
                </div>
                <div style={{ marginTop: 20, display: 'flex', gap: 8 }}>
                  <button className="btn-primary" id="settings-save-security">Save Security Settings</button>
                  <button className="btn-outline" id="settings-change-password">Change Password</button>
                </div>
              </div>
            )}

          </div>
        </div>

      </div>
    </AdminLayout>
  )
}
