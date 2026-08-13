import { useState, useEffect, useCallback } from 'react'
import AdminLayout from '../layouts/AdminLayout'
import { reportsApi } from '../api'
import './ReportsPage.css'

/* ── Helpers ── */
function fmtNum(n) {
  return n >= 1000 ? Number(n).toLocaleString('en-IN') : n
}
function fmtCurrency(n) {
  const num = Number(n)
  if (num >= 100000) return `₹${(num / 100000).toFixed(1)}L`
  if (num >= 1000)   return `₹${(num / 1000).toFixed(1)}k`
  return `₹${num.toFixed(0)}`
}

/* ── Revenue Bar Chart ── */
function RevenueChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="rev-chart" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280', fontSize: 13 }}>
        No revenue data for this period.
      </div>
    )
  }
  const max = Math.max(...data.map((d) => Number(d.value)), 1)
  return (
    <div className="rev-chart">
      {data.map((item, i) => (
        <div key={item.label || i} className="rev-chart__col">
          <div className="rev-chart__bar-wrap">
            <div
              className="rev-chart__bar"
              style={{ height: `${Math.max(Math.round((Number(item.value) / max) * 100), Number(item.value) > 0 ? 2 : 0)}%` }}
              title={`₹${Number(item.value).toLocaleString('en-IN')}`}
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
  return (
    <div className="cat-bar">
      <div className="cat-bar__top">
        <span className="cat-bar__name">{name}</span>
        <span className="cat-bar__pct">{pct}%</span>
      </div>
      <div className="cat-bar__track">
        <div className="cat-bar__fill" style={{ width: `${pct}%` }} />
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

/* ── Stat Card ── */
function StatCard({ label, value, change, changeDir, icon, dark }) {
  return (
    <div className={`stat-card${dark ? ' stat-card--dark' : ''}`}>
      <div className="stat-card__top">
        <span className="stat-card__label">{label}</span>
        <span className="stat-card__icon">{icon}</span>
      </div>
      <div className="stat-card__value">{value}</div>
      {change != null && (
        <div className={`stat-card__change stat-card__change--${changeDir || 'neutral'}`}>
          {changeDir === 'up'   && <span className="change-arrow">↗</span>}
          {changeDir === 'down' && <span className="change-arrow">↘</span>}
          {change}
        </div>
      )}
    </div>
  )
}

/* ── Main Page ── */
export default function ReportsPage() {
  const [period,      setPeriod]      = useState('weekly')
  const [customOpen,  setCustomOpen]  = useState(false)
  const [customRange, setCustomRange] = useState(null)

  // API data
  const [summary,    setSummary]    = useState(null)
  const [chartData,  setChartData]  = useState([])
  const [categories, setCategories] = useState([])
  const [loading,    setLoading]    = useState(true)

  const loadReports = useCallback(async () => {
    setLoading(true)
    try {
      const params = customRange
        ? { period: 'custom', date_from: customRange.from, date_to: customRange.to }
        : { period }

      const [summaryData, chartRes, catRes] = await Promise.all([
        reportsApi.summary(params),
        reportsApi.revenueChart(params),
        reportsApi.topCategories(params),
      ])

      setSummary(summaryData)
      setChartData(chartRes.data || [])
      setCategories(Array.isArray(catRes) ? catRes : (catRes.results ?? []))
    } catch (err) {
      console.error('Reports load error:', err)
    } finally {
      setLoading(false)
    }
  }, [period, customRange])

  useEffect(() => {
    loadReports()
  }, [loadReports])

  // Build change labels from API data
  const revenueChangePct = summary?.revenue_change_pct
  const revenueChangeLabel = revenueChangePct != null
    ? `${revenueChangePct >= 0 ? '+' : ''}${revenueChangePct}% vs prev period`
    : null
  const revenueChangeDir = revenueChangePct == null ? 'neutral' : revenueChangePct >= 0 ? 'up' : 'down'

  const periodLabel = customRange
    ? `${customRange.from} – ${customRange.to}`
    : period === 'daily' ? 'Today (hourly)'
    : period === 'weekly' ? 'This week (daily)'
    : 'This month (weekly)'

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
            onClick={() => setCustomOpen(true)}
            id="period-custom"
          >
            <CalendarIcon /> Custom
          </button>
        </div>
      }
    >
      <div className="reports-page">
        {loading ? (
          <div style={{ color: '#9ca3af', textAlign: 'center', padding: '60px 0', fontSize: 14 }}>
            Loading reports…
          </div>
        ) : (
          <>
            {/* Stat Cards */}
            <div className="reports-stat-row">
              <StatCard
                label="TOTAL ORDERS"
                value={fmtNum(summary?.total_orders ?? 0)}
                change={null}
                icon={<OrdersIcon />}
              />
              <StatCard
                label="COMPLETED"
                value={fmtNum(summary?.completed ?? 0)}
                change={null}
                icon={<CheckIcon />}
              />
              <StatCard
                label="PENDING"
                value={fmtNum(summary?.pending ?? 0)}
                change={null}
                changeDir="neutral"
                icon={<ClockIcon />}
              />
              <StatCard
                label="CANCELLED"
                value={fmtNum(summary?.cancelled ?? 0)}
                change={null}
                changeDir="down"
                icon={<XIcon />}
              />
              <StatCard
                label="AVG ORDER VALUE"
                value={`₹${Number(summary?.avg_order_value ?? 0).toFixed(2)}`}
                change={revenueChangeLabel}
                changeDir={revenueChangeDir}
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
                    <p className="reports-revenue-card__sub">{periodLabel}</p>
                  </div>
                  <span className="reports-revenue-card__total">
                    {fmtCurrency(summary?.revenue ?? 0)}
                  </span>
                </div>
                <RevenueChart data={chartData} />
              </div>

              {/* Top Categories */}
              <div className="reports-categories-card">
                <h2 className="reports-categories-card__title">Top Categories</h2>
                <div className="reports-categories-card__bars">
                  {categories.length === 0 ? (
                    <div style={{ color: '#6b7280', fontSize: 13 }}>
                      No category data yet. Complete some orders to see analytics.
                    </div>
                  ) : (
                    categories.map((cat) => (
                      <CategoryBar key={cat.name} name={cat.name} pct={cat.pct} />
                    ))
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <CustomDateModal
        open={customOpen}
        onClose={() => setCustomOpen(false)}
        onApply={(from, to) => setCustomRange({ from, to })}
      />
    </AdminLayout>
  )
}

/* ── Icons ── */
function CalendarIcon() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> }
function OrdersIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/></svg> }
function CheckIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/></svg> }
function ClockIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> }
function XIcon()     { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg> }
function MoneyIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg> }
