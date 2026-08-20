import { useState } from 'react'
import AdminLayout from '../../layouts/AdminLayout'
import { OWNER_CHART_DATA, OWNER_BRANCHES, OWNER_DASHBOARD_STATS } from '../../data/ownerMockData'
import '../DashboardPage.css'
import './owner.css'

/* ── Bar Chart — reuses DashboardPage pattern ── */
function ReportChart({ data }) {
  if (!data || data.length === 0) return (
    <div className="chart" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', fontSize: 13 }}>
      No data for this period.
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

const REPORT_TYPES = ['Sales', 'Orders', 'Payments', 'Bills', 'Expenses', 'Inventory', 'Staff Performance', 'Branch Performance']
const PERIODS      = [
  { key: 'today',     label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'week',      label: 'This Week' },
  { key: 'month',     label: 'This Month' },
  { key: 'custom',    label: 'Custom Range' },
]

/* Summary tables per report type */
const REPORT_SUMMARIES = {
  Sales: [
    ['Koramangala', '₹24,800', '84', '₹295'],
    ['Indiranagar', '₹18,600', '61', '₹305'],
    ['HSR Layout',  '₹11,200', '43', '₹261'],
    ['Whitefield',  '₹0',      '0',  '—'],
  ],
  Orders: [
    ['Koramangala', '84', '72 completed', '6 pending', '6 cancelled'],
    ['Indiranagar', '61', '54 completed', '4 pending', '3 cancelled'],
    ['HSR Layout',  '43', '40 completed', '2 pending', '1 cancelled'],
    ['Whitefield',  '0',  '—', '—', '—'],
  ],
  'Branch Performance': [
    ['Koramangala', '₹24,800', '92%', 'Rahul Sharma', 'Active'],
    ['Indiranagar', '₹18,600', '88%', 'Priya Nair',   'Active'],
    ['HSR Layout',  '₹11,200', '85%', 'Amit Patel',   'Active'],
    ['Whitefield',  '₹0',      '—',   'Sneha Reddy',  'Inactive'],
  ],
}

export default function OwnerReportsPage() {
  const [period,     setPeriod]     = useState('today')
  const [branchFil,  setBranch]     = useState('all')
  const [reportType, setReportType] = useState('Sales')

  const chartData = OWNER_CHART_DATA[period] || OWNER_CHART_DATA.today
  const summaryData = REPORT_SUMMARIES[reportType] || REPORT_SUMMARIES.Sales

  return (
    <AdminLayout pageTitle="Reports & Analytics" pageIcon="📊">
      <div className="owner-page">

        <div className="owner-page-header">
          <div className="owner-page-header__left">
            <h1 className="owner-page-header__title">Reports &amp; Analytics</h1>
            <p className="owner-page-header__sub">Comprehensive business reports across all branches.</p>
          </div>
          <div className="owner-page-header__actions">
            <button className="btn-outline">⬇ Export</button>
          </div>
        </div>

        {/* Filters Row */}
        <div className="owner-section-card">
          <div className="owner-section-card__header">
            <span className="owner-section-card__title">Filters</span>
          </div>
          <div className="owner-section-card__body">
            <div className="owner-filter-bar" style={{ flexWrap: 'wrap', gap: 8 }}>
              {/* Period */}
              <div className="owner-chart-filters">
                {PERIODS.map(p => (
                  <button key={p.key} className={`owner-chart-filter-btn${period === p.key ? ' owner-chart-filter-btn--active' : ''}`} onClick={() => setPeriod(p.key)} id={`report-period-${p.key}`}>{p.label}</button>
                ))}
              </div>
              {/* Branch */}
              <select className="form-select" value={branchFil} onChange={e => setBranch(e.target.value)} id="filter-report-branch">
                <option value="all">All Branches</option>
                {OWNER_BRANCHES.map(b => <option key={b.id} value={b.id}>{b.name.replace('Artisan Brew — ', '')}</option>)}
              </select>
              {/* Report Type */}
              <select className="form-select" value={reportType} onChange={e => setReportType(e.target.value)} id="filter-report-type">
                {REPORT_TYPES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="owner-kpi-grid">
          {[
            { label: "Today's Sales",  value: `₹${OWNER_DASHBOARD_STATS.todaySales.toLocaleString('en-IN')}` },
            { label: 'Total Orders',   value: OWNER_DASHBOARD_STATS.totalOrders },
            { label: 'Net Sales',      value: `₹${OWNER_DASHBOARD_STATS.netSales.toLocaleString('en-IN')}` },
            { label: 'Expenses',       value: `₹${OWNER_DASHBOARD_STATS.todayExpenses.toLocaleString('en-IN')}` },
          ].map(k => (
            <div key={k.label} className="owner-kpi-card">
              <div className="owner-kpi-card__label">{k.label}</div>
              <div className="owner-kpi-card__value">{k.value}</div>
            </div>
          ))}
        </div>

        {/* Chart */}
        <div className="owner-section-card">
          <div className="owner-section-card__header">
            <span className="owner-section-card__title">Sales Overview — {PERIODS.find(p => p.key === period)?.label}</span>
            <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{branchFil === 'all' ? 'All Branches' : OWNER_BRANCHES.find(b => b.id === Number(branchFil))?.name.replace('Artisan Brew — ', '')}</span>
          </div>
          <div className="owner-section-card__body">
            <ReportChart data={chartData} />
          </div>
        </div>

        {/* Summary Table */}
        <div className="owner-section-card">
          <div className="owner-section-card__header">
            <span className="owner-section-card__title">{reportType} — Branch Breakdown</span>
          </div>
          <div className="owner-table-wrap">
            {reportType === 'Sales' && (
              <table className="owner-table">
                <thead><tr><th>Branch</th><th>Sales</th><th>Orders</th><th>Avg Order Value</th></tr></thead>
                <tbody>{summaryData.map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={j} className={j === 0 ? 'td-name' : j > 0 ? '' : 'td-muted'}>{cell}</td>)}</tr>)}</tbody>
              </table>
            )}
            {reportType === 'Orders' && (
              <table className="owner-table">
                <thead><tr><th>Branch</th><th>Total</th><th>Completed</th><th>Pending</th><th>Cancelled</th></tr></thead>
                <tbody>{summaryData.map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={j} className={j === 0 ? 'td-name' : 'td-muted'}>{cell}</td>)}</tr>)}</tbody>
              </table>
            )}
            {reportType === 'Branch Performance' && (
              <table className="owner-table">
                <thead><tr><th>Branch</th><th>Sales</th><th>Efficiency</th><th>Manager</th><th>Status</th></tr></thead>
                <tbody>{summaryData.map((row, i) => (
                  <tr key={i}>
                    <td className="td-name">{row[0]}</td>
                    <td>{row[1]}</td>
                    <td>{row[2]}</td>
                    <td className="td-muted">{row[3]}</td>
                    <td><span className={`owner-badge owner-badge--${row[4].toLowerCase()}`}>{row[4].toUpperCase()}</span></td>
                  </tr>
                ))}</tbody>
              </table>
            )}
            {!['Sales', 'Orders', 'Branch Performance'].includes(reportType) && (
              <div className="owner-empty" style={{ padding: '40px 24px' }}>
                <div className="owner-empty__icon">📊</div>
                <div className="owner-empty__text">Detailed {reportType} report will be available when APIs are connected.</div>
              </div>
            )}
          </div>
        </div>

      </div>
    </AdminLayout>
  )
}
