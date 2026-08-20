import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminLayout from '../../layouts/AdminLayout'
import { useApp } from '../../context/AppContext'
import {
  OWNER_DASHBOARD_STATS,
  OWNER_BRANCHES,
  OWNER_RECENT_ACTIVITY,
  OWNER_CHART_DATA,
} from '../../data/ownerMockData'
import '../DashboardPage.css'
import './owner.css'

/* ── Greeting helper ── */
function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

/* ── Mini bar chart (reuses DashboardPage pattern) ── */
function OwnerSalesChart({ data }) {
  if (!data || data.length === 0) return (
    <div className="chart" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', fontSize: 13 }}>
      No data available.
    </div>
  )
  const values = data.map(d => d.value)
  const max    = Math.max(...values, 1)
  const yMax   = Math.ceil(max / 1000) * 1000 || 5000
  const yLabels = [yMax, Math.round(yMax * 0.6), Math.round(yMax * 0.2), 0]
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
  )
}

/* ── KPI Card ── */
function KPICard({ label, value, sub, badge, badgeType = 'green' }) {
  return (
    <div className="owner-kpi-card">
      <div className="owner-kpi-card__label">{label}</div>
      <div className="owner-kpi-card__value">{value}</div>
      {badge && <span className={`owner-kpi-badge owner-kpi-badge--${badgeType}`}>{badge}</span>}
      {sub && <div className="owner-kpi-card__sub">{sub}</div>}
    </div>
  )
}

/* ── Main Page ── */
export default function OwnerDashboardPage() {
  const navigate = useNavigate()
  const { currentUser } = useApp()
  const [chartPeriod, setChartPeriod] = useState('today')

  const userName = currentUser?.name || currentUser?.username || 'Dilfa'
  const s = OWNER_DASHBOARD_STATS
  const chartData = OWNER_CHART_DATA[chartPeriod] || OWNER_CHART_DATA.today

  const PERIODS = [
    { key: 'today',     label: 'Today' },
    { key: 'yesterday', label: 'Yesterday' },
    { key: 'week',      label: 'This Week' },
    { key: 'month',     label: 'This Month' },
  ]

  return (
    <AdminLayout searchPlaceholder="Search across branches...">
      <div className="owner-page">

        {/* Greeting */}
        <div>
          <h1 className="dashboard__greeting-title">{getGreeting()}, {userName} ☕</h1>
          <p className="dashboard__greeting-sub">Here&apos;s what&apos;s happening across your business today.</p>
        </div>

        {/* KPI Row 1 */}
        <div className="owner-kpi-grid">
          <KPICard label="Today's Sales"   value={`₹${s.todaySales.toLocaleString('en-IN')}`}  badge="+12% vs yesterday" badgeType="green" />
          <KPICard label="Total Orders"    value={s.totalOrders}  sub="Across all branches" />
          <KPICard label="Paid Bills"      value={s.paidBills}    badge="92% paid" badgeType="green" />
          <KPICard label="Pending Bills"   value={s.pendingBills} badge="Action needed" badgeType="orange" />
        </div>

        {/* KPI Row 2 */}
        <div className="owner-kpi-grid">
          <KPICard label="Today's Expenses"  value={`₹${s.todayExpenses.toLocaleString('en-IN')}`} sub="Approved + pending" />
          <KPICard label="Net Sales"         value={`₹${s.netSales.toLocaleString('en-IN')}`}      badge="After expenses" badgeType="green" />
          <KPICard label="Active Branches"   value={`${s.activeBranches} / 4`}                      sub="1 branch inactive" />
          <KPICard label="Total Staff"       value={s.totalStaff}                                    sub="Across all branches" />
        </div>

        {/* Branch Performance + Activity */}
        <div className="owner-detail-grid">

          {/* Branch Performance */}
          <div className="owner-section-card">
            <div className="owner-section-card__header">
              <span className="owner-section-card__title">Branch Performance</span>
              <button className="btn-outline" style={{ padding: '6px 14px', fontSize: 12 }} onClick={() => navigate('/owner/branches')}>
                View All
              </button>
            </div>
            <div className="owner-section-card__body--no-pad">
              <div className="branch-perf-list" style={{ padding: '0 20px' }}>
                {OWNER_BRANCHES.map(b => (
                  <div key={b.id} className="branch-perf-row">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 160 }}>
                      <span className="branch-perf-name">{b.name.replace('Artisan Brew — ', '')}</span>
                      <span className="owner-badge owner-badge--active" style={{ fontSize: 9 }}>{b.status.toUpperCase()}</span>
                    </div>
                    <div className="branch-perf-stats">
                      <div className="branch-perf-stat">
                        <span className="branch-perf-stat__label">Sales</span>
                        <span className="branch-perf-stat__value">₹{(b.todaySales / 1000).toFixed(1)}k</span>
                      </div>
                      <div className="branch-perf-stat">
                        <span className="branch-perf-stat__label">Orders</span>
                        <span className="branch-perf-stat__value">{b.orders}</span>
                      </div>
                      <div className="branch-perf-stat">
                        <span className="branch-perf-stat__label">Pending</span>
                        <span className="branch-perf-stat__value">{b.pendingOrders}</span>
                      </div>
                    </div>
                    <button
                      className="owner-icon-btn"
                      title="View Branch"
                      onClick={() => navigate(`/owner/branches/${b.id}`)}
                    >→</button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="owner-section-card">
            <div className="owner-section-card__header">
              <span className="owner-section-card__title">Recent Business Activity</span>
            </div>
            <div className="owner-section-card__body--no-pad">
              <div className="owner-activity-list" style={{ padding: '0 20px' }}>
                {OWNER_RECENT_ACTIVITY.map(a => (
                  <div key={a.id} className="owner-activity-item">
                    <div className="owner-activity-icon">{a.icon}</div>
                    <div className="owner-activity-body">
                      <div className="owner-activity-title">{a.title}</div>
                      <div className="owner-activity-time">{a.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Sales Overview Chart */}
        <div className="owner-section-card">
          <div className="owner-section-card__header">
            <span className="owner-section-card__title">Sales Overview</span>
            <div className="owner-chart-filters">
              {PERIODS.map(p => (
                <button
                  key={p.key}
                  className={`owner-chart-filter-btn${chartPeriod === p.key ? ' owner-chart-filter-btn--active' : ''}`}
                  onClick={() => setChartPeriod(p.key)}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <div className="owner-section-card__body">
            <OwnerSalesChart data={chartData} />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="owner-section-card">
          <div className="owner-section-card__header">
            <span className="owner-section-card__title">Quick Actions</span>
          </div>
          <div className="owner-section-card__body">
            <div className="owner-quick-actions">
              <button className="owner-qa-btn" id="qa-add-branch"   onClick={() => navigate('/owner/branches')}>
                <span className="owner-qa-btn__icon">🏪</span> Add Branch
              </button>
              <button className="owner-qa-btn" id="qa-add-manager"  onClick={() => navigate('/owner/staff')}>
                <span className="owner-qa-btn__icon">👤</span> Add Manager
              </button>
              <button className="owner-qa-btn" id="qa-add-staff"    onClick={() => navigate('/owner/staff')}>
                <span className="owner-qa-btn__icon">👥</span> Add Staff
              </button>
              <button className="owner-qa-btn" id="qa-add-pos"      onClick={() => navigate('/owner/pos')}>
                <span className="owner-qa-btn__icon">🖥️</span> Add POS Terminal
              </button>
              <button className="owner-qa-btn" id="qa-view-reports" onClick={() => navigate('/owner/reports')}>
                <span className="owner-qa-btn__icon">📊</span> View Reports
              </button>
            </div>
          </div>
        </div>

      </div>
    </AdminLayout>
  )
}
