import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminLayout from '../../layouts/AdminLayout'
import Modal from '../../components/Modal'
import { useApp } from '../../context/AppContext'
import './owner.css'

const DEFAULT_BRANCH = {
  id: 1,
  name: 'Artisan Brew — Main Branch',
  location: 'MG Road, Main Market',
  status: 'active',
}

const EMPTY_FORM = {
  name: '', address: '', phone: '', status: 'active',
}

export default function OwnerBranchesPage() {
  const navigate = useNavigate()
  const { tables, orders, products } = useApp()
  const [branches, setBranches]   = useState([DEFAULT_BRANCH])
  const [search,   setSearch]     = useState('')
  const [modal,    setModal]      = useState(false)
  const [editing,  setEditing]    = useState(null)
  const [form,     setForm]       = useState(EMPTY_FORM)

  const liveTableCount = tables.length
  const liveOrderCount = orders.length
  const liveSalesTotal = orders.filter(o => o.status === 'COMPLETED').reduce((s, o) => s + (o.amount || 0), 0)

  const filtered = branches.filter(b =>
    b.name.toLowerCase().includes(search.toLowerCase()) ||
    (b.location && b.location.toLowerCase().includes(search.toLowerCase()))
  )

  const openAdd  = () => { setForm(EMPTY_FORM); setEditing(null); setModal('add') }
  const openEdit = (b) => {
    setForm({
      name: b.name, address: b.location || '', phone: b.phone || '', status: b.status || 'active',
    })
    setEditing(b.id)
    setModal('edit')
  }
  const closeModal = () => { setModal(false); setEditing(null) }

  const handleSave = () => {
    if (!form.name.trim()) return
    if (editing) {
      setBranches(prev => prev.map(b => b.id === editing ? { ...b, ...form, location: form.address } : b))
    } else {
      const newBranch = {
        id: Date.now(), ...form, location: form.address, status: form.status || 'active',
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
            <p className="owner-page-header__sub">Manage all your cafe branches connected to live database floor plans.</p>
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
                  <th>Location</th>
                  <th>DB Tables</th>
                  <th>Live Orders</th>
                  <th>Total Revenue</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={7}><div className="owner-empty"><div className="owner-empty__icon">🏪</div><div className="owner-empty__text">No branches found</div></div></td></tr>
                ) : filtered.map(b => (
                  <tr key={b.id}>
                    <td className="td-name">{b.name}</td>
                    <td className="td-muted">{b.location}</td>
                    <td>{liveTableCount} tables</td>
                    <td>{liveOrderCount} orders</td>
                    <td style={{ fontWeight: 600 }}>₹{Number(liveSalesTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td>
                      <span className={`owner-badge owner-badge--${b.status}`}>{b.status.toUpperCase()}</span>
                    </td>
                    <td>
                      <div className="td-actions">
                        <button className="owner-icon-btn" title="Edit" onClick={() => openEdit(b)}>✏️</button>
                        <button
                          className={`owner-icon-btn${b.status === 'active' ? ' owner-icon-btn--danger' : ''}`}
                          title={b.status === 'active' ? 'Deactivate' : 'Activate'}
                          onClick={() => toggleStatus(b.id)}
                        >
                          {b.status === 'active' ? '⏸' : '▶'}
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
      <Modal open={!!modal} onClose={closeModal} title={modal === 'edit' ? 'Edit Branch' : 'Add Branch'}>
        <div className="owner-form-grid">
          <div className="form-group owner-form-grid--full">
            <label className="form-label">Branch Name <span>*</span></label>
            <input className="form-input" placeholder="e.g. Artisan Brew — MG Road" value={form.name} onChange={f('name')} id="inp-branch-name" />
          </div>
          <div className="form-group owner-form-grid--full">
            <label className="form-label">Address</label>
            <input className="form-input" placeholder="Branch address..." value={form.address} onChange={f('address')} id="inp-branch-address" />
          </div>
          <div className="form-group">
            <label className="form-label">Phone</label>
            <input className="form-input" placeholder="+91 XXXXXXXXXX" value={form.phone} onChange={f('phone')} id="inp-branch-phone" />
          </div>
          <div className="form-group">
            <label className="form-label">Status</label>
            <select className="form-select" value={form.status} onChange={f('status')} id="sel-branch-status">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
        <div className="owner-modal-footer">
          <button className="btn-outline" onClick={closeModal}>Cancel</button>
          <button className="btn-primary" onClick={handleSave} id="btn-save-branch">{modal === 'edit' ? 'Save Changes' : 'Add Branch'}</button>
        </div>
      </Modal>
    </AdminLayout>
  )
}
