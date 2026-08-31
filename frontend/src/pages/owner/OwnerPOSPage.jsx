import { useState, useEffect, useCallback } from 'react'
import AdminLayout from '../../layouts/AdminLayout'
import Modal from '../../components/Modal'
import { useApp } from '../../context/AppContext'
import { request } from '../../api'
import './owner.css'

const EMPTY_FORM = { terminal: '', branchId: '', status: 'active' }

export default function OwnerPOSPage() {
  const { orders } = useApp()
  const [terminals, setTerminals] = useState([])
  const [branches, setBranches] = useState([])
  const [modal, setModal]     = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm]       = useState(EMPTY_FORM)
  const [loading, setLoading] = useState(true)

  // Form validation errors state
  const [formErrors, setFormErrors] = useState({})

  // Toast notification state
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' })
  
  // Delete confirmation state
  const [deleteModal, setDeleteModal] = useState(false)
  const [terminalToDelete, setTerminalToDelete] = useState(null)
  const [deletingProgress, setDeletingProgress] = useState(false)

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type })
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000)
  }

  const loadData = useCallback(async () => {
    try {
      const posData = await request('GET', '/owner/pos/')
      setTerminals(Array.isArray(posData) ? posData : (posData.results ?? []))
      const branchData = await request('GET', '/branches/')
      setBranches(Array.isArray(branchData) ? branchData : (branchData.results ?? []))
    } catch (err) {
      console.error("Failed to load POS or branch data", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const openAdd  = () => { 
    setForm({ terminal: '', branchId: branches[0]?.id || '', status: 'active' })
    setEditing(null)
    setFormErrors({})
    setModal(true) 
  }

  const openEdit = (t) => {
    setForm({ terminal: t.terminal || t.name, branchId: t.branch || '', status: t.status })
    setEditing(t.id)
    setFormErrors({})
    setModal(true)
  }

  const closeModal = () => { 
    setModal(false)
    setEditing(null)
    setFormErrors({})
  }

  const handleSave = async () => {
    if (!form.terminal.trim()) return
    if (!form.branchId) {
      showToast("Please select a branch.", "error")
      return
    }
    try {
      setFormErrors({})
      if (editing) {
        await request('PATCH', `/owner/pos/${editing}/`, {
          terminalName: form.terminal,
          branchId: form.branchId,
          status: form.status
        })
        showToast("POS terminal updated successfully.", "success")
      } else {
        await request('POST', '/owner/pos/', {
          terminalName: form.terminal,
          branchId: form.branchId,
          status: form.status
        })
        showToast("POS terminal registered successfully.", "success")
      }
      await loadData()
      closeModal()
    } catch (err) {
      if (err.data && typeof err.data === 'object') {
        setFormErrors(err.data)
      }
      showToast(err.message || "Failed to save POS terminal.", "error")
    }
  }

  const toggleStatus = async (id, currentStatus) => {
    const nextStatus = currentStatus === 'active' ? 'inactive' : 'active'
    try {
      await request('PATCH', `/owner/pos/${id}/status/`, { status: nextStatus })
      showToast(`POS terminal ${nextStatus === 'active' ? 'activated' : 'deactivated'} successfully.`, "success")
      await loadData()
    } catch (err) {
      showToast(err.message || "Failed to update terminal status.", "error")
    }
  }

  const handleDeleteClick = (t) => {
    if (t.assigned_cashier || (t.assignedUser && t.assignedUser !== 'Not Assigned')) {
      showToast(`${t.terminal || t.name} is currently assigned to a cashier. Please unassign the cashier before deleting this terminal.`, 'error')
      return
    }
    setTerminalToDelete(t)
    setDeleteModal(true)
  }

  const confirmDelete = async () => {
    if (!terminalToDelete) return
    setDeletingProgress(true)
    try {
      await request('DELETE', `/owner/pos/${terminalToDelete.id}/`)
      showToast("POS terminal deleted successfully.", "success")
      setDeleteModal(false)
      setTerminalToDelete(null)
      await loadData()
    } catch (err) {
      showToast(err.message || "Failed to delete POS terminal.", "error")
    } finally {
      setDeletingProgress(false)
    }
  }

  const f = (key) => (e) => setForm(prev => ({ ...prev, [key]: e.target.value }))

  const totalSales = orders.filter(o => o.status === 'COMPLETED').reduce((a, o) => a + (Number(o.amount) || 0), 0)
  const activeCount = terminals.filter(t => t.status === 'active').length

  if (loading) {
    return (
      <AdminLayout pageTitle="POS Terminals" pageIcon="🖥️">
        <div className="owner-page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', color: 'var(--color-espresso)' }}>
          <h3>Loading POS terminals...</h3>
        </div>
      </AdminLayout>
    )
  }

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
                  <th>Branch</th>
                  <th>Assigned Cashier</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {terminals.map(t => (
                  <tr key={t.id}>
                    <td className="td-name td-mono">{t.terminal || t.name}</td>
                    <td className="td-muted">{t.branch_name || 'No Branch'}</td>
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
                          onClick={() => toggleStatus(t.id, t.status)}
                        >
                          {t.status === 'active' ? '⏸' : '▶'}
                        </button>
                        <button 
                          className="owner-icon-btn owner-icon-btn--danger" 
                          title="Delete" 
                          onClick={() => handleDeleteClick(t)}
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {terminals.length === 0 && (
                  <tr>
                    <td colSpan={5}>
                      <div className="owner-empty">No POS terminals registered yet.</div>
                    </td>
                  </tr>
                )}
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
            <input 
              className="form-input" 
              placeholder="e.g. POS-02 (Counter Express)" 
              value={form.terminal} 
              onChange={f('terminal')} 
              id="inp-pos-name" 
              required 
              style={formErrors.name || formErrors.terminal || formErrors.terminalName ? { borderColor: '#e53e3e', boxShadow: '0 0 0 1px #e53e3e' } : {}}
            />
            {(formErrors.name || formErrors.terminal || formErrors.terminalName) && (
              <p style={{ color: '#e53e3e', fontSize: '11px', marginTop: '4px', marginBottom: '0' }}>
                {formErrors.name || formErrors.terminal || formErrors.terminalName}
              </p>
            )}
          </div>
          <div className="form-group owner-form-grid--full">
            <label className="form-label">Branch <span>*</span></label>
            <select className="form-select" value={form.branchId} onChange={f('branchId')} id="sel-pos-branch" required>
              <option value="">Select Branch</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group owner-form-grid--full">
            <label className="form-label">Status</label>
            <select className="form-select" value={form.status} onChange={f('status')} id="sel-pos-status">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="maintenance">Maintenance</option>
            </select>
          </div>
        </div>
        <div className="owner-modal-footer">
          <button className="btn-outline" onClick={closeModal}>Cancel</button>
          <button className="btn-primary" onClick={handleSave} id="btn-save-pos">{editing ? 'Save Changes' : 'Register Terminal'}</button>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal open={deleteModal} onClose={() => setDeleteModal(false)} title="Delete POS Terminal?">
        <div style={{ padding: '10px 0', fontSize: '14px', color: 'var(--color-espresso)' }}>
          <p>Are you sure you want to delete <strong>"{terminalToDelete?.terminal || terminalToDelete?.name}"</strong>?</p>
          <p style={{ color: '#e53e3e', fontSize: '13px', marginTop: '8px' }}>This action cannot be undone.</p>
        </div>
        <div className="owner-modal-footer">
          <button className="btn-outline" onClick={() => setDeleteModal(false)} disabled={deletingProgress}>Cancel</button>
          <button 
            className="btn-primary" 
            style={{ backgroundColor: '#e53e3e', color: '#fff', border: 'none' }} 
            onClick={confirmDelete} 
            disabled={deletingProgress}
          >
            {deletingProgress ? 'Deleting...' : 'Delete Terminal'}
          </button>
        </div>
      </Modal>

      {/* Toast Notification */}
      {toast.show && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          padding: '12px 20px',
          borderRadius: '8px',
          backgroundColor: toast.type === 'success' ? '#2e7d32' : toast.type === 'error' ? '#c62828' : '#333',
          color: '#fff',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          animation: 'slideIn 0.3s ease-out',
          fontSize: '14px',
          fontWeight: '500'
        }}>
          <span>{toast.type === 'success' ? '✓' : '⚠️'}</span>
          <span>{toast.message}</span>
        </div>
      )}

      <style>{`
        @keyframes slideIn {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>

    </AdminLayout>
  )
}
