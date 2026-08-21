import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminLayout from '../../layouts/AdminLayout'
import { useApp } from '../../context/AppContext'
import { dashboardApi, reportsApi } from '../../api'
import '../DashboardPage.css'
import './owner.css'

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function OwnerSalesChart({ data }) {
  if (!data || data.length === 0) return (
    <div className="chart" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', fontSize: 13 }}>
      No data available in database.
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

export default function OwnerDashboardPage() {
  const navigate = useNavigate()
  const { currentUser, orders, tables, waiterRequestsState } = useApp()
  const [stats, setStats] = useState(null)
  const [chartData, setChartData] = useState([])
  const [chartPeriod, setChartPeriod] = useState('weekly')
  const [loading, setLoading] = useState(true)

  const userName = currentUser?.name || currentUser?.username || 'Owner'

  useEffect(() => {
    let active = true
    async function loadData() {
      try {
        setLoading(true)
        const [statsRes, chartRes] = await Promise.all([
          dashboardApi.stats().catch(() => null),
          dashboardApi.salesChart(chartPeriod).catch(() => null),
        ])
        if (!active) return
        setStats(statsRes)
        if (Array.isArray(chartRes)) {
          setChartData(chartRes.map(item => ({ label: item.day || item.date || item.label, value: item.sales || item.total || 0 })))
        } else if (chartRes && Array.isArray(chartRes.data)) {
          setChartData(chartRes.data)
        }
      } catch (err) {
        console.error('Failed to load owner dashboard:', err)
      } finally {
        if (active) setLoading(false)
      }
    }
    loadData()
    return () => { active = false }
  }, [chartPeriod])

  const todaySales = stats?.today_sales ?? orders.filter(o => o.status === 'COMPLETED').reduce((sum, o) => sum + (o.amount || 0), 0)
  const totalOrdersCount = stats?.today_orders ?? orders.length
  const activeTablesCount = stats?.active_tables ?? tables.filter(t => t.status !== 'available').length
  const totalTablesCount = stats?.total_tables ?? tables.length
  const activeRequestsCount = stats?.active_requests ?? waiterRequestsState.filter(r => r.status === 'new' || r.status === 'in_progress').length

  const PERIODS = [
    { key: 'daily',   label: 'Daily' },
    { key: 'weekly',  label: 'Weekly' },
    { key: 'monthly', label: 'Monthly' },
  ]

  return (
    <AdminLayout searchPlaceholder="Search across business database...">
      <div className="owner-page">

        {/* Greeting */}
        <div>
          <h1 className="dashboard__greeting-title">{getGreeting()}, {userName} ☕</h1>
          <p className="dashboard__greeting-sub">Live database overview for your cafe business.</p>
        </div>

        {/* KPI Row 1 */}
        <div className="owner-kpi-grid">
          <KPICard label="Today's Sales"   value={`₹${Number(todaySales).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`} badge="Live DB" badgeType="green" />
          <KPICard label="Total Orders"    value={totalOrdersCount} sub="Live database orders" />
          <KPICard label="Active Tables"   value={`${activeTablesCount} / ${totalTablesCount}`} badge="Floor State" badgeType="green" />
          <KPICard label="Pending Requests" value={activeRequestsCount} badge="Table Service" badgeType="orange" />
        </div>

        {/* Chart + Sales Detail */}
        <div className="owner-detail-grid">
          <div className="owner-section-card">
            <div className="owner-section-card__header">
              <span className="owner-section-card__title">Sales Analytics Trend</span>
              <div className="owner-tab-bar" style={{ marginBottom: 0 }}>
                {PERIODS.map(p => (
                  <button
                    key={p.key}
                    className={`owner-tab${chartPeriod === p.key ? ' owner-tab--active' : ''}`}
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

          <div className="owner-section-card">
            <div className="owner-section-card__header">
              <span className="owner-section-card__title">Recent Database Orders</span>
              <button className="btn-outline" style={{ padding: '6px 14px', fontSize: 12 }} onClick={() => navigate('/orders')}>
                View All
              </button>
            </div>
            <div className="owner-section-card__body--no-pad">
              <div style={{ padding: '0 20px' }}>
                {orders.slice(0, 5).map(o => (
                  <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--color-border-subtle, #f0e6df)' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{o.orderId || `ORD-${o.id}`}</div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{o.table} &middot; {o.itemsSummary || `${o.item_count || 1} items`}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>₹{Number(o.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                      <span className="owner-badge owner-badge--active" style={{ fontSize: 10 }}>{o.status}</span>
                    </div>
                  </div>
                ))}
                {orders.length === 0 && (
                  <div style={{ padding: '30px 0', textAlign: 'center', color: 'var(--color-text-muted)' }}>No live orders in database.</div>
                )}
              </div>
            </div>
          </div>
        </div>

      </div>
    </AdminLayout>
  )
}
