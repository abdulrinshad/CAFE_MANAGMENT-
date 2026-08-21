import { useState, useEffect } from 'react'
import AdminLayout from '../../layouts/AdminLayout'
import { reportsApi, dashboardApi } from '../../api'
import { useApp } from '../../context/AppContext'
import '../DashboardPage.css'
import './owner.css'

function ReportChart({ data }) {
  if (!data || data.length === 0) return (
    <div className="chart" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', fontSize: 13 }}>
      No report data for this period in database.
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

const PERIODS = [
  { key: 'daily',   label: 'Daily' },
  { key: 'weekly',  label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
]

export default function OwnerReportsPage() {
  const { orders } = useApp()
  const [period, setPeriod] = useState('weekly')
  const [reportType, setReportType] = useState('Sales')
  const [summary, setSummary] = useState(null)
  const [chartData, setChartData] = useState([])
  const [topCats, setTopCats] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    async function loadReports() {
      try {
        setLoading(true)
        const [sumData, revData, catsData] = await Promise.all([
          reportsApi.summary({ period }).catch(() => null),
          reportsApi.revenueChart({ period }).catch(() => null),
          reportsApi.topCategories({ period }).catch(() => null),
        ])
        if (!active) return
        setSummary(sumData)
        if (Array.isArray(revData)) {
          setChartData(revData.map(d => ({ label: d.label || d.day || d.date, value: d.sales || d.value || 0 })))
        } else if (revData && Array.isArray(revData.data)) {
          setChartData(revData.data)
        }
        if (Array.isArray(catsData)) {
          setTopCats(catsData)
        }
      } catch (err) {
        console.error('Load reports error:', err)
      } finally {
        if (active) setLoading(false)
      }
    }
    loadReports()
    return () => { active = false }
  }, [period])

  const totalSales = summary?.total_sales ?? summary?.revenue ?? orders.filter(o => o.status === 'COMPLETED').reduce((s, o) => s + (o.amount || 0), 0)
  const totalOrders = summary?.total_orders ?? orders.length
  const avgOrderVal = totalOrders > 0 ? (totalSales / totalOrders) : 0

  return (
    <AdminLayout pageTitle="Reports & Analytics" pageIcon="📊">
      <div className="owner-page">

        <div className="owner-page-header">
          <div className="owner-page-header__left">
            <h1 className="owner-page-header__title">Reports &amp; Analytics</h1>
            <p className="owner-page-header__sub">Database analytics and revenue metrics.</p>
          </div>
          <div className="owner-page-header__actions">
            <button className="btn-outline" onClick={() => window.print()}>⬇ Export / Print</button>
          </div>
        </div>

        {/* Filters Row */}
        <div className="owner-section-card">
          <div className="owner-section-card__header">
            <span className="owner-section-card__title">Time Period & Filter</span>
          </div>
          <div className="owner-section-card__body">
            <div className="owner-filter-bar" style={{ flexWrap: 'wrap', gap: 8 }}>
              <div className="owner-chart-filters">
                {PERIODS.map(p => (
                  <button
                    key={p.key}
                    className={`owner-chart-filter-btn${period === p.key ? ' owner-chart-filter-btn--active' : ''}`}
                    onClick={() => setPeriod(p.key)}
                    id={`report-period-${p.key}`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="owner-kpi-grid">
          <div className="owner-kpi-card">
            <div className="owner-kpi-card__label">Total Revenue</div>
            <div className="owner-kpi-card__value">₹{Number(totalSales).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          </div>
          <div className="owner-kpi-card">
            <div className="owner-kpi-card__label">Total Orders</div>
            <div className="owner-kpi-card__value">{totalOrders}</div>
          </div>
          <div className="owner-kpi-card">
            <div className="owner-kpi-card__label">Avg. Order Value</div>
            <div className="owner-kpi-card__value">₹{Number(avgOrderVal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          </div>
        </div>

        {/* Chart */}
        <div className="owner-section-card">
          <div className="owner-section-card__header">
            <span className="owner-section-card__title">Revenue Breakdown ({period.toUpperCase()})</span>
          </div>
          <div className="owner-section-card__body">
            <ReportChart data={chartData} />
          </div>
        </div>

        {/* Top Categories Table */}
        <div className="owner-section-card">
          <div className="owner-section-card__header">
            <span className="owner-section-card__title">Top Category Performance</span>
          </div>
          <div className="owner-table-wrap">
            <table className="owner-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Total Sales</th>
                  <th>Order Items Sold</th>
                </tr>
              </thead>
              <tbody>
                {topCats.length === 0 ? (
                  <tr>
                    <td colSpan={3}>
                      <div className="owner-empty">
                        <div className="owner-empty__icon">📊</div>
                        <div className="owner-empty__text">No category sales recorded yet.</div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  topCats.map((cat, idx) => (
                    <tr key={idx}>
                      <td className="td-name">{cat.category || cat.name}</td>
                      <td style={{ fontWeight: 600 }}>₹{Number(cat.sales || cat.revenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td>{cat.items_count || cat.count || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </AdminLayout>
  )
}
