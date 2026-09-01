import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminLayout from '../../layouts/AdminLayout'
import Modal from '../../components/Modal'
import PasswordInput from '../../components/PasswordInput'
import { branchApi, branchManagerApi } from '../../api'
import './owner.css'

// ── Empty form shapes ──────────────────────────────────────────────────────────
const EMPTY_BRANCH_FORM = { name: '', code: '', address: '', phone: '', active: true }
const EMPTY_MGR_FORM    = { name: '', manager_id: '', manager_email: '', pin: '', confirm_pin: '' }

export default function OwnerBranchesPage() {
  const navigate = useNavigate()

  // ── Data state ────────────────────────────────────────────────────────────
  const [branches,  setBranches]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [apiError,  setApiError]  = useState('')
  const [search,    setSearch]    = useState('')

  // ── Modal state ───────────────────────────────────────────────────────────
  // modal: false | 'add' | 'edit' | 'manager'
  const [modal,     setModal]     = useState(false)
  const [saving,    setSaving]    = useState(false)
  const [saveError, setSaveError] = useState('')

  // ── Branch form ───────────────────────────────────────────────────────────
  const [editingId,   setEditingId]   = useState(null)
  const [branchForm,  setBranchForm]  = useState(EMPTY_BRANCH_FORM)

  // ── Manager form (shown inside Add Branch modal or standalone) ────────────
  const [mgrForm,     setMgrForm]     = useState(EMPTY_MGR_FORM)
  const [addManager,  setAddManager]  = useState(false) // toggle inside 'add' modal
  const [mgrBranchId, setMgrBranchId] = useState(null) // for standalone 'manager' modal

  // ── OTP PIN Change Verification Modal State ─────────────────────────────
  const [otpModalOpen, setOtpModalOpen] = useState(false)
  const [pendingMgrId, setPendingMgrId] = useState(null)
  const [otpValue,     setOtpValue]     = useState('')
  const [otpLoading,   setOtpLoading]   = useState(false)
  const [otpError,     setOtpError]     = useState('')
  const [otpSuccess,   setOtpSuccess]   = useState('')

  // ── Fetch branches ────────────────────────────────────────────────────────
  const fetchBranches = useCallback(async () => {
    setLoading(true)
    setApiError('')
    try {
      const data = await branchApi.list()
      setBranches(Array.isArray(data) ? data : (data.results ?? []))
    } catch (err) {
      setApiError(err.message || 'Failed to load branches.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchBranches() }, [fetchBranches])

  // ── Helpers ───────────────────────────────────────────────────────────────
  const filtered = branches.filter(b =>
    b.name.toLowerCase().includes(search.toLowerCase()) ||
    (b.address && b.address.toLowerCase().includes(search.toLowerCase()))
  )

  const bf = (key) => (e) => setBranchForm(prev => ({ ...prev, [key]: e.target.value }))
  const mf = (key) => (e) => setMgrForm(prev => ({ ...prev, [key]: e.target.value }))

  // ── Open modals ───────────────────────────────────────────────────────────
  const openAdd = () => {
    setBranchForm(EMPTY_BRANCH_FORM)
    setMgrForm(EMPTY_MGR_FORM)
    setAddManager(false)
    setEditingId(null)
    setSaveError('')
    setModal('add')
  }

  const openEdit = (b) => {
    setBranchForm({
      name:    b.name    || '',
      code:    b.code    || '',
      address: b.address || '',
      phone:   b.phone   || '',
      active:  b.active  ?? true,
    })
    setEditingId(b.id)
    setSaveError('')
    setModal('edit')
  }

  const openManagerModal = (branchId) => {
    const branch = branches.find(b => b.id === branchId)
    const existingMgr = branch?.manager
    setMgrForm(existingMgr
      ? { name: existingMgr.name, manager_id: existingMgr.manager_id, manager_email: existingMgr.email || '', pin: '', confirm_pin: '' }
      : EMPTY_MGR_FORM
    )
    setMgrBranchId(branchId)
    setSaveError('')
    setModal('manager')
  }

  const closeModal = () => {
    setModal(false)
    setEditingId(null)
    setMgrBranchId(null)
    setSaveError('')
  }

  // ── Save branch (create or update) ───────────────────────────────────────
  const handleSaveBranch = async () => {
    if (!branchForm.name.trim()) { setSaveError('Branch name is required.'); return }
    if (!branchForm.code.trim()) { setSaveError('Branch code is required.'); return }
    
    if (!editingId && addManager) {
      if (!mgrForm.name.trim())       { setSaveError('Manager name is required.'); return }
      if (!mgrForm.manager_id.trim()) { setSaveError('Manager ID is required.'); return }
      if (!mgrForm.manager_email.trim())      { setSaveError('Manager Email is required.'); return }
      if (!mgrForm.pin.trim())        { setSaveError('PIN / Password is required.'); return }
      if (mgrForm.pin !== mgrForm.confirm_pin) { setSaveError('PINs do not match.'); return }
    }

    setSaving(true); setSaveError('')
    try {
      if (editingId) {
        await branchApi.patch(editingId, branchForm)
      } else {
        const payload = { ...branchForm }
        if (addManager) {
          payload.create_manager = true
          payload.manager_name = mgrForm.name
          payload.manager_id = mgrForm.manager_id
          payload.manager_email = mgrForm.manager_email
          payload.manager_pin = mgrForm.pin
        }
        await branchApi.create(payload)
      }

      await fetchBranches()
      closeModal()
    } catch (err) {
      const data = err.data
      if (data && typeof data === 'object') {
        const msgs = Object.entries(data).map(([k, v]) => `${k}: ${Array.isArray(v) ? v[0] : v}`)
        setSaveError(msgs.join(' | '))
      } else {
        setSaveError(err.message || 'Failed to save branch.')
      }
    } finally {
      setSaving(false)
    }
  }

  // ── Save manager (standalone edit/create for existing branch) ─────────────
  const handleSaveManager = async () => {
    if (!mgrForm.name.trim())       { setSaveError('Manager name is required.');  return }
    if (!mgrForm.manager_id.trim()) { setSaveError('Manager ID is required.');    return }
    if (!mgrForm.manager_email.trim())      { setSaveError('Manager Email is required.'); return }
    setSaving(true); setSaveError('')
    try {
      const branch = branches.find(b => b.id === mgrBranchId)
      const existingMgr = branch?.manager
      if (existingMgr) {
        const payload = { name: mgrForm.name, manager_id: mgrForm.manager_id, email: mgrForm.manager_email }
        if (mgrForm.pin.trim()) {
          if (mgrForm.pin !== mgrForm.confirm_pin) {
            setSaveError('PINs do not match.')
            setSaving(false)
            return
          }
          payload.pin = mgrForm.pin
        }
        const res = await branchManagerApi.update(existingMgr.id, payload)
        if (res && res.requires_otp) {
          setPendingMgrId(existingMgr.id)
          setOtpValue('')
          setOtpError('')
          setOtpSuccess("For your security, we've sent a verification code to your registered email address.")
          setModal(false)
          setOtpModalOpen(true)
          return
        }
      } else {
        if (!mgrForm.pin.trim()) { setSaveError('PIN is required for a new manager.'); setSaving(false); return }
        if (mgrForm.pin !== mgrForm.confirm_pin) { setSaveError('PINs do not match.'); setSaving(false); return }
        await branchManagerApi.create({
          name:       mgrForm.name,
          manager_id: mgrForm.manager_id,
          email:      mgrForm.manager_email,
          pin:        mgrForm.pin,
          branch:     mgrBranchId,
        })
      }
      await fetchBranches()
      closeModal()
    } catch (err) {
      const data = err.data
      if (data && typeof data === 'object') {
        const msgs = Object.entries(data).map(([k, v]) => `${k}: ${Array.isArray(v) ? v[0] : v}`)
        setSaveError(msgs.join(' | '))
      } else {
        setSaveError(err.message || 'Failed to save manager.')
      }
    } finally {
      setSaving(false)
    }
  }

  // ── OTP PIN Change Verification Handlers ─────────────────────────────────
  const handleVerifyPinOTP = async (e) => {
    if (e) e.preventDefault()
    if (!otpValue.trim()) { setOtpError('Please enter the verification code.'); return }
    setOtpLoading(true)
    setOtpError('')
    try {
      await branchManagerApi.verifyPinChangeOTP(pendingMgrId, { otp: otpValue.trim() })
      setOtpModalOpen(false)
      setPendingMgrId(null)
      setOtpValue('')
      await fetchBranches()
      alert('Branch Manager PIN updated successfully.')
    } catch (err) {
      setOtpError(err.message || 'Invalid verification code.')
    } finally {
      setOtpLoading(false)
    }
  }

  const handleResendPinOTP = async () => {
    setOtpLoading(true)
    setOtpError('')
    setOtpSuccess('')
    try {
      const res = await branchManagerApi.resendPinChangeOTP(pendingMgrId)
      setOtpSuccess(res.message || 'New verification code sent to your email.')
    } catch (err) {
      setOtpError(err.message || 'Failed to resend verification code.')
    } finally {
      setOtpLoading(false)
    }
  }

  const handleCancelOtp = () => {
    setOtpModalOpen(false)
    setPendingMgrId(null)
    setOtpValue('')
    setOtpError('')
    setOtpSuccess('')
  }

  // ── Toggle branch active/inactive ─────────────────────────────────────────
  const toggleStatus = async (b) => {
    try {
      const updated = await branchApi.setActive(b.id, !b.active)
      setBranches(prev => prev.map(br => br.id === b.id ? { ...br, ...updated } : br))
    } catch (err) {
      alert(err.message || 'Failed to update branch status.')
    }
  }

  return (
    <AdminLayout pageTitle="Branches" pageIcon="🏪">
      <div className="owner-page">

        {/* Header */}
        <div className="owner-page-header">
          <div className="owner-page-header__left">
            <h1 className="owner-page-header__title">Branches</h1>
            <p className="owner-page-header__sub">Manage all your cafe branches and their branch managers.</p>
          </div>
          <div className="owner-page-header__actions">
            <button className="btn-primary" id="btn-add-branch" onClick={openAdd}>+ Add Branch</button>
          </div>
        </div>

        {/* API error banner */}
        {apiError && (
          <div style={{ padding: '12px 16px', background: 'var(--color-danger-light, #fee)', color: 'var(--color-danger, #c00)', borderRadius: 8, fontSize: 13 }}>
            {apiError}
            <button onClick={fetchBranches} style={{ marginLeft: 12, textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>Retry</button>
          </div>
        )}

        {/* Table card */}
        <div className="owner-section-card">
          <div className="owner-section-card__header">
            <div className="owner-filter-bar">
              <input
                className="form-input"
                placeholder="Search branches…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ minWidth: 240, fontSize: 13, padding: '8px 14px' }}
                id="search-branches"
              />
            </div>
            <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
              {loading ? 'Loading…' : `${filtered.length} branch${filtered.length !== 1 ? 'es' : ''}`}
            </span>
          </div>

          <div className="owner-table-wrap">
            <table className="owner-table">
              <thead>
                <tr>
                  <th>Branch Name</th>
                  <th>Code</th>
                  <th>Location</th>
                  <th>Branch Manager</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6}><div className="owner-empty"><div className="owner-empty__text">Loading branches…</div></div></td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={6}><div className="owner-empty"><div className="owner-empty__icon">🏪</div><div className="owner-empty__text">No branches found</div></div></td></tr>
                ) : filtered.map(b => (
                  <tr key={b.id}>
                    <td className="td-name">
                      <button
                        onClick={() => navigate(`/owner/branches/${b.id}`)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontWeight: 600, textAlign: 'left', padding: 0 }}
                      >
                        {b.name}
                      </button>
                    </td>
                    <td className="td-mono td-muted">{b.code}</td>
                    <td className="td-muted">{b.address || '—'}</td>
                    <td>
                      {b.manager ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 13 }}>{b.manager.name}</span>
                          <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>({b.manager.manager_id})</span>
                          <button
                            className="owner-icon-btn"
                            title="Edit Manager"
                            onClick={() => openManagerModal(b.id)}
                            style={{ fontSize: 12 }}
                          >✏️</button>
                        </div>
                      ) : (
                        <button
                          className="btn-outline"
                          onClick={() => openManagerModal(b.id)}
                          style={{ fontSize: 12, padding: '4px 10px' }}
                          id={`btn-add-manager-${b.id}`}
                        >
                          + Add Manager
                        </button>
                      )}
                    </td>
                    <td>
                      <span className={`owner-badge owner-badge--${b.active ? 'active' : 'inactive'}`}>
                        {b.active ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </td>
                    <td>
                      <div className="td-actions">
                        <button className="owner-icon-btn" title="Edit Branch" onClick={() => openEdit(b)}>✏️</button>
                        <button
                          className={`owner-icon-btn${b.active ? ' owner-icon-btn--danger' : ''}`}
                          title={b.active ? 'Deactivate' : 'Activate'}
                          onClick={() => toggleStatus(b)}
                        >
                          {b.active ? '⏸' : '▶'}
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

      {/* ── Add Branch Modal ── */}
      <Modal open={modal === 'add'} onClose={closeModal} title="Add New Branch">
        <div className="owner-form-grid">
          <div className="form-group owner-form-grid--full">
            <label className="form-label">Branch Name <span>*</span></label>
            <input className="form-input" placeholder="e.g. Indiranagar Branch" value={branchForm.name} onChange={bf('name')} id="inp-add-branch-name" />
          </div>
          <div className="form-group">
            <label className="form-label">Branch Code <span>*</span></label>
            <input className="form-input" placeholder="e.g. BR-002" value={branchForm.code} onChange={bf('code')} id="inp-add-branch-code" />
          </div>
          <div className="form-group">
            <label className="form-label">Phone</label>
            <input className="form-input" placeholder="+91 XXXXXXXXXX" value={branchForm.phone} onChange={bf('phone')} id="inp-add-branch-phone" />
          </div>
          <div className="form-group owner-form-grid--full">
            <label className="form-label">Address</label>
            <input className="form-input" placeholder="Full branch address…" value={branchForm.address} onChange={bf('address')} id="inp-add-branch-address" />
          </div>
          <div className="form-group">
            <label className="form-label">Status</label>
            <select className="form-select" value={branchForm.active ? 'true' : 'false'} onChange={e => setBranchForm(p => ({ ...p, active: e.target.value === 'true' }))} id="sel-add-branch-status">
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>

          {/* Manager section toggle */}
          <div className="form-group owner-form-grid--full">
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--color-espresso)' }}>
              <input type="checkbox" checked={addManager} onChange={e => setAddManager(e.target.checked)} id="chk-add-manager" />
              Also create a Branch Manager for this branch
            </label>
          </div>

          {addManager && (
            <>
              <div className="form-group owner-form-grid--full" style={{ borderTop: '1px dashed var(--color-border)', paddingTop: 12 }}>
                <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 10 }}>Branch Manager Details</p>
              </div>
              <div className="form-group">
                <label className="form-label">Manager Name <span>*</span></label>
                <input className="form-input" placeholder="e.g. Rahul Sharma" value={mgrForm.name} onChange={mf('name')} id="inp-mgr-name" />
              </div>
              <div className="form-group">
                <label className="form-label">Manager ID <span>*</span></label>
                <input className="form-input" placeholder="e.g. MGR-001" value={mgrForm.manager_id} onChange={mf('manager_id')} id="inp-mgr-id" />
              </div>
              <div className="form-group owner-form-grid--full">
                <label className="form-label">Manager Email <span>*</span></label>
                <input className="form-input" type="email" placeholder="e.g. manager@artisanbrew.com" value={mgrForm.manager_email} onChange={mf('manager_email')} id="inp-mgr-email" />
              </div>
              <div className="form-group">
                <label className="form-label">PIN / Password <span>*</span></label>
                <PasswordInput placeholder="Set a login PIN" value={mgrForm.pin} onChange={mf('pin')} id="inp-mgr-pin" title="PIN" />
              </div>
              <div className="form-group">
                <label className="form-label">Confirm PIN <span>*</span></label>
                <PasswordInput placeholder="Confirm login PIN" value={mgrForm.confirm_pin} onChange={mf('confirm_pin')} id="inp-mgr-confirm-pin" title="Confirm PIN" />
              </div>
            </>
          )}
        </div>

        {saveError && (
          <p style={{ color: 'var(--color-danger, #c00)', fontSize: 12, marginTop: 8 }}>{saveError}</p>
        )}

        <div className="owner-modal-footer">
          <button className="btn-outline" onClick={closeModal} disabled={saving}>Cancel</button>
          <button className="btn-primary" onClick={handleSaveBranch} disabled={saving} id="btn-save-branch">
            {saving ? 'Saving…' : 'Add Branch'}
          </button>
        </div>
      </Modal>

      {/* ── Edit Branch Modal ── */}
      <Modal open={modal === 'edit'} onClose={closeModal} title="Edit Branch">
        <div className="owner-form-grid">
          <div className="form-group owner-form-grid--full">
            <label className="form-label">Branch Name <span>*</span></label>
            <input className="form-input" placeholder="Branch name" value={branchForm.name} onChange={bf('name')} id="inp-edit-branch-name" />
          </div>
          <div className="form-group">
            <label className="form-label">Branch Code <span>*</span></label>
            <input className="form-input" placeholder="e.g. BR-001" value={branchForm.code} onChange={bf('code')} id="inp-edit-branch-code" />
          </div>
          <div className="form-group">
            <label className="form-label">Phone</label>
            <input className="form-input" placeholder="+91 XXXXXXXXXX" value={branchForm.phone} onChange={bf('phone')} id="inp-edit-branch-phone" />
          </div>
          <div className="form-group owner-form-grid--full">
            <label className="form-label">Address</label>
            <input className="form-input" placeholder="Branch address…" value={branchForm.address} onChange={bf('address')} id="inp-edit-branch-address" />
          </div>
          <div className="form-group">
            <label className="form-label">Status</label>
            <select className="form-select" value={branchForm.active ? 'true' : 'false'} onChange={e => setBranchForm(p => ({ ...p, active: e.target.value === 'true' }))} id="sel-edit-branch-status">
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
        </div>

        {saveError && (
          <p style={{ color: 'var(--color-danger, #c00)', fontSize: 12, marginTop: 8 }}>{saveError}</p>
        )}

        <div className="owner-modal-footer">
          <button className="btn-outline" onClick={closeModal} disabled={saving}>Cancel</button>
          <button className="btn-primary" onClick={handleSaveBranch} disabled={saving} id="btn-update-branch">
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </Modal>

      {/* ── Add / Edit Manager Modal ── */}
      <Modal
        open={modal === 'manager'}
        onClose={closeModal}
        title={branches.find(b => b.id === mgrBranchId)?.manager ? 'Edit Branch Manager' : 'Add Branch Manager'}
      >
        {(() => {
          const branch = branches.find(b => b.id === mgrBranchId)
          const hasManager = !!branch?.manager
          return (
            <>
              {branch && (
                <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 14 }}>
                  Branch: <strong>{branch.name}</strong> ({branch.code})
                </p>
              )}
              <div className="owner-form-grid">
                <div className="form-group">
                  <label className="form-label">Manager Name <span>*</span></label>
                  <input className="form-input" placeholder="e.g. Rahul Sharma" value={mgrForm.name} onChange={mf('name')} id="inp-modal-mgr-name" />
                </div>
                <div className="form-group">
                  <label className="form-label">Manager ID <span>*</span></label>
                  <input className="form-input" placeholder="e.g. MGR-001" value={mgrForm.manager_id} onChange={mf('manager_id')} id="inp-modal-mgr-id" />
                </div>
                <div className="form-group owner-form-grid--full">
                  <label className="form-label">Manager Email <span>*</span></label>
                  <input className="form-input" type="email" placeholder="e.g. manager@artisanbrew.com" value={mgrForm.manager_email} onChange={mf('manager_email')} id="inp-modal-mgr-email" />
                </div>
                <div className="form-group">
                  <label className="form-label">
                    PIN / Password {!hasManager && <span>*</span>}
                    {hasManager && <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--color-text-muted)' }}> (leave blank to keep existing)</span>}
                  </label>
                  <PasswordInput placeholder={hasManager ? '(unchanged)' : 'Set a login PIN'} value={mgrForm.pin} onChange={mf('pin')} id="inp-modal-mgr-pin" title="PIN" />
                </div>
                {hasManager && mgrForm.pin.trim() && (
                  <div className="form-group">
                    <label className="form-label">Confirm PIN <span>*</span></label>
                    <PasswordInput placeholder="Confirm new login PIN" value={mgrForm.confirm_pin} onChange={mf('confirm_pin')} id="inp-modal-mgr-confirm-pin" title="Confirm PIN" />
                  </div>
                )}
                {!hasManager && (
                  <div className="form-group">
                    <label className="form-label">Confirm PIN <span>*</span></label>
                    <PasswordInput placeholder="Confirm login PIN" value={mgrForm.confirm_pin} onChange={mf('confirm_pin')} id="inp-modal-mgr-confirm-pin" title="Confirm PIN" />
                  </div>
                )}
              </div>

              {saveError && (
                <p style={{ color: 'var(--color-danger, #c00)', fontSize: 12, marginTop: 8 }}>{saveError}</p>
              )}

              <div className="owner-modal-footer">
                <button className="btn-outline" onClick={closeModal} disabled={saving}>Cancel</button>
                <button className="btn-primary" onClick={handleSaveManager} disabled={saving} id="btn-save-manager">
                  {saving ? 'Saving…' : hasManager ? 'Save Changes' : 'Add Manager'}
                </button>
              </div>
            </>
          )
        })()}
      </Modal>

      {/* ── Verify PIN Change OTP Modal ── */}
      <Modal
        open={otpModalOpen}
        onClose={handleCancelOtp}
        title="Verify PIN Change"
      >
        <div style={{ padding: '4px 0' }}>
          {otpSuccess && (
            <div style={{ color: 'green', fontSize: 13, marginBottom: 12, textAlign: 'center', fontWeight: 600 }}>
              {otpSuccess}
            </div>
          )}
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 16 }}>
            For your security, we've sent a 6-digit verification code to your registered email address.
          </p>

          <form onSubmit={handleVerifyPinOTP}>
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label">Verification Code (OTP) <span>*</span></label>
              <input
                className="form-input"
                type="text"
                maxLength={6}
                placeholder="123456"
                value={otpValue}
                onChange={e => setOtpValue(e.target.value.replace(/\D/g, ''))}
                autoFocus
                style={{ letterSpacing: '4px', fontSize: 16, fontWeight: 700, textAlign: 'center' }}
                id="inp-otp-pin-change"
              />
            </div>

            {otpError && (
              <p style={{ color: 'var(--color-danger, #c00)', fontSize: 12, marginBottom: 12, textAlign: 'center' }}>{otpError}</p>
            )}

            <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 20, textAlign: 'center' }}>
              Code expires in 5 minutes.
            </p>

            <div className="owner-modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                type="button"
                className="btn-outline"
                onClick={handleResendPinOTP}
                disabled={otpLoading}
                style={{ fontSize: 12 }}
              >
                Resend Code
              </button>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="btn-outline" onClick={handleCancelOtp} disabled={otpLoading}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={otpLoading} id="btn-verify-pin-otp">
                  {otpLoading ? 'Verifying…' : 'Verify & Change PIN'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </Modal>
    </AdminLayout>
  )
}
