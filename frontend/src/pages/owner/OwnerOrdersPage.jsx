import { useState, useEffect } from 'react'
import AdminLayout from '../../layouts/AdminLayout'
import { useApp } from '../../context/AppContext'
import { branchApi } from '../../api'
import './owner.css'

const STATUS_OPTS = ['All', 'PENDING', 'PREPARING', 'READY', 'SERVED', 'COMPLETED', 'CANCELLED']

function statusBadge(status) {
  const s = (status || '').toUpperCase()
  const cls = {
    'PENDING':   'new',
    'PREPARING': 'preparing',
    'READY':     'ready',
    'SERVED':    'served',
    'COMPLETED': 'completed',
    'CANCELLED': 'cancelled',
  }[s] || 'idle'
  return <span className={`owner-badge owner-badge--${cls}`}>{s}</span>
}

export default function OwnerOrdersPage() {
  const { orders, fetchOrders } = useApp()
  const [statusFil,    setStatus]       = useState('All')
  const [search,       setSearch]       = useState('')
  const [branchFilter, setBranchFilter] = useState('all')
  const [branches,     setBranches]     = useState([])

  useEffect(() => {
    fetchOrders()
    branchApi.list()
      .then(data => setBranches(Array.isArray(data) ? data : (data.results ?? [])))
      .catch(() => {})
  }, [fetchOrders])

  const filtered = orders.filter(o => {
    const oStat = (o.status || '').toUpperCase()
    const matchStatus = statusFil === 'All' || oStat === statusFil
    const matchSearch = !search ||
      (o.orderId && o.orderId.toLowerCase().includes(search.toLowerCase())) ||
      (o.table  && o.table.toLowerCase().includes(search.toLowerCase()))  ||
      (o.waiter && o.waiter.toLowerCase().includes(search.toLowerCase()))
    const matchBranch = branchFilter === 'all' || String(o.branch) === branchFilter
    return matchStatus && matchSearch && matchBranch
  })

  const totalAmount = filtered.reduce((a, o) => a + (Number(o.amount) || 0), 0)

  return (
    <AdminLayout pageTitle="Orders" pageIcon="🛎️">
      <div className="owner-page">

        {/* Header */}
        <div className="owner-page-header">
          <div className="owner-page-header__left">
            <h1 className="owner-page-header__title">Orders</h1>
            <p className="owner-page-header__sub">All orders across every branch — live database view.</p>
          </div>
        </div>

        {/* KPIs */}
        <div className="owner-kpi-grid">
          <div className="owner-kpi-card">
            <div className="owner-kpi-card__label">Showing</div>
            <div className="owner-kpi-card__value">{filtered.length}</div>
            <div className="owner-kpi-card__sub">orders matching filters</div>
          </div>
          <div className="owner-kpi-card">
            <div className="owner-kpi-card__label">Total Amount</div>
            <div className="owner-kpi-card__value">₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          </div>
          <div className="owner-kpi-card">
            <div className="owner-kpi-card__label">Completed</div>
            <div className="owner-kpi-card__value">{filtered.filter(o => (o.status || '').toUpperCase() === 'COMPLETED').length}</div>
          </div>
          <div className="owner-kpi-card">
            <div className="owner-kpi-card__label">Active / Pending</div>
            <div className="owner-kpi-card__value">{filtered.filter(o => ['PENDING', 'PREPARING', 'READY'].includes((o.status || '').toUpperCase())).length}</div>
          </div>
        </div>

        {/* Filters + Table */}
        <div className="owner-section-card">
          <div className="owner-section-card__header" style={{ flexWrap: 'wrap', gap: 10 }}>
            <span className="owner-section-card__title">Order List</span>
            <div className="owner-filter-bar" style={{ flex: 1 }}>
              <input
                className="form-input"
                placeholder="Search order number, table, waiter..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ minWidth: 200, fontSize: 13, padding: '8px 14px' }}
                id="search-orders"
              />
              <select className="form-select" value={statusFil} onChange={e => setStatus(e.target.value)} id="filter-order-status"
                style={{ fontSize: 13, padding: '8px 12px' }}>
                {STATUS_OPTS.map(s => <option key={s} value={s}>{s === 'All' ? 'All Statuses' : s}</option>)}
              </select>
              <select
                className="form-select"
                value={branchFilter}
                onChange={e => setBranchFilter(e.target.value)}
                style={{ fontSize: 13, padding: '8px 12px', minWidth: 150 }}
                id="filter-orders-branch"
              >
                <option value="all">All Branches</option>
                {branches.filter(b => b.active).map(b => (
                  <option key={b.id} value={String(b.id)}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="owner-table-wrap">
            <table className="owner-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Table</th>
                  <th>Waiter</th>
                  <th>Items</th>
                  <th>Total Amount</th>
                  <th>Status</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      <div className="owner-empty">
                        <div className="owner-empty__icon">🛎️</div>
                        <div className="owner-empty__text">No orders match the selected filters in database</div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map(o => (
                    <tr key={o.id}>
                      <td className="td-name td-mono">{o.orderId || `ORD-${o.id}`}</td>
                      <td className="td-muted">{o.table || 'Takeaway'}</td>
                      <td className="td-muted">{o.waiter || '—'}</td>
                      <td className="td-muted">{o.itemsSummary || `${o.item_count || 1} items`}</td>
                      <td style={{ fontWeight: 600 }}>₹{Number(o.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td>{statusBadge(o.status)}</td>
                      <td className="td-muted">{o.time}</td>
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
