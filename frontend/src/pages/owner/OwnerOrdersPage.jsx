import { useState } from 'react'
import AdminLayout from '../../layouts/AdminLayout'
import { OWNER_ORDERS, OWNER_BRANCHES } from '../../data/ownerMockData'
import './owner.css'

const STATUS_OPTS  = ['All', 'NEW', 'PREPARING', 'READY', 'SERVED', 'COMPLETED']
const CHANNEL_OPTS = ['All', 'DINE-IN', 'TAKEAWAY', 'SWIGGY', 'ZOMATO']

function channelBadge(channel) {
  const key = channel.toLowerCase().replace('-', '')
  const cls = {
    'dinein':   'dine-in',
    'takeaway': 'takeaway',
    'swiggy':   'swiggy',
    'zomato':   'zomato',
  }[key] || 'idle'
  return <span className={`owner-badge owner-badge--${cls}`}>{channel}</span>
}

function statusBadge(status) {
  const cls = {
    'NEW':       'new',
    'PREPARING': 'preparing',
    'READY':     'ready',
    'SERVED':    'served',
    'COMPLETED': 'completed',
    'CANCELLED': 'cancelled',
  }[status] || 'idle'
  return <span className={`owner-badge owner-badge--${cls}`}>{status}</span>
}

export default function OwnerOrdersPage() {
  const [branchFil,  setBranch]   = useState('all')
  const [statusFil,  setStatus]   = useState('All')
  const [channelFil, setChannel]  = useState('All')
  const [payFil,     setPay]      = useState('All')
  const [search,     setSearch]   = useState('')

  const filtered = OWNER_ORDERS.filter(o => {
    const matchBranch  = branchFil  === 'all' || o.branchId === Number(branchFil)
    const matchStatus  = statusFil  === 'All' || o.status === statusFil
    const matchChannel = channelFil === 'All' || o.channel === channelFil
    const matchPay     = payFil     === 'All' || o.payStatus.toLowerCase() === payFil.toLowerCase()
    const matchSearch  = !search    || o.id.toLowerCase().includes(search.toLowerCase()) || o.waiter.toLowerCase().includes(search.toLowerCase())
    return matchBranch && matchStatus && matchChannel && matchPay && matchSearch
  })

  const totalAmount = filtered.reduce((a, o) => a + o.amount, 0)

  return (
    <AdminLayout pageTitle="Orders" pageIcon="🛎️">
      <div className="owner-page">

        {/* Header */}
        <div className="owner-page-header">
          <div className="owner-page-header__left">
            <h1 className="owner-page-header__title">Orders</h1>
            <p className="owner-page-header__sub">All orders across every branch — real-time view.</p>
          </div>
        </div>

        {/* KPIs */}
        <div className="owner-kpi-grid">
          <div className="owner-kpi-card"><div className="owner-kpi-card__label">Showing</div><div className="owner-kpi-card__value">{filtered.length}</div><div className="owner-kpi-card__sub">orders matching filters</div></div>
          <div className="owner-kpi-card"><div className="owner-kpi-card__label">Total Amount</div><div className="owner-kpi-card__value">₹{totalAmount.toLocaleString('en-IN')}</div></div>
          <div className="owner-kpi-card"><div className="owner-kpi-card__label">Paid</div><div className="owner-kpi-card__value">{filtered.filter(o => o.payStatus === 'paid').length}</div></div>
          <div className="owner-kpi-card"><div className="owner-kpi-card__label">Pending Payment</div><div className="owner-kpi-card__value">{filtered.filter(o => o.payStatus === 'pending').length}</div></div>
        </div>

        {/* Filters + Table */}
        <div className="owner-section-card">
          <div className="owner-section-card__header" style={{ flexWrap: 'wrap', gap: 10 }}>
            <span className="owner-section-card__title">Order List</span>
            <div className="owner-filter-bar" style={{ flex: 1 }}>
              <input className="form-input" placeholder="Search order ID, waiter..." value={search} onChange={e => setSearch(e.target.value)} style={{ minWidth: 200, fontSize: 13, padding: '8px 14px' }} id="search-orders" />
              <select className="form-select" value={branchFil} onChange={e => setBranch(e.target.value)} id="filter-order-branch">
                <option value="all">All Branches</option>
                {OWNER_BRANCHES.map(b => <option key={b.id} value={b.id}>{b.name.replace('Artisan Brew — ', '')}</option>)}
              </select>
              <select className="form-select" value={channelFil} onChange={e => setChannel(e.target.value)} id="filter-order-channel">
                {CHANNEL_OPTS.map(c => <option key={c} value={c}>{c === 'All' ? 'All Channels' : c}</option>)}
              </select>
              <select className="form-select" value={statusFil} onChange={e => setStatus(e.target.value)} id="filter-order-status">
                {STATUS_OPTS.map(s => <option key={s} value={s}>{s === 'All' ? 'All Statuses' : s}</option>)}
              </select>
              <select className="form-select" value={payFil} onChange={e => setPay(e.target.value)} id="filter-order-pay">
                <option value="All">All Payments</option>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
              </select>
            </div>
          </div>

          <div className="owner-table-wrap">
            <table className="owner-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Branch</th>
                  <th>Table / Channel</th>
                  <th>Waiter</th>
                  <th>Amount</th>
                  <th>Payment</th>
                  <th>Pay Status</th>
                  <th>Status</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0
                  ? <tr><td colSpan={9}><div className="owner-empty"><div className="owner-empty__icon">🛎️</div><div className="owner-empty__text">No orders match the selected filters</div></div></td></tr>
                  : filtered.map(o => (
                    <tr key={o.id}>
                      <td className="td-name td-mono">{o.id}</td>
                      <td className="td-muted">{o.branch}</td>
                      <td>
                        {o.channel === 'DINE-IN' ? `Table ${o.table}` : channelBadge(o.channel)}
                      </td>
                      <td className="td-muted">{o.waiter}</td>
                      <td style={{ fontWeight: 500 }}>₹{o.amount.toLocaleString('en-IN')}</td>
                      <td className="td-muted">{o.payment}</td>
                      <td>
                        <span className={`owner-badge owner-badge--${o.payStatus}`}>{o.payStatus.toUpperCase()}</span>
                      </td>
                      <td>{statusBadge(o.status)}</td>
                      <td className="td-muted">{o.time}</td>
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
