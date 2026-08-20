import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminLayout from '../../layouts/AdminLayout'
import Modal from '../../components/Modal'
import { OWNER_BRANCHES } from '../../data/ownerMockData'
import './owner.css'

const EMPTY_FORM = {
  name: '', address: '', phone: '', gst: '', currency: 'INR',
  opening: '08:00', closing: '22:00', tables: '', pos: '', status: 'active',
}

export default function OwnerBranchesPage() {
  const navigate = useNavigate()
  const [branches, setBranches]   = useState(OWNER_BRANCHES)
  const [search,   setSearch]     = useState('')
  const [modal,    setModal]      = useState(false) // 'add' | 'edit' | false
  const [editing,  setEditing]    = useState(null)
  const [form,     setForm]       = useState(EMPTY_FORM)

  const filtered = branches.filter(b =>
    b.name.toLowerCase().includes(search.toLowerCase()) ||
    b.location.toLowerCase().includes(search.toLowerCase())
  )

  const openAdd  = () => { setForm(EMPTY_FORM); setEditing(null); setModal('add') }
  const openEdit = (b) => {
    setForm({
      name: b.name, address: b.location, phone: b.phone, gst: b.gst,
      currency: b.currency, opening: b.opening, closing: b.closing,
      tables: b.tables, pos: b.pos, status: b.status,
    })
    setEditing(b.id)
    setModal('edit')
  }
  const closeModal = () => { setModal(false); setEditing(null) }

  const handleSave = () => {
    if (!form.name.trim()) return
    if (editing) {
      setBranches(prev => prev.map(b => b.id === editing ? { ...b, ...form, location: form.address, tables: Number(form.tables), pos: Number(form.pos) } : b))
    } else {
      const newBranch = {
        id: Date.now(), ...form, location: form.address,
        tables: Number(form.tables), pos: Number(form.pos),
        staff: 0, manager: '—', managerId: null,
        todaySales: 0, monthSales: 0, orders: 0, pendingOrders: 0,
      }
      setBranches(prev => [...prev, newBranch])
    }
    closeModal()
  }

  const toggleStatus = (id) => {
    setBranches(prev => prev.map(b => b.id === id ? { ...b, status: b.status === 'active' ? 'inactive' : 'active' } : b))
  }

  const f = (key) => (e) => setForm(prev => ({ ...prev, [key]: e.target.value }))

  return (
    <AdminLayout pageTitle="Branches" pageIcon="🏪">
      <div className="owner-page">

        {/* Header */}
        <div className="owner-page-header">
          <div className="owner-page-header__left">
            <h1 className="owner-page-header__title">Branches</h1>
            <p className="owner-page-header__sub">Manage all your cafe branches from one place.</p>
          </div>
          <div className="owner-page-header__actions">
            <button className="btn-primary" id="btn-add-branch" onClick={openAdd}>+ Add Branch</button>
          </div>
        </div>

        {/* Filter */}
        <div className="owner-section-card">
          <div className="owner-section-card__header">
            <div className="owner-filter-bar">
              <input
                className="form-input"
                placeholder="Search branches..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ minWidth: 240, fontSize: 13, padding: '8px 14px' }}
                id="search-branches"
              />
            </div>
            <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{filtered.length} branches</span>
          </div>

          {/* Table */}
          <div className="owner-table-wrap">
            <table className="owner-table">
              <thead>
                <tr>
                  <th>Branch Name</th>
                  <th>Manager</th>
                  <th>Location</th>
                  <th>Staff</th>
                  <th>Tables</th>
                  <th>POS</th>
                  <th>Today's Sales</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={9}><div className="owner-empty"><div className="owner-empty__icon">🏪</div><div className="owner-empty__text">No branches found</div></div></td></tr>
                ) : filtered.map(b => (
                  <tr key={b.id}>
                    <td className="td-name">{b.name}</td>
                    <td>{b.manager}</td>
                    <td className="td-muted">{b.location}</td>
                    <td>{b.staff}</td>
                    <td>{b.tables}</td>
                    <td>{b.pos}</td>
                    <td style={{ fontWeight: 500 }}>₹{b.todaySales.toLocaleString('en-IN')}</td>
                    <td>
                      <span className={`owner-badge owner-badge--${b.status}`}>{b.status.toUpperCase()}</span>
                    </td>
                    <td>
                      <div className="td-actions">
                        <button className="owner-icon-btn" title="View" onClick={() => navigate(`/owner/branches/${b.id}`)}>👁</button>
                        <button className="owner-icon-btn" title="Edit" onClick={() => openEdit(b)}>✏️</button>
                        <button
                          className={`owner-icon-btn${b.status === 'active' ? ' owner-icon-btn--danger' : ''}`}
                          title={b.status === 'active' ? 'Deactivate' : 'Activate'}
                          onClick={() => toggleStatus(b.id)}
                        >{b.status === 'active' ? '⏸' : '▶'}</button>
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
      <Modal open={!!modal} onClose={closeModal} title={modal === 'edit' ? 'Edit Branch' : 'Add Branch'}>
        <div className="owner-form-grid">
          <div className="form-group owner-form-grid--full">
            <label className="form-label">Branch Name <span>*</span></label>
            <input className="form-input" placeholder="e.g. Artisan Brew — MG Road" value={form.name} onChange={f('name')} id="inp-branch-name" />
          </div>
          <div className="form-group owner-form-grid--full">
            <label className="form-label">Address</label>
            <input className="form-input" placeholder="Full address" value={form.address} onChange={f('address')} id="inp-branch-address" />
          </div>
          <div className="form-group">
            <label className="form-label">Phone</label>
            <input className="form-input" placeholder="+91 98765 XXXXX" value={form.phone} onChange={f('phone')} id="inp-branch-phone" />
          </div>
          <div className="form-group">
            <label className="form-label">GST / Tax ID</label>
            <input className="form-input" placeholder="GSTIN" value={form.gst} onChange={f('gst')} id="inp-branch-gst" />
          </div>
          <div className="form-group">
            <label className="form-label">Currency</label>
            <select className="form-select" value={form.currency} onChange={f('currency')} id="sel-branch-currency">
              <option value="INR">INR — Indian Rupee</option>
              <option value="USD">USD — US Dollar</option>
              <option value="EUR">EUR — Euro</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Status</label>
            <select className="form-select" value={form.status} onChange={f('status')} id="sel-branch-status">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Opening Time</label>
            <input className="form-input" type="time" value={form.opening} onChange={f('opening')} id="inp-branch-opening" />
          </div>
          <div className="form-group">
            <label className="form-label">Closing Time</label>
            <input className="form-input" type="time" value={form.closing} onChange={f('closing')} id="inp-branch-closing" />
          </div>
          <div className="form-group">
            <label className="form-label">Table Count</label>
            <input className="form-input" type="number" min="0" placeholder="0" value={form.tables} onChange={f('tables')} id="inp-branch-tables" />
          </div>
          <div className="form-group">
            <label className="form-label">POS Terminal Count</label>
            <input className="form-input" type="number" min="0" placeholder="0" value={form.pos} onChange={f('pos')} id="inp-branch-pos" />
          </div>
        </div>
        <div className="owner-modal-footer">
          <button className="btn-outline" onClick={closeModal}>Cancel</button>
          <button className="btn-primary" onClick={handleSave} id="btn-save-branch">
            {modal === 'edit' ? 'Save Changes' : 'Add Branch'}
          </button>
        </div>
      </Modal>
    </AdminLayout>
  )
}
