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
import { waiterRequestApi } from '../api'
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
    // Map to request status based on is_read + type
    status: n.is_read
      ? 'completed'
      : (n._in_progress ? 'in_progress' : 'new'),
  }
}

// Request type pill label
function typeLabel(type) {
  if (type === 'new_order')         return 'New Order'
  if (type === 'bill_requested')    return 'Bill Request'
  if (type === 'table_attention')   return 'Needs Attention'
  if (type === 'payment_completed') return 'Payment Done'
  if (type === 'status_changed')    return 'Status Changed'
  return type
}

export default function RequestsPage() {
  const navigate = useNavigate()
  const {
    notifications,
    waiterRequests,
    markNotificationRead,
    fetchNotifications,
    fetchWaiterRequests,
    attendWaiterRequest,
    currentWaiter,
    currentUser,
  } = useApp()

  const activeWaiterName = currentWaiter?.name || currentUser?.username || 'Staff'

  // Local state for feedback message
  const [attendError, setAttendError] = useState(null)
  const [attendingId, setAttendingId] = useState(null)

  // Map backend WaiterRequests + Notifications
  const reqList = (waiterRequests || []).map((wr) => ({
    id: wr.id,
    rawId: wr.id,
    type: 'table_attention',
    title: `Table ${wr.table_name || wr.table_id || wr.table}`,
    message: wr.message || `Customer requested assistance at table Table ${wr.table_name || wr.table_id}`,
    tableId: wr.table_name || (wr.table ? `T-${wr.table}` : '—'),
    time: relativeTime(wr.created_at),
    rawTime: wr.created_at,
    status: wr.status === 'in_progress' ? 'in_progress' : wr.status === 'completed' ? 'completed' : 'new',
    assignedWaiter: wr.assigned_waiter || '',
    isWaiterRequest: true,
  }))

  const notifList = (notifications || [])
    .filter((n) => ['new_order', 'bill_requested', 'table_attention'].includes(n.type))
    .map((n) => notifToRequest(n))

  // Merge and deduplicate by table/message if needed
  const requests = [...reqList]
  notifList.forEach((n) => {
    if (!requests.some((r) => r.tableId === n.tableId && r.status === n.status)) {
      requests.push(n)
    }
  })

  const [activeTab, setActiveTab] = useState('All Requests')

  const countFor = (tab) => {
    if (tab === 'All Requests') return requests.length
    if (tab === 'New')          return requests.filter((r) => r.status === 'new').length
    if (tab === 'In Progress')  return requests.filter((r) => r.status === 'in_progress').length
    if (tab === 'Completed')    return requests.filter((r) => r.status === 'completed').length
    return 0
  }

  const filtered = requests.filter((r) => {
    if (activeTab === 'All Requests') return true
    if (activeTab === 'New')          return r.status === 'new'
    if (activeTab === 'In Progress')  return r.status === 'in_progress'
    if (activeTab === 'Completed')    return r.status === 'completed'
    return true
  })

  const handleAttend = async (req) => {
    if (attendingId === req.id) return
    setAttendingId(req.id)
    setAttendError(null)

    try {
      if (req.isWaiterRequest && req.rawId) {
        await attendWaiterRequest(req.rawId, activeWaiterName)
      } else {
        // Fallback for notification item
        await markNotificationRead(req.id)
      }
      await fetchWaiterRequests()
      await fetchNotifications()
    } catch (err) {
      console.warn('Attend error:', err)
      const errMsg = err.message || 'This request has already been attended.'
      setAttendError(errMsg)
      await fetchWaiterRequests()
      await fetchNotifications()
    } finally {
      setAttendingId(null)
    }
  }

  const handleDismiss = async (req) => {
    if (req.isWaiterRequest) {
      await attendWaiterRequest(req.rawId, activeWaiterName)
    } else {
      await markNotificationRead(req.id)
    }
  }

  const handleMarkCompleted = async (req) => {
    if (req.isWaiterRequest) {
      await waiterRequestApi.setStatus(req.rawId, { status: 'completed' })
    } else {
      await markNotificationRead(req.id)
    }

    await fetchWaiterRequests()
    await fetchNotifications()
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

        {/* Double-attendance error toast */}
        {attendError && (
          <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, padding: '12px 16px', marginBottom: 16, color: '#991b1b', fontSize: 13, fontWeight: 500 }}>
            ⚠️ {attendError}
          </div>
        )}

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

          {filtered.map((req) => {
            const isAssignedToMe = req.assignedWaiter && (req.assignedWaiter === activeWaiterName || req.assignedWaiter === currentWaiter?.name)

            return (
              <div
                key={req.id}
                className={`waiter-request-card ${req.status}${req.type === 'bill_requested' ? ' bill-req' : ''}`}
              >
                <div className="waiter-request-card__header">
                  <span className="request-table-badge">
                    {req.tableId !== '—' ? `Table ${req.tableId.replace('T-', '')}` : req.title}
                  </span>
                  <div className="request-header-right">
                    <span className={`req-type-pill req-type-pill--${req.type}`}>
                      {req.status === 'new' ? 'PENDING' : req.status === 'in_progress' ? 'ATTENDED' : 'DONE'}
                    </span>
                  </div>
                </div>

                <div className="waiter-request-card__body">
                  <div className="request-type-label">{typeLabel(req.type)}</div>
                  <p className="request-msg">"{req.message}"</p>

                  {req.assignedWaiter && (
                    <div style={{ fontSize: 12, fontWeight: 600, color: isAssignedToMe ? '#16a34a' : '#d97706', marginTop: 4 }}>
                      {isAssignedToMe ? '✓ Attended by You' : `✓ Attended by ${req.assignedWaiter}`}
                    </div>
                  )}

                  <div className="request-time">
                    <ClockIcon /> {req.time}
                  </div>
                </div>

                <div className="waiter-request-card__actions">
                  {req.status === 'new' && (
                    <>
                      <button
                        className="btn-outline btn-sm"
                        onClick={() => handleDismiss(req)}
                        id={`dismiss-req-${req.id}`}
                      >
                        Dismiss
                      </button>
                      <button
                        className="btn-primary btn-sm"
                        onClick={() => handleAttend(req)}
                        disabled={attendingId === req.id}
                        id={`attend-req-${req.id}`}
                      >
                        {attendingId === req.id ? 'Attending…' : '✓ Attend'}
                      </button>
                    </>
                  )}
                  {req.status === 'in_progress' && (
                    <button
                      className="btn-primary btn-sm w-full"
                      onClick={() => handleMarkCompleted(req)}
                      id={`complete-req-${req.id}`}
                      style={{ background: 'var(--color-green, #16a34a)' }}
                    >
                      Mark Completed
                    </button>
                  )}
                  {req.status === 'completed' && (
                    <span className="req-done-label">✓ Completed</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </AdminLayout>
  )
}


function ClockIcon() {
  return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
}
