import { useState, useEffect, useMemo } from 'react'
import AdminLayout from '../../layouts/AdminLayout'
import PasswordInput from '../../components/PasswordInput'
import { useApp } from '../../context/AppContext'
import { settingsApi, branchApi, branchManagerApi, cashierApi, waiterApi } from '../../api'
import './owner.css'

const SETTINGS_SECTIONS = [
  { key: 'business',   label: 'Business Profile',  icon: '🏢' },
  { key: 'branches',   label: 'Branches',          icon: '🏪' },
  { key: 'users',      label: 'Users & Roles',     icon: '👥' },
  { key: 'permissions',label: 'Permissions',       icon: '🔐' },
  { key: 'tax',        label: 'Tax & Billing',     icon: '🧾' },
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
  const { fetchOwnerSettings } = useApp()
  const [section, setSection] = useState('business')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [successMessage, setSuccessMessage] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})
  
  const [settings, setSettings] = useState({
    business_name: '',
    owner_name: '',
    email: '',
    phone: '',
    gstin: '',
    address: '',
    website: '',
    currency: 'INR',
    auto_disable_inactive_branches: false,
    cross_branch_inventory_sharing: true,
    unified_menu_across_branches: false,
    require_email_verification: true,
    allow_managers_create_staff: true,
    allow_managers_view_reports: false,
    default_tax_rate: '5.00',
    service_charge: '0.00',
    invoice_footer_text: '',
    pm_cash: true,
    pm_upi: true,
    pm_card: true,
    pm_swiggy: true,
    pm_zomato: true,
    notif_new_order: true,
    notif_payment_done: true,
    notif_low_stock: true,
    notif_expense_added: false,
    notif_branch_report: true,
    notif_email_digest: false,
    sec_two_fa: false,
    sec_login_alerts: true,
    sec_session_timeout: '60',
  })

  // Branch and Staff lists
  const [branches, setBranches] = useState([])
  const [branchManagers, setBranchManagers] = useState([])
  const [cashiers, setCashiers] = useState([])
  const [waiters, setWaiters] = useState([])

  // Modal / Form state for Branch
  const [showBranchModal, setShowBranchModal] = useState(false)
  const [editingBranch, setEditingBranch] = useState(null)
  const [branchForm, setBranchForm] = useState({ name: '', code: '', phone: '', address: '', active: true })

  // Modal / Form state for Staff
  const [showStaffModal, setShowStaffModal] = useState(false)
  const [staffRole, setStaffRole] = useState('manager') // manager, cashier, waiter
  const [editingStaff, setEditingStaff] = useState(null)
  const [staffForm, setStaffForm] = useState({ name: '', employee_id: '', manager_id: '', email: '', pin: '', branch: '', section: '', is_active: true })

  useEffect(() => {
    fetchSettings()
  }, [])

  useEffect(() => {
    if (section === 'branches') {
      fetchBranches()
    } else if (section === 'users') {
      fetchBranches()
      fetchStaff()
    }
  }, [section])

  // Lookup map for display branch names
  const branchMap = useMemo(() => {
    const map = {}
    branches.forEach(b => {
      if (b && b.id) {
        map[b.id] = b.name
      }
    })
    return map
  }, [branches])

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const data = await settingsApi.get()
      setSettings(data)
      setError(null)
    } catch (err) {
      console.error('Failed to fetch settings', err)
      setError('Failed to load settings from database.')
    } finally {
      setLoading(false)
    }
  }

  const fetchBranches = async () => {
    try {
      const data = await branchApi.list()
      setBranches(data)
    } catch (err) {
      console.error('Failed to fetch branches', err)
    }
  }

  const fetchStaff = async () => {
    try {
      const [bmData, cashierData, waiterData] = await Promise.all([
        branchManagerApi.list(),
        cashierApi.list(),
        waiterApi.list()
      ])
      setBranchManagers(bmData)
      setCashiers(cashierData)
      setWaiters(waiterData)
    } catch (err) {
      console.error('Failed to fetch staff data', err)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSuccessMessage(null)
    setFieldErrors({})

    let normalizedWebsite = settings.website ? settings.website.trim() : ''
    if (normalizedWebsite) {
      if (!/^https?:\/\//i.test(normalizedWebsite)) {
        normalizedWebsite = `https://${normalizedWebsite}`
      }
      const urlPattern = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/i
      if (!urlPattern.test(normalizedWebsite)) {
        setFieldErrors({ website: 'Please enter a valid website URL.' })
        setSaving(false)
        return
      }
    } else {
      normalizedWebsite = null
    }

    try {
      const payload = { ...settings, website: normalizedWebsite }
      const res = await settingsApi.update(payload)
      setSettings(res)
      await fetchOwnerSettings()
      setSuccessMessage('Settings saved successfully!')
      setTimeout(() => setSuccessMessage(null), 4000)
    } catch (err) {
      console.error('Failed to save settings', err)
      if (err.data && typeof err.data === 'object') {
        setFieldErrors(err.data)
        const errMsg = Object.entries(err.data)
          .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`)
          .join('\n')
        setError(`Failed to save settings:\n${errMsg}`)
      } else {
        setError(err.message || 'Failed to save settings to database.')
      }
    } finally {
      setSaving(false)
    }
  }

  // Branch CRUD actions
  const handleOpenBranchModal = (branch = null) => {
    if (branch) {
      setEditingBranch(branch)
      setBranchForm({
        name: branch.name,
        code: branch.code,
        phone: branch.phone || '',
        address: branch.address || '',
        active: branch.active
      })
    } else {
      setEditingBranch(null)
      setBranchForm({ name: '', code: 'BRANCH-' + (branches.length + 1).toString().padStart(3, '0'), phone: '', address: '', active: true })
    }
    setShowBranchModal(true)
  }

  const handleSaveBranch = async (e) => {
    e.preventDefault()
    try {
      if (editingBranch) {
        await branchApi.update(editingBranch.id, branchForm)
      } else {
        await branchApi.create(branchForm)
      }
      setShowBranchModal(false)
      fetchBranches()
      setSuccessMessage(editingBranch ? 'Branch updated successfully!' : 'Branch created successfully!')
      setTimeout(() => setSuccessMessage(null), 4000)
    } catch (err) {
      alert(err.message || 'Failed to save branch')
    }
  }

  const handleToggleBranchActive = async (branch) => {
    try {
      await branchApi.setActive(branch.id, !branch.active)
      fetchBranches()
      setSuccessMessage(`Branch ${branch.name} status updated.`)
      setTimeout(() => setSuccessMessage(null), 4000)
    } catch (err) {
      alert('Failed to toggle branch status')
    }
  }

  // Staff CRUD actions
  const handleOpenStaffModal = (role, staff = null) => {
    setStaffRole(role)
    if (staff) {
      setEditingStaff(staff)
      setStaffForm({
        name: staff.name,
        employee_id: staff.employee_id || '',
        manager_id: staff.manager_id || '',
        email: staff.email || '',
        pin: '',
        branch: staff.branch_id || staff.branch || '',
        section: staff.section || '',
        is_active: staff.is_active !== undefined ? staff.is_active : true
      })
    } else {
      setEditingStaff(null)
      setStaffForm({ name: '', employee_id: '', manager_id: '', email: '', pin: '', branch: branches[0]?.id || '', section: '', is_active: true })
    }
    setShowStaffModal(true)
  }

  const handleSaveStaff = async (e) => {
    e.preventDefault()
    try {
      const payload = { ...staffForm }
      if (!payload.pin) {
        delete payload.pin // don't send empty pin on edit
      }

      if (staffRole === 'manager') {
        const mgrPayload = {
          name: payload.name,
          manager_id: payload.manager_id,
          email: payload.email,
          branch: payload.branch,
          is_active: payload.is_active
        }
        if (payload.pin) mgrPayload.pin = payload.pin

        if (editingStaff) {
          await branchManagerApi.update(editingStaff.id, mgrPayload)
        } else {
          await branchManagerApi.create(mgrPayload)
        }
      } else if (staffRole === 'cashier') {
        const cashPayload = {
          name: payload.name,
          employee_id: payload.employee_id,
          branch: payload.branch,
          is_active: payload.is_active
        }
        if (payload.pin) cashPayload.pin = payload.pin

        if (editingStaff) {
          await cashierApi.update(editingStaff.id, cashPayload)
        } else {
          await cashierApi.create(cashPayload)
        }
      } else if (staffRole === 'waiter') {
        const waiterPayload = {
          name: payload.name,
          employee_id: payload.employee_id,
          branch: payload.branch,
          section: payload.section,
          is_active: payload.is_active
        }
        if (payload.pin) waiterPayload.pin = payload.pin

        if (editingStaff) {
          await waiterApi.update(editingStaff.id, waiterPayload)
        } else {
          await waiterApi.create(waiterPayload)
        }
      }
      setShowStaffModal(false)
      fetchStaff()
      setSuccessMessage('Staff account saved successfully!')
      setTimeout(() => setSuccessMessage(null), 4000)
    } catch (err) {
      alert(err.message || 'Failed to save staff')
    }
  }

  const handleDeleteStaff = async (role, id) => {
    if (!confirm('Are you sure you want to delete this staff account?')) return
    try {
      if (role === 'manager') await branchManagerApi.delete(id)
      else if (role === 'cashier') await cashierApi.delete(id)
      else if (role === 'waiter') await waiterApi.delete(id)
      fetchStaff()
      setSuccessMessage('Staff account deleted.')
      setTimeout(() => setSuccessMessage(null), 4000)
    } catch (err) {
      alert('Failed to delete staff')
    }
  }

  const getBranchDisplayName = (staff) => {
    if (staff.branch_name) return staff.branch_name
    const bId = staff.branch_id || staff.branch
    if (bId && branchMap[bId]) return branchMap[bId]
    if (bId) return `Branch #${bId}`
    return '—'
  }

  const sf = (key) => (e) => setSettings(prev => ({ ...prev, [key]: e.target.value }))
  const setToggle = (key) => (v) => setSettings(prev => ({ ...prev, [key]: v }))

  if (loading) {
    return (
      <AdminLayout pageTitle="Settings" pageIcon="⚙️">
        <div className="owner-page">
          <div className="owner-section-card" style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>⚙️</div>
            <p style={{ margin: 0, fontSize: '14px' }}>Loading owner settings...</p>
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout pageTitle="Settings" pageIcon="⚙️">
      <div className="owner-page">

        <div className="owner-page-header">
          <div className="owner-page-header__left">
            <h1 className="owner-page-header__title">Owner Settings</h1>
            <p className="owner-page-header__sub">Manage business configuration, branch options, staff access, and operational preferences.</p>
          </div>
        </div>

        {successMessage && (
          <div style={{
            background: 'rgba(74,124,89,0.12)',
            color: 'var(--color-green)',
            border: '1px solid rgba(74,124,89,0.3)',
            borderRadius: '8px',
            padding: '12px 16px',
            fontSize: '13px',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span>✓ {successMessage}</span>
            <button onClick={() => setSuccessMessage(null)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '14px' }}>✕</button>
          </div>
        )}

        {error && <div style={{color: 'red', marginBottom: 15, padding: '10px 15px', background: '#ffebeb', borderRadius: 6}}>{error}</div>}

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

            {/* Business Profile — OUT OF SCOPE (UNTOUCHED) */}
            {section === 'business' && (
              <div className="owner-settings-block">
                <div className="owner-settings-block__title">Business Profile</div>
                <div className="owner-form-grid">
                  <div className="form-group">
                    <label className="form-label">Business Name</label>
                    <input className="form-input" value={settings.business_name} onChange={sf('business_name')} id="settings-business-name" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Owner Name</label>
                    <input className="form-input" value={settings.owner_name} onChange={sf('owner_name')} id="settings-owner-name" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input className="form-input" type="email" value={settings.email} onChange={sf('email')} id="settings-email" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone</label>
                    <input className="form-input" value={settings.phone} onChange={sf('phone')} id="settings-phone" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">GSTIN</label>
                    <input className="form-input" value={settings.gstin} onChange={sf('gstin')} id="settings-gstin" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Currency</label>
                    <select className="form-select" value={settings.currency} onChange={sf('currency')} id="settings-currency">
                      <option value="INR">INR — Indian Rupee (₹)</option>
                      <option value="USD">USD — US Dollar ($)</option>
                      <option value="EUR">EUR — Euro (€)</option>
                    </select>
                  </div>
                  <div className="form-group owner-form-grid--full">
                    <label className="form-label">Address</label>
                    <input className="form-input" value={settings.address} onChange={sf('address')} id="settings-address" />
                  </div>
                  <div className="form-group owner-form-grid--full">
                    <label className="form-label">Website</label>
                    <input className="form-input" value={settings.website || ''} onChange={sf('website')} id="settings-website" style={fieldErrors.website ? {borderColor: 'red'} : {}} />
                    {fieldErrors.website && <span className="field-error" style={{color: 'red', fontSize: '12px', marginTop: '4px', display: 'block'}}>{fieldErrors.website}</span>}
                  </div>
                </div>
                <div style={{ marginTop: 20 }}>
                  <button className="btn-primary" id="settings-save-business" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
                </div>
              </div>
            )}

            {/* Branches */}
            {section === 'branches' && (
              <div className="owner-settings-block">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <h2 className="owner-settings-block__title" style={{ margin: 0, paddingBottom: 4, borderBottom: 'none' }}>Manage Branches</h2>
                    <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-text-muted)' }}>Configure active branches, location codes, contact info, and operational status.</p>
                  </div>
                  <button className="btn-primary" onClick={() => handleOpenBranchModal()}>➕ Add Branch</button>
                </div>

                <div className="owner-table-wrap">
                  <table className="owner-table">
                    <thead>
                      <tr>
                        <th>Branch Code</th>
                        <th>Branch Name</th>
                        <th>Phone</th>
                        <th>Address</th>
                        <th>Status</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {branches.length === 0 ? (
                        <tr><td colSpan="6" style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '24px' }}>No branches found in database. Click "Add Branch" to create a branch.</td></tr>
                      ) : (
                        branches.map(b => (
                          <tr key={b.id}>
                            <td><strong>{b.code}</strong></td>
                            <td className="td-name">{b.name}</td>
                            <td>{b.phone || '—'}</td>
                            <td>{b.address || '—'}</td>
                            <td>
                              <span className={`owner-kpi-badge owner-kpi-badge--${b.active ? 'green' : 'red'}`}>
                                {b.active ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' }}>
                                <button className="btn-outline" style={{ padding: '4px 8px', fontSize: 12 }} onClick={() => handleOpenBranchModal(b)}>Edit</button>
                                <button className={b.active ? "btn-outline" : "btn-primary"} style={{ padding: '4px 8px', fontSize: 12 }} onClick={() => handleToggleBranchActive(b)}>
                                  {b.active ? 'Deactivate' : 'Activate'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Users & Roles */}
            {section === 'users' && (
              <div className="owner-settings-block">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <h2 className="owner-settings-block__title" style={{ margin: 0, paddingBottom: 4, borderBottom: 'none' }}>Staff Accounts</h2>
                    <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-text-muted)' }}>Manage employee accounts, credentials, role assignments, and branch access.</p>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn-primary" style={{ fontSize: 12, padding: '6px 12px' }} onClick={() => handleOpenStaffModal('manager')}>➕ Manager</button>
                    <button className="btn-primary" style={{ fontSize: 12, padding: '6px 12px' }} onClick={() => handleOpenStaffModal('cashier')}>➕ Cashier</button>
                    <button className="btn-primary" style={{ fontSize: 12, padding: '6px 12px' }} onClick={() => handleOpenStaffModal('waiter')}>➕ Waiter</button>
                  </div>
                </div>

                <div className="owner-table-wrap">
                  <table className="owner-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>ID</th>
                        <th>Role</th>
                        <th>Branch</th>
                        <th>Status</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Managers */}
                      {branchManagers.map(bm => (
                        <tr key={`mgr-${bm.id}`}>
                          <td className="td-name">{bm.name}</td>
                          <td><code>{bm.manager_id}</code></td>
                          <td><span className="owner-kpi-badge owner-kpi-badge--blue">Manager</span></td>
                          <td>{getBranchDisplayName(bm)}</td>
                          <td>
                            <span className={`owner-kpi-badge owner-kpi-badge--${bm.is_active ? 'green' : 'red'}`}>
                              {bm.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                              <button className="btn-outline" style={{ padding: '3px 6px', fontSize: 11 }} onClick={() => handleOpenStaffModal('manager', bm)}>Edit</button>
                              <button className="btn-outline" style={{ padding: '3px 6px', fontSize: 11, borderColor: 'red', color: 'red' }} onClick={() => handleDeleteStaff('manager', bm.id)}>Delete</button>
                            </div>
                          </td>
                        </tr>
                      ))}

                      {/* Cashiers */}
                      {cashiers.map(c => (
                        <tr key={`csh-${c.id}`}>
                          <td className="td-name">{c.name}</td>
                          <td><code>{c.employee_id}</code></td>
                          <td><span className="owner-kpi-badge owner-kpi-badge--yellow">Cashier</span></td>
                          <td>{getBranchDisplayName(c)}</td>
                          <td>
                            <span className={`owner-kpi-badge owner-kpi-badge--${c.is_active ? 'green' : 'red'}`}>
                              {c.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                              <button className="btn-outline" style={{ padding: '3px 6px', fontSize: 11 }} onClick={() => handleOpenStaffModal('cashier', c)}>Edit</button>
                              <button className="btn-outline" style={{ padding: '3px 6px', fontSize: 11, borderColor: 'red', color: 'red' }} onClick={() => handleDeleteStaff('cashier', c.id)}>Delete</button>
                            </div>
                          </td>
                        </tr>
                      ))}

                      {/* Waiters */}
                      {waiters.map(w => (
                        <tr key={`wtr-${w.id}`}>
                          <td className="td-name">{w.name}</td>
                          <td><code>{w.employee_id || w.id}</code></td>
                          <td><span className="owner-kpi-badge owner-kpi-badge--green">Waiter</span></td>
                          <td>{getBranchDisplayName(w)}</td>
                          <td>
                            <span className={`owner-kpi-badge owner-kpi-badge--${w.is_active ? 'green' : 'red'}`}>
                              {w.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                              <button className="btn-outline" style={{ padding: '3px 6px', fontSize: 11 }} onClick={() => handleOpenStaffModal('waiter', w)}>Edit</button>
                              <button className="btn-outline" style={{ padding: '3px 6px', fontSize: 11, borderColor: 'red', color: 'red' }} onClick={() => handleDeleteStaff('waiter', w.id)}>Delete</button>
                            </div>
                          </td>
                        </tr>
                      ))}

                      {branchManagers.length === 0 && cashiers.length === 0 && waiters.length === 0 && (
                        <tr><td colSpan="6" style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>No staff accounts found.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Permissions */}
            {section === 'permissions' && (
              <div className="owner-settings-block">
                <div className="owner-settings-block__title">System Permissions Matrix (Read-Only)</div>
                <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
                  Overview of default access permissions across different staff roles in the Café Management System.
                </p>
                <div className="owner-table-wrap">
                  <table className="owner-table" style={{ minWidth: 550 }}>
                    <thead>
                      <tr>
                        <th>Permission Module</th>
                        <th style={{ textAlign: 'center' }}>Owner</th>
                        <th style={{ textAlign: 'center' }}>Manager</th>
                        <th style={{ textAlign: 'center' }}>POS / Cashier</th>
                        <th style={{ textAlign: 'center' }}>Waiter</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        ['View Multi-Branch Operations', 'Full Access', 'Assigned Branch', '—', '—'],
                        ['Configure System & Branch Settings', 'Full Access', '—', '—', '—'],
                        ['Manage Staff Accounts', 'Full Access', 'Configurable', '—', '—'],
                        ['View Financial & Sales Reports', 'Full Access', 'Configurable', '—', '—'],
                        ['Manage Menu & Products', 'Full Access', 'Allowed', '—', '—'],
                        ['Process POS Orders & Payments', 'Full Access', 'Allowed', 'Full Access', 'Allowed'],
                        ['Manage Customer QRs & Tables', 'Full Access', 'Allowed', 'Allowed', 'Allowed'],
                        ['View & Record Expenses', 'Full Access', 'Allowed', '—', '—'],
                      ].map(([perm, owner, manager, pos, waiter]) => (
                        <tr key={perm}>
                          <td className="td-name">{perm}</td>
                          <td style={{ textAlign: 'center' }}>
                            <span className="owner-kpi-badge owner-kpi-badge--green">{owner}</span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {manager === '—' ? (
                              <span style={{ color: 'var(--color-text-muted)' }}>—</span>
                            ) : (
                              <span className={`owner-kpi-badge owner-kpi-badge--${manager === 'Full Access' ? 'green' : manager === 'Configurable' ? 'orange' : 'blue'}`}>{manager}</span>
                            )}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {pos === '—' ? (
                              <span style={{ color: 'var(--color-text-muted)' }}>—</span>
                            ) : (
                              <span className={`owner-kpi-badge owner-kpi-badge--${pos === 'Full Access' ? 'green' : 'blue'}`}>{pos}</span>
                            )}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {waiter === '—' ? (
                              <span style={{ color: 'var(--color-text-muted)' }}>—</span>
                            ) : (
                              <span className={`owner-kpi-badge owner-kpi-badge--${waiter === 'Full Access' ? 'green' : 'blue'}`}>{waiter}</span>
                            )}
                          </td>
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
                <div className="owner-settings-block__title">Tax &amp; Billing Settings</div>
                <div className="owner-form-grid">
                  <div className="form-group">
                    <label className="form-label">Default Tax Rate (%)</label>
                    <input
                      className="form-input"
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={settings.default_tax_rate}
                      onChange={sf('default_tax_rate')}
                      id="settings-tax-rate"
                    />
                    <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px', display: 'block' }}>
                      Base GST/tax percentage applied automatically to orders and menu items.
                    </span>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Service Charge (%)</label>
                    <input
                      className="form-input"
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={settings.service_charge}
                      onChange={sf('service_charge')}
                      id="settings-service-charge"
                    />
                    <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px', display: 'block' }}>
                      Optional service percentage added to dine-in bills.
                    </span>
                  </div>
                  <div className="form-group owner-form-grid--full">
                    <label className="form-label">Invoice Footer Text</label>
                    <textarea
                      className="form-textarea"
                      rows={3}
                      value={settings.invoice_footer_text}
                      onChange={sf('invoice_footer_text')}
                      id="settings-invoice-footer"
                      placeholder="Thank you for dining with us!"
                    />
                    <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px', display: 'block' }}>
                      Custom thank-you message or tax disclaimer printed on receipts.
                    </span>
                  </div>
                </div>
                <div style={{ marginTop: 20 }}>
                  <button className="btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Tax Settings'}</button>
                </div>
              </div>
            )}


            {/* Notifications */}
            {section === 'notifs' && (
              <div className="owner-settings-block">
                <div className="owner-settings-block__title">Notification Preferences</div>
                <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
                  Choose which operational alerts and system updates trigger notifications for the owner account.
                </p>
                {[
                  { key: 'notif_new_order',     label: 'New Order Alerts',          sub: 'Receive real-time notifications when a new order is placed' },
                  { key: 'notif_payment_done',  label: 'Payment Confirmations',     sub: 'Get notified when an order bill payment is settled' },
                  { key: 'notif_low_stock',     label: 'Low Stock Warnings',        sub: 'Alert when ingredient inventory drops below threshold levels' },
                  { key: 'notif_expense_added', label: 'Branch Expense Entries',    sub: 'Notify when a branch manager records a new expense' },
                  { key: 'notif_branch_report', label: 'Daily Branch Summaries',    sub: 'End-of-day revenue and sales report notifications' },
                  { key: 'notif_email_digest',  label: 'Weekly Executive Email',    sub: 'Weekly executive sales & performance digest sent via email' },
                ].map(n => (
                  <div key={n.key} className="owner-settings-row">
                    <div>
                      <div className="owner-settings-row__label">{n.label}</div>
                      <div className="owner-settings-row__sub">{n.sub}</div>
                    </div>
                    <Toggle
                      checked={settings[n.key]}
                      onChange={setToggle(n.key)}
                      id={`notif-${n.key}`}
                    />
                  </div>
                ))}
                <div style={{ marginTop: 20 }}>
                  <button className="btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Notification Settings'}</button>
                </div>
              </div>
            )}

            {/* Security */}
            {section === 'security' && (
              <div className="owner-settings-block">
                <div className="owner-settings-block__title">Security &amp; Account Protection</div>
                <div className="owner-settings-row">
                  <div>
                    <div className="owner-settings-row__label">Two-Factor Authentication (2FA)</div>
                    <div className="owner-settings-row__sub">Require OTP verification on login for administrative accounts</div>
                  </div>
                  <Toggle checked={settings.sec_two_fa} onChange={setToggle('sec_two_fa')} id="toggle-2fa" />
                </div>
                <div className="owner-settings-row">
                  <div>
                    <div className="owner-settings-row__label">Security Login Alerts</div>
                    <div className="owner-settings-row__sub">Receive email alerts when a login occurs from an unrecognized device or IP</div>
                  </div>
                  <Toggle checked={settings.sec_login_alerts} onChange={setToggle('sec_login_alerts')} id="toggle-login-alerts" />
                </div>
                <div className="owner-settings-row">
                  <div>
                    <div className="owner-settings-row__label">Automated Session Timeout</div>
                    <div className="owner-settings-row__sub">Automatically end idle management sessions to prevent unauthorized access</div>
                  </div>
                  <select className="form-select" style={{ width: 'auto' }} value={settings.sec_session_timeout} onChange={sf('sec_session_timeout')} id="settings-session-timeout">
                    <option value="30">30 minutes</option>
                    <option value="60">1 hour</option>
                    <option value="240">4 hours</option>
                    <option value="0">Never (Stay logged in)</option>
                  </select>
                </div>
                <div style={{ marginTop: 20 }}>
                  <button className="btn-primary" id="settings-save-security" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Security Settings'}</button>
                </div>
              </div>
            )}

          </div>
        </div>

      </div>

      {/* Branch Modal */}
      {showBranchModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 8, padding: 25, width: '100%', maxWidth: 450, boxShadow: '0 4px 15px rgba(0,0,0,0.15)' }}>
            <h3 style={{ marginTop: 0, marginBottom: 15 }}>{editingBranch ? 'Edit Branch' : 'Add Branch'}</h3>
            <form onSubmit={handleSaveBranch}>
              <div style={{ marginBottom: 12 }}>
                <label className="form-label">Branch Name</label>
                <input className="form-input" required value={branchForm.name} onChange={e => setBranchForm({ ...branchForm, name: e.target.value })} />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label className="form-label">Branch Code</label>
                <input className="form-input" required value={branchForm.code} onChange={e => setBranchForm({ ...branchForm, code: e.target.value })} />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label className="form-label">Phone</label>
                <input className="form-input" value={branchForm.phone} onChange={e => setBranchForm({ ...branchForm, phone: e.target.value })} />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label className="form-label">Address</label>
                <input className="form-input" value={branchForm.address} onChange={e => setBranchForm({ ...branchForm, address: e.target.value })} />
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
                <button type="button" className="btn-outline" onClick={() => setShowBranchModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Save Branch</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Staff Modal */}
      {showStaffModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 8, padding: 25, width: '100%', maxWidth: 450, boxShadow: '0 4px 15px rgba(0,0,0,0.15)' }}>
            <h3 style={{ marginTop: 0, marginBottom: 15 }}>
              {editingStaff ? 'Edit' : 'Add'} {staffRole === 'manager' ? 'Branch Manager' : staffRole === 'cashier' ? 'Cashier' : 'Waiter'}
            </h3>
            <form onSubmit={handleSaveStaff}>
              <div style={{ marginBottom: 12 }}>
                <label className="form-label">Full Name</label>
                <input className="form-input" required value={staffForm.name} onChange={e => setStaffForm({ ...staffForm, name: e.target.value })} />
              </div>

              {staffRole === 'manager' && (
                <>
                  <div style={{ marginBottom: 12 }}>
                    <label className="form-label">Manager ID (Username)</label>
                    <input className="form-input" required value={staffForm.manager_id} onChange={e => setStaffForm({ ...staffForm, manager_id: e.target.value })} />
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <label className="form-label">Manager Email *</label>
                    <input className="form-input" type="email" required value={staffForm.email || ''} onChange={e => setStaffForm({ ...staffForm, email: e.target.value })} />
                  </div>
                </>
              )}
              {staffRole !== 'manager' && (
                <div style={{ marginBottom: 12 }}>
                  <label className="form-label">Employee ID (Username)</label>
                  <input className="form-input" required value={staffForm.employee_id} onChange={e => setStaffForm({ ...staffForm, employee_id: e.target.value })} />
                </div>
              )}

              <div style={{ marginBottom: 12 }}>
                <label className="form-label">PIN / Password {editingStaff && '(leave empty to keep current)'}</label>
                <PasswordInput required={!editingStaff} value={staffForm.pin} onChange={e => setStaffForm({ ...staffForm, pin: e.target.value })} title="PIN" />
              </div>

              <div style={{ marginBottom: 12 }}>
                <label className="form-label">Branch Assignment</label>
                <select className="form-select" value={staffForm.branch} onChange={e => setStaffForm({ ...staffForm, branch: e.target.value })}>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              {staffRole === 'waiter' && (
                <div style={{ marginBottom: 12 }}>
                  <label className="form-label">Section / Dining Area</label>
                  <input className="form-input" placeholder="e.g. Ground Floor, Terrace" value={staffForm.section} onChange={e => setStaffForm({ ...staffForm, section: e.target.value })} />
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <label className="form-label" style={{ margin: 0 }}>Active Status</label>
                <Toggle checked={staffForm.is_active} onChange={v => setStaffForm({ ...staffForm, is_active: v })} id="staff-active-toggle" />
              </div>

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
                <button type="button" className="btn-outline" onClick={() => setShowStaffModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Save Account</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
