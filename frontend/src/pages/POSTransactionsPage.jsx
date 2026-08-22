/**
 * POSTransactionsPage — /cashier/transactions
 *
 * Dedicated Cashier / POS Transaction History page.
 * Displays completed payments, filterable by:
 *   - Date range (Today, Yesterday, This Week, All Time)
 *   - Payment method (Cash, UPI, Card, Other)
 *   - Order channel (Dine-In, Takeaway, Swiggy, Zomato)
 *   - Search query (Invoice #, Order #, Table, Cashier)
 *
 * Reuses existing backend orders & invoices cleanly.
 */
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminLayout from '../layouts/AdminLayout'
import { useApp } from '../context/AppContext'
import { orderApi } from '../api'
import './POSTransactionsPage.css'

export default function POSTransactionsPage() {
  const navigate = useNavigate()
  const { orders, fetchOrders, currentUser } = useApp()

  const [dateFilter, setDateFilter]     = useState('today')     // 'today' | 'yesterday' | 'week' | 'all'
  const [methodFilter, setMethodFilter] = useState('all')       // 'all' | 'cash' | 'upi' | 'card' | 'other'
  const [channelFilter, setChannelFilter] = useState('all')     // 'all' | 'dine_in' | 'takeaway' | 'swiggy' | 'zomato'
  const [searchQuery, setSearchQuery]   = useState('')
  const [loading, setLoading]           = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        await fetchOrders()
      } catch (err) {
        console.error('POSTransactionsPage load error:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [fetchOrders])

  // Derive completed transactions list from orders
  const allTransactions = (orders || []).map((o) => {
    const isCompleted = o.status === 'completed' || o.status === 'paid'
    const channel = (o.order_type || o.channel || (o.table_label || o.table ? 'dine_in' : 'takeaway')).toLowerCase()
    
    return {
      id:           o.id,
      orderNumber:  o.order_number || `#${o.id}`,
      invoiceNumber: o.invoice_number || `INV-${String(o.id).padStart(5, '0')}`,
      tableLabel:   o.table_label || (o.table ? String(o.table) : 'Takeaway'),
      channel:      channel.includes('swiggy') ? 'swiggy' : channel.includes('zomato') ? 'zomato' : channel.includes('takeaway') ? 'takeaway' : 'dine_in',
      paymentMethod: (o.payment_method || o.method || 'cash').toLowerCase(),
      total:        Number(o.total || o.amount || 0),
      cashier:      o.cashier_name || o.waiter_name || currentUser?.username || 'Cashier 01',
      dateStr:      o.created_at || new Date().toISOString(),
      status:       isCompleted ? 'completed' : 'pending',
    }
  })

  // Date filtering helper
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const yesterdayStart = todayStart - 86400000
  const weekStart = todayStart - (6 * 86400000)

  const filteredTransactions = allTransactions.filter((tx) => {
    const txTime = new Date(tx.dateStr).getTime()

    // Date Filter
    if (dateFilter === 'today' && txTime < todayStart) return false
    if (dateFilter === 'yesterday' && (txTime < yesterdayStart || txTime >= todayStart)) return false
    if (dateFilter === 'week' && txTime < weekStart) return false

    // Method Filter
    if (methodFilter !== 'all' && tx.paymentMethod !== methodFilter) return false

    // Channel Filter
    if (channelFilter !== 'all' && tx.channel !== channelFilter) return false

    // Search Query Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const match =
        tx.invoiceNumber.toLowerCase().includes(q) ||
        tx.orderNumber.toLowerCase().includes(q) ||
        tx.tableLabel.toLowerCase().includes(q) ||
        tx.cashier.toLowerCase().includes(q)
      if (!match) return false
    }

    return true
  })

  // Statistics summaries
  const completedList = filteredTransactions.filter((t) => t.status === 'completed')
  const totalRevenue = completedList.reduce((sum, t) => sum + t.total, 0)
  const cashTotal    = completedList.filter((t) => t.paymentMethod === 'cash').reduce((sum, t) => sum + t.total, 0)
  const upiTotal     = completedList.filter((t) => t.paymentMethod === 'upi').reduce((sum, t) => sum + t.total, 0)
  const cardTotal    = completedList.filter((t) => t.paymentMethod === 'card').reduce((sum, t) => sum + t.total, 0)

  return (
    <AdminLayout
      searchPlaceholder="Search transactions by invoice, order, table..."
      pageTitle="Transaction History"
      pageIcon={
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <line x1="2" y1="10" x2="22" y2="10" />
        </svg>
      }
    >
      <div className="pos-transactions-page">
        {/* KPI Stats Bar */}
        <div className="pos-transactions-stats">
          <div className="pos-tx-stat-card">
            <span className="pos-tx-stat-card__label">TOTAL REVENUE</span>
            <span className="pos-tx-stat-card__value" style={{ color: '#4ade80' }}>
              ₹{totalRevenue.toLocaleString('en-IN')}
            </span>
            <span className="pos-tx-stat-card__sub">{completedList.length} completed payments</span>
          </div>
          <div className="pos-tx-stat-card">
            <span className="pos-tx-stat-card__label">CASH COLLECTED</span>
            <span className="pos-tx-stat-card__value">₹{cashTotal.toLocaleString('en-IN')}</span>
            <span className="pos-tx-stat-card__sub">Physical cash payments</span>
          </div>
          <div className="pos-tx-stat-card">
            <span className="pos-tx-stat-card__label">UPI COLLECTED</span>
            <span className="pos-tx-stat-card__value">₹{upiTotal.toLocaleString('en-IN')}</span>
            <span className="pos-tx-stat-card__sub">QR & UPI transfers</span>
          </div>
          <div className="pos-tx-stat-card">
            <span className="pos-tx-stat-card__label">CARD COLLECTED</span>
            <span className="pos-tx-stat-card__value">₹{cardTotal.toLocaleString('en-IN')}</span>
            <span className="pos-tx-stat-card__sub">Credit/Debit POS Machine</span>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="pos-transactions-filters">
          <div className="pos-transactions-filters__group">
            {/* Date Filter */}
            <div className="pos-filter-control">
              <label>Period:</label>
              <select
                className="pos-filter-select"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                id="pos-tx-filter-period"
              >
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="week">This Week</option>
                <option value="all">All Time</option>
              </select>
            </div>

            {/* Payment Method Filter */}
            <div className="pos-filter-control">
              <label>Method:</label>
              <select
                className="pos-filter-select"
                value={methodFilter}
                onChange={(e) => setMethodFilter(e.target.value)}
                id="pos-tx-filter-method"
              >
                <option value="all">All Methods</option>
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
                <option value="card">Card</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Order Channel Filter */}
            <div className="pos-filter-control">
              <label>Channel:</label>
              <select
                className="pos-filter-select"
                value={channelFilter}
                onChange={(e) => setChannelFilter(e.target.value)}
                id="pos-tx-filter-channel"
              >
                <option value="all">All Channels</option>
                <option value="dine_in">Dine-In</option>
                <option value="takeaway">Takeaway</option>
                <option value="swiggy">Swiggy</option>
                <option value="zomato">Zomato</option>
              </select>
            </div>
          </div>

          {/* Search Box */}
          <div className="pos-filter-control">
            <input
              type="text"
              className="pos-search-input"
              placeholder="Search invoice, order, table..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              id="pos-tx-search-input"
            />
          </div>
        </div>

        {/* Transactions Table */}
        <div className="pos-transactions-table-wrap">
          {loading ? (
            <div className="pos-tx-empty">Loading transactions…</div>
          ) : filteredTransactions.length === 0 ? (
            <div className="pos-tx-empty">
              No transactions found matching your search and filters.
            </div>
          ) : (
            <table className="pos-tx-table">
              <thead>
                <tr>
                  <th>INVOICE #</th>
                  <th>ORDER #</th>
                  <th>CHANNEL</th>
                  <th>TABLE</th>
                  <th>PAYMENT METHOD</th>
                  <th>AMOUNT</th>
                  <th>CASHIER / POS</th>
                  <th>DATE & TIME</th>
                  <th>STATUS</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((tx) => (
                  <tr key={tx.id}>
                    <td style={{ fontWeight: 600, color: 'var(--color-accent, #f3c623)' }}>
                      {tx.invoiceNumber}
                    </td>
                    <td>{tx.orderNumber}</td>
                    <td>
                      <span className={`pos-channel-badge pos-channel-badge--${tx.channel}`}>
                        {tx.channel.replace('_', ' ')}
                      </span>
                    </td>
                    <td>{tx.tableLabel}</td>
                    <td>
                      <span className="pos-method-badge">
                        {tx.paymentMethod === 'cash' ? '💵 Cash' : tx.paymentMethod === 'upi' ? '📲 UPI' : tx.paymentMethod === 'card' ? '💳 Card' : '🧾 Other'}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700 }}>₹{tx.total.toFixed(2)}</td>
                    <td style={{ color: 'var(--color-text-secondary, #9ca3af)' }}>{tx.cashier}</td>
                    <td style={{ color: 'var(--color-text-secondary, #9ca3af)', fontSize: '12px' }}>
                      {new Date(tx.dateStr).toLocaleString('en-IN', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td>
                      <span className={`pos-status-badge pos-status-badge--${tx.status}`}>
                        {tx.status === 'completed' ? '✓ Paid' : 'Pending'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          className="btn-outline btn-sm"
                          onClick={() => navigate(`/orders/${tx.id}/invoice`)}
                          id={`view-invoice-${tx.id}`}
                          title="View Invoice"
                          style={{ padding: '3px 8px', fontSize: '11px' }}
                        >
                          Invoice
                        </button>
                        <button
                          className="btn-ghost btn-sm"
                          onClick={() => navigate(`/orders/${tx.id}`)}
                          id={`view-order-${tx.id}`}
                          title="View Order Details"
                          style={{ padding: '3px 8px', fontSize: '11px' }}
                        >
                          View
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}
