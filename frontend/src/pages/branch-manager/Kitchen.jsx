import { useState, useEffect } from 'react';
import BranchManagerLayout from '../../layouts/BranchManagerLayout';
import { branchManagerService } from '../../services/branchManagerService';
import '../../pages/owner/owner.css';

export default function Kitchen() {
  const [orders, setOrders] = useState([]);
  const [channelFilter, setChannelFilter] = useState('ALL');

  useEffect(() => {
    setOrders(branchManagerService.getOrders());
  }, []);

  const handleMoveStatus = (id, nextStatus) => {
    branchManagerService.updateOrderStatus(id, nextStatus);
    setOrders(branchManagerService.getOrders());
  };

  const filteredOrders = orders.filter(o => {
    if (channelFilter === 'ALL') return true;
    if (channelFilter === 'ONLINE') return o.channel === 'Swiggy' || o.channel === 'Zomato';
    return o.channel.toLowerCase() === channelFilter.toLowerCase();
  });

  const columns = [
    { key: 'NEW', label: 'New Orders', color: 'var(--color-tan-dark)' },
    { key: 'PREPARING', label: 'Preparing', color: 'var(--color-brown-light)' },
    { key: 'READY', label: 'Ready for Pickup', color: 'var(--color-green)' },
    { key: 'SERVED', label: 'Served', color: 'var(--color-espresso)' }
  ];

  return (
    <BranchManagerLayout>
      <div className="owner-page">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 className="owner-page-header__title">Kitchen Display System</h1>
            <p className="owner-page-header__sub">Monitor and update cooking stages for Kochi branch orders.</p>
          </div>
          
          {/* Quick Filters */}
          <div style={{ display: 'flex', gap: '8px' }}>
            {['ALL', 'Dine-In', 'Takeaway', 'ONLINE'].map(ch => (
              <button
                key={ch}
                onClick={() => setChannelFilter(ch)}
                className={`owner-chart-filter-btn ${channelFilter === ch ? 'owner-chart-filter-btn--active' : ''}`}
                style={{ padding: '6px 12px', fontSize: '12px' }}
              >
                {ch === 'ONLINE' ? 'Delivery (Swiggy/Zomato)' : ch}
              </button>
            ))}
          </div>
        </div>

        {/* Kanban Board Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', minHeight: '600px' }} className="owner-detail-grid">
          {columns.map(col => {
            const colOrders = filteredOrders.filter(o => o.status === col.key);
            
            return (
              <div
                key={col.key}
                style={{
                  background: 'var(--color-white)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '12px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}
              >
                {/* Column Title */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderBottom: `2.5px solid ${col.color}`,
                  paddingBottom: '8px',
                  marginBottom: '8px'
                }}>
                  <span style={{ fontWeight: 'bold', color: 'var(--color-espresso)', fontSize: '14px' }}>{col.label}</span>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 'bold',
                    padding: '2px 8px',
                    borderRadius: '20px',
                    backgroundColor: 'var(--color-cream)',
                    color: 'var(--color-espresso)'
                  }}>
                    {colOrders.length}
                  </span>
                </div>

                {/* Column Items */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto' }}>
                  {colOrders.map(order => (
                    <div
                      key={order.id}
                      style={{
                        background: 'var(--color-bg-alt)',
                        border: '1.5px solid var(--color-border-light)',
                        borderRadius: '8px',
                        padding: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                      }}
                    >
                      {/* Ticket header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="td-mono" style={{ fontWeight: 'bold', color: 'var(--color-espresso)' }}>{order.id}</span>
                        <span className={`owner-badge owner-badge--${order.channel.toLowerCase()}`} style={{ fontSize: '9px' }}>
                          {order.channel}
                        </span>
                      </div>

                      {/* Details */}
                      <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                        <div style={{ fontWeight: '600' }}>Table: {order.table}</div>
                        <div>Staff: {order.waiter || 'Online API'}</div>
                        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>Placed: {order.createdTime || order.time}</div>
                      </div>

                      {/* Items block */}
                      <div style={{
                        padding: '8px',
                        background: 'var(--color-white)',
                        borderRadius: '6px',
                        border: '1px dashed var(--color-border)'
                      }}>
                        {order.items.map((it, idx) => (
                          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', paddingBottom: '3px' }}>
                            <span>{it.product}</span>
                            <span style={{ fontWeight: 'bold' }}>x{it.quantity}</span>
                          </div>
                        ))}
                      </div>

                      {/* Actions */}
                      <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                        {col.key === 'NEW' && (
                          <button
                            className="btn-primary"
                            style={{ width: '100%', padding: '6px 0', fontSize: '11px' }}
                            onClick={() => handleMoveStatus(order.id, 'PREPARING')}
                          >
                            Accept & Prepare
                          </button>
                        )}
                        {col.key === 'PREPARING' && (
                          <button
                            className="btn-primary"
                            style={{ width: '100%', padding: '6px 0', fontSize: '11px' }}
                            onClick={() => handleMoveStatus(order.id, 'READY')}
                          >
                            Done Cooking
                          </button>
                        )}
                        {col.key === 'READY' && (
                          <button
                            className="btn-primary"
                            style={{ width: '100%', padding: '6px 0', fontSize: '11px' }}
                            onClick={() => handleMoveStatus(order.id, 'SERVED')}
                          >
                            Mark Handed Over
                          </button>
                        )}
                        {col.key === 'SERVED' && (
                          <button
                            className="btn-primary"
                            style={{ width: '100%', padding: '6px 0', fontSize: '11px' }}
                            onClick={() => handleMoveStatus(order.id, 'COMPLETED')}
                          >
                            Complete Order
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  {colOrders.length === 0 && (
                    <div style={{
                      textAlign: 'center',
                      padding: '40px 10px',
                      color: 'var(--color-text-light)',
                      fontSize: '12px',
                      border: '1px dashed var(--color-border-light)',
                      borderRadius: '8px'
                    }}>
                      Empty
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </BranchManagerLayout>
  );
}
