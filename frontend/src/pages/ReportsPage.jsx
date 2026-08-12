import { useState } from 'react'
import AdminLayout from '../layouts/AdminLayout'
import './ReportsPage.css'

/* ── Mock Analytics Data ── */
const ANALYTICS = {
  daily: {
    totalOrders: 148,
    completed: 141,
    pending: 5,
    cancelled: 2,
    avgOrderValue: 3.20,
    avgOrderChange: '+0.40',
    revenue: 2650,
    totalChange: '+8% today',
    completedChange: '+10% today',
    pendingChange: '→ Normal volume',
    cancelledChange: '↘ -1% today',
    chartLabel: 'Today (hourly)',
    chartData: [
      { label: '8am',  value: 180 },
      { label: '9am',  value: 320 },
      { label: '10am', value: 470 },
      { label: '11am', value: 390 },
      { label: '12pm', value: 610 },
      { label: '2pm',  value: 290 },
      { label: '4pm',  value: 240 },
      { label: '6pm',  value: 150 },
    ],
    categories: [
      { name: 'Espresso Bar', pct: 48 },
      { name: 'Pastries',     pct: 28 },
      { name: 'Pour Over',    pct: 14 },
      { name: 'Retail Beans', pct: 10 },
    ],
  },
  weekly: {
    totalOrders: 1248,
    completed: 1180,
    pending: 42,
    cancelled: 26,
    avgOrderValue: 24.50,
    avgOrderChange: '+$1.20',
    revenue: 18450,
    totalChange: '+12% this week',
    completedChange: '+15% this week',
    pendingChange: '→ Normal volume',
    cancelledChange: '↘ -2% this week',
    chartLabel: 'Weekly sales performance across all channels.',
    chartData: [
      { label: 'Mon', value: 2200 },
      { label: 'Tue', value: 3100 },
      { label: 'Wed', value: 2800 },
      { label: 'Thu', value: 4100 },
      { label: 'Fri', value: 1900 },
      { label: 'Sat', value: 3200 },
      { label: 'Sun', value: 3150 },
    ],
    categories: [
      { name: 'Espresso Bar', pct: 45 },
      { name: 'Pastries',     pct: 30 },
      { name: 'Pour Over',    pct: 15 },
      { name: 'Retail Beans', pct: 10 },
    ],
  },
  monthly: {
    totalOrders: 5320,
    completed: 5100,
    pending: 140,
    cancelled: 80,
    avgOrderValue: 26.80,
    avgOrderChange: '+$2.10',
    revenue: 79200,
    totalChange: '+9% this month',
    completedChange: '+11% this month',
    pendingChange: '→ Normal volume',
    cancelledChange: '↘ -1% this month',
    chartLabel: 'Monthly sales performance across all channels.',
    chartData: [
      { label: 'Wk 1', value: 18000 },
      { label: 'Wk 2', value: 22000 },
      { label: 'Wk 3', value: 19500 },
      { label: 'Wk 4', value: 19700 },
    ],
    categories: [
      { name: 'Espresso Bar', pct: 44 },
      { name: 'Pastries',     pct: 31 },
      { name: 'Pour Over',    pct: 16 },
      { name: 'Retail Beans', pct: 9 },
    ],
  },
}

function formatNum(n) {
  return n >= 1000 ? n.toLocaleString() : n
}
function formatCurrency(n) {
  return n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n}`
}

/* ── Revenue Bar Chart ── */
function RevenueChart({ data }) {
  const max = Math.max(...data.map((d) => d.value))
  return (
    <div className="rev-chart">
      {data.map((item) => (
        <div key={item.label} className="rev-chart__col">
          <div className="rev-chart__bar-wrap">
            <div
              className="rev-chart__bar"
              style={{ height: `${Math.round((item.value / max) * 100)}%` }}
            />
          </div>
          <span className="rev-chart__label">{item.label}</span>
        </div>
      ))}
    </div>
  )
}

/* ── Category Bar ── */
function CategoryBar({ name, pct }) {
  const barWidths = { 45: 'var(--w45)', 48: 'var(--w48)', 44: 'var(--w44)' }
  return (
    <div className="cat-bar">
      <div className="cat-bar__top">
        <span className="cat-bar__name">{name}</span>
        <span className="cat-bar__pct">{pct}%</span>
      </div>
      <div className="cat-bar__track">
        <div
          className="cat-bar__fill"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

/* ── Custom Date Modal ── */
function CustomDateModal({ open, onClose, onApply }) {
  const [from, setFrom] = useState('')
  const [to,   setTo]   = useState('')
  if (!open) return null
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-box--sm" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-box__title">Custom Date Range</h3>
        <div style={{ display: 'flex', gap: 12, flexDirection: 'column', marginTop: 16 }}>
          <div className="form-group">
            <label className="form-label">From</label>
            <input type="date" className="form-input" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">To</label>
            <input type="date" className="form-input" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
          <button className="btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={() => { onApply(from, to); onClose() }}>Apply</button>
        </div>
      </div>
    </div>
  )
}

export default function ReportsPage() {
  const [period, setPeriod]  = useState('weekly')
  const [custom, setCustom]  = useState(false)
  const [customRange, setCustomRange] = useState(null)

  const data = ANALYTICS[period] || ANALYTICS.weekly

  return (
    <AdminLayout
      pageTitle="Reports & Analytics"
      headerRight={
        <div className="reports-period-tabs">
          {['daily', 'weekly', 'monthly'].map((p) => (
            <button
              key={p}
              className={`period-tab${period === p && !customRange ? ' period-tab--active' : ''}`}
              onClick={() => { setPeriod(p); setCustomRange(null) }}
              id={`period-${p}`}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
          <button
            className={`period-tab period-tab--custom${customRange ? ' period-tab--active' : ''}`}
            onClick={() => setCustom(true)}
            id="period-custom"
          >
            <CalendarIcon /> Custom
          </button>
        </div>
      }
    >
      <div className="reports-page">
        {/* Stat Cards */}
        <div className="reports-stat-row">
          <StatCard
            label="TOTAL ORDERS"
            value={formatNum(data.totalOrders)}
            change={data.totalChange}
            changeDir="up"
            icon={<OrdersIcon />}
          />
          <StatCard
            label="COMPLETED"
            value={formatNum(data.completed)}
            change={data.completedChange}
            changeDir="up"
            icon={<CheckIcon />}
          />
          <StatCard
            label="PENDING"
            value={formatNum(data.pending)}
            change={data.pendingChange}
            changeDir="neutral"
            icon={<ClockIcon />}
          />
          <StatCard
            label="CANCELLED"
            value={formatNum(data.cancelled)}
            change={data.cancelledChange}
            changeDir="down"
            icon={<XIcon />}
          />
          <StatCard
            label="AVG ORDER VALUE"
            value={`$${data.avgOrderValue.toFixed(2)}`}
            change={`${data.avgOrderChange} this week`}
            changeDir="up"
            icon={<MoneyIcon />}
            dark
          />
        </div>

        {/* Revenue + Categories */}
        <div className="reports-bottom-row">
          {/* Revenue Overview */}
          <div className="reports-revenue-card">
            <div className="reports-revenue-card__header">
              <div>
                <h2 className="reports-revenue-card__title">Revenue Overview</h2>
                <p className="reports-revenue-card__sub">{data.chartLabel}</p>
              </div>
              <span className="reports-revenue-card__total">{formatCurrency(data.revenue)}</span>
            </div>
            <RevenueChart data={data.chartData} />
          </div>

          {/* Top Categories */}
          <div className="reports-categories-card">
            <h2 className="reports-categories-card__title">Top Categories</h2>
            <div className="reports-categories-card__bars">
              {data.categories.map((cat) => (
                <CategoryBar key={cat.name} name={cat.name} pct={cat.pct} />
              ))}
            </div>
          </div>
        </div>
      </div>

      <CustomDateModal
        open={custom}
        onClose={() => setCustom(false)}
        onApply={(from, to) => {
          setCustomRange({ from, to })
          setPeriod('weekly')
        }}
      />
    </AdminLayout>
  )
}

/* ── Stat Card ── */
function StatCard({ label, value, change, changeDir, icon, dark }) {
  return (
    <div className={`stat-card${dark ? ' stat-card--dark' : ''}`}>
      <div className="stat-card__top">
        <span className="stat-card__label">{label}</span>
        <span className="stat-card__icon">{icon}</span>
      </div>
      <div className="stat-card__value">{value}</div>
      <div className={`stat-card__change stat-card__change--${changeDir}`}>
        {changeDir === 'up'   && <span className="change-arrow">↗</span>}
        {changeDir === 'down' && <span className="change-arrow">↘</span>}
        {change}
      </div>
    </div>
  )
}

/* ── Icons ── */
function CalendarIcon() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> }
function OrdersIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/></svg> }
function CheckIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/></svg> }
function ClockIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> }
function XIcon()     { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg> }
function MoneyIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg> }
