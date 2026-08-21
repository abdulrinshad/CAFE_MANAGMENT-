import { useState } from 'react'
import AdminLayout from '../../layouts/AdminLayout'
import Modal from '../../components/Modal'
import { useApp } from '../../context/AppContext'
import './owner.css'

const EMPTY_FORM = { terminal: 'POS-01 (Counter Main)', status: 'active' }

export default function OwnerPOSPage() {
  const { orders } = useApp()
  const [terminals, setTerminals] = useState([
    { id: 1, terminal: 'POS-01 (Counter Main)', status: 'active', assignedUser: 'Main Counter Cashier' }
  ])
  const [modal, setModal]     = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm]       = useState(EMPTY_FORM)

  const openAdd  = () => { setForm(EMPTY_FORM); setEditing(null); setModal(true) }
  const openEdit = (t) => {
    setForm({ terminal: t.terminal, status: t.status })
    setEditing(t.id)
    setModal(true)
  }
  const closeModal = () => { setModal(false); setEditing(null) }

  const handleSave = () => {
    if (!form.terminal.trim()) return
    if (editing) {
      setTerminals(prev => prev.map(t => t.id === editing ? { ...t, ...form } : t))
    } else {
      setTerminals(prev => [...prev, { id: Date.now(), terminal: form.terminal, status: form.status, assignedUser: 'Cashier' }])
    }
    closeModal()
  }

  const toggleStatus = (id) => setTerminals(prev =>
    prev.map(t => t.id === id ? { ...t, status: t.status === 'active' ? 'offline' : 'active' } : t)
  )

  const f = (key) => (e) => setForm(prev => ({ ...prev, [key]: e.target.value }))

  const totalSales = orders.filter(o => o.status === 'COMPLETED').reduce((a, o) => a + (Number(o.amount) || 0), 0)
  const activeCount = terminals.filter(t => t.status === 'active').length

  return (
    <AdminLayout pageTitle="POS Terminals" pageIcon="🖥️">
      <div className="owner-page">

        {/* Header */}
        <div className="owner-page-header">
          <div className="owner-page-header__left">
            <h1 className="owner-page-header__title">POS Terminals</h1>
            <p className="owner-page-header__sub">Register POS terminals connected to the main database backend.</p>
          </div>
          <div className="owner-page-header__actions">
            <button className="btn-primary" id="btn-add-pos" onClick={openAdd}>+ Register Terminal</button>
          </div>
        </div>

        {/* KPIs */}
        <div className="owner-kpi-grid">
          <div className="owner-kpi-card">
            <div className="owner-kpi-card__label">Registered POS</div>
            <div className="owner-kpi-card__value">{terminals.length}</div>
          </div>
          <div className="owner-kpi-card">
            <div className="owner-kpi-card__label">Active Online</div>
            <div className="owner-kpi-card__value">{activeCount}</div>
          </div>
          <div className="owner-kpi-card">
            <div className="owner-kpi-card__label">Live Database Revenue</div>
            <div className="owner-kpi-card__value">₹{Number(totalSales).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          </div>
        </div>

        {/* Table */}
        <div className="owner-section-card">
          <div className="owner-section-card__header">
            <span className="owner-section-card__title">Terminal List</span>
          </div>

          <div className="owner-table-wrap">
            <table className="owner-table">
              <thead>
                <tr>
                  <th>Terminal ID</th>
                  <th>Assigned Station</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {terminals.map(t => (
                  <tr key={t.id}>
                    <td className="td-name td-mono">{t.terminal}</td>
                    <td className="td-muted">{t.assignedUser}</td>
                    <td>
                      <span className={`owner-badge owner-badge--${t.status}`}>{t.status.toUpperCase()}</span>
                    </td>
                    <td>
                      <div className="td-actions">
                        <button className="owner-icon-btn" title="Edit" onClick={() => openEdit(t)}>✏️</button>
                        <button
                          className={`owner-icon-btn${t.status === 'active' ? ' owner-icon-btn--danger' : ' owner-icon-btn--primary'}`}
                          title={t.status === 'active' ? 'Deactivate' : 'Activate'}
                          onClick={() => toggleStatus(t.id)}
                        >
                          {t.status === 'active' ? '⏸' : '▶'}
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
      <Modal open={modal} onClose={closeModal} title={editing ? 'Edit POS Terminal' : 'Register POS Terminal'}>
        <div className="owner-form-grid">
          <div className="form-group owner-form-grid--full">
            <label className="form-label">Terminal Name / ID <span>*</span></label>
            <input className="form-input" placeholder="e.g. POS-02 (Counter Express)" value={form.terminal} onChange={f('terminal')} id="inp-pos-name" />
          </div>
          <div className="form-group owner-form-grid--full">
            <label className="form-label">Status</label>
            <select className="form-select" value={form.status} onChange={f('status')} id="sel-pos-status">
              <option value="active">Active</option>
              <option value="offline">Offline</option>
            </select>
          </div>
        </div>
        <div className="owner-modal-footer">
          <button className="btn-outline" onClick={closeModal}>Cancel</button>
          <button className="btn-primary" onClick={handleSave} id="btn-save-pos">{editing ? 'Save Changes' : 'Register Terminal'}</button>
        </div>
      </Modal>
    </AdminLayout>
  )
}
