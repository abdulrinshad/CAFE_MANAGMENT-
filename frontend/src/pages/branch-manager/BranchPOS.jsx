import { useState, useEffect, useCallback } from 'react';
import BranchManagerLayout from '../../layouts/BranchManagerLayout';
import { branchManagerService } from '../../services/branchManagerService';
import Modal from '../../components/Modal';
import '../../pages/owner/owner.css';

export default function BranchPOS() {
  const [terminals, setTerminals] = useState([]);
  const [cashiers, setCashiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [selectedTerminal, setSelectedTerminal] = useState(null);
  
  const [form, setForm] = useState({
    name: '',
    status: 'active',
    cashierId: ''
  });

  const loadData = useCallback(async () => {
    try {
      const posData = await branchManagerService.getPOSTerminals();
      setTerminals(Array.isArray(posData) ? posData : (posData.results ?? []));

      const staffData = await branchManagerService.getStaff();
      const staffList = Array.isArray(staffData) ? staffData : (staffData.results ?? []);
      // Filter active cashiers belonging to this branch
      const activeCashiers = staffList.filter(s => s.role === 'Cashier' && String(s.status ?? '').toLowerCase() === 'active');
      setCashiers(activeCashiers);
    } catch (err) {
      console.error("Failed to load POS terminals data", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openManage = (t) => {
    setSelectedTerminal(t);
    setForm({
      name: t.name || t.terminal,
      status: t.status,
      cashierId: t.assigned_cashier || ''
    });
    setModal(true);
  };

  const closeModal = () => {
    setModal(false);
    setSelectedTerminal(null);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!selectedTerminal) return;
    try {
      // Update terminal name and status
      await branchManagerService.updatePOSTerminal(selectedTerminal.id, {
        name: form.name,
        status: form.status,
        assignedCashierId: form.cashierId || null
      });
      await loadData();
      closeModal();
    } catch (err) {
      alert(err.message || 'Failed to update terminal settings.');
    }
  };

  const toggleStatus = async (id, currentStatus) => {
    const nextStatus = currentStatus === 'active' ? 'inactive' : 'active';
    try {
      await branchManagerService.updatePOSTerminalStatus(id, nextStatus);
      await loadData();
    } catch (err) {
      alert(err.message || 'Failed to toggle terminal status.');
    }
  };

  const f = (key) => (e) => setForm(prev => ({ ...prev, [key]: e.target.value }));

  // Metrics
  const totalTerminals = terminals.length;
  const activeCount = terminals.filter(t => t.status === 'active').length;
  const inactiveCount = terminals.filter(t => t.status === 'inactive').length;
  const maintenanceCount = terminals.filter(t => t.status === 'maintenance').length;

  if (loading) {
    return (
      <BranchManagerLayout pageTitle="POS Terminals" pageIcon="🖥️">
        <div className="owner-page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', color: 'var(--color-espresso)' }}>
          <h3>Loading POS terminals...</h3>
        </div>
      </BranchManagerLayout>
    );
  }

  return (
    <BranchManagerLayout pageTitle="POS Terminals" pageIcon="🖥️">
      <div className="owner-page">
        {/* Header */}
        <div className="owner-page-header">
          <div className="owner-page-header__left">
            <h1 className="owner-page-header__title">POS Terminals</h1>
            <p className="owner-page-header__sub">Manage POS terminals assigned to your branch.</p>
          </div>
        </div>

        {/* KPIs */}
        <div className="owner-kpi-grid">
          <div className="owner-kpi-card">
            <div className="owner-kpi-card__label">Total Terminals</div>
            <div className="owner-kpi-card__value">{totalTerminals}</div>
          </div>
          <div className="owner-kpi-card">
            <div className="owner-kpi-card__label">Active</div>
            <div className="owner-kpi-card__value" style={{ color: 'var(--color-green)' }}>{activeCount}</div>
          </div>
          <div className="owner-kpi-card">
            <div className="owner-kpi-card__label">Offline / Maintenance</div>
            <div className="owner-kpi-card__value" style={{ color: 'var(--color-orange)' }}>{inactiveCount + maintenanceCount}</div>
          </div>
        </div>

        {/* Table */}
        <div className="owner-section-card">
          <div className="owner-table-wrap">
            <table className="owner-table">
              <thead>
                <tr>
                  <th>Terminal ID</th>
                  <th>Assigned Cashier</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {terminals.map(t => (
                  <tr key={t.id}>
                    <td className="td-name td-mono">{t.name || t.terminal}</td>
                    <td className="td-muted">{t.assignedUser || 'Not Assigned'}</td>
                    <td>
                      <span className={`owner-badge owner-badge--${t.status}`}>{t.status.toUpperCase()}</span>
                    </td>
                    <td>
                      <div className="td-actions">
                        <button className="btn-outline" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={() => openManage(t)}>Manage</button>
                        <button
                          className={`owner-icon-btn${t.status === 'active' ? ' owner-icon-btn--danger' : ' owner-icon-btn--primary'}`}
                          title={t.status === 'active' ? 'Deactivate' : 'Activate'}
                          onClick={() => toggleStatus(t.id, t.status)}
                          style={{ marginLeft: '10px' }}
                        >
                          {t.status === 'active' ? '⏸' : '▶'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {terminals.length === 0 && (
                  <tr>
                    <td colSpan={4}>
                      <div className="owner-empty">No POS terminals registered for your branch.</div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Manage Modal */}
        <Modal open={modal} onClose={closeModal} title="Manage POS Terminal">
          <form onSubmit={handleSave}>
            <div className="owner-form-grid">
              <div className="form-group owner-form-grid--full">
                <label className="form-label">Terminal Name / ID <span>*</span></label>
                <input className="form-input" value={form.name} onChange={f('name')} required />
              </div>
              <div className="form-group owner-form-grid--full">
                <label className="form-label">Assign Cashier</label>
                <select className="form-select" value={form.cashierId} onChange={f('cashierId')}>
                  <option value="">Not Assigned</option>
                  {cashiers.map(c => {
                    const dbId = c.id.includes('_') ? c.id.split('_')[1] : c.id;
                    return (
                      <option key={c.id} value={dbId}>{c.name}</option>
                    );
                  })}
                </select>
              </div>
              <div className="form-group owner-form-grid--full">
                <label className="form-label">Status</label>
                <select className="form-select" value={form.status} onChange={f('status')}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </div>
            </div>
            <div className="owner-modal-footer" style={{ marginTop: '20px' }}>
              <button type="button" className="btn-outline" onClick={closeModal}>Cancel</button>
              <button type="submit" className="btn-primary">Save Changes</button>
            </div>
          </form>
        </Modal>
      </div>
    </BranchManagerLayout>
  );
}
