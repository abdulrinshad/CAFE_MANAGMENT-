import { useState, useEffect } from 'react';
import BranchManagerLayout from '../../layouts/BranchManagerLayout';
import { branchManagerService } from '../../services/branchManagerService';
import '../../pages/owner/owner.css';

export default function Reports() {
  const [filterPeriod, setFilterPeriod] = useState('month');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  useEffect(() => {
    async function loadReports() {
      setLoading(true);
      setError(null);
      try {
        const res = await branchManagerService.getReports(filterPeriod);
        setData(res);
      } catch (err) {
        console.error('Failed to load branch reports:', err);
        setError(err.message || 'Failed to load report analytics.');
      } finally {
        setLoading(false);
      }
    }
    loadReports();
  }, [filterPeriod]);

  // Extract variables with defaults to avoid errors
  const metrics = data?.metrics || {
    totalSales: 0,
    expenses: 0,
    netSales: 0,
    avgOrder: 0,
    totalOrders: 0
  };

  const salesData = data?.sales_data || [];
  const paymentBreakdown = data?.payment_breakdown || [];
  const topSellingProducts = data?.top_selling_products || [];
  const channelBreakdown = data?.channel_breakdown || [];
  const staffPerformance = data?.staff_performance || [];

  // Calculate dynamic maximum value for trends
  const maxTrendVal = salesData.length > 0 ? Math.max(...salesData.map(c => c.value)) : 0;

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
                disabled={loading}
              >
                {p.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div style={{ padding: '16px', background: '#fdf2f2', border: '1px solid #f5c2c2', borderRadius: '8px', color: '#b81414', margin: '20px 0', fontSize: '14px' }}>
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-muted)', fontWeight: '600' }}>
            Loading branch report analytics...
          </div>
        ) : !data ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            No report data could be resolved.
          </div>
        ) : (
          <>
            {/* Report summary cards */}
            <div className="owner-kpi-grid">
              <div className="owner-kpi-card">
                <div className="owner-kpi-card__label">Total Gross Sales</div>
                <div className="owner-kpi-card__value">₹{metrics.totalSales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
              </div>
              <div className="owner-kpi-card">
                <div className="owner-kpi-card__label">Total Expenses</div>
                <div className="owner-kpi-card__value" style={{ color: 'var(--color-red)' }}>₹{metrics.expenses.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
              </div>
              <div className="owner-kpi-card">
                <div className="owner-kpi-card__label">Net Revenue</div>
                <div className="owner-kpi-card__value" style={{ color: 'var(--color-green)' }}>₹{metrics.netSales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
              </div>
              <div className="owner-kpi-card">
                <div className="owner-kpi-card__label">Average Order Value</div>
                <div className="owner-kpi-card__value">₹{metrics.avgOrder.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
              </div>
            </div>

            {/* Breakdown structures */}
            <div className="owner-detail-grid">
              {/* Sales Performance Chart */}
              <div className="owner-section-card">
                <div className="owner-section-card__header">
                  <span className="owner-section-card__title">
                    {filterPeriod === 'today' || filterPeriod === 'yesterday'
                      ? 'Hourly Sales Trend'
                      : (filterPeriod === 'week' ? 'Weekly Sales Trend' : 'Monthly Sales Weekly Trend')
                    }
                  </span>
                </div>
                <div className="owner-section-card__body" style={{ minHeight: '260px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                  {salesData.length === 0 || maxTrendVal === 0 ? (
                    <div style={{ height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', color: 'var(--color-text-muted)' }}>
                      No sales recorded in this period.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'flex-end', height: '180px', paddingTop: '20px', overflowX: 'auto', gap: '8px' }}>
                      {salesData.map(c => {
                        const pct = maxTrendVal > 0 ? (c.value / maxTrendVal) * 140 : 0;
                        return (
                          <div key={c.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', minWidth: '32px' }}>
                            <div style={{
                              width: filterPeriod === 'week' || filterPeriod === 'month' ? '45px' : '15px',
                              height: `${pct}px`,
                              background: 'var(--color-espresso)',
                              borderRadius: '4px',
                              position: 'relative'
                            }} title={`₹${c.value}`} />
                            <span style={{ fontSize: '10px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>{c.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Payment Method Breakdown */}
              <div className="owner-section-card">
                <div className="owner-section-card__header">
                  <span className="owner-section-card__title">Payment Method Breakdown</span>
                </div>
                <div className="owner-section-card__body">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {paymentBreakdown.length === 0 || paymentBreakdown.every(p => p.count === 0) ? (
                      <div style={{ padding: '20px', textAlign: 'center', fontSize: '13px', color: 'var(--color-text-muted)' }}>
                        No transactions recorded.
                      </div>
                    ) : (
                      paymentBreakdown.map(p => (
                        <div key={p.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border-light)', paddingBottom: '10px' }}>
                          <div>
                            <div style={{ fontWeight: '600', fontSize: '13px' }}>{p.name}</div>
                            <span className="td-muted">{p.count} transactions</span>
                          </div>
                          <span style={{ fontWeight: 'bold', color: 'var(--color-espresso)' }}>₹{p.value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>
                      ))
                    )}
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
                  {topSellingProducts.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', fontSize: '13px', color: 'var(--color-text-muted)' }}>
                      No product sales recorded.
                    </div>
                  ) : (
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
                            <td style={{ fontWeight: 'bold' }}>₹{p.revenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              {/* Order Channel Breakdown */}
              <div className="owner-section-card">
                <div className="owner-section-card__header">
                  <span className="owner-section-card__title">Order Channels</span>
                </div>
                <div className="owner-section-card__body">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {channelBreakdown.every(c => c.orders === 0) ? (
                      <div style={{ padding: '20px', textAlign: 'center', fontSize: '13px', color: 'var(--color-text-muted)' }}>
                        No orders recorded.
                      </div>
                    ) : (
                      channelBreakdown.map(c => {
                        const pct = metrics.totalSales > 0 ? (c.value / metrics.totalSales) * 100 : 0;
                        return (
                          <div key={c.name} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                              <span style={{ fontWeight: '600' }}>{c.name}</span>
                              <span style={{ fontWeight: 'bold' }}>₹{c.value.toLocaleString('en-IN', { minimumFractionDigits: 2 })} ({c.orders} orders)</span>
                            </div>
                            {/* Bar chart representation */}
                            <div style={{ width: '100%', height: '6px', background: 'var(--color-cream)', borderRadius: '3px', overflow: 'hidden' }}>
                              <div style={{ width: `${pct}%`, height: '100%', background: c.color }} />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Staff performance list */}
            <div className="owner-detail-grid">
              {/* Staff performance metrics */}
              <div className="owner-section-card">
                <div className="owner-section-card__header">
                  <span className="owner-section-card__title">Waiter Performance Summary</span>
                </div>
                <div className="owner-table-wrap">
                  {staffPerformance.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', fontSize: '13px', color: 'var(--color-text-muted)' }}>
                      No staff performance recorded.
                    </div>
                  ) : (
                    <table className="owner-table">
                      <thead>
                        <tr>
                          <th>Staff Name</th>
                          <th>Role</th>
                          <th>Orders Served</th>
                          <th>Efficiency Rating</th>
                        </tr>
                      </thead>
                      <tbody>
                        {staffPerformance.map(s => (
                          <tr key={s.name}>
                            <td className="td-name">{s.name}</td>
                            <td>{s.role}</td>
                            <td>{s.orders} served</td>
                            <td style={{ fontWeight: 'bold', color: 'var(--color-green)' }}>{s.rating}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </BranchManagerLayout>
  );
}
