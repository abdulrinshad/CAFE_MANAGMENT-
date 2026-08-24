import { useState, useEffect } from 'react';
import BranchManagerLayout from '../../layouts/BranchManagerLayout';
import { branchManagerService } from '../../services/branchManagerService';
import '../../pages/owner/owner.css';

export default function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    category: 'Supplies',
    description: '',
    amount: '',
    paymentMethod: 'Cash',
    reference: '',
    notes: ''
  });

  const [loading, setLoading] = useState(true);

  const loadExpenses = async () => {
    try {
      const data = await branchManagerService.getExpenses();
      setExpenses(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExpenses();
  }, []);

  const handleOpenAdd = () => {
    setFormData({
      category: 'Supplies',
      description: '',
      amount: '',
      paymentMethod: 'Cash',
      reference: '',
      notes: ''
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      await branchManagerService.addExpense({
        ...formData,
        amount: Number(formData.amount),
        title: formData.description
      });
      await loadExpenses();
      setShowModal(false);
    } catch (err) {
      alert(err.message || 'Failed to add expense');
    }
  };

  if (loading) {
    return (
      <BranchManagerLayout>
        <div className="owner-page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', color: 'var(--color-espresso)' }}>
          <h3>Loading expenses...</h3>
        </div>
      </BranchManagerLayout>
    );
  }

  // Metrics
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const approvedExpenses = expenses.filter(e => e.status === 'Approved').reduce((sum, e) => sum + e.amount, 0);
  const pendingExpenses = expenses.filter(e => e.status === 'Pending').reduce((sum, e) => sum + e.amount, 0);
  const thisMonthExpenses = expenses.reduce((sum, e) => sum + e.amount, 0); // simple mockup count

  const getStatusBadgeClass = (status) => {
    if (status === 'Approved') return 'owner-badge--paid';
    return 'owner-badge--pending';
  };

  return (
    <BranchManagerLayout>
      <div className="owner-page">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 className="owner-page-header__title">Expense Management</h1>
            <p className="owner-page-header__sub">Record and review payouts, supplier invoices, and staff allowances.</p>
          </div>
          <button className="btn-primary" onClick={handleOpenAdd}>+ Record Expense</button>
        </div>

        {/* Metrics Grid */}
        <div className="owner-kpi-grid">
          <div className="owner-kpi-card">
            <div className="owner-kpi-card__label">Today's Payouts</div>
            <div className="owner-kpi-card__value">₹2,000</div>
            <div className="owner-kpi-card__sub">Pending approval</div>
          </div>
          <div className="owner-kpi-card">
            <div className="owner-kpi-card__label">This Month</div>
            <div className="owner-kpi-card__value">₹{thisMonthExpenses.toLocaleString('en-IN')}</div>
            <div className="owner-kpi-card__sub">August totals</div>
          </div>
          <div className="owner-kpi-card">
            <div className="owner-kpi-card__label">Approved Expenses</div>
            <div className="owner-kpi-card__value" style={{ color: 'var(--color-green)' }}>₹{approvedExpenses.toLocaleString('en-IN')}</div>
          </div>
          <div className="owner-kpi-card">
            <div className="owner-kpi-card__label">Total Recorded</div>
            <div className="owner-kpi-card__value">₹{totalExpenses.toLocaleString('en-IN')}</div>
          </div>
        </div>

        {/* Expenses List */}
        <div className="owner-section-card">
          <div className="owner-table-wrap">
            <table className="owner-table">
              <thead>
                <tr>
                  <th>Expense ID</th>
                  <th>Category</th>
                  <th>Description</th>
                  <th>Amount</th>
                  <th>Date</th>
                  <th>Reference ID</th>
                  <th>Logged By</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map(exp => (
                  <tr key={exp.id}>
                    <td className="td-name td-mono">{exp.id}</td>
                    <td>
                      <span className="owner-badge owner-badge--takeaway" style={{ fontSize: '10px' }}>
                        {exp.category}
                      </span>
                    </td>
                    <td>{exp.description}</td>
                    <td style={{ fontWeight: 'bold' }}>₹{exp.amount.toLocaleString('en-IN')}</td>
                    <td>{exp.date}</td>
                    <td className="td-mono">{exp.reference}</td>
                    <td>{exp.addedBy}</td>
                    <td>
                      <span className={`owner-badge ${getStatusBadgeClass(exp.status)}`}>
                        {exp.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Record Expense Modal */}
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
                Record Payout / Expense
              </h2>
              <form onSubmit={handleSave}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div className="owner-form-grid" style={{ marginTop: 0 }}>
                    <div className="form-group">
                      <label className="form-label">Category</label>
                      <select
                        className="form-select"
                        value={formData.category}
                        onChange={e => setFormData({ ...formData, category: e.target.value })}
                      >
                        <option value="Supplies">Supplies & Ingredients</option>
                        <option value="Utilities">Utilities (Power, Water)</option>
                        <option value="Rent">Branch Rent</option>
                        <option value="Staff">Staff Allowances</option>
                        <option value="Maintenance">Maintenance & Repairs</option>
                        <option value="Other">Other Payouts</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Payment Amount (₹)</label>
                      <input
                        type="number"
                        className="form-input"
                        required
                        min={1}
                        value={formData.amount}
                        onChange={e => setFormData({ ...formData, amount: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Expense Description</label>
                    <input
                      type="text"
                      className="form-input"
                      required
                      placeholder="e.g. Bought 20L Cooking oil"
                      value={formData.description}
                      onChange={e => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>

                  <div className="owner-form-grid" style={{ marginTop: 0 }}>
                    <div className="form-group">
                      <label className="form-label">Payment Method</label>
                      <select
                        className="form-select"
                        value={formData.paymentMethod}
                        onChange={e => setFormData({ ...formData, paymentMethod: e.target.value })}
                      >
                        <option value="Cash">Cash Drawer</option>
                        <option value="UPI">UPI/QR Code</option>
                        <option value="Card">Corporate Debit Card</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Bill Reference Number</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Invoice receipt ID"
                        value={formData.reference}
                        onChange={e => setFormData({ ...formData, reference: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Receipt placeholder */}
                  <div className="form-group">
                    <label className="form-label">Invoice Attachment / Receipt</label>
                    <div style={{
                      border: '2px dashed var(--color-border)',
                      borderRadius: '8px',
                      padding: '16px',
                      textAlign: 'center',
                      fontSize: '12px',
                      color: 'var(--color-text-muted)',
                      cursor: 'pointer'
                    }} onClick={() => alert('Mock image upload triggered.')}>
                      📸 Click to upload image or drop receipt PDF here
                    </div>
                  </div>
                </div>

                <div className="owner-modal-footer">
                  <button type="button" className="btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn-primary">Record Payout</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </BranchManagerLayout>
  );
}
