import { useState } from 'react'
import AdminLayout from '../../layouts/AdminLayout'
import Modal from '../../components/Modal'
import { OWNER_POS_TERMINALS, OWNER_BRANCHES, OWNER_STAFF } from '../../data/ownerMockData'
import './owner.css'

const EMPTY_FORM = { terminal: '', branchId: '', userId: '', status: 'active' }

export default function OwnerPOSPage() {
  const [terminals, setTerminals] = useState(OWNER_POS_TERMINALS)
  const [branchFil, setBranch]    = useState('all')
  const [modal,     setModal]     = useState(false)
  const [editing,   setEditing]   = useState(null)
  const [form,      setForm]      = useState(EMPTY_FORM)

  const filtered = branchFil === 'all' ? terminals : terminals.filter(t => t.branchId === Number(branchFil))

  const openAdd  = () => { setForm(EMPTY_FORM); setEditing(null); setModal(true) }
  const openEdit = (t) => {
    setForm({ terminal: t.terminal, branchId: t.branchId, userId: t.userId || '', status: t.status })
    setEditing(t.id)
    setModal(true)
  }
  const closeModal = () => { setModal(false); setEditing(null) }

  const handleSave = () => {
    if (!form.terminal.trim()) return
    const branch = OWNER_BRANCHES.find(b => b.id === Number(form.branchId))
    const user   = OWNER_STAFF.find(s => s.id === Number(form.userId))
    if (editing) {
      setTerminals(prev => prev.map(t => t.id === editing
        ? { ...t, ...form, branchId: Number(form.branchId), branch: branch?.name.replace('Artisan Brew — ', '') || t.branch, assignedUser: user?.name || '—', userId: user?.id || null }
        : t
      ))
    } else {
      setTerminals(prev => [...prev, {
        id: Date.now(), terminal: form.terminal,
        branchId: Number(form.branchId),
        branch: branch?.name.replace('Artisan Brew — ', '') || '—',
        assignedUser: user?.name || '—', userId: user?.id || null,
        status: form.status, lastActive: '—', todaySales: 0,
      }])
    }
    closeModal()
  }

  const toggleStatus = (id) => setTerminals(prev =>
    prev.map(t => t.id === id ? { ...t, status: t.status === 'active' ? 'offline' : 'active' } : t)
  )

  const f = (key) => (e) => setForm(prev => ({ ...prev, [key]: e.target.value }))

  const totalSales  = terminals.reduce((a, t) => a + t.todaySales, 0)
  const activeCount = terminals.filter(t => t.status === 'active').length

  return (
    <AdminLayout pageTitle="POS Terminals" pageIcon="🖥️">
      <div className="owner-page">

        {/* Header */}
        <div className="owner-page-header">
          <div className="owner-page-header__left">
            <h1 className="owner-page-header__title">POS Terminals</h1>
            <p className="owner-page-header__sub">Manage POS terminals across all branches.</p>
          </div>
          <div className="owner-page-header__actions">
            <button className="btn-primary" id="btn-add-pos" onClick={openAdd}>+ Add POS Terminal</button>
          </div>
        </div>

        {/* KPIs */}
        <div className="owner-kpi-grid--3 owner-kpi-grid">
          <div className="owner-kpi-card"><div className="owner-kpi-card__label">Total Terminals</div><div className="owner-kpi-card__value">{terminals.length}</div></div>
          <div className="owner-kpi-card"><div className="owner-kpi-card__label">Active Now</div><div className="owner-kpi-card__value">{activeCount}</div></div>
          <div className="owner-kpi-card"><div className="owner-kpi-card__label">Today's Combined Sales</div><div className="owner-kpi-card__value">₹{totalSales.toLocaleString('en-IN')}</div></div>
        </div>

        {/* Table */}
        <div className="owner-section-card">
          <div className="owner-section-card__header">
            <span className="owner-section-card__title">All POS Terminals</span>
            <div className="owner-filter-bar">
              <select className="form-select" value={branchFil} onChange={e => setBranch(e.target.value)} id="filter-pos-branch">
                <option value="all">All Branches</option>
                {OWNER_BRANCHES.map(b => <option key={b.id} value={b.id}>{b.name.replace('Artisan Brew — ', '')}</option>)}
              </select>
            </div>
          </div>
          <div className="owner-table-wrap">
            <table className="owner-table">
              <thead>
                <tr>
                  <th>Terminal</th>
                  <th>Branch</th>
                  <th>Assigned User</th>
                  <th>Status</th>
                  <th>Last Active</th>
                  <th>Today's Sales</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0
                  ? <tr><td colSpan={7}><div className="owner-empty"><div className="owner-empty__icon">🖥️</div><div className="owner-empty__text">No terminals found</div></div></td></tr>
                  : filtered.map(t => (
                    <tr key={t.id}>
                      <td className="td-name">{t.terminal}</td>
                      <td className="td-muted">{t.branch}</td>
                      <td>{t.assignedUser}</td>
                      <td><span className={`owner-badge owner-badge--${t.status}`}>{t.status.toUpperCase()}</span></td>
                      <td className="td-muted">{t.lastActive}</td>
                      <td style={{ fontWeight: 500 }}>₹{t.todaySales.toLocaleString('en-IN')}</td>
                      <td>
                        <div className="td-actions">
                          <button className="owner-icon-btn" title="Edit / Assign User" onClick={() => openEdit(t)}>✏️</button>
                          <button
                            className={`owner-icon-btn${t.status === 'active' ? ' owner-icon-btn--danger' : ' owner-icon-btn--primary'}`}
                            title={t.status === 'active' ? 'Deactivate' : 'Activate'}
                            onClick={() => toggleStatus(t.id)}
                          >{t.status === 'active' ? '⏸' : '▶'}</button>
                        </div>
                      </td>
                    </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Modal */}
      <Modal open={modal} onClose={closeModal} title={editing ? 'Edit POS Terminal' : 'Add POS Terminal'}>
        <div className="owner-form-grid">
          <div className="form-group">
            <label className="form-label">Terminal ID <span>*</span></label>
            <input className="form-input" placeholder="e.g. POS-07" value={form.terminal} onChange={f('terminal')} id="inp-pos-terminal" />
          </div>
          <div className="form-group">
            <label className="form-label">Branch</label>
            <select className="form-select" value={form.branchId} onChange={f('branchId')} id="sel-pos-branch">
              <option value="">-- Select Branch --</option>
              {OWNER_BRANCHES.map(b => <option key={b.id} value={b.id}>{b.name.replace('Artisan Brew — ', '')}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Assign User</label>
            <select className="form-select" value={form.userId} onChange={f('userId')} id="sel-pos-user">
              <option value="">-- Unassigned --</option>
              {OWNER_STAFF.map(s => <option key={s.id} value={s.id}>{s.name} ({s.role})</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Status</label>
            <select className="form-select" value={form.status} onChange={f('status')} id="sel-pos-status">
              <option value="active">Active</option>
              <option value="idle">Idle</option>
              <option value="offline">Offline</option>
            </select>
          </div>
        </div>
        <div className="owner-modal-footer">
          <button className="btn-outline" onClick={closeModal}>Cancel</button>
          <button className="btn-primary" onClick={handleSave} id="btn-save-pos">{editing ? 'Save Changes' : 'Add Terminal'}</button>
        </div>
      </Modal>
    </AdminLayout>
  )
}
