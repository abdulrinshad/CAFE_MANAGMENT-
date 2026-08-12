import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminLayout from '../layouts/AdminLayout'
import { useApp } from '../context/AppContext'
import './OrdersPage.css'

const STATUS_TABS = ['All', 'New', 'Accepted', 'Preparing', 'Ready', 'Completed']

const STATUS_META = {
  NEW:       { label: 'NEW',       cls: 'badge--new',       dot: 'dot--new'   },
  ACCEPTED:  { label: 'ACCEPTED',  cls: 'badge--accepted',  dot: 'dot--accepted' },
  PREPARING: { label: 'PREP',      cls: 'badge--prep',      dot: 'dot--prep'  },
  READY:     { label: 'READY',     cls: 'badge--ready',     dot: 'dot--ready' },
  COMPLETED: { label: 'DONE',      cls: 'badge--done',      dot: 'dot--done'  },
}

const PAGE_SIZE = 10

export default function OrdersPage() {
  const navigate = useNavigate()
  const { orders } = useApp()

  const [search, setSearch]     = useState('')
  const [activeTab, setActiveTab] = useState('All')
  const [page, setPage]         = useState(1)

  const filtered = orders.filter((o) => {
    const matchSearch =
      o.orderId.toLowerCase().includes(search.toLowerCase()) ||
      o.table.toLowerCase().includes(search.toLowerCase()) ||
      o.itemsSummary.toLowerCase().includes(search.toLowerCase())
    const matchTab =
      activeTab === 'All' ||
      o.status.toLowerCase() === activeTab.toLowerCase() ||
      (activeTab === 'Preparing' && o.status === 'PREPARING') ||
      (activeTab === 'New'       && o.status === 'NEW')       ||
      (activeTab === 'Accepted'  && o.status === 'ACCEPTED')  ||
      (activeTab === 'Ready'     && o.status === 'READY')     ||
      (activeTab === 'Completed' && o.status === 'COMPLETED')
    return matchSearch && matchTab
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const countFor = (tab) => {
    if (tab === 'All') return orders.length
    return orders.filter(
      (o) => o.status.toLowerCase() === tab.toLowerCase() ||
             (tab === 'Preparing' && o.status === 'PREPARING')
    ).length
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
            <button className="btn-outline btn-export" id="btn-export">
              <DownloadIcon /> Export
            </button>
            <button className="btn-primary" id="btn-manual-order" onClick={() => navigate('/menu/add')}>
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
              placeholder="Search ID, item..."
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
                {tab} {tab !== 'All' && `(${countFor(tab)})`}
                {tab === 'All' && `(${orders.length})`}
              </button>
            ))}
            <button className="btn-ghost orders-filter-btn" id="btn-more-filters">
              <FilterIcon /> More Filters
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="orders-table-wrap">
          <table className="orders-table">
            <thead>
              <tr>
                <th>
                  <span className="orders-th-sort">ORDER ID <SortIcon /></span>
                </th>
                <th>TABLE</th>
                <th>WAITER</th>
                <th>ITEMS SUMMARY</th>
                <th>AMOUNT</th>
                <th>STATUS</th>
                <th>TIME</th>
                <th>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {paged.map((order) => {
                const meta = STATUS_META[order.status] || STATUS_META.COMPLETED
                const isDone = order.status === 'COMPLETED'
                return (
                  <tr
                    key={order.id}
                    className={`orders-row${isDone ? ' orders-row--done' : ''}`}
                    onClick={() => navigate(`/orders/${order.id}`)}
                    style={{ cursor: 'pointer' }}
                    id={`order-row-${order.id}`}
                  >
                    <td className="orders-cell orders-cell--id">{order.orderId}</td>
                    <td className="orders-cell">{order.table}</td>
                    <td className="orders-cell">{order.waiter}</td>
                    <td className="orders-cell orders-cell--summary">{order.itemsSummary}</td>
                    <td className="orders-cell orders-cell--amount">₹{order.amount}</td>
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
              })}
              {paged.length === 0 && (
                <tr>
                  <td colSpan={8} className="orders-empty">No orders match your filters.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="orders-pagination">
          <span className="orders-pagination__info">
            Showing {filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} orders
          </span>
          <div className="orders-pagination__controls">
            <button
              className="page-btn"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
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
            <button
              className="page-btn"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
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
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  )
}
function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  )
}
function FilterIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="6" x2="20" y2="6"/>
      <line x1="8" y1="12" x2="16" y2="12"/>
      <line x1="12" y1="18" x2="12" y2="18"/>
    </svg>
  )
}
function SortIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  )
}
function ChevronRightIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  )
}
function ChevronLeftIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6"/>
    </svg>
  )
}
