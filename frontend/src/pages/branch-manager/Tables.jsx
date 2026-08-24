import { useState, useEffect } from 'react';
import BranchManagerLayout from '../../layouts/BranchManagerLayout';
import { branchManagerService } from '../../services/branchManagerService';
import '../../pages/owner/owner.css';

export default function Tables() {
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [formData, setFormData] = useState({
    number: '',
    capacity: 4,
    section: 'Main Hall',
    status: 'available',
    active: true
  });
  const [editId, setEditId] = useState(null);

  const [loading, setLoading] = useState(true);

  const loadTables = async () => {
    try {
      const data = await branchManagerService.getTables();
      setTables(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTables();
  }, []);

  if (loading) {
    return (
      <BranchManagerLayout>
        <div className="owner-page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', color: 'var(--color-espresso)' }}>
          <h3>Loading tables...</h3>
        </div>
      </BranchManagerLayout>
    );
  }

  const totalTables = tables.length;
  const available = tables.filter(t => String(t.status ?? "").toLowerCase() === 'available').length;
  const occupied = tables.filter(t => String(t.status ?? "").toLowerCase() === 'occupied').length;
  const orderInProgress = tables.filter(t => String(t.status ?? "").toLowerCase() === 'order_in_progress').length;
  const billRequested = tables.filter(t => String(t.status ?? "").toLowerCase() === 'bill_requested').length;

  const handleOpenAdd = () => {
    setEditId(null);
    setFormData({
      number: '',
      capacity: 4,
      section: 'Main Hall',
      status: 'available',
      active: true
    });
    setShowModal(true);
  };

  const handleOpenEdit = (table) => {
    setEditId(table.id);
    setFormData({
      number: table.number,
      capacity: table.capacity,
      section: table.section || 'Main Hall',
      status: table.status,
      active: table.qrStatus === 'active'
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editId) {
        await branchManagerService.updateTable(editId, {
          number: formData.number,
          capacity: Number(formData.capacity),
          section: formData.section,
          active: formData.active
        });
      } else {
        await branchManagerService.addTable({
          number: formData.number,
          capacity: Number(formData.capacity),
          section: formData.section,
          active: formData.active
        });
      }
      await loadTables();
      setShowModal(false);
    } catch (err) {
      alert(err.message || 'Failed to save table');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'available':         return 'var(--color-green)';
      case 'occupied':          return 'var(--color-espresso)';
      case 'order_in_progress': return 'var(--color-brown-light)';
      case 'bill_requested':    return 'var(--color-orange)';
      default:                  return 'var(--color-text-muted)';
    }
  };

  const getStatusBg = (status) => {
    switch (status) {
      case 'available':         return 'rgba(74,124,89,0.06)';
      case 'occupied':          return 'rgba(44,24,16,0.04)';
      case 'order_in_progress': return 'rgba(139,94,60,0.06)';
      case 'bill_requested':    return 'rgba(212,96,26,0.06)';
      default:                  return 'rgba(0,0,0,0.02)';
    }
  };

  return (
    <BranchManagerLayout>
      <div className="owner-page">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 className="owner-page-header__title">Table Management</h1>
            <p className="owner-page-header__sub">Visual floor plan and table states for the restaurant area.</p>
          </div>
          <button className="btn-primary" onClick={handleOpenAdd}>+ Add Table</button>
        </div>

        {/* Summary Card Metrics */}
        <div className="owner-kpi-grid owner-kpi-grid--5">
          <div className="owner-kpi-card">
            <div className="owner-kpi-card__label">Total Tables</div>
            <div className="owner-kpi-card__value">{totalTables}</div>
          </div>
          <div className="owner-kpi-card">
            <div className="owner-kpi-card__label">Available</div>
            <div className="owner-kpi-card__value" style={{ color: 'var(--color-green)' }}>{available}</div>
          </div>
          <div className="owner-kpi-card">
            <div className="owner-kpi-card__label">Occupied</div>
            <div className="owner-kpi-card__value" style={{ color: 'var(--color-espresso)' }}>{occupied}</div>
          </div>
          <div className="owner-kpi-card">
            <div className="owner-kpi-card__label">In Progress</div>
            <div className="owner-kpi-card__value" style={{ color: 'var(--color-brown-light)' }}>{orderInProgress}</div>
          </div>
          <div className="owner-kpi-card">
            <div className="owner-kpi-card__label">Bill Requested</div>
            <div className="owner-kpi-card__value" style={{ color: 'var(--color-orange)' }}>{billRequested}</div>
          </div>
        </div>

        {/* Visual Table Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
          {tables.map(table => (
            <div
              key={table.id}
              onClick={() => {
                setSelectedTable(table);
                setShowDetailModal(true);
              }}
              style={{
                background: getStatusBg(table.status),
                border: `1.5px solid ${getStatusColor(table.status)}`,
                borderRadius: '12px',
                padding: '20px',
                cursor: 'pointer',
                transition: 'transform var(--transition), box-shadow var(--transition)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}
              className="table-card-hover"
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--color-espresso)', fontFamily: 'var(--font-serif)' }}>
                  {table.number}
                </span>
                <span className="owner-badge" style={{
                  backgroundColor: getStatusColor(table.status),
                  color: '#fff',
                  fontSize: '9px'
                }}>
                  {table.status.replace(/_/g, ' ').toUpperCase()}
                </span>
              </div>

              <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                <div>Seating: {table.capacity} Pax</div>
                <div>Area: {table.section || 'Main Hall'}</div>
                {table.currentOrderId && <div style={{ fontWeight: '600', marginTop: '4px' }}>Order: #{table.currentOrderId}</div>}
              </div>

              <div style={{
                marginTop: 'auto',
                paddingTop: '8px',
                borderTop: '1px solid rgba(0,0,0,0.05)',
                fontSize: '11px',
                color: 'var(--color-text-muted)',
                display: 'flex',
                justifyContent: 'space-between'
              }}>
                <span>Waiter: {table.assignedWaiter || 'None'}</span>
                <span>QR: {table.qrStatus.toUpperCase()}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Add/Edit Table Modal */}
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
              maxWidth: '450px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
            }}>
              <h2 style={{ fontFamily: 'var(--font-serif)', color: 'var(--color-espresso)', marginBottom: '16px' }}>
                {editId ? 'Modify Table Details' : 'Add Dining Table'}
              </h2>
              <form onSubmit={handleSave}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Table Number / Name</label>
                    <input
                      type="text"
                      className="form-input"
                      required
                      placeholder="e.g. T-06"
                      value={formData.number}
                      onChange={e => setFormData({ ...formData, number: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Seating Capacity</label>
                    <input
                      type="number"
                      className="form-input"
                      required
                      min={1}
                      value={formData.capacity}
                      onChange={e => setFormData({ ...formData, capacity: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Section / Area</label>
                    <select
                      className="form-select"
                      value={formData.section}
                      onChange={e => setFormData({ ...formData, section: e.target.value })}
                    >
                      <option value="Main Hall">Main Hall</option>
                      <option value="Balcony">Balcony</option>
                      <option value="Private Room">Private Room</option>
                      <option value="Garden area">Garden Area</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                    <input
                      type="checkbox"
                      id="qr_active"
                      checked={formData.active}
                      onChange={e => setFormData({ ...formData, active: e.target.checked })}
                    />
                    <label htmlFor="qr_active" style={{ fontSize: '13px', cursor: 'pointer' }}>Generate Active Digital QR Code</label>
                  </div>
                </div>

                <div className="owner-modal-footer">
                  <button type="button" className="btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn-primary">Save Table</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Table Details Modal */}
        {showDetailModal && selectedTable && (
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
                <h3 style={{ fontFamily: 'var(--font-serif)', color: 'var(--color-espresso)', fontSize: '20px' }}>
                  Table {selectedTable.number} Details
                </h3>
                <button
                  style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--color-text-muted)' }}
                  onClick={() => setShowDetailModal(false)}
                >
                  &times;
                </button>
              </div>

              <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border-light)', paddingBottom: '12px' }}>
                  <div>
                    <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>Status</div>
                    <div style={{ fontWeight: 'bold', color: getStatusColor(selectedTable.status) }}>
                      {selectedTable.status.replace(/_/g, ' ').toUpperCase()}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>Section</div>
                    <div style={{ fontWeight: '600' }}>{selectedTable.section || 'Main Hall'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>Seating</div>
                    <div style={{ fontWeight: '600' }}>{selectedTable.capacity} Persons</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                  {/* Mock QR image container */}
                  <div style={{
                    width: '100px',
                    height: '100px',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px',
                    padding: '8px',
                    background: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {/* Simplified mock QR SVG */}
                    <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="2" y="2" width="6" height="6" />
                      <rect x="16" y="2" width="6" height="6" />
                      <rect x="2" y="16" width="6" height="6" />
                      <path d="M10 2h4M10 6h4M16 10h6M10 10v4M14 14h8M10 18h4M18 18v4M14 22h8" />
                    </svg>
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--color-espresso)' }}>Digital Menu QR Code</div>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Guests can scan this QR code to view the menu, place orders, and request waiter service.</div>
                    <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                      <button className="btn-outline" style={{ padding: '4px 8px', fontSize: '10px' }} onClick={() => alert('Downloading QR PDF...')}>Download</button>
                      <button className="btn-outline" style={{ padding: '4px 8px', fontSize: '10px' }} onClick={() => alert('Printing QR sticker...')}>Print</button>
                      <button className="btn-outline" style={{ padding: '4px 8px', fontSize: '10px' }} onClick={() => alert('Regenerated table token.')}>Regenerate</button>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', background: 'var(--color-bg-alt)', padding: '12px', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="td-muted">Assigned Waiter:</span>
                    <span>{selectedTable.assignedWaiter || ' Rahul K. S.'}</span>
                  </div>
                  {selectedTable.currentOrderId && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span className="td-muted">Active Bill Amount:</span>
                      <span style={{ fontWeight: 'bold', color: 'var(--color-espresso)' }}>₹720.00</span>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', borderTop: '1px solid var(--color-border-light)', paddingTop: '16px' }}>
                  <button
                    className="btn-danger"
                    onClick={async () => {
                      if (confirm(`Remove table ${selectedTable.number}?`)) {
                        try {
                          await branchManagerService.deleteTable(selectedTable.id);
                          await loadTables();
                          setShowDetailModal(false);
                        } catch (err) {
                          alert(err.message || 'Failed to delete table');
                        }
                      }
                    }}
                  >
                    Delete Table
                  </button>
                  <button className="btn-outline" onClick={() => {
                    setShowDetailModal(false);
                    handleOpenEdit(selectedTable);
                  }}>
                    Edit Details
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </BranchManagerLayout>
  );
}
