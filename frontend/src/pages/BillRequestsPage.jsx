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
  const { waiterRequests, fetchWaiterRequests, orders, fetchOrders } = useApp()

  const [activeTab, setActiveTab] = useState('All')
  const [updatingId, setUpdatingId] = useState(null)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    fetchWaiterRequests()
    fetchOrders()
  }, [fetchWaiterRequests, fetchOrders])

  // Filter requests that are Bill Requests
  const billRequestsRaw = (waiterRequests || []).filter(
    (r) =>
      r.type === 'Bill Request' ||
      r.request_type === 'Bill Request' ||
      r.request_type === 'Request Bill' ||
      (r.message && r.message.toLowerCase().includes('bill'))
  )

  const billRequests = billRequestsRaw.map((r) => {
    // Find matching order if available
    const tableIdNum = String(r.tableId || r.tableFK || '').replace(/\D/g, '')
    const matchedOrder = (orders || []).find(
      (o) =>
        (r.orderId && (o.id === r.orderId || o.order_number === r.orderId)) ||
        (tableIdNum && (o.table === `Table ${tableIdNum}` || o.table === r.tableId))
    )

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
      id: r.id,
      table: r.tableId ? `Table ${r.tableId.replace(/\D/g, '')}` : r.title || 'Table',
      order: matchedOrder ? matchedOrder.order_number || `#${matchedOrder.id}` : r.orderRef || 'Order #4092',
      orderId: matchedOrder ? matchedOrder.id : null,
      amount: r.amount || (matchedOrder ? matchedOrder.total || matchedOrder.amount : 450.00),
      time: r.time || relativeTime(r.created_at),
      status: billStatus,
      rawStatus: r.status,
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

  const handleUpdateStatus = async (item, nextStatus) => {
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
      setToast({ type: 'error', message: 'Failed to update bill request status.' })
      setTimeout(() => setToast(null), 3000)
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
            <p className="bill-requests__subtitle">Manage customer check and bill requests.</p>
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
                </div>

                <div className="bill-card__actions">
                  {item.status === 'REQUESTED' && (
                    <button
                      className="btn-primary btn-sm w-full"
                      onClick={() => handleUpdateStatus(item, 'PROCESSING')}
                      disabled={updatingId === item.id}
                    >
                      {updatingId === item.id ? 'Updating...' : 'Start Processing'}
                    </button>
                  )}
                  {item.status === 'PROCESSING' && (
                    <button
                      className="btn-primary btn-sm w-full"
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
