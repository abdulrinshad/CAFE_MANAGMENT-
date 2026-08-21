import { useState, useEffect, useCallback } from 'react'
import AdminLayout from '../../layouts/AdminLayout'
import Modal from '../../components/Modal'
import { expenseApi, branchApi } from '../../api'
import './owner.css'

// ─── Constants ────────────────────────────────────────────────────────────────
const CATEGORIES = [
  { value: 'rent',        label: 'Rent' },
  { value: 'utilities',   label: 'Utilities' },
  { value: 'salaries',    label: 'Salaries' },
  { value: 'supplies',    label: 'Supplies' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'marketing',   label: 'Marketing' },
  { value: 'equipment',   label: 'Equipment' },
  { value: 'food_cost',   label: 'Food Cost' },
  { value: 'other',       label: 'Other' },
]

const STATUSES = [
  { value: 'approved', label: 'Approved' },
  { value: 'pending',  label: 'Pending' },
  { value: 'rejected', label: 'Rejected' },
]

const EMPTY_FORM = {
  title: '',
  category: 'other',
  amount: '',
  date: new Date().toISOString().slice(0, 10),
  description: '',
  status: 'approved',
  branch: '',
}

const STATUS_BADGE = {
  approved: 'owner-badge--active',
  pending:  'owner-badge--pending',
  rejected: 'owner-badge--inactive',
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function OwnerExpensesPage() {
  // Data
  const [expenses,  setExpenses]  = useState([])
  const [branches,  setBranches]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [apiError,  setApiError]  = useState('')

  // Filters
  const [search,         setSearch]         = useState('')
  const [filterBranch,   setFilterBranch]   = useState('')
  const [filterCategory, setFilterCategory] = useState('')

  // Modal
  const [modal,     setModal]     = useState(false) // false | 'add' | 'edit'
  const [editingId, setEditingId] = useState(null)
  const [form,      setForm]      = useState(EMPTY_FORM)
  const [saving,    setSaving]    = useState(false)
  const [saveError, setSaveError] = useState('')

  // Delete confirm
  const [deletingId, setDeletingId] = useState(null)
  const [deleting,   setDeleting]   = useState(false)

  // ─── Fetch ─────────────────────────────────────────────────────────────────
  const fetchExpenses = useCallback(async () => {
    setLoading(true)
    setApiError('')
    try {
      const params = {}
      if (filterBranch)   params.branch   = filterBranch
      if (filterCategory) params.category = filterCategory
      if (search)         params.search   = search
      const data = await expenseApi.list(params)
      setExpenses(Array.isArray(data) ? data : (data.results ?? []))
    } catch (err) {
      setApiError(err.message || 'Failed to load expenses.')
    } finally {
      setLoading(false)
    }
  }, [filterBranch, filterCategory, search])

  const fetchBranches = useCallback(async () => {
    try {
      const data = await branchApi.list()
      setBranches(Array.isArray(data) ? data : (data.results ?? []))
    } catch {}
  }, [])

  useEffect(() => { fetchBranches() }, [fetchBranches])
  useEffect(() => { fetchExpenses() }, [fetchExpenses])

  // ─── Derived totals (from currently-loaded records) ────────────────────────
  const total = expenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0)

  // ─── Modal helpers ─────────────────────────────────────────────────────────
  const openAdd = () => {
    setForm(EMPTY_FORM)
    setEditingId(null)
    setSaveError('')
    setModal('add')
  }

  const openEdit = (exp) => {
    setForm({
      title:       exp.title       || '',
      category:    exp.category    || 'other',
      amount:      exp.amount      || '',
      date:        exp.date        || new Date().toISOString().slice(0, 10),
      description: exp.description || '',
      status:      exp.status      || 'approved',
      branch:      exp.branch      ?? '',
    })
    setEditingId(exp.id)
    setSaveError('')
    setModal('edit')
  }

  const closeModal = () => {
    setModal(false)
    setEditingId(null)
    setSaveError('')
  }

  const ff = (key) => (e) => setForm(prev => ({ ...prev, [key]: e.target.value }))

  // ─── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.title.trim())  { setSaveError('Expense title is required.');  return }
    if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) < 0) {
      setSaveError('A valid amount is required.'); return
    }
    if (!form.date)          { setSaveError('Date is required.');           return }
    setSaving(true); setSaveError('')
    try {
      const payload = {
        title:       form.title.trim(),
        category:    form.category,
        amount:      Number(form.amount),
        date:        form.date,
        description: form.description.trim(),
        status:      form.status,
        branch:      form.branch || null,
      }
      if (editingId) {
        await expenseApi.update(editingId, payload)
      } else {
        await expenseApi.create(payload)
      }
      await fetchExpenses()
      closeModal()
    } catch (err) {
      const data = err.data
      if (data && typeof data === 'object') {
        const msgs = Object.entries(data).map(([k, v]) => `${k}: ${Array.isArray(v) ? v[0] : v}`)
        setSaveError(msgs.join(' | '))
      } else {
        setSaveError(err.message || 'Failed to save expense.')
      }
    } finally {
      setSaving(false)
    }
  }

  // ─── Delete ────────────────────────────────────────────────────────────────
  const confirmDelete = (id) => { setDeletingId(id) }
  const cancelDelete  = ()  => { setDeletingId(null) }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await expenseApi.delete(deletingId)
      setDeletingId(null)
      await fetchExpenses()
    } catch (err) {
      alert(err.message || 'Failed to delete expense.')
    } finally {
      setDeleting(false)
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <AdminLayout pageTitle="Expenses" pageIcon="💸">
      <div className="owner-page">

        {/* Header */}
        <div className="owner-page-header">
          <div className="owner-page-header__left">
            <h1 className="owner-page-header__title">Expenses</h1>
            <p className="owner-page-header__sub">Track operational expenses logged across cafe branches.</p>
          </div>
          <div className="owner-page-header__actions">
            <button className="btn-primary" id="btn-add-expense" onClick={openAdd}>
              + Add Expense
            </button>
          </div>
        </div>

        {/* Error banner */}
        {apiError && (
          <div style={{ padding: '12px 16px', background: 'var(--color-danger-light,#fee)', color: 'var(--color-danger,#c00)', borderRadius: 8, fontSize: 13 }}>
            {apiError}
            <button onClick={fetchExpenses} style={{ marginLeft: 12, textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>Retry</button>
          </div>
        )}

        {/* KPIs */}
        <div className="owner-kpi-grid owner-kpi-grid--2">
          <div className="owner-kpi-card">
            <div className="owner-kpi-card__label">Total Expenses</div>
            <div className="owner-kpi-card__value">
              {loading ? '…' : `₹${total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
            </div>
            {(filterBranch || filterCategory) && (
              <div className="owner-kpi-card__sub">Filtered view</div>
            )}
          </div>
          <div className="owner-kpi-card">
            <div className="owner-kpi-card__label">Logged Records</div>
            <div className="owner-kpi-card__value">{loading ? '…' : expenses.length}</div>
          </div>
        </div>

        {/* Expense Log Table */}
        <div className="owner-section-card">
          <div className="owner-section-card__header" style={{ flexWrap: 'wrap', gap: 10 }}>
            <span className="owner-section-card__title">Expense Log</span>
            <div className="owner-filter-bar">
              <input
                className="form-input"
                placeholder="Search expenses…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ minWidth: 200, fontSize: 13, padding: '8px 14px' }}
                id="search-expenses"
              />
              <select
                className="form-select"
                value={filterBranch}
                onChange={e => setFilterBranch(e.target.value)}
                id="filter-branch"
              >
                <option value="">All Branches</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
              <select
                className="form-select"
                value={filterCategory}
                onChange={e => setFilterCategory(e.target.value)}
                id="filter-category"
              >
                <option value="">All Categories</option>
                {CATEGORIES.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="owner-table-wrap">
            <table className="owner-table">
              <thead>
                <tr>
                  <th>Expense Name</th>
                  <th>Category</th>
                  <th>Amount</th>
                  <th>Date</th>
                  <th>Branch</th>
                  <th>Location</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8}>
                    <div className="owner-empty"><div className="owner-empty__text">Loading expenses…</div></div>
                  </td></tr>
                ) : expenses.length === 0 ? (
                  <tr><td colSpan={8}>
                    <div className="owner-empty">
                      <div className="owner-empty__icon">💸</div>
                      <div className="owner-empty__text">No expenses logged yet</div>
                    </div>
                  </td></tr>
                ) : expenses.map(exp => (
                  <tr key={exp.id}>
                    <td className="td-name">{exp.title}</td>
                    <td className="td-muted">{exp.category_display || exp.category}</td>
                    <td style={{ fontWeight: 600 }}>
                      ₹{Number(exp.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="td-muted">{exp.date}</td>
                    <td>{exp.branch_name || <span className="td-muted">—</span>}</td>
                    <td className="td-muted" style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {exp.branch_address || '—'}
                    </td>
                    <td>
                      <span className={`owner-badge ${STATUS_BADGE[exp.status] || 'owner-badge--pending'}`}>
                        {(exp.status_display || exp.status || '').toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <div className="td-actions">
                        <button className="owner-icon-btn" title="Edit" onClick={() => openEdit(exp)}>✏️</button>
                        <button className="owner-icon-btn owner-icon-btn--danger" title="Delete" onClick={() => confirmDelete(exp.id)}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* ── Add / Edit Modal ── */}
      <Modal
        open={modal === 'add' || modal === 'edit'}
        onClose={closeModal}
        title={modal === 'edit' ? 'Edit Expense' : 'Add Expense'}
      >
        <div className="owner-form-grid">
          <div className="form-group owner-form-grid--full">
            <label className="form-label">Expense Title <span>*</span></label>
            <input
              className="form-input"
              placeholder="e.g. Monthly Electricity Bill"
              value={form.title}
              onChange={ff('title')}
              id="inp-expense-title"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Category <span>*</span></label>
            <select className="form-select" value={form.category} onChange={ff('category')} id="sel-expense-category">
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Amount (₹) <span>*</span></label>
            <input
              className="form-input"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={form.amount}
              onChange={ff('amount')}
              id="inp-expense-amount"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Date <span>*</span></label>
            <input
              className="form-input"
              type="date"
              value={form.date}
              onChange={ff('date')}
              id="inp-expense-date"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Status</label>
            <select className="form-select" value={form.status} onChange={ff('status')} id="sel-expense-status">
              {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>

          <div className="form-group owner-form-grid--full">
            <label className="form-label">Branch</label>
            <select className="form-select" value={form.branch} onChange={ff('branch')} id="sel-expense-branch">
              <option value="">— No Branch —</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.name} {b.address ? `(${b.address})` : ''}</option>
              ))}
            </select>
          </div>

          <div className="form-group owner-form-grid--full">
            <label className="form-label">Description / Notes</label>
            <textarea
              className="form-input"
              rows={3}
              placeholder="Optional notes about this expense…"
              value={form.description}
              onChange={ff('description')}
              id="inp-expense-description"
              style={{ resize: 'vertical' }}
            />
          </div>
        </div>

        {saveError && (
          <p style={{ color: 'var(--color-danger,#c00)', fontSize: 12, marginTop: 8 }}>{saveError}</p>
        )}

        <div className="owner-modal-footer">
          <button className="btn-outline" onClick={closeModal} disabled={saving}>Cancel</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving} id="btn-save-expense">
            {saving ? 'Saving…' : modal === 'edit' ? 'Save Changes' : 'Add Expense'}
          </button>
        </div>
      </Modal>

      {/* ── Delete Confirm Modal ── */}
      <Modal open={!!deletingId} onClose={cancelDelete} title="Delete Expense">
        <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginBottom: 20 }}>
          Are you sure you want to permanently delete this expense record? This cannot be undone.
        </p>
        <div className="owner-modal-footer">
          <button className="btn-outline" onClick={cancelDelete} disabled={deleting}>Cancel</button>
          <button
            className="btn-primary"
            onClick={handleDelete}
            disabled={deleting}
            id="btn-confirm-delete-expense"
            style={{ background: 'var(--color-danger,#c00)', borderColor: 'var(--color-danger,#c00)' }}
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </Modal>

    </AdminLayout>
  )
}
