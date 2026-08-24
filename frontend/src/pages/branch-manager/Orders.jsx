import { useState, useEffect } from 'react';
import BranchManagerLayout from '../../layouts/BranchManagerLayout';
import { branchManagerService } from '../../services/branchManagerService';
import '../../pages/owner/owner.css';

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDrawer, setShowDrawer] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [channelFilter, setChannelFilter] = useState('ALL');

  const [loading, setLoading] = useState(true);

  const loadOrders = async () => {
    try {
      const data = await branchManagerService.getOrders();
      setOrders(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const handleUpdateStatus = async (id, nextStatus) => {
    try {
      await branchManagerService.updateOrderStatus(id, nextStatus);
      await loadOrders();
      if (selectedOrder && selectedOrder.id === id) {
        setSelectedOrder(prev => ({ ...prev, status: nextStatus }));
      }
    } catch (err) {
      alert(err.message || 'Failed to update order status');
    }
  };

  if (loading) {
    return (
      <BranchManagerLayout>
        <div className="owner-page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', color: 'var(--color-espresso)' }}>
          <h3>Loading orders...</h3>
        </div>
      </BranchManagerLayout>
    );
  }

  const totalCount = orders.length;
  const newCount = orders.filter(o => o.status === 'NEW' || o.status === 'PENDING').length;
  const preparingCount = orders.filter(o => o.status === 'PREPARING').length;
  const readyCount = orders.filter(o => o.status === 'READY').length;
  const servedCount = orders.filter(o => o.status === 'SERVED').length;
  const completedCount = orders.filter(o => o.status === 'COMPLETED').length;

  // Filter logic
  const filteredOrders = orders.filter(o => {
    const searchValue = search.toLowerCase();
    const matchesSearch = String(o.id ?? o.order_number ?? "").toLowerCase().includes(searchValue) || 
                          String(o.order_number ?? "").toLowerCase().includes(searchValue) ||
                          String(o.table ?? "").toLowerCase().includes(searchValue) ||
                          String(o.waiter ?? "").toLowerCase().includes(searchValue);
    const matchesStatus = statusFilter === 'ALL' || String(o.status ?? "").toUpperCase() === statusFilter.toUpperCase();
    const matchesChannel = channelFilter === 'ALL' || String(o.channel ?? "").toLowerCase() === channelFilter.toLowerCase();
    return matchesSearch && matchesStatus && matchesChannel;
  });

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'NEW':       return 'owner-badge--new';
      case 'PREPARING': return 'owner-badge--preparing';
      case 'READY':     return 'owner-badge--ready';
      case 'SERVED':    return 'owner-badge--served';
      case 'COMPLETED': return 'owner-badge--completed';
      case 'CANCELLED': return 'owner-badge--cancelled';
      default:          return 'owner-badge--idle';
    }
  };

  return (
    <BranchManagerLayout>
      <div className="owner-page">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 className="owner-page-header__title">Order Management</h1>
            <p className="owner-page-header__sub">Track and control all live and completed branch orders.</p>
          </div>
        </div>

        {/* Order Summary Cards */}
        <div className="owner-kpi-grid owner-kpi-grid--5">
          <div className="owner-kpi-card" style={{ cursor: 'pointer' }} onClick={() => setStatusFilter('ALL')}>
            <div className="owner-kpi-card__label">Total Tickets</div>
            <div className="owner-kpi-card__value">{totalCount}</div>
          </div>
          <div className="owner-kpi-card" style={{ cursor: 'pointer' }} onClick={() => setStatusFilter('NEW')}>
            <div className="owner-kpi-card__label">New</div>
            <div className="owner-kpi-card__value" style={{ color: 'var(--color-tan-dark)' }}>{newCount}</div>
          </div>
          <div className="owner-kpi-card" style={{ cursor: 'pointer' }} onClick={() => setStatusFilter('PREPARING')}>
            <div className="owner-kpi-card__label">Preparing</div>
            <div className="owner-kpi-card__value" style={{ color: 'var(--color-brown-light)' }}>{preparingCount}</div>
          </div>
          <div className="owner-kpi-card" style={{ cursor: 'pointer' }} onClick={() => setStatusFilter('READY')}>
            <div className="owner-kpi-card__label">Ready</div>
            <div className="owner-kpi-card__value" style={{ color: 'var(--color-green)' }}>{readyCount}</div>
          </div>
          <div className="owner-kpi-card" style={{ cursor: 'pointer' }} onClick={() => setStatusFilter('COMPLETED')}>
            <div className="owner-kpi-card__label">Completed</div>
            <div className="owner-kpi-card__value" style={{ color: 'var(--color-green)' }}>{completedCount}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="owner-filter-bar">
          <input
            type="text"
            className="form-input"
            placeholder="Search order ID, waiter, table..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select className="form-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="ALL">All Statuses</option>
            <option value="NEW">New</option>
            <option value="PREPARING">Preparing</option>
            <option value="READY">Ready</option>
            <option value="SERVED">Served</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
          <select className="form-select" value={channelFilter} onChange={e => setChannelFilter(e.target.value)}>
            <option value="ALL">All Channels</option>
            <option value="Dine-In">Dine-In</option>
            <option value="Takeaway">Takeaway</option>
            <option value="Swiggy">Swiggy</option>
            <option value="Zomato">Zomato</option>
          </select>
        </div>

        {/* Orders Table */}
        <div className="owner-section-card">
          <div className="owner-table-wrap">
            <table className="owner-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Channel</th>
                  <th>Table / Customer</th>
                  <th>Assigned Waiter</th>
                  <th>Amount</th>
                  <th>Payment</th>
                  <th>Order Status</th>
                  <th>Created</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map(order => (
                  <tr key={order.id}>
                    <td className="td-name td-mono">{order.id}</td>
                    <td>
                      <span className={`owner-badge owner-badge--${String(order.channel ?? "").toLowerCase()}`}>
                        {order.channel}
                      </span>
                    </td>
                    <td>{order.table}</td>
                    <td>{order.waiter}</td>
                    <td style={{ fontWeight: '600' }}>₹{order.amount.toFixed(2)}</td>
                    <td>
                      <span className={`owner-badge ${order.paymentStatus === 'paid' ? 'owner-badge--paid' : 'owner-badge--pending'}`}>
                        {order.paymentStatus.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <span className={`owner-badge ${getStatusBadgeClass(order.status)}`}>
                        {order.status}
                      </span>
                    </td>
                    <td>{order.createdTime || order.time}</td>
                    <td>
                      <button className="btn-outline" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={() => {
                        setSelectedOrder(order);
                        setShowDrawer(true);
                      }}>
                        Manage
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredOrders.length === 0 && (
                  <tr>
                    <td colSpan={9}>
                      <div className="owner-empty">No orders found matching the filter.</div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Order Details Drawer Overlay */}
        {showDrawer && selectedOrder && (
          <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(44, 24, 16, 0.4)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            justifyContent: 'flex-end',
            zIndex: 1000
          }} onClick={() => setShowDrawer(false)}>
            <div style={{
              background: '#fff',
              height: '100%',
              width: '100%',
              maxWidth: '480px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '-4px 0 20px rgba(0,0,0,0.1)'
            }} onClick={e => e.stopPropagation()}>
              
              {/* Drawer Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border-light)', paddingBottom: '16px' }}>
                <div>
                  <h3 style={{ fontFamily: 'var(--font-serif)', color: 'var(--color-espresso)', fontSize: '22px' }}>Order Details</h3>
                  <span className="td-mono td-muted">{selectedOrder.id} • {selectedOrder.channel}</span>
                </div>
                <button
                  style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: 'var(--color-text-muted)' }}
                  onClick={() => setShowDrawer(false)}
                >
                  &times;
                </button>
              </div>

              {/* Drawer Scrollable Content */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px 0', display: 'flex', flexDirection: 'column', gap: '18px' }}>
                {/* Meta details */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px' }}>
                  <div>
                    <div style={{ color: 'var(--color-text-muted)' }}>Dining Table / Reference</div>
                    <div style={{ fontWeight: '600' }}>{selectedOrder.table}</div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--color-text-muted)' }}>Assigned Waiter</div>
                    <div style={{ fontWeight: '600' }}>{selectedOrder.waiter}</div>
                  </div>
                </div>

                {/* Status timelines */}
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--color-espresso)', marginBottom: '8px' }}>Workflow Progress</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--color-bg-alt)', padding: '12px', borderRadius: '8px' }}>
                    {['NEW', 'PREPARING', 'READY', 'SERVED', 'COMPLETED'].map((s, idx, arr) => {
                      const isActive = selectedOrder.status === s;
                      return (
                        <div key={s} style={{ display: 'flex', alignItems: 'center' }}>
                          <span style={{
                            fontSize: '10px',
                            fontWeight: isActive ? 'bold' : '500',
                            color: isActive ? 'var(--color-espresso)' : 'var(--color-text-light)',
                            padding: '4px 6px',
                            background: isActive ? 'var(--color-peach-active)' : 'transparent',
                            borderRadius: '4px'
                          }}>
                            {s}
                          </span>
                          {idx < arr.length - 1 && <span style={{ color: 'var(--color-text-light)', margin: '0 4px' }}>➔</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Items List */}
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--color-espresso)', marginBottom: '8px' }}>Ordered Items</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {selectedOrder.items.map((it, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', borderBottom: '1px dashed var(--color-border-light)', paddingBottom: '6px' }}>
                        <div>
                          <span style={{ fontWeight: 'bold', marginRight: '6px' }}>{it.quantity}x</span>
                          <span>{it.product}</span>
                        </div>
                        <span style={{ fontWeight: '500' }}>₹{it.total.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Financial Summary */}
                <div style={{ background: 'var(--color-bg-alt)', padding: '14px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="td-muted">Subtotal:</span>
                    <span>₹{(selectedOrder.financials?.subtotal || selectedOrder.amount * 0.85).toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="td-muted">GST Tax (18%):</span>
                    <span>₹{(selectedOrder.financials?.tax || selectedOrder.amount * 0.15).toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '14px', borderTop: '1px solid var(--color-border)', paddingTop: '6px', marginTop: '4px' }}>
                    <span>Total Amount:</span>
                    <span>₹{selectedOrder.amount.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Drawer Actions */}
              <div style={{ borderTop: '1px solid var(--color-border-light)', paddingTop: '16px', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                {selectedOrder.status !== 'CANCELLED' && selectedOrder.status !== 'COMPLETED' && (
                  <>
                    <button className="btn-danger" onClick={() => handleUpdateStatus(selectedOrder.id, 'CANCELLED')}>Cancel Order</button>
                    {selectedOrder.status === 'NEW' && <button className="btn-primary" onClick={() => handleUpdateStatus(selectedOrder.id, 'PREPARING')}>Start Preparing</button>}
                    {selectedOrder.status === 'PREPARING' && <button className="btn-primary" onClick={() => handleUpdateStatus(selectedOrder.id, 'READY')}>Mark Ready</button>}
                    {selectedOrder.status === 'READY' && <button className="btn-primary" onClick={() => handleUpdateStatus(selectedOrder.id, 'SERVED')}>Mark Served</button>}
                    {selectedOrder.status === 'SERVED' && <button className="btn-primary" onClick={() => handleUpdateStatus(selectedOrder.id, 'COMPLETED')}>Complete Order</button>}
                  </>
                )}
                <button className="btn-outline" onClick={() => setShowDrawer(false)}>Close</button>
              </div>

            </div>
          </div>
        )}
      </div>
    </BranchManagerLayout>
  );
}
