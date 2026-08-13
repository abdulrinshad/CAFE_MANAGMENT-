import { useNavigate } from 'react-router-dom'
import AdminLayout from '../layouts/AdminLayout'
import { useApp } from '../context/AppContext'
import { recentOrders, bestSellers, salesChartData } from '../data/mockData'
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

/* ── Sales Chart ── */
function SalesChart({ data }) {
  const max = Math.max(...data.map((d) => d.value))
  const yLabels = [25000, 15000, 5000, 0]

  return (
    <div className="chart">
      <div className="chart__y-axis">
        {yLabels.map((v) => (
          <span key={v} className="chart__y-label">
            {v === 0 ? '0' : `₹${v / 1000}k`}
          </span>
        ))}
      </div>
      <div className="chart__bars-wrap">
        <div className="chart__grid">
          {yLabels.slice(0, -1).map((v) => (
            <div key={v} className="chart__grid-line" style={{ bottom: `${(v / 28000) * 100}%` }} />
          ))}
        </div>
        <div className="chart__bars">
          {data.map((d) => (
            <div key={d.day} className="chart__bar-col">
              <div
                className={`chart__bar${d.day === 'Thu' ? ' chart__bar--active' : ''}`}
                style={{ height: `${(d.value / 28000) * 100}%` }}
                title={`₹${d.value.toLocaleString()}`}
              />
              <span className="chart__bar-label">{d.day}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ── Status Badge ── */
function StatusBadge({ status }) {
  const cls = {
    PREPARING: 'badge--preparing',
    PENDING:   'badge--pending',
    COMPLETED: 'badge--completed',
  }[status] || ''
  const short = { PREPARING: 'PREPAR...', PENDING: 'PENDING', COMPLETED: 'COMPL...' }[status] || status
  return <span className={`badge ${cls}`}>{short}</span>
}

/* ── Dashboard Page ── */
export default function DashboardPage() {
  const navigate = useNavigate()
  const { currentRole, currentWaiter, waiterRequests, tables, orders, updateRequestStatus, dismissRequest } = useApp()

  // Waiter Stats calculation
  const occupiedTablesCount = tables ? tables.filter(t => t.status === 'occupied').length : 0
  const activeRequestsCount = waiterRequests ? waiterRequests.filter(r => r.status === 'new').length : 0
  const activeOrdersCount = orders ? orders.filter(o => o.status === 'PREPARING' || o.status === 'NEW').length : 0
  const pendingBillsCount = tables ? tables.filter(t => t.status === 'needs_attention').length : 0

  if (currentRole === 'waiter') {
    return (
      <AdminLayout 
        searchPlaceholder="Search active tables, orders..."
        pageTitle="Dashboard"
        pageIcon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>}
      >
        <div className="dashboard">
          {/* Greeting */}
          <div className="dashboard__greeting">
            <h1 className="dashboard__greeting-title">Good morning, {currentWaiter?.name || 'Waiter'}</h1>
            <p className="dashboard__greeting-sub">Current Shift Performance &middot; {currentWaiter?.station || 'Station'}</p>
          </div>

          {/* Quick CTA to create order */}
          <div className="dashboard__waiter-cta">
            <div className="waiter-cta__card">
              <div className="waiter-cta__info">
                <h3>Serve a Table</h3>
                <p>Start a new order, add items, or process payment requests.</p>
              </div>
              <button className="btn-primary" onClick={() => navigate('/tables')}>
                Create New Order
              </button>
            </div>
          </div>

          {/* Stats Row */}
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
                <span className="waiter-stat-card__lbl">Active Requests</span>
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

          {/* Recent Requests Section */}
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
                      <span className="request-table-badge">Table {req.tableId.replace('T-', '')}</span>
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
                          <button 
                            className="btn-outline btn-sm"
                            onClick={() => dismissRequest(req.id)}
                          >
                            Dismiss
                          </button>
                          <button 
                            className="btn-primary btn-sm"
                            onClick={() => updateRequestStatus(req.id, 'in_progress')}
                          >
                            Accept
                          </button>
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

  return (
    <AdminLayout searchPlaceholder="Search orders, items...">
      <div className="dashboard">
        {/* Greeting */}
        <div className="dashboard__greeting">
          <h1 className="dashboard__greeting-title">Good morning, Owner</h1>
          <p className="dashboard__greeting-sub">Here&apos;s what&apos;s happening at your café today.</p>
        </div>

        {/* Stats Row */}
        <div className="dashboard__stats">
          {/* Today's Sales */}
          <div className="stat-sales">
            <div className="stat-sales__label">TODAY'S SALES</div>
            <div className="stat-sales__row">
              <span className="stat-sales__value">₹18,450</span>
              <span className="stat-sales__badge">+ 12%</span>
            </div>
            <div className="stat-sales__sub">Compared to yesterday</div>
            <div className="stat-sales__icon">
              <TrendIcon />
            </div>
          </div>

          {/* Order Stats */}
          <div className="stat-orders">
            <div className="stat-orders__grid">
              <StatCard label="Today's Orders" value="48" />
              <StatCard label="Pending" value="5" />
              <StatCard label="Preparing" value="3" />
              <StatCard label="Completed" value="40" />
            </div>
          </div>

          {/* Active Tables */}
          <div className="stat-tables">
            <div className="stat-tables__dot" />
            <div className="stat-tables__label">ACTIVE TABLES</div>
            <div className="stat-tables__value">8</div>
            <div className="stat-tables__sub">Out of 15 total tables</div>
            <div className="stat-tables__watermark">5</div>
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
            <SalesChart data={salesChartData} />
          </div>

          {/* Right Column */}
          <div className="dashboard__right">
            {/* Quick Actions */}
            <div className="quick-actions">
              <h2 className="quick-actions__title">Quick Actions</h2>
              <button
                className="qa-btn qa-btn--dark"
                id="qa-new-order"
                onClick={() => {}}
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
                onClick={() => {}}
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
              {bestSellers.map((item) => (
                <div key={item.id} className="best-seller-item">
                  <div className="best-seller-item__img">
                    <img src={item.image} alt={item.name} />
                  </div>
                  <div className="best-seller-item__info">
                    <div className="best-seller-item__name">{item.name}</div>
                    <div className="best-seller-item__sold">{item.soldToday} sold today</div>
                  </div>
                  <div className="best-seller-item__price">₹{item.price}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Orders */}
        <div className="recent-orders">
          <div className="recent-orders__header">
            <h2 className="recent-orders__title">Recent Orders</h2>
            <button className="recent-orders__view-all" id="btn-view-all-orders">
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
                {recentOrders.map((order) => (
                  <tr key={order.id}>
                    <td className="order-id">{order.id}</td>
                    <td>{order.customer}</td>
                    <td>{order.table}</td>
                    <td className="order-items">{order.items}</td>
                    <td>₹{order.total}</td>
                    <td><StatusBadge status={order.status} /></td>
                  </tr>
                ))}
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
