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
import {
  posConfig,
  posStats,
  pendingBillRequests,
  tableStatusList,
  recentTransactions,
  paymentBreakdownData,
  recentActivities
} from '../data/posMockData'
import './POSDashboardPage.css'

export default function POSDashboardPage() {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [toastMessage, setToastMessage] = useState('')
  const [selectedTable, setSelectedTable] = useState(null)

  // Simulate loading state on mount
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 600)
    return () => clearTimeout(timer)
  }, [])

  // Show temporary toast notification
  const triggerToast = (msg) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(''), 3000)
  }

  const handleOpenBill = (req) => {
    triggerToast(`Opening billing options for Table ${req.table} (${req.orderId}). Amount: ₹${req.amount}`)
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

  // Filter tables and bill requests based on header search
  const filteredTables = tableStatusList.filter(t => 
    t.table.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.status.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (t.orderId && t.orderId.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const filteredBillRequests = pendingBillRequests.filter(req => 
    req.table.toLowerCase().includes(searchQuery.toLowerCase()) ||
    req.orderId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    req.waiter.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const headerRight = (
    <div className="header-branch-terminal" style={{ marginRight: '16px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', fontSize: '11px', color: 'var(--color-text-secondary)' }}>
      <span style={{ fontWeight: '600' }}>{posConfig.branch}</span>
      <span style={{ color: 'var(--color-text-muted)' }}>POS Terminal: {posConfig.terminal}</span>
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
        {/* Search Input binding from AdminLayout header input */}
        {/* Note: In a fully wired app, the Search input in the layout would populate AppContext or search params. 
            Here we will simulate this by checking if there's any search text. We also place an inline search filter for testing. */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div className="pos-dashboard__greeting">
            <h1 className="pos-dashboard__greeting-title">{greeting}, {posConfig.cashier}</h1>
            <p className="pos-dashboard__greeting-sub">Here's what's happening at your POS today.</p>
            <div className="pos-dashboard__terminal-badge">
              <span>{posConfig.branch}</span>
              <span>•</span>
              <span>{posConfig.terminal}</span>
            </div>
          </div>

          {/* Quick Search Bar within Dashboard in case header input isn't fully bound */}
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
            value={`₹${posStats.todaySales.toLocaleString('en-IN')}`} 
            sub="Compared to yesterday" 
            trend={posStats.salesTrend}
            variant="sales"
          />
          <POSStatCard 
            label="TODAY'S ORDERS" 
            value={posStats.todayOrders} 
          />
          <POSStatCard 
            label="PENDING PAYMENTS" 
            value={posStats.pendingPayments} 
            sub="Awaiting bill settlement"
          />
          <POSStatCard 
            label="COMPLETED PAYMENTS" 
            value={posStats.completedPayments} 
          />
        </div>

        {/* Extended Stats (Collections) */}
        <div className="pos-dashboard__stats-grid" style={{ marginTop: '-8px' }}>
          <POSStatCard 
            label="CASH COLLECTION" 
            value={`₹${posStats.cashCollection.toLocaleString('en-IN')}`} 
          />
          <POSStatCard 
            label="UPI COLLECTION" 
            value={`₹${posStats.upiCollection.toLocaleString('en-IN')}`} 
          />
          <POSStatCard 
            label="CARD COLLECTION" 
            value={`₹${posStats.cardCollection.toLocaleString('en-IN')}`} 
          />
          <POSStatCard 
            label="ACTIVE TABLES" 
            value={`${posStats.activeTables}`} 
            sub={`Out of ${posStats.totalTables} total tables`}
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
                  {pendingBillRequests.map(req => (
                    <PendingBillRequestCard key={req.id} req={req} onOpenBill={handleOpenBill} />
                  ))}
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
                  <button className="pos-section-card__view-all" onClick={() => triggerToast('Opening all completed transactions...')}>
                    View All Transactions <span>→</span>
                  </button>
                </div>
                <RecentTransactionsTable transactions={recentTransactions} onInvoiceClick={(tx) => triggerToast(`Clicked Invoice: ${tx.invoice}`)} />
              </div>
            </div>

            {/* ROW 5: Recent Activity */}
            <div className="pos-dashboard__row-five">
              <POSActivityFeed activities={recentActivities} />
            </div>
          </>
        )}
      </div>

      {/* Floating interactive toast */}
      {toastMessage && (
        <div className="pos-toast">
          {toastMessage}
        </div>
      )}
    </AdminLayout>
  )
}
