import { useState, useEffect } from 'react'
import AdminLayout from '../../layouts/AdminLayout'
import Modal from '../../components/Modal'
import { waiterApi, cashierApi, branchApi } from '../../api'
import './owner.css'

const EMPLOYEE_TYPE_WAITER = 'waiter'
const EMPLOYEE_TYPE_CASHIER = 'cashier'

const EMPTY_WAITER_FORM = {
  name: '',
  employee_id: '',
  section: 'Main Section',
  branch: '',
  pin: '',
  confirm_pin: '',
  is_active: true,
}

const EMPTY_CASHIER_FORM = {
  name: '',
  employee_id: '',
  branch: '',
  pin: '',
  confirm_pin: '',
  is_active: true,
}

export default function OwnerStaffPage() {
  const [activeTab, setActiveTab]       = useState('all')   // 'all' | 'waiter' | 'cashier'
  const [waiters, setWaiters]           = useState([])
  const [cashiers, setCashiers]         = useState([])
  const [branches, setBranches]         = useState([])
  const [search, setSearch]             = useState('')
  const [branchFilter, setBranchFilter] = useState('all')
  const [modal, setModal]               = useState(false)
  const [editing, setEditing]           = useState(null)     // { id, type }
  const [employeeType, setEmployeeType] = useState(EMPLOYEE_TYPE_WAITER)
  const [form, setForm]                 = useState(EMPTY_WAITER_FORM)
  const [saving, setSaving]             = useState(false)
  const [error, setError]               = useState(null)

  const loadAll = async () => {
    try {
      const [waiterData, cashierData, branchData] = await Promise.all([
        waiterApi.list(),
        cashierApi.list(),
        branchApi.list(),
      ])
      setWaiters(Array.isArray(waiterData) ? waiterData : (waiterData.results ?? []))
      setCashiers(Array.isArray(cashierData) ? cashierData : (cashierData.results ?? []))
      setBranches(Array.isArray(branchData) ? branchData : (branchData.results ?? []))
    } catch (err) {
      console.error('Load staff error:', err)
    }
  }

  useEffect(() => { loadAll() }, [])

  // Unified list
  const allEmployees = [
    ...waiters.map(w => ({ ...w, _type: 'waiter' })),
    ...cashiers.map(c => ({ ...c, _type: 'cashier' })),
  ]

  const filtered = allEmployees.filter(e => {
    const matchSearch = e.name.toLowerCase().includes(search.toLowerCase()) ||
      (e.employee_id && e.employee_id.toLowerCase().includes(search.toLowerCase())) ||
      (e.branch_name && e.branch_name.toLowerCase().includes(search.toLowerCase()))
    const matchTab    = activeTab === 'all' || e._type === activeTab
    const matchBranch = branchFilter === 'all' || String(e.branch) === branchFilter
    return matchSearch && matchTab && matchBranch
  })

  const openAdd = (type = EMPLOYEE_TYPE_WAITER) => {
    setEmployeeType(type)
    setForm(type === EMPLOYEE_TYPE_WAITER ? EMPTY_WAITER_FORM : EMPTY_CASHIER_FORM)
    setEditing(null)
    setError(null)
    setModal(true)
  }

  const openEdit = (e) => {
    setEmployeeType(e._type)
    if (e._type === EMPLOYEE_TYPE_WAITER) {
      setForm({
        name: e.name,
        employee_id: e.employee_id || '',
        section: e.section || 'Main Section',
        branch: e.branch ?? '',
        pin: '',
        confirm_pin: '',
        is_active: e.is_active ?? true,
      })
    } else {
      setForm({
        name: e.name,
        employee_id: e.employee_id || '',
        branch: e.branch ?? '',
        pin: '',
        confirm_pin: '',
        is_active: e.is_active ?? true,
      })
    }
    setEditing({ id: e.id, type: e._type })
    setError(null)
    setModal(true)
  }

  const closeModal = () => {
    setModal(false)
    setEditing(null)
    setError(null)
  }

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Name is required.'); return }
    if (!form.employee_id.trim()) { setError('Employee ID is required.'); return }
    if (!form.branch) { setError('Branch is required.'); return }
    if (!editing && !form.pin) { setError('PIN is required for new employees.'); return }
    if (form.pin && (form.pin.length !== 4 || !/^\d+$/.test(form.pin))) {
      setError('PIN must be exactly 4 digits.'); return
    }
    if (form.pin && form.pin !== form.confirm_pin) {
      setError('PINs do not match.'); return
    }

    setSaving(true)
    setError(null)
    try {
      const payload = {
        name: form.name.trim(),
        employee_id: form.employee_id.trim(),
        branch: Number(form.branch),
        is_active: form.is_active,
      }
      if (employeeType === EMPLOYEE_TYPE_WAITER) {
        payload.section = form.section?.trim() || 'Main Section'
      }
      if (form.pin) {
        payload.pin = form.pin
        payload.confirm_pin = form.pin
      }

      if (editing) {
        if (editing.type === EMPLOYEE_TYPE_WAITER) {
          await waiterApi.update(editing.id, payload)
        } else {
          await cashierApi.update(editing.id, payload)
        }
      } else {
        if (employeeType === EMPLOYEE_TYPE_WAITER) {
          await waiterApi.create(payload)
        } else {
          await cashierApi.create(payload)
        }
      }

      await loadAll()
      closeModal()
    } catch (err) {
      console.error('Save staff error:', err)
      setError(err.message || 'Failed to save employee.')
    } finally {
      setSaving(false)
    }
  }

  const toggleStatus = async (e) => {
    try {
      const payload = { is_active: !e.is_active }
      if (e._type === EMPLOYEE_TYPE_WAITER) {
        await waiterApi.update(e.id, payload)
      } else {
        await cashierApi.update(e.id, payload)
      }
      await loadAll()
    } catch (err) {
      console.error('Toggle status error:', err)
    }
  }

  const f = (key) => (ev) => setForm(prev => ({ ...prev, [key]: ev.target.value }))

  const TABS = [
    { key: 'all',     label: 'All Employees' },
    { key: 'waiter',  label: 'Waiters' },
    { key: 'cashier', label: 'Cashiers' },
  ]

  return (
    <AdminLayout pageTitle="Staff & Permissions" pageIcon="👥">
      <div className="owner-page">

        {/* Header */}
        <div className="owner-page-header">
          <div className="owner-page-header__left">
            <h1 className="owner-page-header__title">Staff &amp; Permissions</h1>
            <p className="owner-page-header__sub">Manage waiters and cashiers assigned to branches.</p>
          </div>
          <div className="owner-page-header__actions" style={{ display: 'flex', gap: 10 }}>
            <button className="btn-outline" id="btn-add-waiter" onClick={() => openAdd(EMPLOYEE_TYPE_WAITER)}>
              + Add Waiter
            </button>
            <button className="btn-primary" id="btn-add-cashier" onClick={() => openAdd(EMPLOYEE_TYPE_CASHIER)}>
              + Add Cashier
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              style={{
                padding: '7px 18px',
                borderRadius: 8,
                border: activeTab === t.key ? '2px solid var(--color-primary)' : '2px solid var(--color-border)',
                background: activeTab === t.key ? 'var(--color-primary)' : 'transparent',
                color: activeTab === t.key ? '#111' : 'var(--color-text-muted)',
                fontWeight: activeTab === t.key ? 700 : 500,
                fontSize: 13,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Table card */}
        <div className="owner-section-card">
          <div className="owner-section-card__header">
            <div className="owner-filter-bar">
              <input
                className="form-input"
                placeholder="Search by name, employee ID, or branch..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ minWidth: 240, fontSize: 13, padding: '8px 14px' }}
                id="search-staff"
              />
              <select
                className="form-select"
                value={branchFilter}
                onChange={e => setBranchFilter(e.target.value)}
                style={{ fontSize: 13, padding: '8px 14px', minWidth: 160 }}
                id="filter-staff-branch"
              >
                <option value="all">All Branches</option>
                {branches.filter(b => b.active).map(b => (
                  <option key={b.id} value={String(b.id)}>{b.name}</option>
                ))}
              </select>
            </div>
            <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{filtered.length} employees</span>
          </div>

          <div className="owner-table-wrap">
            <table className="owner-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Employee ID</th>
                  <th>Role</th>
                  <th>Branch</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <div className="owner-empty">
                        <div className="owner-empty__icon">👥</div>
                        <div className="owner-empty__text">No employees found</div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map(e => (
                    <tr key={`${e._type}-${e.id}`}>
                      <td className="td-name">{e.name}</td>
                      <td className="td-muted" style={{ fontFamily: 'monospace', fontSize: 12 }}>
                        {e.employee_id || <span style={{ color: '#888', fontStyle: 'italic' }}>—</span>}
                      </td>
                      <td>
                        <span className={`owner-badge ${e._type === 'cashier' ? 'owner-badge--warning' : 'owner-badge--active'}`}>
                          {e._type.toUpperCase()}
                        </span>
                      </td>
                      <td className="td-muted">{e.branch_name || '—'}</td>
                      <td>
                        <span className={`owner-badge owner-badge--${e.is_active ? 'active' : 'inactive'}`}>
                          {e.is_active ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </td>
                      <td>
                        <div className="td-actions">
                          <button className="owner-icon-btn" title="Edit" onClick={() => openEdit(e)}>✏️</button>
                          <button
                            className={`owner-icon-btn${e.is_active ? ' owner-icon-btn--danger' : ' owner-icon-btn--primary'}`}
                            title={e.is_active ? 'Deactivate' : 'Activate'}
                            onClick={() => toggleStatus(e)}
                          >
                            {e.is_active ? '⏸' : '▶'}
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

      </div>

      {/* Add / Edit Modal */}
      <Modal
        open={modal}
        onClose={closeModal}
        title={editing
          ? `Edit ${employeeType === EMPLOYEE_TYPE_WAITER ? 'Waiter' : 'Cashier'}`
          : `Add ${employeeType === EMPLOYEE_TYPE_WAITER ? 'Waiter' : 'Cashier'}`}
      >
        {error && (
          <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 6, padding: '8px 12px', color: '#991b1b', fontSize: 13, marginBottom: 14 }}>
            {error}
          </div>
        )}
        <div className="owner-form-grid">

          {/* Employee Type indicator (read-only on edit) */}
          <div className="form-group owner-form-grid--full" style={{ marginBottom: 4 }}>
            <label className="form-label">Employee Type</label>
            <div style={{ display: 'flex', gap: 10 }}>
              {[EMPLOYEE_TYPE_WAITER, EMPLOYEE_TYPE_CASHIER].map(type => (
                <button
                  key={type}
                  type="button"
                  disabled={!!editing}
                  onClick={() => {
                    setEmployeeType(type)
                    setForm(type === EMPLOYEE_TYPE_WAITER ? EMPTY_WAITER_FORM : EMPTY_CASHIER_FORM)
                  }}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: 8,
                    border: employeeType === type ? '2px solid var(--color-primary)' : '2px solid var(--color-border)',
                    background: employeeType === type ? 'var(--color-primary)' : 'transparent',
                    color: employeeType === type ? '#111' : 'var(--color-text-muted)',
                    fontWeight: employeeType === type ? 700 : 500,
                    fontSize: 13,
                    cursor: editing ? 'not-allowed' : 'pointer',
                    opacity: editing ? 0.6 : 1,
                  }}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Full Name */}
          <div className="form-group owner-form-grid--full">
            <label className="form-label">Full Name <span>*</span></label>
            <input className="form-input" placeholder="e.g. Rahul Sharma" value={form.name} onChange={f('name')} id="inp-staff-name" />
          </div>

          {/* Employee ID */}
          <div className="form-group">
            <label className="form-label">Employee ID <span>*</span></label>
            <input className="form-input" placeholder="e.g. EMP-001" value={form.employee_id} onChange={f('employee_id')} id="inp-staff-emp-id" />
          </div>

          {/* Branch */}
          <div className="form-group">
            <label className="form-label">Branch <span>*</span></label>
            <select className="form-select" value={form.branch} onChange={f('branch')} id="sel-staff-branch">
              <option value="">— Select Branch —</option>
              {branches.filter(b => b.active).map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          {/* Section (Waiter only) */}
          {employeeType === EMPLOYEE_TYPE_WAITER && (
            <div className="form-group owner-form-grid--full">
              <label className="form-label">Section</label>
              <input className="form-input" placeholder="e.g. Patio or Main Dining" value={form.section || ''} onChange={f('section')} id="inp-staff-section" />
            </div>
          )}

          {/* PIN */}
          <div className="form-group">
            <label className="form-label">4-Digit PIN {!editing && <span>*</span>}</label>
            <input
              className="form-input"
              type="password"
              maxLength={4}
              placeholder={editing ? 'Leave blank to keep' : 'e.g. 1234'}
              value={form.pin}
              onChange={f('pin')}
              id="inp-staff-pin"
            />
          </div>

          {/* Confirm PIN */}
          <div className="form-group">
            <label className="form-label">Confirm PIN</label>
            <input
              className="form-input"
              type="password"
              maxLength={4}
              placeholder="Re-enter PIN"
              value={form.confirm_pin}
              onChange={f('confirm_pin')}
              id="inp-staff-confirm-pin"
            />
          </div>

          {/* Status */}
          <div className="form-group owner-form-grid--full">
            <label className="form-label">Status</label>
            <select
              className="form-select"
              value={form.is_active ? 'active' : 'inactive'}
              onChange={e => setForm(p => ({ ...p, is_active: e.target.value === 'active' }))}
              id="sel-staff-status"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

        </div>
        <div className="owner-modal-footer">
          <button className="btn-outline" onClick={closeModal}>Cancel</button>
          <button className="btn-primary" onClick={handleSave} id="btn-save-staff" disabled={saving}>
            {saving ? 'Saving…' : (editing ? 'Save Changes' : `Add ${employeeType === EMPLOYEE_TYPE_WAITER ? 'Waiter' : 'Cashier'}`)}
          </button>
        </div>
      </Modal>
    </AdminLayout>
  )
}
