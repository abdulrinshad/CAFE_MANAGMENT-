import { useState } from 'react'
import AdminLayout from '../../layouts/AdminLayout'
import Modal from '../../components/Modal'
import { OWNER_STAFF, OWNER_BRANCHES } from '../../data/ownerMockData'
import './owner.css'

const ROLE_TABS  = ['All', 'Managers', 'POS Users', 'Waiters', 'Kitchen Staff', 'Other Staff']
const ROLE_MAP   = { managers: 'manager', 'pos users': 'pos', waiters: 'waiter', 'kitchen staff': 'kitchen', 'other staff': 'other' }
const EMPTY_FORM = { name: '', email: '', phone: '', branchId: '', role: 'manager', status: 'active' }

export default function OwnerStaffPage() {
  const [staff,      setStaff]   = useState(OWNER_STAFF)
  const [roleTab,    setRoleTab] = useState('All')
  const [branchFil,  setBranch]  = useState('all')
  const [search,     setSearch]  = useState('')
  const [modal,      setModal]   = useState(false)
  const [editing,    setEditing] = useState(null)
  const [form,       setForm]    = useState(EMPTY_FORM)

  const filtered = staff.filter(s => {
    const matchRole   = roleTab === 'All' || s.role === ROLE_MAP[roleTab.toLowerCase()]
    const matchBranch = branchFil === 'all' || s.branchId === Number(branchFil)
    const matchSearch = !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.email.toLowerCase().includes(search.toLowerCase())
    return matchRole && matchBranch && matchSearch
  })

  const openAdd  = () => { setForm(EMPTY_FORM); setEditing(null); setModal(true) }
  const openEdit = (s) => {
    setForm({ name: s.name, email: s.email, phone: s.phone, branchId: s.branchId, role: s.role, status: s.status })
    setEditing(s.id)
    setModal(true)
  }
  const closeModal = () => { setModal(false); setEditing(null) }

  const handleSave = () => {
    if (!form.name.trim()) return
    const branch = OWNER_BRANCHES.find(b => b.id === Number(form.branchId))
    if (editing) {
      setStaff(prev => prev.map(s => s.id === editing ? { ...s, ...form, branchId: Number(form.branchId), branch: branch?.name.replace('Artisan Brew — ', '') || s.branch } : s))
    } else {
      setStaff(prev => [...prev, {
        id: Date.now(), ...form, branchId: Number(form.branchId),
        branch: branch?.name.replace('Artisan Brew — ', '') || '—',
        performance: 75, joined: new Date().toISOString().slice(0, 10),
      }])
    }
    closeModal()
  }

  const toggleStatus = (id) => setStaff(prev => prev.map(s => s.id === id ? { ...s, status: s.status === 'active' ? 'inactive' : 'active' } : s))
  const f = (key) => (e) => setForm(prev => ({ ...prev, [key]: e.target.value }))

  return (
    <AdminLayout pageTitle="Staff & Permissions" pageIcon="👥">
      <div className="owner-page">

        {/* Header */}
        <div className="owner-page-header">
          <div className="owner-page-header__left">
            <h1 className="owner-page-header__title">Staff &amp; Permissions</h1>
            <p className="owner-page-header__sub">Manage all staff across branches. Assign roles and permissions.</p>
          </div>
          <div className="owner-page-header__actions">
            <button className="btn-primary" id="btn-add-staff" onClick={openAdd}>+ Add Staff</button>
          </div>
        </div>

        {/* Role Tabs + Filters */}
        <div className="owner-section-card">
          <div className="owner-tab-bar">
            {ROLE_TABS.map(t => (
              <button key={t} className={`owner-tab${roleTab === t ? ' owner-tab--active' : ''}`} onClick={() => setRoleTab(t)} id={`staff-tab-${t.toLowerCase().replace(/\s/g, '-')}`}>{t}</button>
            ))}
          </div>

          <div className="owner-section-card__header" style={{ borderBottom: 'none' }}>
            <div className="owner-filter-bar">
              <input className="form-input" placeholder="Search name, email..." value={search} onChange={e => setSearch(e.target.value)} style={{ minWidth: 220, fontSize: 13, padding: '8px 14px' }} id="search-staff" />
              <select className="form-select" value={branchFil} onChange={e => setBranch(e.target.value)} id="filter-staff-branch">
                <option value="all">All Branches</option>
                {OWNER_BRANCHES.map(b => <option key={b.id} value={b.id}>{b.name.replace('Artisan Brew — ', '')}</option>)}
              </select>
            </div>
            <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{filtered.length} members</span>
          </div>

          <div className="owner-table-wrap">
            <table className="owner-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Branch</th>
                  <th>Contact</th>
                  <th>Status</th>
                  <th>Performance</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0
                  ? <tr><td colSpan={7}><div className="owner-empty"><div className="owner-empty__icon">👥</div><div className="owner-empty__text">No staff found</div></div></td></tr>
                  : filtered.map(s => (
                    <tr key={s.id}>
                      <td className="td-name">{s.name}</td>
                      <td style={{ textTransform: 'capitalize' }}>
                        <span className="owner-badge owner-badge--active">{s.role}</span>
                      </td>
                      <td className="td-muted">{s.branch}</td>
                      <td className="td-muted">{s.phone}</td>
                      <td><span className={`owner-badge owner-badge--${s.status}`}>{s.status.toUpperCase()}</span></td>
                      <td>
                        <div className="perf-bar">
                          <div className="perf-bar__track"><div className="perf-bar__fill" style={{ width: `${s.performance}%` }} /></div>
                          <span className="perf-bar__value">{s.performance}%</span>
                        </div>
                      </td>
                      <td>
                        <div className="td-actions">
                          <button className="owner-icon-btn" title="Edit" onClick={() => openEdit(s)}>✏️</button>
                          <button className={`owner-icon-btn${s.status === 'active' ? ' owner-icon-btn--danger' : ''}`} title={s.status === 'active' ? 'Deactivate' : 'Activate'} onClick={() => toggleStatus(s.id)}>
                            {s.status === 'active' ? '⏸' : '▶'}
                          </button>
                        </div>
                      </td>
                    </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Add / Edit Modal */}
      <Modal open={modal} onClose={closeModal} title={editing ? 'Edit Staff Member' : 'Add Staff Member'}>
        <div className="owner-form-grid">
          <div className="form-group owner-form-grid--full">
            <label className="form-label">Full Name <span>*</span></label>
            <input className="form-input" placeholder="e.g. Rahul Sharma" value={form.name} onChange={f('name')} id="inp-staff-name" />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" placeholder="email@artisanbrew.com" value={form.email} onChange={f('email')} id="inp-staff-email" />
          </div>
          <div className="form-group">
            <label className="form-label">Phone</label>
            <input className="form-input" placeholder="+91 98765 XXXXX" value={form.phone} onChange={f('phone')} id="inp-staff-phone" />
          </div>
          <div className="form-group">
            <label className="form-label">Role</label>
            <select className="form-select" value={form.role} onChange={f('role')} id="sel-staff-role">
              <option value="manager">Manager</option>
              <option value="pos">POS User</option>
              <option value="waiter">Waiter</option>
              <option value="kitchen">Kitchen Staff</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Assign Branch</label>
            <select className="form-select" value={form.branchId} onChange={f('branchId')} id="sel-staff-branch">
              <option value="">-- Select Branch --</option>
              {OWNER_BRANCHES.map(b => <option key={b.id} value={b.id}>{b.name.replace('Artisan Brew — ', '')}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Status</label>
            <select className="form-select" value={form.status} onChange={f('status')} id="sel-staff-status">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
        <div className="owner-modal-footer">
          <button className="btn-outline" onClick={closeModal}>Cancel</button>
          <button className="btn-primary" onClick={handleSave} id="btn-save-staff">{editing ? 'Save Changes' : 'Add Staff'}</button>
        </div>
      </Modal>
    </AdminLayout>
  )
}
