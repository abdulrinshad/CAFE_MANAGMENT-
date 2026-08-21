import { useState, useEffect } from 'react'
import AdminLayout from '../../layouts/AdminLayout'
import Modal from '../../components/Modal'
import { waiterApi } from '../../api'
import './owner.css'

const EMPTY_FORM = { name: '', section: 'Main Section', pin: '', is_active: true }

export default function OwnerStaffPage() {
  const [waiters, setWaiters] = useState([])
  const [search, setSearch]   = useState('')
  const [modal, setModal]     = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm]       = useState(EMPTY_FORM)
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState(null)

  const loadWaiters = async () => {
    try {
      const data = await waiterApi.list()
      const list = Array.isArray(data) ? data : (data.results ?? [])
      setWaiters(list)
    } catch (err) {
      console.error('Load waiters error:', err)
    }
  }

  useEffect(() => {
    loadWaiters()
  }, [])

  const filtered = waiters.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.section && s.section.toLowerCase().includes(search.toLowerCase()))
  )

  const openAdd = () => {
    setForm(EMPTY_FORM)
    setEditing(null)
    setError(null)
    setModal(true)
  }

  const openEdit = (s) => {
    setForm({
      name: s.name,
      section: s.section || 'Main Section',
      pin: '',
      is_active: s.is_active ?? true,
    })
    setEditing(s.id)
    setError(null)
    setModal(true)
  }

  const closeModal = () => {
    setModal(false)
    setEditing(null)
    setError(null)
  }

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError('Name is required.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const payload = {
        name: form.name.trim(),
        section: form.section.trim() || 'Main Section',
        is_active: form.is_active,
      }
      if (form.pin && form.pin.length === 4) {
        payload.pin = form.pin
        payload.confirm_pin = form.pin
      }

      if (editing) {
        await waiterApi.update(editing, payload)
      } else {
        if (!form.pin) payload.pin = '1234'
        payload.confirm_pin = payload.pin
        await waiterApi.create(payload)
      }
      await loadWaiters()
      closeModal()
    } catch (err) {
      console.error('Save staff error:', err)
      setError(err.message || 'Failed to save staff member to database.')
    } finally {
      setSaving(false)
    }
  }

  const toggleStatus = async (s) => {
    try {
      await waiterApi.update(s.id, { is_active: !s.is_active })
      await loadWaiters()
    } catch (err) {
      console.error('Toggle staff error:', err)
    }
  }

  const f = (key) => (e) => setForm(prev => ({ ...prev, [key]: e.target.value }))

  return (
    <AdminLayout pageTitle="Staff & Permissions" pageIcon="👥">
      <div className="owner-page">

        {/* Header */}
        <div className="owner-page-header">
          <div className="owner-page-header__left">
            <h1 className="owner-page-header__title">Staff &amp; Permissions</h1>
            <p className="owner-page-header__sub">Manage waiters and staff members from the live database.</p>
          </div>
          <div className="owner-page-header__actions">
            <button className="btn-primary" id="btn-add-staff" onClick={openAdd}>+ Add Staff Member</button>
          </div>
        </div>

        {/* Filters */}
        <div className="owner-section-card">
          <div className="owner-section-card__header">
            <div className="owner-filter-bar">
              <input
                className="form-input"
                placeholder="Search staff by name or section..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ minWidth: 240, fontSize: 13, padding: '8px 14px' }}
                id="search-staff"
              />
            </div>
            <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{filtered.length} staff members</span>
          </div>

          <div className="owner-table-wrap">
            <table className="owner-table">
              <thead>
                <tr>
                  <th>Staff Name</th>
                  <th>Role</th>
                  <th>Section</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5}>
                      <div className="owner-empty">
                        <div className="owner-empty__icon">👥</div>
                        <div className="owner-empty__text">No staff records in database</div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map(s => (
                    <tr key={s.id}>
                      <td className="td-name">{s.name}</td>
                      <td>
                        <span className="owner-badge owner-badge--active">WAITER</span>
                      </td>
                      <td className="td-muted">{s.section || 'Main Section'}</td>
                      <td>
                        <span className={`owner-badge owner-badge--${s.is_active ? 'active' : 'inactive'}`}>
                          {s.is_active ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </td>
                      <td>
                        <div className="td-actions">
                          <button className="owner-icon-btn" title="Edit" onClick={() => openEdit(s)}>✏️</button>
                          <button
                            className={`owner-icon-btn${s.is_active ? ' owner-icon-btn--danger' : ' owner-icon-btn--primary'}`}
                            title={s.is_active ? 'Deactivate' : 'Activate'}
                            onClick={() => toggleStatus(s)}
                          >
                            {s.is_active ? '⏸' : '▶'}
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
      <Modal open={modal} onClose={closeModal} title={editing ? 'Edit Staff Member' : 'Add Staff Member'}>
        {error && (
          <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 6, padding: '8px 12px', color: '#991b1b', fontSize: 13, marginBottom: 14 }}>
            {error}
          </div>
        )}
        <div className="owner-form-grid">
          <div className="form-group owner-form-grid--full">
            <label className="form-label">Full Name <span>*</span></label>
            <input className="form-input" placeholder="e.g. Rahul Sharma" value={form.name} onChange={f('name')} id="inp-staff-name" />
          </div>
          <div className="form-group">
            <label className="form-label">Section</label>
            <input className="form-input" placeholder="e.g. Patio or Main Dining" value={form.section} onChange={f('section')} id="inp-staff-section" />
          </div>
          <div className="form-group">
            <label className="form-label">4-Digit PIN</label>
            <input className="form-input" type="password" maxLength={4} placeholder="e.g. 1234" value={form.pin} onChange={f('pin')} id="inp-staff-pin" />
          </div>
          <div className="form-group owner-form-grid--full">
            <label className="form-label">Status</label>
            <select className="form-select" value={form.is_active ? 'active' : 'inactive'} onChange={e => setForm(p => ({ ...p, is_active: e.target.value === 'active' }))} id="sel-staff-status">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
        <div className="owner-modal-footer">
          <button className="btn-outline" onClick={closeModal}>Cancel</button>
          <button className="btn-primary" onClick={handleSave} id="btn-save-staff" disabled={saving}>
            {saving ? 'Saving…' : (editing ? 'Save Changes' : 'Add Staff')}
          </button>
        </div>
      </Modal>
    </AdminLayout>
  )
}
