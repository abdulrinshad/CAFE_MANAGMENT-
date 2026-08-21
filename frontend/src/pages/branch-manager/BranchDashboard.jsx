import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BranchManagerLayout from '../../layouts/BranchManagerLayout';
import { branchManagerService } from '../../services/branchManagerService';
import '../DashboardPage.css';
import '../owner/owner.css';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function SalesChart({ data }) {
  if (!data || data.length === 0) return (
    <div className="chart" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', fontSize: 13 }}>
      No data available.
    </div>
  );
  const values = data.map(d => d.value);
  const max = Math.max(...values, 1);
  const yMax = Math.ceil(max / 1000) * 1000 || 5000;
  const yLabels = [yMax, Math.round(yMax * 0.6), Math.round(yMax * 0.2), 0];
  
  return (
    <div className="chart">
      <div className="chart__y-axis">
        {yLabels.map(v => (
          <span key={v} className="chart__y-label">
            {v === 0 ? '0' : `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
          </span>
        ))}
      </div>
      <div className="chart__bars-wrap">
        <div className="chart__grid">
          {yLabels.slice(0, -1).map(v => (
            <div key={v} className="chart__grid-line" style={{ bottom: `${(v / yMax) * 100}%` }} />
          ))}
        </div>
        <div className="chart__bars">
          {data.map((d, i) => (
            <div key={d.label || i} className="chart__bar-col">
              <div
                className="chart__bar"
                style={{ height: `${Math.max((d.value / yMax) * 100, d.value > 0 ? 2 : 0)}%` }}
                title={`₹${Number(d.value).toLocaleString('en-IN')}`}
              />
              <span className="chart__bar-label">{d.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, badge, badgeType = 'green', isLarge = false, onClick }) {
  return (
    <div className={`owner-kpi-card ${isLarge ? 'owner-kpi-card--large' : ''}`} style={{ cursor: onClick ? 'pointer' : 'default' }} onClick={onClick}>
      <div className="owner-kpi-card__label">{label}</div>
      <div className="owner-kpi-card__value" style={{ fontSize: isLarge ? '32px' : '24px' }}>{value}</div>
      {badge && <span className={`owner-kpi-badge owner-kpi-badge--${badgeType}`} style={{ marginTop: '4px' }}>{badge}</span>}
      {sub && <div className="owner-kpi-card__sub" style={{ marginTop: '4px' }}>{sub}</div>}
    </div>
  );
}

export default function BranchDashboard() {
  const navigate = useNavigate();
  const [chartPeriod, setChartPeriod] = useState('daily');
  const [activities, setActivities] = useState([]);
  const [orders, setOrders] = useState([]);
  const [tables, setTables] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [expenses, setExpenses] = useState([]);

  useEffect(() => {
    setActivities(branchManagerService.getActivities());
    setOrders(branchManagerService.getOrders());
    setTables(branchManagerService.getTables());
    setInventory(branchManagerService.getInventory());
    setExpenses(branchManagerService.getExpenses());
  }, []);

  const branchInfo = branchManagerService.getBranchInfo();

  // Calculations
  const todayDateStr = new Date().toISOString().split('T')[0];
  
  const todayOrders = orders.filter(o => o.createdTime); // simple count for mock
  const todaySales = orders
    .filter(o => o.status === 'COMPLETED' || o.paymentStatus === 'paid')
    .reduce((sum, o) => sum + o.amount, 0);

  const activeTablesCount = tables.filter(t => t.status === 'occupied' || t.status === 'order_in_progress' || t.status === 'bill_requested').length;
  const pendingOrdersCount = orders.filter(o => o.status === 'NEW').length;
  const preparingOrdersCount = orders.filter(o => o.status === 'PREPARING').length;
  const pendingBillsCount = tables.filter(t => t.status === 'bill_requested').length;
  const lowStockCount = inventory.filter(i => i.currentStock <= i.minimumStock).length;
  const todayExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  const avgOrderValue = todayOrders.length > 0 ? Math.round(todaySales / todayOrders.length) : 0;
  const completedOrders = orders.filter(o => o.status === 'COMPLETED').length;
  const cancelledOrders = orders.filter(o => o.status === 'CANCELLED').length;
  const pendingPayments = orders.filter(o => o.paymentStatus === 'pending').reduce((sum, o) => sum + o.amount, 0);

  // Mock Sales Overview Chart Data
  const chartDataMap = {
    daily: [
      { label: '09 AM', value: 1200 },
      { label: '11 AM', value: 3400 },
      { label: '01 PM', value: 7800 },
      { label: '03 PM', value: 4500 },
      { label: '05 PM', value: 6200 },
      { label: '07 PM', value: 11000 },
      { label: '09 PM', value: 9500 },
    ],
    weekly: [
      { label: 'Mon', value: 22000 },
      { label: 'Tue', value: 24000 },
      { label: 'Wed', value: 28000 },
      { label: 'Thu', value: 26000 },
      { label: 'Fri', value: 35000 },
      { label: 'Sat', value: 48000 },
      { label: 'Sun', value: 42000 },
    ],
    monthly: [
      { label: 'Week 1', value: 180000 },
      { label: 'Week 2', value: 210000 },
      { label: 'Week 3', value: 240000 },
      { label: 'Week 4', value: 295000 },
    ],
  };

  return (
    <BranchManagerLayout>
      <div className="owner-page">
        {/* Header Greeting */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 className="dashboard__greeting-title">{getGreeting()}, Manager ☕</h1>
            <p className="dashboard__greeting-sub">Manage and monitor everything happening at Kochi Branch.</p>
          </div>
          <span className="owner-badge owner-badge--active" style={{ fontSize: '12px', padding: '6px 12px' }}>
            Kochi Branch • Active
          </span>
        </div>

        {/* Stats Grid Layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '16px' }} className="owner-detail-grid">
          <StatCard
            label="TODAY'S SALES"
            value={`₹${todaySales.toLocaleString('en-IN')}`}
            badge="+15% vs last week"
            badgeType="green"
            isLarge={true}
          />
          <StatCard
            label="ACTIVE TABLES"
            value={`${activeTablesCount} / ${tables.length}`}
            sub="Occupied or in service"
            badgeType="orange"
            onClick={() => navigate('/branch/tables')}
          />
          <StatCard
            label="TODAY'S ORDERS"
            value={todayOrders.length}
            sub="Total tickets printed"
            onClick={() => navigate('/branch/orders')}
          />
        </div>

        <div className="owner-kpi-grid">
          <StatCard label="PENDING ORDERS" value={pendingOrdersCount} sub="New orders in queue" onClick={() => navigate('/branch/kitchen')} />
          <StatCard label="PREPARING" value={preparingOrdersCount} sub="Being cooked" onClick={() => navigate('/branch/kitchen')} />
          <StatCard label="PENDING BILLS" value={pendingBillsCount} sub="Awaiting payment" onClick={() => navigate('/branch/tables')} />
          <StatCard
            label="LOW STOCK ITEMS"
            value={lowStockCount}
            badge={lowStockCount > 0 ? "Reorder Alert" : null}
            badgeType="red"
            onClick={() => navigate('/branch/inventory')}
          />
        </div>

        {/* Sales Chart Section */}
        <div className="owner-section-card">
          <div className="owner-section-card__header">
            <span className="owner-section-card__title">Sales Overview</span>
            <div className="owner-chart-filters">
              {['daily', 'weekly', 'monthly'].map(p => (
                <button
                  key={p}
                  className={`owner-chart-filter-btn${chartPeriod === p ? ' owner-chart-filter-btn--active' : ''}`}
                  onClick={() => setChartPeriod(p)}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div className="owner-section-card__body">
            <SalesChart data={chartDataMap[chartPeriod]} />
          </div>
        </div>

        {/* Dynamic Activity Feed & Quick Actions */}
        <div className="owner-detail-grid">
          {/* Recent Activity */}
          <div className="owner-section-card">
            <div className="owner-section-card__header">
              <span className="owner-section-card__title">Branch Activity Log</span>
            </div>
            <div className="owner-section-card__body--no-pad">
              <div className="owner-activity-list" style={{ padding: '0 20px' }}>
                {activities.length === 0 ? (
                  <div className="owner-empty">No recent activity.</div>
                ) : (
                  activities.map(a => (
                    <div key={a.id} className="owner-activity-item">
                      <div className="owner-activity-icon">{a.icon}</div>
                      <div className="owner-activity-body">
                        <div className="owner-activity-title">{a.description}</div>
                        <div className="owner-activity-time">{a.time}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="owner-section-card">
            <div className="owner-section-card__header">
              <span className="owner-section-card__title">Quick Actions</span>
            </div>
            <div className="owner-section-card__body">
              <div className="owner-quick-actions" style={{ flexDirection: 'column', gap: '12px' }}>
                <button className="owner-qa-btn" onClick={() => navigate('/branch/staff')} style={{ justifyContent: 'flex-start', width: '100%' }}>
                  <span className="owner-qa-btn__icon">👥</span> Add Staff Member
                </button>
                <button className="owner-qa-btn" onClick={() => navigate('/branch/tables')} style={{ justifyContent: 'flex-start', width: '100%' }}>
                  <span className="owner-qa-btn__icon">🪑</span> Add Dining Table
                </button>
                <button className="owner-qa-btn" onClick={() => navigate('/branch/orders')} style={{ justifyContent: 'flex-start', width: '100%' }}>
                  <span className="owner-qa-btn__icon">📋</span> View All Orders
                </button>
                <button className="owner-qa-btn" onClick={() => navigate('/branch/inventory')} style={{ justifyContent: 'flex-start', width: '100%' }}>
                  <span className="owner-qa-btn__icon">📦</span> Adjust Inventory Stock
                </button>
                <button className="owner-qa-btn" onClick={() => navigate('/branch/expenses')} style={{ justifyContent: 'flex-start', width: '100%' }}>
                  <span className="owner-qa-btn__icon">💵</span> Record Branch Expense
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Branch Performance Snapshot */}
        <div className="owner-section-card">
          <div className="owner-section-card__header">
            <span className="owner-section-card__title">Branch Performance Snapshot</span>
          </div>
          <div className="owner-section-card__body">
            <div className="branch-perf-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
              <div className="branch-perf-stat">
                <span className="branch-perf-stat__label">Today's Revenue</span>
                <span className="branch-perf-stat__value" style={{ fontSize: '18px' }}>₹{todaySales.toLocaleString('en-IN')}</span>
              </div>
              <div className="branch-perf-stat">
                <span className="branch-perf-stat__label">Total Orders</span>
                <span className="branch-perf-stat__value" style={{ fontSize: '18px' }}>{todayOrders.length}</span>
              </div>
              <div className="branch-perf-stat">
                <span className="branch-perf-stat__label">Average Order Value</span>
                <span className="branch-perf-stat__value" style={{ fontSize: '18px' }}>₹{avgOrderValue}</span>
              </div>
              <div className="branch-perf-stat">
                <span className="branch-perf-stat__label">Completed Orders</span>
                <span className="branch-perf-stat__value" style={{ fontSize: '18px' }}>{completedOrders}</span>
              </div>
              <div className="branch-perf-stat">
                <span className="branch-perf-stat__label">Cancelled Orders</span>
                <span className="branch-perf-stat__value" style={{ fontSize: '18px' }}>{cancelledOrders}</span>
              </div>
              <div className="branch-perf-stat">
                <span className="branch-perf-stat__label">Pending Payments</span>
                <span className="branch-perf-stat__value" style={{ fontSize: '18px' }}>₹{pendingPayments.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </BranchManagerLayout>
  );
}
