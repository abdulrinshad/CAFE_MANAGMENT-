import { useState, useEffect } from 'react';
import BranchManagerLayout from '../../layouts/BranchManagerLayout';
import { branchManagerService } from '../../services/branchManagerService';
import '../../pages/owner/owner.css';

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [selectedCust, setSelectedCust] = useState(null);
  const [showDrawer, setShowDrawer] = useState(false);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCustomers = async () => {
      try {
        const data = await branchManagerService.getCustomers();
        setCustomers(data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadCustomers();
  }, []);

  if (loading) {
    return (
      <BranchManagerLayout>
        <div className="owner-page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', color: 'var(--color-espresso)' }}>
          <h3>Loading customer data...</h3>
        </div>
      </BranchManagerLayout>
    );
  }

  // Summary Metrics
  const totalPatrons = customers.length;
  const totalSpending = customers.reduce((sum, c) => sum + (c.spent || 0), 0);
  const averageValue = totalPatrons > 0 ? Math.round(totalSpending / totalPatrons) : 0;
  const returningCount = customers.filter(c => (c.visits || 0) > 1).length;

  return (
    <BranchManagerLayout>
      <div className="owner-page">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 className="owner-page-header__title">Customer Relationship Management</h1>
            <p className="owner-page-header__sub">View local loyalty members, transaction value, and visit patterns.</p>
          </div>
        </div>

        {/* Customer Stats Cards */}
        <div className="owner-kpi-grid">
          <div className="owner-kpi-card">
            <div className="owner-kpi-card__label">Total Patrons</div>
            <div className="owner-kpi-card__value">{totalPatrons}</div>
            <div className="owner-kpi-card__sub">Kochi database</div>
          </div>
          <div className="owner-kpi-card">
            <div className="owner-kpi-card__label">Total CRM Revenue</div>
            <div className="owner-kpi-card__value" style={{ color: 'var(--color-green)' }}>₹{Number(totalSpending ?? 0).toLocaleString('en-IN')}</div>
          </div>
          <div className="owner-kpi-card">
            <div className="owner-kpi-card__label">Average Spent</div>
            <div className="owner-kpi-card__value">₹{averageValue}</div>
            <div className="owner-kpi-card__sub">Per profile registered</div>
          </div>
          <div className="owner-kpi-card">
            <div className="owner-kpi-card__label">Loyal Fans (20+ visits)</div>
            <div className="owner-kpi-card__value" style={{ color: 'var(--color-espresso)' }}>{returningCount}</div>
          </div>
        </div>

        {/* Customer Table */}
        <div className="owner-section-card">
          <div className="owner-table-wrap">
            <table className="owner-table">
              <thead>
                <tr>
                  <th>Customer Name</th>
                  <th>Phone Number</th>
                  <th>Total Visits</th>
                  <th>Total Spent</th>
                  <th>Last Visited</th>
                  <th>Favourite Items</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {customers.map(c => (
                  <tr key={c.id}>
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
                          {c.name.charAt(0)}
                        </div>
                        <span className="td-name">{c.name}</span>
                      </div>
                    </td>
                    <td>{c.phone}</td>
                    <td style={{ fontWeight: 'bold' }}>{(c.totalOrders ?? c.visits ?? 0)} times</td>
                    <td style={{ fontWeight: 'bold' }}>₹{Number(c.totalSpending ?? c.spent ?? 0).toLocaleString('en-IN')}</td>
                    <td>{c.lastVisit}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {c.favouriteItems.map(item => (
                          <span key={item} className="owner-badge owner-badge--takeaway" style={{ fontSize: '9px' }}>
                            {item}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <button className="btn-outline" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={() => {
                        setSelectedCust(c);
                        setShowDrawer(true);
                      }}>
                        View History
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Customer Detail Drawer */}
        {showDrawer && selectedCust && (
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
              
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border-light)', paddingBottom: '16px' }}>
                <h3 style={{ fontFamily: 'var(--font-serif)', color: 'var(--color-espresso)', fontSize: '22px' }}>Customer History</h3>
                <button
                  style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: 'var(--color-text-muted)' }}
                  onClick={() => setShowDrawer(false)}
                >
                  &times;
                </button>
              </div>

              {/* Content */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px 0', display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--color-cream)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'var(--font-serif)',
                    fontSize: '22px',
                    fontWeight: '700',
                    color: 'var(--color-espresso)'
                  }}>
                    {selectedCust.name.charAt(0)}
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: '18px', color: 'var(--color-espresso)' }}>{selectedCust.name}</h4>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                      <a href={`https://wa.me/${selectedCust.whatsapp.replace(/[^0-9]/g,'')}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: '11px', color: 'var(--color-green)', textDecoration: 'none', fontWeight: 'bold' }}>
                        💬 WhatsApp Client
                      </a>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', background: 'var(--color-bg-alt)', padding: '12px', borderRadius: '8px' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--color-espresso)' }}>{selectedCust.totalOrders}</div>
                    <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>Visits</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--color-espresso)' }}>₹{Number(selectedCust.totalSpending ?? selectedCust.spent ?? 0).toLocaleString('en-IN')}</div>
                    <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>Total Spent</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--color-espresso)', marginTop: '4px' }}>{selectedCust.lastVisit}</div>
                    <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>Last Visit</div>
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--color-espresso)', marginBottom: '8px' }}>Favourite Items</div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {selectedCust.favouriteItems.map(item => (
                      <span key={item} className="owner-badge owner-badge--takeaway" style={{ fontSize: '11px', padding: '4px 10px' }}>
                        {item}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--color-espresso)', marginBottom: '8px' }}>Recent Orders (Kochi Branch)</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', borderBottom: '1px dashed var(--color-border-light)', paddingBottom: '8px' }}>
                      <div>
                        <div style={{ fontWeight: '600' }}>Order #ORD-1024</div>
                        <span className="td-muted">Dine-In • 2x Cappuccino, 1x Chicken Burger</span>
                      </div>
                      <span style={{ fontWeight: 'bold' }}>₹720.00</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', borderBottom: '1px dashed var(--color-border-light)', paddingBottom: '8px' }}>
                      <div>
                        <div style={{ fontWeight: '600' }}>Order #ORD-0985</div>
                        <span className="td-muted">Takeaway • 1x Club Sandwich</span>
                      </div>
                      <span style={{ fontWeight: 'bold' }}>₹220.00</span>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--color-border-light)', paddingTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn-outline" onClick={() => setShowDrawer(false)}>Close Summary</button>
              </div>

            </div>
          </div>
        )}
      </div>
    </BranchManagerLayout>
  );
}
