import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminLayout from '../layouts/AdminLayout'
import { useApp } from '../context/AppContext'
import { waiterRequestApi, orderApi } from '../api'
import './BillRequestsPage.css'

const BILL_STATUSES = ['All', 'REQUESTED', 'PROCESSING', 'READY', 'COMPLETED']

function relativeTime(dateStr) {
  if (!dateStr) return ''
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return new Date(dateStr).toLocaleDateString('en-IN')
}

export default function BillRequestsPage() {
  const navigate = useNavigate()
  const { waiterRequests, fetchWaiterRequests, orders, fetchOrders, currentRole } = useApp()

  // currentRole is 'waiter', 'cashier', 'admin', 'manager', 'branch_manager'
  const isWaiter = currentRole === 'waiter'

  const [activeTab, setActiveTab] = useState('All')
  const [updatingId, setUpdatingId] = useState(null)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    // Refresh every 10s so cashier sees new requests in near-real-time
    // and waiter sees updated statuses
    fetchWaiterRequests()
    fetchOrders()
    const interval = setInterval(fetchWaiterRequests, 10000)
    return () => clearInterval(interval)
  }, [fetchWaiterRequests, fetchOrders])

  // Filter requests that are Bill Requests only (from waiter → cashier flow)
  const billRequestsRaw = (waiterRequests || []).filter(
    (r) =>
      r.request_type === 'Bill Request' ||
      r.type === 'Bill Request' ||
      (r.message && r.message.toLowerCase().includes('bill'))
  )

  const billRequests = billRequestsRaw.map((r) => {
    const resolvedOrderId     = r.order_id
    const resolvedOrderNumber = r.order_number

    let billStatus = 'REQUESTED'
    const statusLower = (r.status || '').toLowerCase()
    if (statusLower === 'processing' || statusLower === 'in_progress') {
      billStatus = 'PROCESSING'
    } else if (statusLower === 'ready') {
      billStatus = 'READY'
    } else if (statusLower === 'completed') {
      billStatus = 'COMPLETED'
    }

    return {
      id:          r.id,
      table:       r.table_name || r.table_id || `Table ${r.table}`,
      order:       resolvedOrderNumber || r.order_number || '—',
      orderId:     resolvedOrderId || null,
      amount:      r.amount ?? 0,
      time:        r.time || relativeTime(r.created_at),
      message:     r.message || '',
      status:      billStatus,
      rawStatus:   r.status,
    }
  })

  const countFor = (tab) => {
    if (tab === 'All') return billRequests.length
    return billRequests.filter((b) => b.status === tab).length
  }

  const filtered = billRequests.filter((b) => {
    if (activeTab === 'All') return true
    return b.status === activeTab
  })

  // Cashier-only: update bill request status
  const handleUpdateStatus = async (item, nextStatus) => {
    if (isWaiter) {
      setToast({ type: 'error', message: 'Only the Cashier can update bill request status.' })
      setTimeout(() => setToast(null), 3000)
      return
    }
    setUpdatingId(item.id)
    try {
      let apiStatus = 'new'
      if (nextStatus === 'PROCESSING') apiStatus = 'in_progress'
      else if (nextStatus === 'READY') apiStatus = 'ready'
      else if (nextStatus === 'COMPLETED') apiStatus = 'completed'

      await waiterRequestApi.setStatus(item.id, { status: apiStatus })
      await fetchWaiterRequests()
      setToast({ type: 'success', message: `Bill status set to ${nextStatus}` })
      setTimeout(() => setToast(null), 3000)
    } catch (err) {
      console.error('Update bill request status error:', err)
      const msg = err?.message || 'Failed to update bill request status.'
      setToast({ type: 'error', message: msg })
      setTimeout(() => setToast(null), 4000)
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <AdminLayout
      searchPlaceholder="Search bill requests..."
      pageTitle="Bill Requests"
      pageIcon={
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="9" y1="13" x2="15" y2="13" />
          <line x1="9" y1="17" x2="13" y2="17" />
        </svg>
      }
    >
      <div className="bill-requests-page">
        <div className="bill-requests__header">
          <div>
            <h1 className="bill-requests__title">Bill Requests</h1>
            <p className="bill-requests__subtitle">
              {isWaiter
                ? 'View status of bill requests you submitted.'
                : 'Manage customer check and bill requests.'}
            </p>
          </div>
          <div className="bill-requests__count">
            <span className="req-count-pill req-count-pill--new">
              {billRequests.filter((b) => b.status === 'REQUESTED').length} Requested
            </span>
          </div>
        </div>

        {/* Filters */}
        <div className="bill-requests-filter-bar">
          {BILL_STATUSES.map((tab) => (
            <button
              key={tab}
              className={`bill-filter-tab ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
              id={`bill-tab-${tab.toLowerCase()}`}
            >
              {tab} ({countFor(tab)})
            </button>
          ))}
        </div>

        {/* Grid / List */}
        <div className="bill-requests-grid">
          {filtered.length === 0 ? (
            <div className="bill-requests-empty">No bill requests found in this category.</div>
          ) : (
            filtered.map((item) => (
              <div key={item.id} className={`bill-request-card status-${item.status.toLowerCase()}`}>
                <div className="bill-card__top">
                  <span className="bill-card__table">{item.table}</span>
                  <span className={`bill-status-pill status-${item.status.toLowerCase()}`}>
                    {item.status}
                  </span>
                </div>

                <div className="bill-card__body">
                  <div className="bill-card__row">
                    <span className="label">Order:</span>
                    <span className="val order-ref">{item.order}</span>
                  </div>
                  <div className="bill-card__row">
                    <span className="label">Amount:</span>
                    <span className="val amount">₹{Number(item.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="bill-card__row">
                    <span className="label">Requested:</span>
                    <span className="val time">{item.time}</span>
                  </div>
                  {item.message && (
                    <div className="bill-card__message">{item.message}</div>
                  )}
                </div>

                <div className="bill-card__actions">
                  {/* ── CASHIER / ADMIN / MANAGER actions ── */}
                  {!isWaiter && (
                    <>
                      {/* Navigate to order to generate bill */}
                      {item.orderId && item.status !== 'COMPLETED' && (
                        <button
                          className="btn-primary btn-sm w-full"
                          style={{ marginBottom: 6, background: 'linear-gradient(135deg,#16a34a 0%,#15803d 100%)' }}
                          onClick={() => navigate(`/orders/${item.orderId}`)}
                          id={`generate-bill-order-${item.orderId}`}
                        >
                          Generate Bill (Invoice)
                        </button>
                      )}

                      {item.status === 'REQUESTED' && (
                        <button
                          className="btn-outline btn-sm w-full"
                          onClick={() => handleUpdateStatus(item, 'PROCESSING')}
                          disabled={updatingId === item.id}
                        >
                          {updatingId === item.id ? 'Updating...' : 'Mark Processing'}
                        </button>
                      )}
                      {item.status === 'PROCESSING' && (
                        <button
                          className="btn-outline btn-sm w-full"
                          onClick={() => handleUpdateStatus(item, 'READY')}
                          disabled={updatingId === item.id}
                        >
                          {updatingId === item.id ? 'Updating...' : 'Mark Bill Ready'}
                        </button>
                      )}
                      {item.status === 'READY' && (
                        <button
                          className="btn-primary btn-sm w-full btn-success-bg"
                          onClick={() => handleUpdateStatus(item, 'COMPLETED')}
                          disabled={updatingId === item.id}
                        >
                          {updatingId === item.id ? 'Updating...' : 'Mark Completed'}
                        </button>
                      )}
                      {item.status === 'COMPLETED' && (
                        <button
                          className="btn-outline btn-sm w-full"
                          onClick={() => item.orderId && navigate(`/orders/${item.orderId}`)}
                        >
                          View Order Details
                        </button>
                      )}
                    </>
                  )}

                  {/* ── WAITER: read-only status chip + view order link ── */}
                  {isWaiter && (
                    <div style={{ textAlign: 'center' }}>
                      <div style={{
                        display: 'inline-block',
                        padding: '5px 14px',
                        borderRadius: 20,
                        fontSize: 12,
                        fontWeight: 700,
                        letterSpacing: 0.4,
                        marginBottom: item.orderId ? 8 : 0,
                        background: item.status === 'COMPLETED'
                          ? 'rgba(22,163,74,0.15)'
                          : item.status === 'READY'
                          ? 'rgba(234,179,8,0.15)'
                          : item.status === 'PROCESSING'
                          ? 'rgba(99,102,241,0.15)'
                          : 'rgba(148,163,184,0.15)',
                        color: item.status === 'COMPLETED'
                          ? '#4ade80'
                          : item.status === 'READY'
                          ? '#fbbf24'
                          : item.status === 'PROCESSING'
                          ? '#a5b4fc'
                          : '#94a3b8',
                        border: item.status === 'COMPLETED'
                          ? '1px solid rgba(22,163,74,0.25)'
                          : item.status === 'READY'
                          ? '1px solid rgba(234,179,8,0.25)'
                          : item.status === 'PROCESSING'
                          ? '1px solid rgba(99,102,241,0.25)'
                          : '1px solid rgba(148,163,184,0.2)',
                      }}>
                        {item.status === 'REQUESTED'  ? '⏳ Waiting for Cashier'  : ''}
                        {item.status === 'PROCESSING' ? '⚙️ Being Processed'       : ''}
                        {item.status === 'READY'      ? '✅ Bill Ready'            : ''}
                        {item.status === 'COMPLETED'  ? '✓ Completed by Cashier'   : ''}
                      </div>
                      {item.orderId && (
                        <button
                          className="btn-outline btn-sm w-full"
                          style={{ marginTop: 6 }}
                          onClick={() => navigate(`/orders/${item.orderId}`)}
                        >
                          View Order
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {toast && (
        <div className={`requests-toast requests-toast--${toast.type}`}>
          {toast.message}
        </div>
      )}
    </AdminLayout>
  )
}
