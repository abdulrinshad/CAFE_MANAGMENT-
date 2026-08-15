/**
 * RequestsPage — Active Requests
 *
 * Drives from real backend notifications:
 *   new_order        → "New Request"  (accept → in_progress)
 *   bill_requested   → "Bill Request" (accept → go to order invoice)
 *   table_attention  → "New Request"  (general assistance)
 *   in_progress      → Mark Completed
 *
 * Waiter actions persist to:
 *   - Notification.is_read (mark read = dismiss)
 *   - Table status (bill_requested notifications link to the table)
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminLayout from '../layouts/AdminLayout'
import { useApp } from '../context/AppContext'
import './RequestsPage.css'

const REQUEST_TYPES = ['All Requests', 'New', 'In Progress', 'Completed']

function relativeTime(dateStr) {
  if (!dateStr) return ''
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return new Date(dateStr).toLocaleDateString('en-IN')
}

function notifToRequest(n) {
  return {
    id:       n.id,
    type:     n.type,
    title:    n.title,
    message:  n.message,
    tableId:  n.table_name ? n.table_name : (n.table ? `T-${n.table}` : '—'),
    tableFK:  n.table,       // raw table FK id
    orderId:  n.order,       // raw order FK id
    orderRef: n.order_number,
    time:     relativeTime(n.created_at),
    rawTime:  n.created_at,
    status:   n.status || 'new',
    whatsapp: n.whatsapp_number,
    invoiceNo: n.invoice_number,
    amount:   n.total_amount,
  }
}

// Request type pill label
function typeLabel(type) {
  if (type === 'new_order')         return 'New Order'
  if (type === 'bill_requested')    return 'Bill Request'
  if (type === 'table_attention')   return 'Needs Attention'
  if (type === 'payment_completed') return 'Payment Done'
  if (type === 'status_changed')    return 'Status Changed'
  if (type === 'bill_share')        return 'Bill Share Request'
  return type
}

export default function RequestsPage() {
  const navigate = useNavigate()
  const { notifications, updateNotificationStatus, fetchNotifications } = useApp()

  // Local actions loading state: { [reqId]: 'accepting' | 'dismissing' | 'completing' }
  const [actionLoading, setActionLoading] = useState({})
  // Toast notifications state: { type: 'success' | 'error', message: '...' }
  const [toast, setToast] = useState(null)

  const showToast = (type, message) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 3000)
  }

  // Only show actionable types on Requests page
  const actionable = (notifications || []).filter((n) =>
    ['new_order', 'bill_requested', 'table_attention', 'bill_share'].includes(n.type)
  )

  const requests = actionable.map((n) => ({
    ...notifToRequest(n),
    status: n.status || 'new', // map directly to backend status
  }))

  const [activeTab, setActiveTab] = useState('All Requests')

  const countFor = (tab) => {
    if (tab === 'All Requests') return requests.length
    if (tab === 'New')          return requests.filter((r) => r.status === 'new').length
    if (tab === 'In Progress')  return requests.filter((r) => r.status === 'in_progress').length
    if (tab === 'Completed')    return requests.filter((r) => r.status === 'completed').length
    return 0
  }

  const filtered = requests.filter((r) => {
    if (activeTab === 'All Requests') return r.status !== 'dismissed'
    if (activeTab === 'New')          return r.status === 'new'
    if (activeTab === 'In Progress')  return r.status === 'in_progress'
    if (activeTab === 'Completed')    return r.status === 'completed'
    return true
  })

  const handleApiError = (err) => {
    console.error("API error updating request:", err)
    if (err.status === 404) {
      showToast('error', 'Request no longer exists. Refreshing requests...')
      fetchNotifications()
    } else if (err.status === 401) {
      showToast('error', 'Your session has expired. Please log in again.')
    } else if (err.status === 403) {
      showToast('error', "You don't have permission to update this request.")
    } else if (err.status === 400 && err.message) {
      showToast('error', err.message)
    } else {
      showToast('error', 'Unable to update request. Please try again.')
    }
  }

  const handleAccept = async (req) => {
    if (actionLoading[req.id]) return
    setActionLoading((prev) => ({ ...prev, [req.id]: 'accepting' }))
    try {
      await updateNotificationStatus(req.id, 'in_progress')
      showToast('success', 'Request accepted')
      if ((req.type === 'bill_requested' || req.type === 'bill_share') && req.orderId) {
        navigate(`/orders/${req.orderId}/checkout`)
      }
    } catch (err) {
      handleApiError(err)
    } finally {
      setActionLoading((prev) => ({ ...prev, [req.id]: null }))
    }
  }

  const handleDismiss = async (req) => {
    if (actionLoading[req.id]) return
    setActionLoading((prev) => ({ ...prev, [req.id]: 'dismissing' }))
    try {
      await updateNotificationStatus(req.id, 'dismissed')
      showToast('success', 'Request dismissed')
    } catch (err) {
      handleApiError(err)
    } finally {
      setActionLoading((prev) => ({ ...prev, [req.id]: null }))
    }
  }

  const handleMarkCompleted = async (req) => {
    if (actionLoading[req.id]) return
    setActionLoading((prev) => ({ ...prev, [req.id]: 'completing' }))
    try {
      await updateNotificationStatus(req.id, 'completed')
      showToast('success', 'Request completed')
    } catch (err) {
      handleApiError(err)
    } finally {
      setActionLoading((prev) => ({ ...prev, [req.id]: null }))
    }
  }

  const newCount = requests.filter((r) => r.status === 'new').length
  const ipCount  = requests.filter((r) => r.status === 'in_progress').length

  return (
    <AdminLayout
      searchPlaceholder="Search active requests..."
      pageTitle="Requests"
      pageIcon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>}
    >
      <div className="requests-page">
        {/* Header */}
        <div className="requests-page__header">
          <div className="requests-page__title-wrap">
            <h1 className="requests-page__title">Active Requests</h1>
            <p className="requests-page__subtitle">Manage customer assistance calls.</p>
          </div>
          <div className="requests-page__counts">
            {newCount > 0 && <span className="req-count-pill req-count-pill--new">{newCount} New</span>}
            {ipCount  > 0 && <span className="req-count-pill req-count-pill--ip">{ipCount} In Progress</span>}
          </div>
        </div>

        {/* Tab Filters */}
        <div className="requests-filter-bar">
          {REQUEST_TYPES.map((tab) => (
            <button
              key={tab}
              className={`requests-filter-tab${activeTab === tab ? ' requests-filter-tab--active' : ''}`}
              onClick={() => setActiveTab(tab)}
              id={`request-tab-${tab.toLowerCase().replace(/\s/g, '-')}`}
            >
              {tab} ({countFor(tab)})
            </button>
          ))}
        </div>

        {/* Requests Grid */}
        <div className="requests-grid">
          {filtered.length === 0 && (
            <div className="requests-empty-state">
              {activeTab === 'All Requests'
                ? 'No active requests right now. All clear! ✓'
                : `No ${activeTab.toLowerCase()} requests.`}
            </div>
          )}

          {filtered.map((req) => (
            <div
              key={req.id}
              className={`waiter-request-card ${req.status}${req.type === 'bill_requested' || req.type === 'bill_share' ? ' bill-req' : ''}`}
            >
              <div className="waiter-request-card__header">
                <span className="request-table-badge">
                  {req.tableId !== '—' ? `Table ${req.tableId.replace('T-', '')}` : req.title}
                </span>
                <div className="request-header-right">
                  <span className={`req-type-pill req-type-pill--${req.type}`}>
                    {req.status === 'new' ? 'NEW REQUEST' : req.status === 'in_progress' ? 'IN PROGRESS' : 'DONE'}
                  </span>
                </div>
              </div>

              {req.type === 'bill_share' ? (
                <div className="waiter-request-card__body">
                  <div className="request-type-label">BILL READY</div>
                  <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {req.invoiceNo && <div><strong>Invoice:</strong> {req.invoiceNo}</div>}
                    {req.amount && <div><strong>Amount:</strong> ₹{Number(req.amount).toFixed(2)}</div>}
                    {req.whatsapp && <div><strong>Customer WhatsApp:</strong> {req.whatsapp}</div>}
                  </div>
                  <p className="request-msg" style={{ marginTop: 8 }}>
                    "Bill is ready to be shared with the customer."
                  </p>
                  <div className="request-time">
                    <ClockIcon /> {req.time}
                  </div>
                </div>
              ) : (
                <div className="waiter-request-card__body">
                  <div className="request-type-label">{typeLabel(req.type)}</div>
                  <p className="request-msg">"{req.message}"</p>
                  <div className="request-time">
                    <ClockIcon /> {req.time}
                  </div>
                </div>
              )}

              <div className="waiter-request-card__actions">
                {req.status === 'new' && (
                  <>
                    <button
                      className="btn-outline btn-sm"
                      onClick={() => handleDismiss(req)}
                      id={`dismiss-req-${req.id}`}
                      disabled={!!actionLoading[req.id]}
                    >
                      {actionLoading[req.id] === 'dismissing' ? 'Dismissing...' : 'Dismiss'}
                    </button>
                    <button
                      className="btn-primary btn-sm"
                      onClick={() => handleAccept(req)}
                      id={`accept-req-${req.id}`}
                      disabled={!!actionLoading[req.id]}
                    >
                      {actionLoading[req.id] === 'accepting' 
                        ? 'Accepting...' 
                        : (req.type === 'bill_share' ? 'Accept & Proceed to Payment' : '✓ Accept')}
                    </button>
                  </>
                )}
                {req.status === 'in_progress' && (
                  <button
                    className="btn-primary btn-sm w-full"
                    onClick={() => handleMarkCompleted(req)}
                    id={`complete-req-${req.id}`}
                    disabled={!!actionLoading[req.id]}
                    style={{ background: 'var(--color-green, #16a34a)' }}
                  >
                    {actionLoading[req.id] === 'completing' ? 'Completing...' : 'Mark Completed'}
                  </button>
                )}
                {req.status === 'completed' && (
                  <span className="req-done-label">✓ Completed</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Success/Error Toast */}
      {toast && (
        <div className={`requests-toast requests-toast--${toast.type}`}>
          {toast.message}
        </div>
      )}
    </AdminLayout>
  )
}

function ClockIcon() {
  return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
}
