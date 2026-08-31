import { useState, useEffect, useCallback } from 'react'
import AdminLayout from '../../layouts/AdminLayout'
import { reportsApi, branchApi } from '../../api'
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
  { key: 'manual',  label: 'Manual' },
]

// Default date range for manual: last 7 days
function todayStr() { return new Date().toISOString().split('T')[0] }
function sevenDaysAgoStr() {
  const d = new Date(); d.setDate(d.getDate() - 6); return d.toISOString().split('T')[0]
}

export default function OwnerReportsPage() {
  const { ownerBranchFilter: branchFilter, setOwnerBranchFilter: setBranchFilter } = useApp()
  const [period,       setPeriod]       = useState('weekly')
  const [summary,      setSummary]      = useState(null)
  const [chartData,    setChartData]    = useState([])
  const [topCats,      setTopCats]      = useState([])
  const [loading,      setLoading]      = useState(true)

  // Manual date range state
  const [dateFrom,     setDateFrom]     = useState(sevenDaysAgoStr())
  const [dateTo,       setDateTo]       = useState(todayStr())
  const [appliedFrom,  setAppliedFrom]  = useState(sevenDaysAgoStr())
  const [appliedTo,    setAppliedTo]    = useState(todayStr())
  const [manualReady,  setManualReady]  = useState(false)   // true once Apply is clicked

  const [branches,     setBranches]     = useState([])

  useEffect(() => {
    branchApi.list()
      .then(data => setBranches(Array.isArray(data) ? data : (data.results ?? [])))
      .catch(() => {})
  }, [])

  const loadReports = useCallback(async () => {
    // For manual mode, only load after Apply is clicked
    if (period === 'manual' && !manualReady) return

    let active = true
    setLoading(true)
    try {
      const params = {}
      if (branchFilter !== 'all' && branchFilter !== 'All') params.branch = branchFilter

      let sumPromise, revPromise, catsPromise
      if (period === 'manual') {
        const manualParams = { ...params, period: 'custom', date_from: appliedFrom, date_to: appliedTo }
        sumPromise  = reportsApi.summary(manualParams).catch(() => null)
        revPromise  = reportsApi.revenueChart(manualParams).catch(() => null)
        catsPromise = reportsApi.topCategories(manualParams).catch(() => null)
      } else {
        sumPromise  = reportsApi.summary({ period, ...params }).catch(() => null)
        revPromise  = reportsApi.revenueChart({ period, ...params }).catch(() => null)
        catsPromise = reportsApi.topCategories({ period, ...params }).catch(() => null)
      }

      const [sumData, revData, catsData] = await Promise.all([sumPromise, revPromise, catsPromise])
      if (!active) return

      setSummary(sumData)
      if (Array.isArray(revData)) {
        setChartData(revData.map(d => ({ label: d.label || d.day || d.date, value: d.sales || d.value || 0 })))
      } else if (revData && Array.isArray(revData.data)) {
        setChartData(revData.data)
      } else {
        setChartData([])
      }
      if (Array.isArray(catsData)) {
        setTopCats(catsData)
      }
    } catch (err) {
      console.error('Load reports error:', err)
    } finally {
      if (active) setLoading(false)
    }
    return () => { active = false }
  }, [period, branchFilter, appliedFrom, appliedTo, manualReady])

  useEffect(() => {
    loadReports()
  }, [loadReports])

  const handleApplyManual = () => {
    if (!dateFrom || !dateTo) return
    setAppliedFrom(dateFrom)
    setAppliedTo(dateTo)
    setManualReady(true)
  }

  const handlePeriodChange = (key) => {
    setPeriod(key)
    if (key !== 'manual') setManualReady(false)
  }

  const totalSales  = summary?.revenue ?? summary?.total_sales ?? 0
  const totalOrders = summary?.total_orders ?? 0
  const avgOrderVal = totalOrders > 0 ? (totalSales / totalOrders) : 0
  const completed   = summary?.completed ?? 0

  const periodLabel = period === 'manual'
    ? (manualReady ? `${appliedFrom} → ${appliedTo}` : 'Select Range')
    : period.toUpperCase()

  return (
    <AdminLayout pageTitle="Reports & Analytics" pageIcon="📊">
      <div className="owner-page">

        <div className="owner-page-header">
          <div className="owner-page-header__left">
            <h1 className="owner-page-header__title">Reports &amp; Analytics</h1>
            <p className="owner-page-header__sub">Real database analytics and revenue metrics, filterable by period and branch.</p>
          </div>
          <div className="owner-page-header__actions">
            <button className="btn-outline" onClick={() => window.print()}>⬇ Export / Print</button>
          </div>
        </div>

        {/* Filters Row */}
        <div className="owner-section-card">
          <div className="owner-section-card__header">
            <span className="owner-section-card__title">Filters</span>
          </div>
          <div className="owner-section-card__body">
            <div className="owner-filter-bar" style={{ flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
              {/* Period tabs */}
              <div className="owner-chart-filters">
                {PERIODS.map(p => (
                  <button
                    key={p.key}
                    className={`owner-chart-filter-btn${period === p.key ? ' owner-chart-filter-btn--active' : ''}`}
                    onClick={() => handlePeriodChange(p.key)}
                    id={`report-period-${p.key}`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Manual date inputs */}
              {period === 'manual' && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <label style={{ fontSize: 12, color: 'var(--color-text-muted)', fontWeight: 500 }}>From</label>
                  <input
                    type="date"
                    className="form-input"
                    value={dateFrom}
                    max={dateTo}
                    onChange={e => setDateFrom(e.target.value)}
                    style={{ fontSize: 13, padding: '7px 10px', minWidth: 130 }}
                    id="report-date-from"
                  />
                  <label style={{ fontSize: 12, color: 'var(--color-text-muted)', fontWeight: 500 }}>To</label>
                  <input
                    type="date"
                    className="form-input"
                    value={dateTo}
                    min={dateFrom}
                    max={todayStr()}
                    onChange={e => setDateTo(e.target.value)}
                    style={{ fontSize: 13, padding: '7px 10px', minWidth: 130 }}
                    id="report-date-to"
                  />
                  <button
                    className="btn-primary"
                    style={{ fontSize: 13, padding: '7px 18px' }}
                    onClick={handleApplyManual}
                    disabled={!dateFrom || !dateTo || dateFrom > dateTo}
                    id="report-apply-manual"
                  >
                    Apply Filter
                  </button>
                </div>
              )}

              {/* Branch filter */}
              <select
                className="form-select"
                value={branchFilter}
                onChange={e => { setBranchFilter(e.target.value); if (period === 'manual') setManualReady(manualReady) }}
                style={{ fontSize: 13, padding: '7px 12px', minWidth: 150 }}
                id="filter-reports-branch"
              >
                <option value="all">All Branches</option>
                {branches.map(b => (
                  <option key={b.id} value={String(b.id)}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="owner-kpi-grid">
          <div className="owner-kpi-card">
            <div className="owner-kpi-card__label">Total Revenue</div>
            <div className="owner-kpi-card__value">₹{Number(totalSales).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
            {summary?.revenue_change_pct != null && (
              <div className={`owner-kpi-card__sub ${summary.revenue_change_pct >= 0 ? 'positive' : 'negative'}`}>
                {summary.revenue_change_pct >= 0 ? '↑' : '↓'} {Math.abs(summary.revenue_change_pct)}% vs prior period
              </div>
            )}
          </div>
          <div className="owner-kpi-card">
            <div className="owner-kpi-card__label">Total Orders</div>
            <div className="owner-kpi-card__value">{totalOrders}</div>
            <div className="owner-kpi-card__sub">{completed} completed</div>
          </div>
          <div className="owner-kpi-card">
            <div className="owner-kpi-card__label">Avg. Order Value</div>
            <div className="owner-kpi-card__value">₹{Number(avgOrderVal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          </div>
          {summary?.cancelled != null && (
            <div className="owner-kpi-card">
              <div className="owner-kpi-card__label">Cancelled</div>
              <div className="owner-kpi-card__value">{summary.cancelled}</div>
            </div>
          )}
        </div>

        {loading ? (
          <div className="owner-section-card" style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)' }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>⏳</div>
            Loading analytics from database…
          </div>
        ) : (
          <>
            {/* Revenue Chart */}
            <div className="owner-section-card">
              <div className="owner-section-card__header">
                <span className="owner-section-card__title">Revenue Breakdown ({periodLabel})</span>
              </div>
              <div className="owner-section-card__body">
                {period === 'manual' && !manualReady ? (
                  <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: 48, fontSize: 14 }}>
                    Select a date range and click <strong>Apply Filter</strong> to load the revenue chart.
                  </div>
                ) : (
                  <ReportChart data={chartData} />
                )}
              </div>
            </div>

            {/* Top Categories */}
            <div className="owner-section-card">
              <div className="owner-section-card__header">
                <span className="owner-section-card__title">Top Category Performance</span>
              </div>
              <div className="owner-table-wrap">
                <table className="owner-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Category</th>
                      <th>Revenue</th>
                      <th>Items Sold</th>
                      <th>Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topCats.length === 0 ? (
                      <tr>
                        <td colSpan={5}>
                          <div className="owner-empty">
                            <div className="owner-empty__icon">📊</div>
                            <div className="owner-empty__text">No category sales recorded for this period.</div>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      topCats.map((cat, idx) => (
                        <tr key={idx}>
                          <td className="td-muted" style={{ width: 36, fontWeight: 600 }}>{idx + 1}</td>
                          <td className="td-name">{cat.category || cat.name}</td>
                          <td style={{ fontWeight: 600 }}>₹{Number(cat.sales || cat.revenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                          <td>{cat.items_count || cat.qty || cat.count || '—'}</td>
                          <td>
                            {cat.pct != null ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{ flex: 1, height: 6, background: 'var(--color-border)', borderRadius: 3, overflow: 'hidden' }}>
                                  <div style={{ width: `${cat.pct}%`, height: '100%', background: 'var(--color-primary)', borderRadius: 3 }} />
                                </div>
                                <span style={{ fontSize: 12, color: 'var(--color-text-muted)', minWidth: 36 }}>{cat.pct}%</span>
                              </div>
                            ) : '—'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

      </div>
    </AdminLayout>
  )
}
