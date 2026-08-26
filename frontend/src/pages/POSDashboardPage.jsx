import React, { useState, useEffect } from 'react'
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
  const { orders, fetchOrders, tables, fetchTables, waiterRequests, fetchWaiterRequests, currentUser, currentCashier } = useApp()
  
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [toastMessage, setToastMessage] = useState('')
  const [selectedTable, setSelectedTable] = useState(null)

  // Load real data from backend on mount
  useEffect(() => {
    async function loadData() {
      setLoading(true)
      try {
        await Promise.all([
          fetchOrders(),
          fetchTables(),
          fetchWaiterRequests()
        ])
      } catch (err) {
        console.error('POSDashboardPage load error:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [fetchOrders, fetchTables, fetchWaiterRequests])

  // Show temporary toast notification
  const triggerToast = (msg) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(''), 3000)
  }

  const handleOpenBill = (req) => {
    if (req.orderId) {
      navigate(`/orders/${req.orderId}`)
    } else {
      triggerToast(`Opening billing options for Table ${req.table}. Amount: ₹${req.amount}`)
    }
  }

  const handleTableClick = (table) => {
    setSelectedTable(table)
    triggerToast(`Selected ${table.table} (${table.status}). ${table.orderId ? `Order: ${table.orderId}` : 'No active order'}`)
  }

  const handleQuickAction = (action) => {
    switch (action) {
      case 'new-order':
        triggerToast('Initiating New Order...')
        navigate('/orders/new')
        break
      case 'bill-requests':
        triggerToast('Navigating to Bill Requests...')
        navigate('/bill-requests')
        break
      case 'active-orders':
        triggerToast('Navigating to Orders...')
        navigate('/orders')
        break
      case 'transactions':
        triggerToast('Opening Transactions History...')
        navigate('/cashier/transactions')
        break
      default:
        break
    }
  }

  // Helper to check if a date is today
  const isToday = (dateStr) => {
    if (!dateStr) return false
    const date = new Date(dateStr)
    const today = new Date()
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
  }

  // Derive all stats and lists from real database state
  const todayOrdersList = (orders || []).filter(o => isToday(o.created_at))
  
  const completedTodayList = todayOrdersList.filter(o => 
    String(o.status || '').toUpperCase() === 'COMPLETED' || 
    String(o.status || '').toUpperCase() === 'PAID'
  )

  const todaySales = completedTodayList.reduce((sum, o) => sum + Number(o.total || 0), 0)
  const todayOrdersCount = todayOrdersList.length
  
  const pendingPayments = (orders || []).filter(o => 
    String(o.status || '').toUpperCase() === 'BILL_REQUESTED'
  ).length

  const completedPaymentsCount = (orders || []).filter(o => 
    (String(o.status || '').toUpperCase() === 'COMPLETED' || String(o.status || '').toUpperCase() === 'PAID') &&
    isToday(o.completed_at || o.created_at)
  ).length

  const cashCollection = completedTodayList
    .filter(o => (o.payment_method || '').toLowerCase() === 'cash')
    .reduce((sum, o) => sum + Number(o.total || 0), 0)

  const upiCollection = completedTodayList
    .filter(o => (o.payment_method || '').toLowerCase() === 'upi')
    .reduce((sum, o) => sum + Number(o.total || 0), 0)

  const cardCollection = completedTodayList
    .filter(o => (o.payment_method || '').toLowerCase() === 'card')
    .reduce((sum, o) => sum + Number(o.total || 0), 0)

  const activeTablesCount = (tables || []).filter(t => 
    String(t.status || '').toLowerCase() === 'occupied' || 
    String(t.status || '').toLowerCase() === 'bill_requested'
  ).length
  
  const totalTablesCount = (tables || []).length

  // Filter requests that are Bill Requests and not completed
  const pendingBillRequests = (waiterRequests || []).filter(r => 
    (r.request_type === 'Bill Request' || r.type === 'Bill Request' || (r.message && r.message.toLowerCase().includes('bill'))) &&
    String(r.status || '').toLowerCase() !== 'completed'
  ).map(r => ({
    id: r.id,
    table: r.tableName ?? r.table_name ?? r.table_id ?? (r.table ? (typeof r.table === 'object' ? r.table.name : `Table ${r.table}`) : 'undefined'),
    orderId: r.orderId ?? r.order_id ?? (r.order ? (typeof r.order === 'object' ? r.order.id : r.order) : null),
    amount: r.amount ?? 0,
    waiter: r.waiter_name || 'Waiter',
    status: r.status
  }))

  const tableStatusList = (tables || []).map(t => ({
    id: t.id,
    table: t.name || `Table ${t.id}`,
    status: t.status || 'available',
    orderId: t.current_order_ref || null
  }))

  const recentTransactions = (orders || [])
    .filter(o => String(o.status || '').toUpperCase() === 'COMPLETED' || String(o.status || '').toUpperCase() === 'PAID')
    .slice(0, 5)
    .map(o => ({
      id: o.id,
      invoice: o.invoice_number || `INV-${String(o.id).padStart(5, '0')}`,
      order: o.order_number || `#${o.id}`,
      table: o.table_label || 'Takeaway',
      method: (o.payment_method || 'cash').toUpperCase(),
      total: Number(o.total || 0),
      time: o.completed_at ? new Date(o.completed_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'
    }))

  const totalCollected = cashCollection + upiCollection + cardCollection || 1
  const paymentBreakdownData = [
    { method: 'Cash', amount: cashCollection, percentage: Math.round((cashCollection / totalCollected) * 100) },
    { method: 'UPI', amount: upiCollection, percentage: Math.round((upiCollection / totalCollected) * 100) },
    { method: 'Card', amount: cardCollection, percentage: Math.round((cardCollection / totalCollected) * 100) }
  ]

  // Filter lists based on header search
  const filteredTables = tableStatusList.filter(t => 
    t.table.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.status.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (t.orderId && t.orderId.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const filteredBillRequests = pendingBillRequests.filter(req => 
    req.table.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (req.orderId && String(req.orderId).toLowerCase().includes(searchQuery.toLowerCase())) ||
    req.waiter.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Configure branch and cashier details
  const branchName = currentCashier?.branch_name || currentUser?.branch?.name || 'Kozhikode'
  const terminalName = currentCashier?.terminal?.name || currentUser?.terminal_name || 'Terminal 01'
  const cashierName = currentCashier?.name || currentUser?.username || 'Cashier 01'

  const headerRight = (
    <div className="header-branch-terminal" style={{ marginRight: '16px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', fontSize: '11px', color: 'var(--color-text-secondary)' }}>
      <span style={{ fontWeight: '600' }}>{branchName}</span>
      <span style={{ color: 'var(--color-text-muted)' }}>POS Terminal: {terminalName}</span>
    </div>
  )

  // Welcome / Greeting
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  if (loading) {
    return (
      <AdminLayout 
        searchPlaceholder="Search orders, tables..."
        headerRight={headerRight}
        pageTitle="POS Dashboard"
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
          <span style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-sans)', fontSize: '14px' }}>Loading POS dashboard data...</span>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout 
      searchPlaceholder="Search orders, tables..."
      headerRight={headerRight}
      pageTitle="POS Dashboard"
    >
      <div className="pos-dashboard">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div className="pos-dashboard__greeting">
            <h1 className="pos-dashboard__greeting-title">{greeting}, {cashierName}</h1>
            <p className="pos-dashboard__greeting-sub">Here's what's happening at your POS today.</p>
            <div className="pos-dashboard__terminal-badge">
              <span>{branchName}</span>
              <span>•</span>
              <span>{terminalName}</span>
            </div>
          </div>

          <div className="form-group" style={{ width: '280px' }}>
            <input 
              type="text" 
              className="form-input" 
              placeholder="Search table, order, waiter..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ padding: '8px 12px', fontSize: '13px' }}
            />
          </div>
        </div>

        {/* ROW 1: Statistics Cards */}
        <div className="pos-dashboard__stats-grid">
          <POSStatCard 
            label="TODAY'S SALES" 
            value={`₹${todaySales.toLocaleString('en-IN')}`} 
            sub="Compared to yesterday" 
            trend="+8.5%"
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

        {/* Extended Stats (Collections) */}
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

        {/* Search Results / Normal Dashboard View */}
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

            {/* ROW 3: Pending Bill Requests + Payment Breakdown */}
            <div className="pos-dashboard__row-three">
              <div className="pos-section-card">
                <div className="pos-section-card__header">
                  <h2 className="pos-section-card__title">Pending Bill Requests</h2>
                  <button className="pos-section-card__view-all" onClick={() => navigate('/bill-requests')}>
                    View All Bill Requests <span>→</span>
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
                  <button className="pos-section-card__view-all" onClick={() => navigate('/tables')}>
                    View All Tables <span>→</span>
                  </button>
                </div>
                <TableStatusCard tables={tableStatusList} onTableClick={handleTableClick} />
              </div>

              <div className="pos-section-card" style={{ padding: '22px 0 0 0' }}>
                <div className="pos-section-card__header" style={{ padding: '0 24px 14px 24px', borderBottom: '1px solid var(--color-border-light)' }}>
                  <h2 className="pos-section-card__title">Recent Transactions</h2>
                  <button className="pos-section-card__view-all" onClick={() => navigate('/cashier/transactions')}>
                    View All Transactions <span>→</span>
                  </button>
                </div>
                <RecentTransactionsTable transactions={recentTransactions} onInvoiceClick={(tx) => navigate(`/orders/${tx.id}/invoice`)} />
              </div>
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

