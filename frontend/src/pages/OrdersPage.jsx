import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminLayout from '../layouts/AdminLayout'
import { orderApi } from '../api'
import './OrdersPage.css'

const STATUS_TABS = ['All', 'NEW', 'PREPARING', 'READY', 'SERVED', 'BILL REQUESTED']

const STATUS_META = {
  PENDING:        { label: 'NEW',            cls: 'badge--new',      dot: 'dot--new',      step: 1 },
  NEW:            { label: 'NEW',            cls: 'badge--new',      dot: 'dot--new',      step: 1 },
  ACCEPTED:       { label: 'PREPARING',      cls: 'badge--prep',     dot: 'dot--prep',     step: 2 },
  PREPARING:      { label: 'PREPARING',      cls: 'badge--prep',     dot: 'dot--prep',     step: 2 },
  READY:          { label: 'READY',          cls: 'badge--ready',    dot: 'dot--ready',    step: 3 },
  COMPLETED:      { label: 'SERVED',         cls: 'badge--done',     dot: 'dot--done',     step: 4 },
  SERVED:         { label: 'SERVED',         cls: 'badge--done',     dot: 'dot--done',     step: 4 },
  BILL_REQUESTED: { label: 'BILL REQUESTED', cls: 'badge--accepted', dot: 'dot--accepted', step: 5 },
  CANCELLED:      { label: 'CANCELLED',      cls: '',                dot: '',              step: 0 },
}

const TAB_TO_STATUS = {
  NEW:              'pending',
  PREPARING:        'preparing',
  READY:            'ready',
  SERVED:           'completed',
  'BILL REQUESTED': 'bill_requested',
}

const PAGE_SIZE = 10

export default function OrdersPage() {
  const navigate = useNavigate()

  const [orders,     setOrders]     = useState([])
  const [loading,    setLoading]    = useState(true)
  const [search,     setSearch]     = useState('')
  const [activeTab,  setActiveTab]  = useState('All')
  const [page,       setPage]       = useState(1)
  const [total,      setTotal]      = useState(0)

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      const params = {
        ordering: '-created_at',
        page_size: 200, // fetch all and paginate client-side for tab counts
      }
      if (activeTab !== 'All' && TAB_TO_STATUS[activeTab]) {
        params.status = TAB_TO_STATUS[activeTab]
      }
      if (search.trim()) {
        params.search = search.trim()
      }
      const data = await orderApi.list(params)
      const list = Array.isArray(data) ? data : (data.results ?? [])
      setOrders(list.map(normalise))
      setTotal(Array.isArray(data) ? data.length : (data.count ?? 0))
    } catch (err) {
      console.error('OrdersPage fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [activeTab, search])

  useEffect(() => {
    setPage(1)
    fetchOrders()
  }, [fetchOrders])

  function normalise(o) {
    return {
      ...o,
      orderId:      o.order_number,
      table:        o.table_label ?? '',
      waiter:       o.waiter_name ?? '',
      itemsSummary: o.items_summary ?? '',
      amount:       parseFloat(o.total ?? 0),
      time: o.created_at
        ? new Date(o.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
        : '',
      status: (o.status ?? 'pending').toUpperCase(),
    }
  }

  // Client-side tab counts (from already-fetched data)
  const allOrders   = orders
  const paged       = allOrders.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const totalPages  = Math.max(1, Math.ceil(allOrders.length / PAGE_SIZE))

  const countFor = (tab) => {
    if (tab === 'All') return allOrders.length
    const s = TAB_TO_STATUS[tab]?.toUpperCase()
    return allOrders.filter(o => o.status === s).length
  }

  return (
    <AdminLayout searchPlaceholder="Search orders, tables, items...">
      <div className="orders-page">
        {/* Header */}
        <div className="orders-page__header">
          <div>
            <h1 className="orders-page__title">Orders</h1>
            <p className="orders-page__sub">Manage and track all ongoing and past orders.</p>
          </div>
          <div className="orders-page__actions">
            <button className="btn-outline btn-export" id="btn-export" disabled>
              <DownloadIcon /> Export
            </button>
            <button className="btn-primary" id="btn-manual-order" onClick={() => navigate('/orders/new')}>
              + Manual Order
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="orders-filter-bar">
          <div className="orders-search-wrap">
            <SearchIcon />
            <input
              className="orders-search"
              placeholder="Search ID, table, item..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              id="orders-search"
            />
          </div>
          <div className="orders-tabs">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab}
                className={`orders-tab${activeTab === tab ? ' orders-tab--active' : ''}`}
                onClick={() => { setActiveTab(tab); setPage(1) }}
                id={`tab-${tab.toLowerCase()}`}
              >
                {tab} ({countFor(tab)})
              </button>
            ))}
            <button className="btn-ghost orders-filter-btn" id="btn-more-filters">
              <FilterIcon /> More Filters
            </button>
          </div>
        </div>

        {/* Table (Desktop only) */}
        <div className="orders-table-wrap desktop-only-table">
          <table className="orders-table">
            <thead>
              <tr>
                <th>ORDER ID</th>
                <th>ORDER TYPE</th>
                <th>TABLE</th>
                <th>WAITER</th>
                <th>ITEMS SUMMARY</th>
                <th>AMOUNT</th>
                <th>PAYMENT</th>
                <th>STATUS</th>
                <th>TIME</th>
                <th>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={11} style={{ textAlign: 'center', padding: 32, color: '#6b7280' }}>Loading orders…</td></tr>
              ) : paged.length === 0 ? (
                <tr><td colSpan={11} className="orders-empty">No orders found.</td></tr>
              ) : (
                paged.map((order) => {
                  const meta    = STATUS_META[order.status] || STATUS_META.PENDING
                  const isDone  = order.status === 'COMPLETED'
                  
                  // Payment Badge helper
                  const renderPaymentBadge = (method, status) => {
                    const s = (status || '').toLowerCase()
                    const m = (method || '').toUpperCase()
                    if (!s || s === 'unpaid' || s === 'pending') {
                      return (
                        <span className="order-badge" style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', fontWeight: 'bold', fontSize: '10px' }}>
                          UNPAID
                        </span>
                      )
                    }
                    let bg = '#e0f2fe', text = '#0369a1', border = '#bae6fd'
                    if (m === 'CASH') { bg = '#dcfce7'; text = '#15803d'; border = '#bbf7d0' }
                    else if (m === 'UPI') { bg = '#faf5ff'; text = '#7e22ce'; border = '#e9d5ff' }
                    else if (m === 'CARD') { bg = '#fef3c7'; text = '#b45309'; border = '#fde68a' }
                    return (
                      <span className="order-badge" style={{ background: bg, color: text, border: `1px solid ${border}`, fontWeight: 'bold', fontSize: '10px' }}>
                        {m}
                      </span>
                    )
                  }

                  const renderChannelLabel = (channel) => {
                    const c = (channel || 'DINE_IN').toUpperCase()
                    if (c === 'TAKEAWAY') return '🥡 Takeaway'
                    if (c === 'SWIGGY') return '🛵 Swiggy'
                    if (c === 'ZOMATO') return '🛵 Zomato'
                    return '🍽️ Dine-In'
                  }

                  return (
                    <tr
                      key={order.id}
                      className={`orders-row${isDone ? ' orders-row--done' : ''}`}
                      onClick={() => navigate(`/orders/${order.id}`)}
                      style={{ cursor: 'pointer' }}
                      id={`order-row-${order.id}`}
                    >
                      <td className="orders-cell orders-cell--id">{order.orderId}</td>
                      <td className="orders-cell" style={{ fontSize: '13px', fontWeight: '500' }}>{renderChannelLabel(order.channel)}</td>
                      <td className="orders-cell">{order.table || '—'}</td>
                      <td className="orders-cell">{order.waiter || '—'}</td>
                      <td className="orders-cell orders-cell--summary">{order.itemsSummary}</td>
                      <td className="orders-cell orders-cell--amount">₹{Number(order.amount).toLocaleString('en-IN')}</td>
                      <td className="orders-cell">{renderPaymentBadge(order.payment_method, order.payment_status)}</td>
                      <td className="orders-cell">
                        <span className={`order-badge ${meta.cls}`}>
                          {meta.label !== 'DONE' && <span className={`order-dot ${meta.dot}`} />}
                          {meta.label === 'READY' && <span className="order-check">✓</span>}
                          {meta.label}
                        </span>
                      </td>
                      <td className="orders-cell orders-cell--time">{order.time}</td>
                      <td className="orders-cell orders-cell--action">
                        <button
                          className="orders-action-btn"
                          onClick={(e) => { e.stopPropagation(); navigate(`/orders/${order.id}`) }}
                          id={`view-order-${order.id}`}
                          aria-label="View order"
                        >
                          <ChevronRightIcon />
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile cards view (Mobile only) */}
        <div className="orders-mobile-cards-wrap">
          {loading ? (
            <div style={{ textAlign: 'center', padding: 32, color: '#6b7280' }}>Loading orders…</div>
          ) : paged.length === 0 ? (
            <div className="orders-empty">No orders found.</div>
          ) : (
            paged.map((order) => {
              const meta = STATUS_META[order.status] || STATUS_META.PENDING
              return (
                <div
                  key={order.id}
                  className="orders-mobile-card"
                  onClick={() => navigate(`/orders/${order.id}`)}
                  id={`order-card-${order.id}`}
                >
                  <div className="orders-mobile-card__header">
                    <span className="card-order-id">{order.orderId}</span>
                    <span className={`order-badge ${meta.cls}`}>{meta.label}</span>
                  </div>
                  <div className="orders-mobile-card__body">
                    <div className="card-row">
                      <div className="card-col">
                        <span className="card-label">TABLE</span>
                        <span className="card-value">{order.table}</span>
                      </div>
                      <div className="card-col">
                        <span className="card-label">WAITER</span>
                        <span className="card-value">{order.waiter}</span>
                      </div>
                    </div>
                    <div className="card-items">
                      <span className="card-label">ITEMS SUMMARY</span>
                      <span className="card-value">{order.itemsSummary}</span>
                    </div>
                  </div>
                  <div className="orders-mobile-card__footer">
                    <div className="card-total">
                      <span className="card-label">TOTAL</span>
                      <span className="card-price">₹{Number(order.amount).toLocaleString('en-IN')}</span>
                    </div>
                    <span className="card-view-btn">View Order →</span>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Pagination */}
        <div className="orders-pagination">
          <span className="orders-pagination__info">
            Showing {allOrders.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–
            {Math.min(page * PAGE_SIZE, allOrders.length)} of {allOrders.length} orders
          </span>
          <div className="orders-pagination__controls">
            <button className="page-btn" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
              <ChevronLeftIcon />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                className={`page-btn${page === n ? ' page-btn--active' : ''}`}
                onClick={() => setPage(n)}
              >
                {n}
              </button>
            ))}
            <button className="page-btn" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
              <ChevronRightIcon />
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}

/* ── Icons ── */
function DownloadIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
}
function SearchIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
}
function FilterIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="12" y1="18" x2="12" y2="18"/></svg>
}
function SortIcon() {
  return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
}
function ChevronRightIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
}
function ChevronLeftIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
}
