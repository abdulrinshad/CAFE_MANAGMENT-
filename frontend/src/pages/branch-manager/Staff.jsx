import { useState, useEffect } from 'react';
import BranchManagerLayout from '../../layouts/BranchManagerLayout';
import { branchManagerService } from '../../services/branchManagerService';
import '../../pages/owner/owner.css';

export default function Staff() {
  const [staff, setStaff] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'Waiter',
    password: '',
    status: 'active'
  });
  const [editId, setEditId] = useState(null);

  const [loading, setLoading] = useState(true);

  const loadStaff = async () => {
    try {
      const data = await branchManagerService.getStaff();
      setStaff(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStaff();
  }, []);

  if (loading) {
    return (
      <BranchManagerLayout>
        <div className="owner-page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', color: 'var(--color-espresso)' }}>
          <h3>Loading staff records...</h3>
        </div>
      </BranchManagerLayout>
    );
  }

  const totalStaff = staff.length;
  const activeStaff = staff.filter(s => s.status === 'active' || s.status === 'ACTIVE').length;
  const waiters = staff.filter(s => s.role === 'Waiter').length;
  const pos = staff.filter(s => s.role === 'POS').length;
  const kitchen = staff.filter(s => s.role === 'Kitchen Staff').length;

  const handleOpenAdd = () => {
    setEditId(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      role: 'Waiter',
      password: '',
      status: 'active'
    });
    setShowModal(true);
  };

  const handleOpenEdit = (member) => {
    setEditId(member.id);
    setFormData({
      name: member.name,
      email: member.email,
      phone: member.phone,
      role: member.role,
      password: member.password || '',
      status: member.status
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editId) {
        await branchManagerService.updateStaff(editId, formData);
      } else {
        await branchManagerService.addStaff(formData);
      }
      await loadStaff();
      setShowModal(false);
    } catch (err) {
      alert(err.message || 'Failed to save staff member');
    }
  };

  const toggleStatus = async (id, currentStatus) => {
    const nextStatus = currentStatus === 'active' || currentStatus === 'ACTIVE' ? 'inactive' : 'active';
    try {
      await branchManagerService.updateStaff(id, { status: nextStatus });
      await loadStaff();
    } catch (err) {
      alert(err.message || 'Failed to update status');
    }
  };

  return (
    <BranchManagerLayout>
      <div className="owner-page">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 className="owner-page-header__title">Staff Management</h1>
            <p className="owner-page-header__sub">Manage your branch employees and their credentials.</p>
          </div>
          <button className="btn-primary" onClick={handleOpenAdd}>+ Add Staff</button>
        </div>

        {/* Staff Statistics */}
        <div className="owner-kpi-grid owner-kpi-grid--5">
          <div className="owner-kpi-card">
            <div className="owner-kpi-card__label">Total Employees</div>
            <div className="owner-kpi-card__value">{totalStaff}</div>
          </div>
          <div className="owner-kpi-card">
            <div className="owner-kpi-card__label">Active Staff</div>
            <div className="owner-kpi-card__value">{activeStaff}</div>
          </div>
          <div className="owner-kpi-card">
            <div className="owner-kpi-card__label">Waiters</div>
            <div className="owner-kpi-card__value">{waiters}</div>
          </div>
          <div className="owner-kpi-card">
            <div className="owner-kpi-card__label">POS/Cashier</div>
            <div className="owner-kpi-card__value">{pos}</div>
          </div>
          <div className="owner-kpi-card">
            <div className="owner-kpi-card__label">Kitchen Crew</div>
            <div className="owner-kpi-card__value">{kitchen}</div>
          </div>
        </div>

        {/* Staff Table */}
        <div className="owner-section-card">
          <div className="owner-table-wrap">
            <table className="owner-table">
              <thead>
                <tr>
                  <th>Staff Member</th>
                  <th>Employee ID</th>
                  <th>Role</th>
                  <th>Contact</th>
                  <th>Status</th>
                  <th>Joined Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {staff.map(member => (
                  <tr key={member.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          backgroundColor: 'var(--color-cream)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: '600',
                          color: 'var(--color-espresso)'
                        }}>
                          {member.name.charAt(0)}
                        </div>
                        <span className="td-name">{member.name}</span>
                      </div>
                    </td>
                    <td className="td-mono">{member.id}</td>
                    <td>{member.role}</td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span>{member.email}</span>
                        <span className="td-muted">{member.phone}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`owner-badge ${member.status === 'active' ? 'owner-badge--active' : 'owner-badge--inactive'}`}>
                        {member.status.toUpperCase()}
                      </span>
                    </td>
                    <td>{member.joinedDate}</td>
                    <td>
                      <div className="td-actions">
                        <button
                          className="owner-icon-btn"
                          title="View Performance"
                          onClick={() => {
                            setSelectedMember(member);
                            setShowDetailModal(true);
                          }}
                        >
                          👁️
                        </button>
                        <button className="owner-icon-btn" title="Edit Credentials" onClick={() => handleOpenEdit(member)}>
                          ✏️
                        </button>
                        <button
                          className="owner-icon-btn"
                          style={{ color: member.status === 'active' ? 'var(--color-red)' : 'var(--color-green)' }}
                          title={member.status === 'active' ? 'Deactivate' : 'Activate'}
                          onClick={() => toggleStatus(member.id, member.status)}
                        >
                          ⚡
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add/Edit Staff Modal */}
        {showModal && (
          <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(44, 24, 16, 0.4)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div style={{
              background: '#fff',
              padding: '24px',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '500px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
            }}>
              <h2 style={{ fontFamily: 'var(--font-serif)', color: 'var(--color-espresso)', marginBottom: '16px' }}>
                {editId ? 'Edit Staff Credentials' : 'Add New Staff Member'}
              </h2>
              <form onSubmit={handleSave}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Full Name</label>
                    <input
                      type="text"
                      className="form-input"
                      required
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Email Address</label>
                    <input
                      type="email"
                      className="form-input"
                      required
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Phone Number</label>
                    <input
                      type="text"
                      className="form-input"
                      required
                      value={formData.phone}
                      onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">System Role</label>
                    <select
                      className="form-select"
                      value={formData.role}
                      onChange={e => setFormData({ ...formData, role: e.target.value })}
                    >
                      <option value="Waiter">Waiter</option>
                      <option value="POS">POS / Cashier</option>
                      <option value="Kitchen Staff">Kitchen Staff</option>
                      <option value="Other Staff">Other Staff</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Temporary Password</label>
                    <input
                      type="password"
                      className="form-input"
                      placeholder={editId ? '(Leave blank to keep same)' : 'Enter initial password'}
                      required={!editId}
                      value={formData.password}
                      onChange={e => setFormData({ ...formData, password: e.target.value })}
                    />
                  </div>
                </div>

                <div className="owner-modal-footer">
                  <button type="button" className="btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn-primary">Save Changes</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Staff details drawer / modal */}
        {showDetailModal && selectedMember && (
          <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(44, 24, 16, 0.4)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div style={{
              background: '#fff',
              padding: '24px',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '450px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <h3 style={{ fontFamily: 'var(--font-serif)', color: 'var(--color-espresso)', fontSize: '20px' }}>Staff Performance Card</h3>
                <button
                  style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--color-text-muted)' }}
                  onClick={() => setShowDetailModal(false)}
                >
                  &times;
                </button>
              </div>

              <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid var(--color-border-light)', paddingBottom: '12px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'var(--color-cream)', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 'bold' }}>
                    {selectedMember.name.charAt(0)}
                  </div>
                  <div>
                    <h4 style={{ margin: 0, color: 'var(--color-espresso)' }}>{selectedMember.name}</h4>
                    <span className="td-muted">{selectedMember.role} • {selectedMember.id}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="td-muted">Email:</span>
                    <span>{selectedMember.email}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="td-muted">Phone:</span>
                    <span>{selectedMember.phone}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="td-muted">Joined Date:</span>
                    <span>{selectedMember.joinedDate}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="td-muted">Status:</span>
                    <span className={`owner-badge ${selectedMember.status === 'active' ? 'owner-badge--active' : 'owner-badge--inactive'}`}>
                      {selectedMember.status.toUpperCase()}
                    </span>
                  </div>
                </div>

                <div style={{ marginTop: '8px', padding: '12px', background: 'var(--color-bg-alt)', borderRadius: '8px', border: '1px solid var(--color-border-light)' }}>
                  <h5 style={{ fontFamily: 'var(--font-serif)', color: 'var(--color-espresso)', marginBottom: '8px' }}>Performance Analytics</h5>
                  {selectedMember.role === 'Waiter' ? (
                    <div style={{ display: 'flex', justifyContent: 'space-around' }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--color-espresso)' }}>{selectedMember.ordersHandled || 0}</div>
                        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Orders Handled</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--color-espresso)' }}>{selectedMember.tablesServed || 0}</div>
                        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Tables Served</div>
                      </div>
                    </div>
                  ) : selectedMember.role === 'POS' ? (
                    <div style={{ display: 'flex', justifyContent: 'space-around' }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--color-espresso)' }}>{selectedMember.billsProcessed || 0}</div>
                        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Bills Printed</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--color-espresso)' }}>₹{(selectedMember.transactionsTotal || 0).toLocaleString('en-IN')}</div>
                        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Total Value</div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', fontSize: '12px', color: 'var(--color-text-muted)' }}>
                      Assigned to kitchen operations. Monitor through Kitchen Monitor flow.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </BranchManagerLayout>
  );
}
