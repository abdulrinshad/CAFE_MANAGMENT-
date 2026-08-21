import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminLayout from '../layouts/AdminLayout'
import { useApp } from '../context/AppContext'
import { dashboardApi } from '../api'
import './DashboardPage.css'

/* ── Stat Card ── */
function StatCard({ label, value, sub }) {
  return (
    <div className="stat-card">
      <div className="stat-card__label">{label}</div>
      <div className="stat-card__value">{value}</div>
      {sub && <div className="stat-card__sub">{sub}</div>}
    </div>
  )
}

/* ── Sales Chart (uses real API data) ── */
function SalesChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="chart" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280', fontSize: 13 }}>
        No sales data yet for this period.
      </div>
    )
  }
  const values = data.map((d) => d.value)
  const max    = Math.max(...values, 1)
  // Round up max to a nice number for Y axis
  const yMax   = Math.ceil(max / 1000) * 1000 || 5000
  const yLabels = [yMax, Math.round(yMax * 0.6), Math.round(yMax * 0.2), 0]

  return (
    <div className="chart">
      <div className="chart__y-axis">
        {yLabels.map((v) => (
          <span key={v} className="chart__y-label">
            {v === 0 ? '0' : `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
          </span>
        ))}
      </div>
      <div className="chart__bars-wrap">
        <div className="chart__grid">
          {yLabels.slice(0, -1).map((v) => (
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

/* ── Status Badge ── */
function StatusBadge({ status }) {
  const map = {
    PREPARING: { cls: 'badge--preparing', label: 'PREPAR...' },
    PENDING:   { cls: 'badge--pending',   label: 'PENDING' },
    COMPLETED: { cls: 'badge--completed', label: 'COMPL...' },
    READY:     { cls: 'badge--completed', label: 'READY' },
    CANCELLED: { cls: '',                 label: 'CANCEL' },
  }
  const { cls, label } = map[status] || { cls: '', label: status }
  return <span className={`badge ${cls}`}>{label}</span>
}

/* ── Dashboard Page ── */
export default function DashboardPage() {
  const navigate = useNavigate()
  const { currentRole, currentWaiter, waiterRequests, tables, orders,
          updateRequestStatus, dismissRequest, currentUser } = useApp()

  // Time-aware greeting
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  // Derive display name: prefer first name, fall back to email username, then 'Owner'
  const displayName = (() => {
    if (!currentUser) return 'Owner'
    const first = (currentUser.first_name || '').trim()
    const last  = (currentUser.last_name  || '').trim()
    if (first && last) return `${first} ${last}`
    if (first)         return first
    if (currentUser.email) return currentUser.email.split('@')[0]
    return 'Owner'
  })()

  // Dashboard API state
  const [stats,        setStats]        = useState(null)
  const [recentOrders, setRecentOrders] = useState([])
  const [bestSellers,  setBestSellers]  = useState([])
  const [chartData,    setChartData]    = useState([])
  const [loading,      setLoading]      = useState(true)

  const loadDashboard = useCallback(async () => {
    try {
      const [statsRes, recentsRes, bestRes, chartRes] = await Promise.all([
        dashboardApi.stats(),
        dashboardApi.recentOrders(8),
        dashboardApi.bestSellers(5, 'daily'),
        dashboardApi.salesChart('weekly'),
      ])
      setStats(statsRes)
      setRecentOrders(recentsRes)
      setBestSellers(bestRes)
      setChartData(chartRes.data || [])
    } catch (err) {
      console.error('Dashboard load error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDashboard()
    // Auto-refresh dashboard every 60 seconds
    const timer = setInterval(loadDashboard, 60000)
    return () => clearInterval(timer)
  }, [loadDashboard])

  // Waiter-specific stats (from PostgreSQL API / live context)
  const occupiedTablesCount = stats?.occupied_tables ?? (tables ? tables.filter(t => t.status === 'occupied').length : 0)
  const activeRequestsCount = stats?.active_requests ?? (waiterRequests ? waiterRequests.filter(r => r.status === 'new' || r.status === 'in_progress').length : 0)
  const activeOrdersCount   = stats?.active_orders ?? (orders ? orders.filter(o => o.status === 'PREPARING' || o.status === 'PENDING').length : 0)
  const pendingBillsCount   = stats?.pending_bills ?? (tables ? tables.filter(t => t.status === 'needs_attention' || t.status === 'bill_requested').length : 0)


  // ── Waiter view ────────────────────────────────────────────────────────────
  if (currentRole === 'waiter') {
    return (
      <AdminLayout
        searchPlaceholder="Search active tables, orders..."
        pageTitle="Dashboard"
        pageIcon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>}
      >
        <div className="dashboard">
          <div className="dashboard__greeting">
            <h1 className="dashboard__greeting-title">Good morning, {currentWaiter?.name || 'Waiter'}</h1>
            <p className="dashboard__greeting-sub">Current Shift Performance · {currentWaiter?.station || 'Station'}</p>
          </div>
          <div className="dashboard__waiter-cta">
            <div className="waiter-cta__card">
              <div className="waiter-cta__info">
                <h3>Serve a Table</h3>
                <p>Start a new order, add items, or process payment requests.</p>
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <button
                  className="btn-outline"
                  onClick={() => navigate('/menu')}
                  id="btn-view-menu-dashboard"
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  ☕ View Menu
                </button>
                <button className="btn-primary" onClick={() => navigate('/orders/new')}>
                  Create New Order
                </button>
              </div>
            </div>
          </div>
          <div className="dashboard__stats-grid">
            <div className="waiter-stat-card">
              <span className="waiter-stat-card__icon text-orange">🪑</span>
              <div className="waiter-stat-card__details">
                <span className="waiter-stat-card__val">{occupiedTablesCount}</span>
                <span className="waiter-stat-card__lbl">Active Tables</span>
              </div>
            </div>
            <div className="waiter-stat-card">
              <span className="waiter-stat-card__icon text-red">🛎️</span>
              <div className="waiter-stat-card__details">
                <span className="waiter-stat-card__val">{activeRequestsCount}</span>
                <span className="waiter-stat-card__lbl">Pending Requests</span>
              </div>
            </div>
            <div className="waiter-stat-card">
              <span className="waiter-stat-card__icon text-green">☕</span>
              <div className="waiter-stat-card__details">
                <span className="waiter-stat-card__val">{activeOrdersCount}</span>
                <span className="waiter-stat-card__lbl">Active Orders</span>
              </div>
            </div>
            <div className="waiter-stat-card">
              <span className="waiter-stat-card__icon text-tan">💵</span>
              <div className="waiter-stat-card__details">
                <span className="waiter-stat-card__val">{pendingBillsCount}</span>
                <span className="waiter-stat-card__lbl">Pending Bills</span>
              </div>
            </div>
          </div>
          <div className="recent-requests-section">
            <div className="recent-orders__header">
              <h2 className="recent-orders__title">Recent Table Requests</h2>
              <button className="recent-orders__view-all" onClick={() => navigate('/requests')}>
                View All <span>→</span>
              </button>
            </div>
            <div className="waiter-requests-list">
              {waiterRequests && waiterRequests.length > 0 ? (
                waiterRequests.slice(0, 3).map((req) => (
                  <div key={req.id} className={`waiter-request-card ${req.status}`}>
                    <div className="waiter-request-card__header">
                      <span className="request-table-badge">Table {req.tableId?.replace('T-', '')}</span>
                      <span className="request-time">{req.time}</span>
                    </div>
                    <div className="waiter-request-card__body">
                      <div className="request-type-label">{req.type}</div>
                      <p className="request-msg">{req.message}</p>
                      {req.amount && <div className="request-amount">Amount: ₹{req.amount}</div>}
                    </div>
                    <div className="waiter-request-card__actions">
                      {req.status === 'new' ? (
                        <>
                          <button className="btn-outline btn-sm" onClick={() => dismissRequest(req.id)}>Dismiss</button>
                          <button className="btn-primary btn-sm" onClick={() => updateRequestStatus(req.id, 'in_progress')}>Accept</button>
                        </>
                      ) : (
                        <button
                          className="btn-primary btn-sm btn-success-bg"
                          onClick={() => updateRequestStatus(req.id, 'completed')}
                          disabled={req.status === 'completed'}
                        >
                          {req.status === 'completed' ? 'Completed' : 'Mark Completed'}
                        </button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="requests-empty">No requests at the moment.</div>
              )}
            </div>
          </div>
        </div>
      </AdminLayout>
    )
  }

  // ── Admin view ─────────────────────────────────────────────────────────────

  const salesChange = stats?.sales_change_pct
  const salesBadge  = salesChange != null
    ? `${salesChange >= 0 ? '+' : ''}${salesChange}%`
    : '—'

  return (
    <AdminLayout searchPlaceholder="Search orders, items...">
      <div className="dashboard">
        {/* Greeting */}
        <div className="dashboard__greeting">
          <h1 className="dashboard__greeting-title">{greeting}, {displayName}</h1>
          <p className="dashboard__greeting-sub">Here&apos;s what&apos;s happening at your café today.</p>
        </div>

        {/* Stats Row */}
        <div className="dashboard__stats">
          {/* Today's Sales */}
          <div className="stat-sales">
            <div className="stat-sales__label">TODAY&apos;S SALES</div>
            <div className="stat-sales__row">
              <span className="stat-sales__value">
                {loading ? '—' : `₹${Number(stats?.today_sales ?? 0).toLocaleString('en-IN')}`}
              </span>
              {salesChange != null && (
                <span className={`stat-sales__badge${salesChange < 0 ? ' stat-sales__badge--down' : ''}`}>
                  {salesBadge}
                </span>
              )}
            </div>
            <div className="stat-sales__sub">Compared to yesterday</div>
            <div className="stat-sales__icon"><TrendIcon /></div>
          </div>

          {/* Order Stats */}
          <div className="stat-orders">
            <div className="stat-orders__grid">
              <StatCard label="Today's Orders" value={loading ? '—' : stats?.today_orders ?? 0} />
              <StatCard label="Pending"         value={loading ? '—' : stats?.pending ?? 0} />
              <StatCard label="Preparing"       value={loading ? '—' : stats?.preparing ?? 0} />
              <StatCard label="Completed"       value={loading ? '—' : stats?.completed ?? 0} />
            </div>
          </div>

          {/* Active Tables */}
          <div className="stat-tables">
            <div className="stat-tables__dot" />
            <div className="stat-tables__label">ACTIVE TABLES</div>
            <div className="stat-tables__value">{loading ? '—' : stats?.active_tables ?? 0}</div>
            <div className="stat-tables__sub">Out of {stats?.total_tables ?? 0} total tables</div>
            <div className="stat-tables__watermark">{stats?.active_tables ?? 0}</div>
          </div>
        </div>

        {/* Middle Row */}
        <div className="dashboard__mid">
          {/* Sales Chart */}
          <div className="chart-card">
            <div className="chart-card__header">
              <h2 className="chart-card__title">Sales Overview</h2>
              <span className="chart-card__period">This Week</span>
            </div>
            <SalesChart data={chartData} />
          </div>

          {/* Right Column */}
          <div className="dashboard__right">
            {/* Quick Actions */}
            <div className="quick-actions">
              <h2 className="quick-actions__title">Quick Actions</h2>
              <button
                className="qa-btn qa-btn--dark"
                id="qa-new-order"
                onClick={() => navigate('/orders/new')}
              >
                <span className="qa-btn__icon"><PlusCircleIcon /></span>
                New Order
                <span className="qa-btn__chevron"><ChevronIcon /></span>
              </button>
              <button
                className="qa-btn qa-btn--outline"
                id="qa-manage-menu"
                onClick={() => navigate('/menu')}
              >
                <span className="qa-btn__icon"><MenuBookIcon /></span>
                Manage Menu
                <span className="qa-btn__chevron"><ChevronIcon /></span>
              </button>
              <button
                className="qa-btn qa-btn--outline"
                id="qa-view-reports"
                onClick={() => navigate('/reports')}
              >
                <span className="qa-btn__icon"><ReportIcon /></span>
                View Reports
                <span className="qa-btn__chevron"><ChevronIcon /></span>
              </button>
            </div>

            {/* Best Sellers */}
            <div className="best-sellers">
              <h2 className="best-sellers__title">
                <span className="best-sellers__star">☆</span> Best Sellers
              </h2>
              {loading ? (
                <div style={{ color: '#9ca3af', fontSize: 13, padding: '8px 0' }}>Loading…</div>
              ) : bestSellers.length === 0 ? (
                <div style={{ color: '#9ca3af', fontSize: 13, padding: '8px 0' }}>
                  No sales data yet. Complete some orders to see best sellers.
                </div>
              ) : (
                bestSellers.map((item, i) => (
                  <div
                    key={item.product_id || i}
                    className="best-seller-item"
                    style={{ cursor: item.product_id ? 'pointer' : 'default' }}
                    onClick={() => item.product_id && navigate(`/menu/edit/${item.product_id}`)}
                  >
                    <div className="best-seller-item__img">
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.name} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', background: '#1f2937', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>☕</div>
                      )}
                    </div>
                    <div className="best-seller-item__info">
                      <div className="best-seller-item__name">{item.name}</div>
                      <div className="best-seller-item__sold">{item.qty_sold} sold today</div>
                    </div>
                    <div className="best-seller-item__price">
                      ₹{item.price != null ? Number(item.price).toFixed(0) : '—'}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Recent Orders */}
        <div className="recent-orders">
          <div className="recent-orders__header">
            <h2 className="recent-orders__title">Recent Orders</h2>
            <button
              className="recent-orders__view-all"
              id="btn-view-all-orders"
              onClick={() => navigate('/orders')}
            >
              View All <span>→</span>
            </button>
          </div>
          <div className="table-wrap">
            <table className="orders-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Table</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} style={{ color: '#6b7280', textAlign: 'center', padding: 24 }}>Loading orders…</td></tr>
                ) : recentOrders.length === 0 ? (
                  <tr><td colSpan={6} style={{ color: '#6b7280', textAlign: 'center', padding: 24 }}>No orders yet. Create your first order!</td></tr>
                ) : (
                  recentOrders.map((order) => (
                    <tr
                      key={order.id}
                      onClick={() => navigate(`/orders/${order.id}`)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td className="order-id">{order.order_number}</td>
                      <td>{order.customer}</td>
                      <td>{order.table}</td>
                      <td className="order-items">{order.items}</td>
                      <td>₹{Number(order.total).toLocaleString('en-IN')}</td>
                      <td><StatusBadge status={order.status} /></td>
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

/* ── Icons ── */
function TrendIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
      <polyline points="17 6 23 6 23 12"/>
    </svg>
  )
}
function PlusCircleIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
    </svg>
  )
}
function MenuBookIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
    </svg>
  )
}
function ReportIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  )
}
function ChevronIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  )
}
