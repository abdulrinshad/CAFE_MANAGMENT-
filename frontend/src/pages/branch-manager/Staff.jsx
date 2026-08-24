import { useState, useEffect } from 'react';
import BranchManagerLayout from '../../layouts/BranchManagerLayout';
import Modal from '../../components/Modal';
import { branchManagerService } from '../../services/branchManagerService';
import { useApp } from '../../context/AppContext';
import '../../pages/owner/owner.css';

// ── Constants ─────────────────────────────────────────────────────────────────

const TYPE_WAITER  = 'waiter';
const TYPE_CASHIER = 'cashier';

const EMPTY_FORM = {
  name:        '',
  employee_id: '',
  section:     '',
  pin:         '',
  confirm_pin: '',
  is_active:   true,
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function Staff() {
  // Auth context — read branch from the manager's session (never from user input)
  const { currentBranch } = useApp();

  // Staff list state
  const [staff,   setStaff]   = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal / form state
  const [modal,        setModal]        = useState(false);
  const [employeeType, setEmployeeType] = useState(TYPE_WAITER);
  const [form,         setForm]         = useState(EMPTY_FORM);
  const [editing,      setEditing]      = useState(null);   // { id: 'waiter_5' | 'cashier_3', type }
  const [saving,       setSaving]       = useState(false);
  const [error,        setError]        = useState(null);

  // Detail view modal
  const [selectedMember,  setSelectedMember]  = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // ── Data loading ───────────────────────────────────────────────────────────

  const loadStaff = async () => {
    try {
      const data = await branchManagerService.getStaff();
      setStaff(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Load staff error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadStaff(); }, []);

  // ── KPI helpers ────────────────────────────────────────────────────────────

  const waiters  = staff.filter(s => s.role_key === 'waiter'  || s.role === 'Waiter').length;
  const cashiers = staff.filter(s => s.role_key === 'cashier' || s.role === 'Cashier').length;
  const active   = staff.filter(s => s.is_active || s.status === 'active').length;

  // ── Modal helpers ──────────────────────────────────────────────────────────

  const openAdd = (type = TYPE_WAITER) => {
    setEmployeeType(type);
    setForm(EMPTY_FORM);
    setEditing(null);
    setError(null);
    setModal(true);
  };

  const openEdit = (member) => {
    const type = member.role_key === 'cashier' ? TYPE_CASHIER : TYPE_WAITER;
    setEmployeeType(type);
    setForm({
      name:        member.name        || '',
      employee_id: member.employee_id || '',
      section:     member.section     || '',
      pin:         '',
      confirm_pin: '',
      is_active:   member.is_active ?? true,
    });
    setEditing({ id: member.id, type });
    setError(null);
    setModal(true);
  };

  const closeModal = () => {
    setModal(false);
    setEditing(null);
    setError(null);
  };

  // ── Field update helper ────────────────────────────────────────────────────

  const f = (key) => (ev) => setForm(prev => ({ ...prev, [key]: ev.target.value }));

  // ── Frontend validations ───────────────────────────────────────────────────

  const validate = () => {
    const name        = form.name.trim();
    const employee_id = form.employee_id.trim();
    const pin         = form.pin.trim();
    const confirm_pin = form.confirm_pin.trim();

    if (!name) {
      setError('Full Name is required.'); return false;
    }
    if (!name.replace(/\s/g, '')) {
      setError('Full Name cannot contain only spaces.'); return false;
    }
    if (name.length > 120) {
      setError('Full Name is too long (max 120 characters).'); return false;
    }
    if (!employee_id) {
      setError('Employee ID is required.'); return false;
    }

    // PIN is required when creating; optional when editing (leave blank = keep existing)
    if (!editing && !pin) {
      setError('4-Digit PIN is required for new employees.'); return false;
    }
    if (pin) {
      if (!/^\d+$/.test(pin)) {
        setError('PIN must contain digits only — no letters or spaces.'); return false;
      }
      if (pin.length !== 4) {
        setError(`PIN must be exactly 4 digits (you entered ${pin.length}).`); return false;
      }
      if (pin !== confirm_pin) {
        setError('PIN and Confirm PIN do not match. Please re-enter.'); return false;
      }
    }

    return true;
  };

  // ── Save ──────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!validate()) return;

    setSaving(true);
    setError(null);
    try {
      const payload = {
        role:        employeeType,            // 'waiter' | 'cashier'
        name:        form.name.trim(),
        employee_id: form.employee_id.trim(),
        section:     form.section?.trim() || '',
        is_active:   form.is_active,
        // Branch is NEVER sent — backend enforces the manager's assigned branch via JWT.
      };

      if (form.pin.trim()) {
        payload.pin         = form.pin.trim();
        payload.confirm_pin = form.pin.trim();
      }

      if (editing) {
        // PATCH /branch/staff/<id>/
        await branchManagerService.editStaff(editing.id, payload);
      } else {
        // POST /branch/staff/
        await branchManagerService.addStaff(payload);
      }

      await loadStaff();
      closeModal();
    } catch (err) {
      console.error('Save employee error:', err);
      // Surface structured backend errors (e.g. { employee_id: "already in use" })
      if (err.data && typeof err.data === 'object') {
        const msgs = Object.values(err.data).flat().join(' ');
        setError(msgs || err.message || 'Failed to save employee.');
      } else {
        setError(err.message || 'Failed to save employee.');
      }
    } finally {
      setSaving(false);
    }
  };

  // ── Toggle active status ──────────────────────────────────────────────────

  const toggleStatus = async (member) => {
    try {
      await branchManagerService.updateStaff(member.id, {
        status: member.is_active ? 'inactive' : 'active',
      });
      await loadStaff();
    } catch (err) {
      alert(err.message || 'Failed to update status.');
    }
  };

  // ── Loading state ─────────────────────────────────────────────────────────

  if (loading) {
    return (
      <BranchManagerLayout>
        <div className="owner-page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', color: 'var(--color-espresso)' }}>
          <h3>Loading staff records…</h3>
        </div>
      </BranchManagerLayout>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <BranchManagerLayout>
      <div className="owner-page">

        {/* ── Page Header ──────────────────────────────────────────────── */}
        <div className="owner-page-header">
          <div className="owner-page-header__left">
            <h1 className="owner-page-header__title">Staff &amp; Employees</h1>
            <p className="owner-page-header__sub">
              Manage waiters and cashiers for{' '}
              <strong>{currentBranch?.name || 'your branch'}</strong>.
            </p>
          </div>
          <div className="owner-page-header__actions" style={{ display: 'flex', gap: 10 }}>
            <button
              className="btn-outline"
              id="btn-add-waiter"
              onClick={() => openAdd(TYPE_WAITER)}
            >
              + Add Waiter
            </button>
            <button
              className="btn-primary"
              id="btn-add-cashier"
              onClick={() => openAdd(TYPE_CASHIER)}
            >
              + Add Cashier
            </button>
          </div>
        </div>

        {/* ── KPI Cards ─────────────────────────────────────────────────── */}
        <div className="owner-kpi-grid">
          <div className="owner-kpi-card">
            <div className="owner-kpi-card__label">Total Employees</div>
            <div className="owner-kpi-card__value">{staff.length}</div>
          </div>
          <div className="owner-kpi-card">
            <div className="owner-kpi-card__label">Active</div>
            <div className="owner-kpi-card__value">{active}</div>
          </div>
          <div className="owner-kpi-card">
            <div className="owner-kpi-card__label">Waiters</div>
            <div className="owner-kpi-card__value">{waiters}</div>
          </div>
          <div className="owner-kpi-card">
            <div className="owner-kpi-card__label">Cashiers</div>
            <div className="owner-kpi-card__value">{cashiers}</div>
          </div>
        </div>

        {/* ── Staff Table ───────────────────────────────────────────────── */}
        <div className="owner-section-card">
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
                {staff.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <div className="owner-empty">
                        <div className="owner-empty__icon">👥</div>
                        <div className="owner-empty__text">No employees yet. Add your first waiter or cashier.</div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  staff.map(member => (
                    <tr key={member.id}>
                      {/* Name */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{
                            width: 32, height: 32, borderRadius: '50%',
                            background: 'var(--color-cream)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: 700, fontSize: 13, color: 'var(--color-espresso)',
                            flexShrink: 0,
                          }}>
                            {(member.name || '?').charAt(0).toUpperCase()}
                          </div>
                          <span className="td-name">{member.name}</span>
                        </div>
                      </td>

                      {/* Employee ID */}
                      <td className="td-muted" style={{ fontFamily: 'monospace', fontSize: 12 }}>
                        {member.employee_id || <span style={{ color: '#aaa', fontStyle: 'italic' }}>—</span>}
                      </td>

                      {/* Role badge */}
                      <td>
                        <span className={`owner-badge ${
                          (member.role_key === 'cashier' || member.role === 'Cashier')
                            ? 'owner-badge--warning'
                            : 'owner-badge--active'
                        }`}>
                          {member.role || member.role_key?.toUpperCase() || '—'}
                        </span>
                      </td>

                      {/* Branch — always manager's own branch */}
                      <td className="td-muted">
                        {member.branch_name || currentBranch?.name || '—'}
                      </td>

                      {/* Status */}
                      <td>
                        <span className={`owner-badge owner-badge--${member.is_active ? 'active' : 'inactive'}`}>
                          {member.is_active ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td>
                        <div className="td-actions">
                          <button
                            className="owner-icon-btn"
                            title="View Details"
                            onClick={() => { setSelectedMember(member); setShowDetailModal(true); }}
                          >
                            👁️
                          </button>
                          <button
                            className="owner-icon-btn"
                            title="Edit Employee"
                            onClick={() => openEdit(member)}
                          >
                            ✏️
                          </button>
                          <button
                            className={`owner-icon-btn${member.is_active ? ' owner-icon-btn--danger' : ' owner-icon-btn--primary'}`}
                            title={member.is_active ? 'Deactivate' : 'Activate'}
                            onClick={() => toggleStatus(member)}
                          >
                            {member.is_active ? '⏸' : '▶'}
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

      {/* ── Add / Edit Employee Modal ─────────────────────────────────────── */}
      <Modal
        open={modal}
        onClose={closeModal}
        title={
          editing
            ? `Edit ${employeeType === TYPE_WAITER ? 'Waiter' : 'Cashier'}`
            : `Add ${employeeType === TYPE_WAITER ? 'Waiter' : 'Cashier'}`
        }
        size="md"
      >
        {/* Error banner */}
        {error && (
          <div style={{
            background: '#fee2e2',
            border: '1px solid #fca5a5',
            borderRadius: 6,
            padding: '8px 12px',
            color: '#991b1b',
            fontSize: 13,
            marginBottom: 14,
            lineHeight: 1.5,
          }}>
            {error}
          </div>
        )}

        <div className="owner-form-grid">

          {/* ── Employee Type toggle (disabled when editing) ─────────────── */}
          <div className="form-group owner-form-grid--full" style={{ marginBottom: 4 }}>
            <label className="form-label">Employee Type</label>
            <div style={{ display: 'flex', gap: 10 }}>
              {[TYPE_WAITER, TYPE_CASHIER].map(type => (
                <button
                  key={type}
                  type="button"
                  disabled={!!editing}
                  onClick={() => {
                    setEmployeeType(type);
                    setForm(EMPTY_FORM);
                    setError(null);
                  }}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: 8,
                    border: employeeType === type
                      ? '2px solid var(--color-primary)'
                      : '2px solid var(--color-border)',
                    background: employeeType === type ? 'var(--color-primary)' : 'transparent',
                    color: employeeType === type ? '#111' : 'var(--color-text-muted)',
                    fontWeight: employeeType === type ? 700 : 500,
                    fontSize: 13,
                    cursor: editing ? 'not-allowed' : 'pointer',
                    opacity: editing ? 0.6 : 1,
                    transition: 'all 0.15s',
                  }}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* ── Full Name ──────────────────────────────────────────────────── */}
          <div className="form-group owner-form-grid--full">
            <label className="form-label">
              Full Name <span style={{ color: '#e53e3e' }}>*</span>
            </label>
            <input
              id="inp-emp-name"
              className="form-input"
              placeholder="e.g. Rahul Sharma"
              value={form.name}
              onChange={f('name')}
              maxLength={120}
              autoComplete="off"
            />
          </div>

          {/* ── Employee ID ────────────────────────────────────────────────── */}
          <div className="form-group">
            <label className="form-label">
              Employee ID <span style={{ color: '#e53e3e' }}>*</span>
            </label>
            <input
              id="inp-emp-id"
              className="form-input"
              placeholder="e.g. EMP-001"
              value={form.employee_id}
              onChange={f('employee_id')}
              autoComplete="off"
            />
          </div>

          {/* ── Branch (read-only — always manager's own branch) ────────────── */}
          <div className="form-group">
            <label className="form-label">Branch</label>
            <input
              className="form-input"
              value={currentBranch?.name || 'Your Branch'}
              disabled
              readOnly
              style={{
                background: 'var(--color-bg-alt, #f7f3ef)',
                color: 'var(--color-text-muted)',
                cursor: 'not-allowed',
                opacity: 0.85,
              }}
              title="Branch is automatically set to your assigned branch."
            />
            <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4, marginBottom: 0 }}>
              Employees are automatically assigned to your branch.
            </p>
          </div>

          {/* ── Section (Waiter only) ──────────────────────────────────────── */}
          {employeeType === TYPE_WAITER && (
            <div className="form-group owner-form-grid--full">
              <label className="form-label">Section</label>
              <input
                id="inp-emp-section"
                className="form-input"
                placeholder="e.g. Patio or Main Dining"
                value={form.section}
                onChange={f('section')}
              />
            </div>
          )}

          {/* ── 4-Digit PIN ────────────────────────────────────────────────── */}
          <div className="form-group">
            <label className="form-label">
              4-Digit PIN{' '}
              {!editing && <span style={{ color: '#e53e3e' }}>*</span>}
            </label>
            <input
              id="inp-emp-pin"
              className="form-input"
              type="password"
              inputMode="numeric"
              maxLength={4}
              placeholder={editing ? 'Leave blank to keep' : 'e.g. 1234'}
              value={form.pin}
              onChange={(e) => {
                // Allow digits only
                const val = e.target.value.replace(/\D/g, '');
                setForm(prev => ({ ...prev, pin: val }));
              }}
              autoComplete="new-password"
            />
          </div>

          {/* ── Confirm PIN ───────────────────────────────────────────────── */}
          <div className="form-group">
            <label className="form-label">
              Confirm PIN{' '}
              {/* Live mismatch hint */}
              {form.pin && form.confirm_pin && form.pin !== form.confirm_pin && (
                <span style={{ color: '#e53e3e', fontWeight: 400, fontSize: 11 }}>
                  ✗ PINs do not match
                </span>
              )}
              {form.pin && form.confirm_pin && form.pin === form.confirm_pin && (
                <span style={{ color: '#22c55e', fontWeight: 400, fontSize: 11 }}>
                  ✓ Match
                </span>
              )}
            </label>
            <input
              id="inp-emp-confirm-pin"
              className="form-input"
              type="password"
              inputMode="numeric"
              maxLength={4}
              placeholder="Re-enter PIN"
              value={form.confirm_pin}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '');
                setForm(prev => ({ ...prev, confirm_pin: val }));
              }}
              autoComplete="new-password"
            />
          </div>

          {/* ── Status ────────────────────────────────────────────────────── */}
          <div className="form-group owner-form-grid--full">
            <label className="form-label">Status</label>
            <select
              id="sel-emp-status"
              className="form-select"
              value={form.is_active ? 'active' : 'inactive'}
              onChange={e => setForm(prev => ({ ...prev, is_active: e.target.value === 'active' }))}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

        </div>

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <div className="owner-modal-footer">
          <button className="btn-outline" onClick={closeModal} disabled={saving}>
            Cancel
          </button>
          <button
            id="btn-save-employee"
            className="btn-primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving
              ? 'Saving…'
              : editing
                ? 'Save Changes'
                : `Add ${employeeType === TYPE_WAITER ? 'Waiter' : 'Cashier'}`
            }
          </button>
        </div>
      </Modal>

      {/* ── Staff Detail Modal ───────────────────────────────────────────── */}
      {showDetailModal && selectedMember && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(44, 24, 16, 0.45)',
          backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            background: '#fff',
            padding: '28px',
            borderRadius: '14px',
            width: '100%',
            maxWidth: '440px',
            boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <h3 style={{ fontFamily: 'var(--font-serif)', color: 'var(--color-espresso)', fontSize: 20, margin: 0 }}>
                Employee Details
              </h3>
              <button
                style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--color-text-muted)', lineHeight: 1 }}
                onClick={() => setShowDetailModal(false)}
                aria-label="Close"
              >
                &times;
              </button>
            </div>

            {/* Avatar + name */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, paddingBottom: 16, borderBottom: '1px solid var(--color-border-light)', marginBottom: 16 }}>
              <div style={{
                width: 52, height: 52, borderRadius: '50%',
                background: 'var(--color-cream)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22, fontWeight: 700, color: 'var(--color-espresso)',
                flexShrink: 0,
              }}>
                {(selectedMember.name || '?').charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--color-espresso)' }}>
                  {selectedMember.name}
                </div>
                <div className="td-muted" style={{ fontSize: 12, marginTop: 2 }}>
                  {selectedMember.role} &bull; {selectedMember.employee_id || 'No ID'}
                </div>
              </div>
            </div>

            {/* Info rows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
              <DetailRow label="Branch"      value={selectedMember.branch_name || currentBranch?.name || '—'} />
              <DetailRow label="Section"     value={selectedMember.section || (selectedMember.role_key === 'cashier' ? 'N/A' : '—')} />
              <DetailRow label="Joined"      value={selectedMember.joinedDate || '—'} />
              <DetailRow
                label="Status"
                value={
                  <span className={`owner-badge owner-badge--${selectedMember.is_active ? 'active' : 'inactive'}`}>
                    {selectedMember.is_active ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                }
              />
            </div>

            <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button className="btn-outline" onClick={() => setShowDetailModal(false)}>Close</button>
              <button
                className="btn-primary"
                onClick={() => { setShowDetailModal(false); openEdit(selectedMember); }}
              >
                Edit Employee
              </button>
            </div>
          </div>
        </div>
      )}

    </BranchManagerLayout>
  );
}

// ── Small helper component ────────────────────────────────────────────────────

function DetailRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ color: 'var(--color-text-muted)' }}>{label}:</span>
      <span style={{ fontWeight: 500 }}>{value}</span>
    </div>
  );
}
