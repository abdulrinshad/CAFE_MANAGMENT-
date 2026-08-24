import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminLayout from '../layouts/AdminLayout'
import POSStatCard from '../components/pos/POSStatCard'
import SalesOverviewChart from '../components/pos/SalesOverviewChart'
import PendingBillRequestCard from '../components/pos/PendingBillRequestCard'
import TableStatusCard from '../components/pos/TableStatusCard'
import RecentTransactionsTable from '../components/pos/RecentTransactionsTable'
import PaymentBreakdown from '../components/pos/PaymentBreakdown'
import POSQuickActions from '../components/pos/POSQuickActions'
import POSActivityFeed from '../components/pos/POSActivityFeed'
import { useApp } from '../context/AppContext'
import './POSDashboardPage.css'

export default function POSDashboardPage() {
  const navigate = useNavigate()
  const {
    orders,
    tables,
    waiterRequests,
    notifications,
    fetchOrders,
    fetchTables,
    fetchWaiterRequests,
    fetchNotifications,
    currentUser,
    currentCashier,
    currentWaiter,
    currentBranch,
  } = useApp()

  const [searchQuery, setSearchQuery]   = useState('')
  const [loading, setLoading]           = useState(true)
  const [toastMessage, setToastMessage] = useState('')

  // ── Polling & Data Fetching ──────────────────────────────────────────────────
  const refreshAll = useCallback(async () => {
    try {
      await Promise.allSettled([
        fetchOrders && fetchOrders(),
        fetchTables && fetchTables(),
        fetchWaiterRequests && fetchWaiterRequests(),
        fetchNotifications && fetchNotifications(),
      ])
    } catch (err) {
      console.error('Cashier Dashboard refresh error:', err)
    }
  }, [fetchOrders, fetchTables, fetchWaiterRequests, fetchNotifications])

  useEffect(() => {
    let timer
    async function init() {
      setLoading(true)
      await refreshAll()
      setLoading(false)
    }
    init()

    // 4-second background refresh polling
    timer = setInterval(() => {
      refreshAll()
    }, 4000)

    return () => clearInterval(timer)
  }, [refreshAll])

  const triggerToast = (msg) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(''), 3000)
  }

  // ── Dynamic Cashier Identity & Terminal ──────────────────────────────────────
  const cashierDisplayName = (() => {
    if (currentUser) {
      const first = (currentUser.first_name || '').trim()
      const last  = (currentUser.last_name  || '').trim()
      if (first && last) return `${first} ${last}`
      if (first)         return first
      if (currentUser.email && currentUser.email.includes('@')) {
        const handle = currentUser.email.split('@')[0]
        return handle.charAt(0).toUpperCase() + handle.slice(1)
      }
      if (currentUser.username && !currentUser.username.startsWith('cashier_')) {
        return currentUser.username
      }
    }
    if (currentCashier?.name) return currentCashier.name
    if (currentWaiter?.name)  return currentWaiter.name
    return 'Cashier'
  })()

  const branchName = currentBranch?.name || currentUser?.branch?.name || currentUser?.branch_name || 'Kochi Main Branch'
  const terminalName = currentUser?.terminal_name || 'Cashier Terminal'

  const headerRight = (
    <div className="header-branch-terminal" style={{ marginRight: '16px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', fontSize: '11px', color: 'var(--color-text-secondary)' }}>
      <span style={{ fontWeight: '600' }}>{branchName}</span>
      <span style={{ color: 'var(--color-text-muted)' }}>{terminalName}</span>
    </div>
  )

  // ── Derived Dynamic POS Statistics & Collections ────────────────────────────
  const isToday = (dateStr) => {
    if (!dateStr) return false
    const date = new Date(dateStr)
    const today = new Date()
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
  }

  const todayOrdersList = (orders || []).filter(o => {
    if (o.created_at) return isToday(o.created_at)
    return true
  })

  const completedOrders = (orders || []).filter(o => {
    const statusUpper = String(o.status || '').toUpperCase()
    return statusUpper === 'COMPLETED' || statusUpper === 'PAID'
  })

  const completedTodayList = todayOrdersList.filter(o => {
    const statusUpper = String(o.status || '').toUpperCase()
    return statusUpper === 'COMPLETED' || statusUpper === 'PAID'
  })

  const todaySales = completedTodayList.reduce((sum, o) => sum + Number(o.total || o.amount || 0), 0)
  const todayOrdersCount = todayOrdersList.length

  const pendingPayments = (orders || []).filter(o => {
    const st = String(o.status || '').toUpperCase()
    return st === 'PENDING' || st === 'IN_PROGRESS' || st === 'BILL_REQUESTED' || st === 'PREPARING' || st === 'READY'
  }).length

  const completedPaymentsCount = completedOrders.length

  const cashCollection = completedTodayList
    .filter(o => (o.payment_method || o.method || 'cash').toLowerCase() === 'cash')
    .reduce((sum, o) => sum + Number(o.total || o.amount || 0), 0)

  const upiCollection = completedTodayList
    .filter(o => (o.payment_method || o.method || '').toLowerCase() === 'upi')
    .reduce((sum, o) => sum + Number(o.total || o.amount || 0), 0)

  const cardCollection = completedTodayList
    .filter(o => (o.payment_method || o.method || '').toLowerCase() === 'card')
    .reduce((sum, o) => sum + Number(o.total || o.amount || 0), 0)

  const activeTablesCount = (tables || []).filter(t => {
    const st = String(t.status || 'available').toLowerCase()
    return st !== 'available'
  }).length
  const totalTablesCount = (tables || []).length || 12
  const availableTablesCount = Math.max(0, totalTablesCount - activeTablesCount)

  // ── Dynamic Pending Bill Requests ─────────────────────────────────────────
  const pendingBillRequestsRaw = (waiterRequests || []).filter(r => {
    const typeStr = (r.request_type || r.type || '').toLowerCase()
    const msgStr  = (r.message || '').toLowerCase()
    const statusStr = String(r.status || '').toLowerCase()
    const isBillReq = typeStr.includes('bill') || msgStr.includes('bill')
    return isBillReq && statusStr !== 'completed'
  })

  const pendingBillRequests = pendingBillRequestsRaw.map(r => {
    const tableIdNum = String(r.tableId || r.tableFK || r.table_id || (r.table && typeof r.table === 'object' ? r.table.id : r.table) || '').replace(/\D/g, '')
    const matchedOrder = (orders || []).find(
      o => (r.orderId && (o.id === r.orderId || o.order_number === r.orderId)) ||
           (r.order_id && (o.id === r.order_id || o.order_number === r.order_id)) ||
           (tableIdNum && (o.table === `Table ${tableIdNum}` || o.table === r.tableId || String(o.table_id) === tableIdNum))
    )

    const tableDisplayName = r.tableName ?? r.table_name ?? (r.table ? (typeof r.table === 'object' ? r.table.name : `Table ${r.table}`) : (r.tableId ? String(r.tableId).replace(/\D/g, '') : '1'))

    return {
      id: r.id,
      table: tableDisplayName,
      orderId: matchedOrder ? (matchedOrder.order_number || `#${matchedOrder.id}`) : (r.orderId || r.order_id || r.orderRef || `#${r.id}`),
      rawOrderId: matchedOrder ? matchedOrder.id : (r.order_id || r.orderId || r.id),
      waiter: r.assignedWaiter || r.waiter_name || r.waiter || 'Staff',
      amount: r.amount || (matchedOrder ? Number(matchedOrder.total || matchedOrder.amount || 0) : 0),
      requestedAt: r.time || (r.created_at ? new Date(r.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'Just now'),
      status: r.status === 'completed' ? 'Completed' : 'Payment Pending',
      items: matchedOrder ? (matchedOrder.items_summary || (matchedOrder.items ? matchedOrder.items.map(i => `${i.name || i.product_name} ×${i.quantity || i.qty}`).join(', ') : 'Active Bill Items')) : 'Bill requested by customer',
    }
  })

  // ── Dynamic Table Status Grid ─────────────────────────────────────────────
  const tableStatusList = (tables || []).map(t => {
    let displayStatus = 'Available'
    const statusLower = String(t.status || 'available').toLowerCase()
    if (statusLower === 'occupied') displayStatus = 'Occupied'
    else if (statusLower === 'bill_requested' || statusLower === 'bill requested') displayStatus = 'Bill Requested'
    else if (statusLower === 'payment_pending' || statusLower === 'payment pending') displayStatus = 'Payment Pending'
    else if (statusLower === 'order_in_progress') displayStatus = 'Order in Progress'

    const tableOrder = (orders || []).find(o => (o.table === t.name || o.table_id === t.id) && String(o.status || '').toLowerCase() !== 'completed' && String(o.status || '').toLowerCase() !== 'cancelled')

    return {
      id: t.id,
      table: t.name || `Table ${t.id}`,
      status: displayStatus,
      rawStatus: statusLower,
      orderId: tableOrder ? (tableOrder.order_number || `#${tableOrder.id}`) : (t.current_order_ref || t.activeOrderId || null),
      rawOrderId: tableOrder ? tableOrder.id : null,
    }
  })

  // ── Dynamic Recent Transactions Table ──────────────────────────────────────
  const recentTransactions = completedOrders.slice(0, 5).map(o => ({
    id: o.id,
    invoice: o.invoice_number || `INV-${String(o.id).padStart(5, '0')}`,
    order: o.order_number || `#${o.id}`,
    target: o.table_label || (o.table ? String(o.table) : 'Takeaway'),
    table: o.table_label || (o.table ? String(o.table) : 'Takeaway'),
    method: (o.payment_method || o.method || 'cash').toUpperCase(),
    amount: Number(o.total || o.amount || 0),
    total: Number(o.total || o.amount || 0),
    status: 'Completed',
    time: o.completed_at ? new Date(o.completed_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : (o.created_at ? new Date(o.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'Today'),
  }))

  // ── Dynamic Recent Orders ──────────────────────────────────────────────────
  const recentOrdersList = (orders || []).slice(0, 5).map(o => ({
    id: o.id,
    orderNumber: o.order_number || `#${o.id}`,
    tableLabel: o.table_label || (o.table ? String(o.table) : 'Takeaway'),
    itemsCount: o.item_count || (o.items ? o.items.length : 1),
    total: Number(o.total || o.amount || 0),
    status: o.status || 'pending',
    time: o.created_at ? new Date(o.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'Just now',
  }))

  // ── Dynamic Payment Breakdown Data ──────────────────────────────────────────
  const totalCompletedAmount = cashCollection + upiCollection + cardCollection || 1
  const paymentBreakdownData = [
    { method: 'UPI',  amount: upiCollection,  percentage: Math.round((upiCollection / totalCompletedAmount) * 100) },
    { method: 'CASH', amount: cashCollection, percentage: Math.round((cashCollection / totalCompletedAmount) * 100) },
    { method: 'CARD', amount: cardCollection, percentage: Math.round((cardCollection / totalCompletedAmount) * 100) },
  ]

  // ── Dynamic Activity Feed ──────────────────────────────────────────────────
  const recentActivities = (notifications || []).slice(0, 5).map(n => ({
    id: n.id,
    type: (n.type || 'request').toLowerCase(),
    title: n.title || 'Notification',
    description: n.message || n.text || 'System update',
    time: n.time || (n.created_at ? new Date(n.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'Recently'),
  }))

  // ── Action Handlers ────────────────────────────────────────────────────────
  const handleOpenBill = (req) => {
    if (req.rawOrderId) {
      navigate(`/orders/${req.rawOrderId}/invoice`)
    } else {
      navigate('/cashier/bill-requests')
    }
  }

  const handleTableClick = (table) => {
    if (table.rawOrderId) {
      navigate(`/orders/${table.rawOrderId}/invoice`)
    } else {
      navigate('/cashier/tables')
    }
  }

  const handleQuickAction = (action) => {
    switch (action) {
      case 'new-order':
        navigate('/orders/new')
        break
      case 'bill-requests':
        navigate('/cashier/bill-requests')
        break
      case 'active-orders':
        navigate('/cashier/orders')
        break
      case 'transactions':
        navigate('/cashier/transactions')
        break
      default:
        break
    }
  }

  // Header Search Filters
  const filteredTables = tableStatusList.filter(t =>
    t.table.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.status.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (t.orderId && String(t.orderId).toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const filteredBillRequests = pendingBillRequests.filter(req =>
    req.table.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (req.orderId && String(req.orderId).toLowerCase().includes(searchQuery.toLowerCase())) ||
    req.waiter.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Welcome / Greeting
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  if (loading) {
    return (
      <AdminLayout
        searchPlaceholder="Search orders, tables..."
        headerRight={headerRight}
        pageTitle="Cashier Dashboard"
      >
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
          <div style={{
            border: '4px solid rgba(44, 24, 16, 0.1)',
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            borderLeftColor: 'var(--color-tan)',
            animation: 'spin 1s linear infinite',
            marginBottom: '1rem'
          }}></div>
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
          <span style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-sans)', fontSize: '14px' }}>Loading cashier dashboard...</span>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout
      searchPlaceholder="Search orders, tables..."
      headerRight={headerRight}
      pageTitle="Cashier Dashboard"
    >
      <div className="pos-dashboard">
        {/* Header Greeting */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div className="pos-dashboard__greeting">
            <h1 className="pos-dashboard__greeting-title">{greeting}, {cashierDisplayName} 👋</h1>
            <p className="pos-dashboard__greeting-sub">Here's what's happening at your cashier today.</p>
            <div className="pos-dashboard__terminal-badge">
              <span>{branchName}</span>
              <span>•</span>
              <span>{terminalName}</span>
            </div>
          </div>

          {/* Search Bar */}
          <div className="form-group" style={{ width: '280px' }}>
            <input
              type="text"
              className="form-input"
              placeholder="Search table, order, waiter..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ padding: '8px 12px', fontSize: '13px' }}
              id="cashier-dashboard-search"
            />
          </div>
        </div>

        {/* ROW 1: Primary Statistics Cards */}
        <div className="pos-dashboard__stats-grid">
          <POSStatCard
            label="TODAY'S SALES"
            value={`₹${todaySales.toLocaleString('en-IN')}`}
            sub="Live revenue today"
            variant="sales"
          />
          <POSStatCard
            label="TODAY'S ORDERS"
            value={todayOrdersCount}
          />
          <POSStatCard
            label="PENDING PAYMENTS"
            value={pendingPayments}
            sub="Awaiting bill settlement"
          />
          <POSStatCard
            label="COMPLETED PAYMENTS"
            value={completedPaymentsCount}
          />
        </div>

        {/* Extended Stats Grid: Collections & Tables */}
        <div className="pos-dashboard__stats-grid" style={{ marginTop: '-8px' }}>
          <POSStatCard
            label="CASH COLLECTION"
            value={`₹${cashCollection.toLocaleString('en-IN')}`}
          />
          <POSStatCard
            label="UPI COLLECTION"
            value={`₹${upiCollection.toLocaleString('en-IN')}`}
          />
          <POSStatCard
            label="CARD COLLECTION"
            value={`₹${cardCollection.toLocaleString('en-IN')}`}
          />
          <POSStatCard
            label="ACTIVE TABLES"
            value={`${activeTablesCount}`}
            sub={`Out of ${totalTablesCount} total tables`}
            variant="dark"
            dot={true}
          />
        </div>

        {/* Search Results / Main View */}
        {searchQuery ? (
          <div className="search-results-overlay">
            <h3 style={{ fontFamily: 'var(--font-serif)', color: 'var(--color-espresso)', marginBottom: '16px' }}>
              Search Results for "{searchQuery}"
            </h3>

            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '10px' }}>Matching Tables ({filteredTables.length})</h4>
              {filteredTables.length > 0 ? (
                <TableStatusCard tables={filteredTables} onTableClick={handleTableClick} />
              ) : (
                <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>No tables found matching query.</p>
              )}
            </div>

            <div>
              <h4 style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '10px' }}>Matching Bill Requests ({filteredBillRequests.length})</h4>
              {filteredBillRequests.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                  {filteredBillRequests.map(req => (
                    <PendingBillRequestCard key={req.id} req={req} onOpenBill={handleOpenBill} />
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>No bill requests found matching query.</p>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* ROW 2: Sales Overview Chart + Quick Actions */}
            <div className="pos-dashboard__row-two">
              <SalesOverviewChart />
              <POSQuickActions onAction={handleQuickAction} />
            </div>

            {/* ROW 3: Recent Orders Table & Pending Bill Requests & Payment Breakdown */}
            <div className="pos-dashboard__row-three">
              <div className="pos-section-card">
                <div className="pos-section-card__header">
                  <h2 className="pos-section-card__title">Recent Orders</h2>
                  <button className="pos-section-card__view-all" onClick={() => navigate('/cashier/orders')}>
                    View All Orders <span>→</span>
                  </button>
                </div>
                {recentOrdersList.length > 0 ? (
                  <div className="table-wrap">
                    <table className="orders-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                      <thead>
                        <tr>
                          <th style={{ padding: '10px 14px', background: 'var(--color-bg)', fontSize: '11px', fontWeight: '500', color: 'var(--color-text-muted)', textAlign: 'left' }}>Order ID</th>
                          <th style={{ padding: '10px 14px', background: 'var(--color-bg)', fontSize: '11px', fontWeight: '500', color: 'var(--color-text-muted)', textAlign: 'left' }}>Table</th>
                          <th style={{ padding: '10px 14px', background: 'var(--color-bg)', fontSize: '11px', fontWeight: '500', color: 'var(--color-text-muted)', textAlign: 'left' }}>Items</th>
                          <th style={{ padding: '10px 14px', background: 'var(--color-bg)', fontSize: '11px', fontWeight: '500', color: 'var(--color-text-muted)', textAlign: 'left' }}>Amount</th>
                          <th style={{ padding: '10px 14px', background: 'var(--color-bg)', fontSize: '11px', fontWeight: '500', color: 'var(--color-text-muted)', textAlign: 'left' }}>Status</th>
                          <th style={{ padding: '10px 14px', background: 'var(--color-bg)', fontSize: '11px', fontWeight: '500', color: 'var(--color-text-muted)', textAlign: 'left' }}>Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentOrdersList.map(o => (
                          <tr key={o.id} onClick={() => navigate(`/orders/${o.id}`)} style={{ cursor: 'pointer' }} className="table-row-hover">
                            <td style={{ padding: '10px 14px', borderTop: '1px solid var(--color-border-light)', fontWeight: '600' }}>{o.orderNumber}</td>
                            <td style={{ padding: '10px 14px', borderTop: '1px solid var(--color-border-light)' }}>{o.tableLabel}</td>
                            <td style={{ padding: '10px 14px', borderTop: '1px solid var(--color-border-light)' }}>{o.itemsCount} {o.itemsCount === 1 ? 'Item' : 'Items'}</td>
                            <td style={{ padding: '10px 14px', borderTop: '1px solid var(--color-border-light)', fontWeight: '600' }}>₹{o.total.toFixed(2)}</td>
                            <td style={{ padding: '10px 14px', borderTop: '1px solid var(--color-border-light)' }}>
                              <span className={`badge badge--${o.status.toLowerCase()}`}>
                                {o.status.toUpperCase()}
                              </span>
                            </td>
                            <td style={{ padding: '10px 14px', borderTop: '1px solid var(--color-border-light)', color: 'var(--color-text-muted)' }}>{o.time}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', padding: '16px 0' }}>
                    No recent orders.
                  </p>
                )}
              </div>

              {/* Pending Bill Requests Card */}
              <div className="pos-section-card">
                <div className="pos-section-card__header">
                  <h2 className="pos-section-card__title">Pending Bill Requests</h2>
                  <button className="pos-section-card__view-all" onClick={() => navigate('/cashier/bill-requests')}>
                    View All <span>→</span>
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
                  {pendingBillRequests.length > 0 ? (
                    pendingBillRequests.map(req => (
                      <PendingBillRequestCard key={req.id} req={req} onOpenBill={handleOpenBill} />
                    ))
                  ) : (
                    <div style={{ padding: '20px', color: 'var(--color-text-muted)', fontSize: '13px' }}>No pending bill requests.</div>
                  )}
                </div>
              </div>

              <PaymentBreakdown data={paymentBreakdownData} />
            </div>

            {/* ROW 4: Active Tables Overview + Recent Transactions */}
            <div className="pos-dashboard__row-four">
              <div className="pos-section-card">
                <div className="pos-section-card__header">
                  <h2 className="pos-section-card__title">Active Tables Status</h2>
                  <button className="pos-section-card__view-all" onClick={() => navigate('/cashier/tables')}>
                    View All Tables <span>→</span>
                  </button>
                </div>
                {tableStatusList.length > 0 ? (
                  <TableStatusCard tables={tableStatusList} onTableClick={handleTableClick} />
                ) : (
                  <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>No tables configured.</p>
                )}
              </div>

              <div className="pos-section-card" style={{ padding: '22px 0 0 0' }}>
                <div className="pos-section-card__header" style={{ padding: '0 24px 14px 24px', borderBottom: '1px solid var(--color-border-light)' }}>
                  <h2 className="pos-section-card__title">Recent Completed Transactions</h2>
                  <button className="pos-section-card__view-all" onClick={() => navigate('/cashier/transactions')}>
                    View All Transactions <span>→</span>
                  </button>
                </div>
                {recentTransactions.length > 0 ? (
                  <RecentTransactionsTable
                    transactions={recentTransactions}
                    onInvoiceClick={(tx) => {
                      if (tx.id) navigate(`/orders/${tx.id}/invoice`)
                      else navigate('/cashier/transactions')
                    }}
                  />
                ) : (
                  <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', padding: '20px 24px' }}>
                    No recent completed transactions.
                  </p>
                )}
              </div>
            </div>

            {/* ROW 5: Recent Activity */}
            <div className="pos-dashboard__row-five">
              {recentActivities.length > 0 && <POSActivityFeed activities={recentActivities} />}
            </div>
          </>
        )}
      </div>

      {toastMessage && (
        <div className="pos-toast">
          {toastMessage}
        </div>
      )}
    </AdminLayout>
  )
}
