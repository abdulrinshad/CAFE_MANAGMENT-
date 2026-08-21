import { useState } from 'react';
import BranchManagerLayout from '../../layouts/BranchManagerLayout';
import '../../pages/owner/owner.css';

export default function Reports() {
  const [filterPeriod, setFilterPeriod] = useState('month');

  // Mocked stats
  const metrics = {
    totalSales: 165800,
    netSales: 141900,
    totalOrders: 382,
    avgOrder: 434,
    completed: 374,
    cancelled: 8,
    pending: 2400,
    expenses: 23900
  };

  const channelBreakdown = [
    { name: 'Dine-In', orders: 210, value: 92400, color: 'var(--color-espresso)' },
    { name: 'Takeaway', orders: 112, value: 48600, color: 'var(--color-tan-dark)' },
    { name: 'Swiggy', orders: 42, value: 16400, color: '#e65300' },
    { name: 'Zomato', orders: 18, value: 8400, color: '#b81414' }
  ];

  const paymentBreakdown = [
    { name: 'UPI / QR Scan', count: 245, value: 104500 },
    { name: 'Credit/Debit Card', count: 82, value: 41200 },
    { name: 'Cash drawer', count: 55, value: 20100 }
  ];

  const topSellingProducts = [
    { name: 'Cappuccino', qty: 320, revenue: 57600 },
    { name: 'Chicken Burger', qty: 184, revenue: 44160 },
    { name: 'Club Sandwich', qty: 142, revenue: 31240 },
    { name: 'Chocolate Coffee', qty: 110, revenue: 13200 },
    { name: 'Chocolate Cake', qty: 95, revenue: 11400 }
  ];

  const staffPerformance = [
    { name: 'Rahul K. S.', role: 'Waiter', orders: 420, rating: '4.8★' },
    { name: 'Amal Raj', role: 'Waiter', orders: 350, rating: '4.7★' },
    { name: 'Arun Dev', role: 'POS', value: 480000, rating: '4.9★' }
  ];

  const mockChartData = [
    { label: 'Week 1', value: 38000 },
    { label: 'Week 2', value: 41000 },
    { label: 'Week 3', value: 44000 },
    { label: 'Week 4', value: 42800 }
  ];

  return (
    <BranchManagerLayout>
      <div className="owner-page">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 className="owner-page-header__title">Branch Reports & Analytics</h1>
            <p className="owner-page-header__sub">Evaluate performance, sales, waitstaff indices, and expense reports.</p>
          </div>
          
          <div className="owner-chart-filters">
            {['today', 'yesterday', 'week', 'month'].map(p => (
              <button
                key={p}
                className={`owner-chart-filter-btn ${filterPeriod === p ? 'owner-chart-filter-btn--active' : ''}`}
                onClick={() => setFilterPeriod(p)}
              >
                {p.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Report summary cards */}
        <div className="owner-kpi-grid">
          <div className="owner-kpi-card">
            <div className="owner-kpi-card__label">Total Gross Sales</div>
            <div className="owner-kpi-card__value">₹{metrics.totalSales.toLocaleString('en-IN')}</div>
          </div>
          <div className="owner-kpi-card">
            <div className="owner-kpi-card__label">Total Expenses</div>
            <div className="owner-kpi-card__value" style={{ color: 'var(--color-red)' }}>₹{metrics.expenses.toLocaleString('en-IN')}</div>
          </div>
          <div className="owner-kpi-card">
            <div className="owner-kpi-card__label">Net Revenue</div>
            <div className="owner-kpi-card__value" style={{ color: 'var(--color-green)' }}>₹{metrics.netSales.toLocaleString('en-IN')}</div>
          </div>
          <div className="owner-kpi-card">
            <div className="owner-kpi-card__label">Average Order Value</div>
            <div className="owner-kpi-card__value">₹{metrics.avgOrder}</div>
          </div>
        </div>

        {/* Breakdown structures */}
        <div className="owner-detail-grid">
          {/* Sales Performance Chart */}
          <div className="owner-section-card">
            <div className="owner-section-card__header">
              <span className="owner-section-card__title">Sales Weekly Trend</span>
            </div>
            <div className="owner-section-card__body" style={{ minHeight: '260px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
              <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'flex-end', height: '180px', paddingTop: '20px' }}>
                {mockChartData.map(c => (
                  <div key={c.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      width: '45px',
                      height: `${(c.value / 50000) * 140}px`,
                      background: 'var(--color-espresso)',
                      borderRadius: '4px',
                      position: 'relative'
                    }} title={`₹${c.value}`} />
                    <span style={{ fontSize: '11px', fontWeight: 'bold' }}>{c.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Payment Method Breakdown */}
          <div className="owner-section-card">
            <div className="owner-section-card__header">
              <span className="owner-section-card__title">Payment Method Breakdown</span>
            </div>
            <div className="owner-section-card__body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {paymentBreakdown.map(p => (
                  <div key={p.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border-light)', paddingBottom: '10px' }}>
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '13px' }}>{p.name}</div>
                      <span className="td-muted">{p.count} transactions</span>
                    </div>
                    <span style={{ fontWeight: 'bold', color: 'var(--color-espresso)' }}>₹{p.value.toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Secondary snapshot layout */}
        <div className="owner-detail-grid">
          {/* Top Selling Products */}
          <div className="owner-section-card">
            <div className="owner-section-card__header">
              <span className="owner-section-card__title">Top Selling Products</span>
            </div>
            <div className="owner-table-wrap">
              <table className="owner-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Qty Sold</th>
                    <th>Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {topSellingProducts.map(p => (
                    <tr key={p.name}>
                      <td className="td-name">{p.name}</td>
                      <td>{p.qty} units</td>
                      <td style={{ fontWeight: 'bold' }}>₹{p.revenue.toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Order Channel Breakdown */}
          <div className="owner-section-card">
            <div className="owner-section-card__header">
              <span className="owner-section-card__title">Order Channels</span>
            </div>
            <div className="owner-section-card__body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {channelBreakdown.map(c => (
                  <div key={c.name} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span style={{ fontWeight: '600' }}>{c.name}</span>
                      <span style={{ fontWeight: 'bold' }}>₹{c.value.toLocaleString('en-IN')} ({c.orders} orders)</span>
                    </div>
                    {/* Bar chart representation */}
                    <div style={{ width: '100%', height: '6px', background: 'var(--color-cream)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${(c.value / metrics.totalSales) * 100}%`, height: '100%', background: c.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Staff & expenses performance list */}
        <div className="owner-detail-grid">
          {/* Staff performance metrics */}
          <div className="owner-section-card">
            <div className="owner-section-card__header">
              <span className="owner-section-card__title">Waiter & POS Performance Summary</span>
            </div>
            <div className="owner-table-wrap">
              <table className="owner-table">
                <thead>
                  <tr>
                    <th>Staff Name</th>
                    <th>Role</th>
                    <th>Orders/Transactions</th>
                    <th>Efficiency Rating</th>
                  </tr>
                </thead>
                <tbody>
                  {staffPerformance.map(s => (
                    <tr key={s.name}>
                      <td className="td-name">{s.name}</td>
                      <td>{s.role}</td>
                      <td>{s.orders ? `${s.orders} served` : `₹${s.value.toLocaleString('en-IN')}`}</td>
                      <td style={{ fontWeight: 'bold', color: 'var(--color-green)' }}>{s.rating}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </BranchManagerLayout>
  );
}
