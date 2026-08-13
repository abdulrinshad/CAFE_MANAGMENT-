import { useState } from 'react'
import AdminLayout from '../layouts/AdminLayout'
import { useApp } from '../context/AppContext'
import './RequestsPage.css'

const FILTER_TABS = ['All Requests', 'New', 'In Progress', 'Completed']

export default function RequestsPage() {
  const { waiterRequests, updateRequestStatus, dismissRequest } = useApp()
  const [activeTab, setActiveTab] = useState('All Requests')

  const countFor = (tab) => {
    if (!waiterRequests) return 0
    if (tab === 'All Requests') return waiterRequests.length
    if (tab === 'New') return waiterRequests.filter(r => r.status === 'new').length
    if (tab === 'In Progress') return waiterRequests.filter(r => r.status === 'in_progress').length
    if (tab === 'Completed') return waiterRequests.filter(r => r.status === 'completed').length
    return 0
  }

  const filtered = waiterRequests ? waiterRequests.filter((req) => {
    if (activeTab === 'All Requests') return true
    if (activeTab === 'New') return req.status === 'new'
    if (activeTab === 'In Progress') return req.status === 'in_progress'
    if (activeTab === 'Completed') return req.status === 'completed'
    return true
  }) : []

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
            <p className="requests-page__subtitle">
              Respond to customer table requests, refills, and billing signals.
            </p>
          </div>
        </div>

        {/* Tab Filters */}
        <div className="requests-filter-bar">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab}
              className={`requests-filter-tab${activeTab === tab ? ' requests-filter-tab--active' : ''}`}
              onClick={() => setActiveTab(tab)}
              id={`request-tab-${tab.toLowerCase().replace(/\s/g, '-')}`}
            >
              {tab} {`(${countFor(tab)})`}
            </button>
          ))}
        </div>

        {/* Requests Grid */}
        <div className="requests-grid">
          {filtered.map((req) => (
            <div key={req.id} className={`waiter-request-card ${req.status}`}>
              <div className="waiter-request-card__header">
                <span className="request-table-badge">Table {req.tableId.replace('T-', '')}</span>
                <span className="request-time">{req.time}</span>
              </div>
              <div className="waiter-request-card__body">
                <div className="request-type-label">{req.type}</div>
                <p className="request-msg">{req.message}</p>
                {req.assignedWaiter && (
                  <div className="request-waiter-assign">
                    Assigned: <strong>{req.assignedWaiter}</strong>
                  </div>
                )}
                {req.amount && <div className="request-amount">Amount: ₹{req.amount}</div>}
              </div>
              <div className="waiter-request-card__actions">
                {req.status === 'new' && (
                  <>
                    <button
                      className="btn-outline btn-sm"
                      onClick={() => dismissRequest(req.id)}
                    >
                      Dismiss
                    </button>
                    <button
                      className="btn-primary btn-sm"
                      onClick={() => updateRequestStatus(req.id, 'in_progress')}
                    >
                      Accept
                    </button>
                  </>
                )}
                {req.status === 'in_progress' && (
                  <button
                    className="btn-primary btn-sm btn-success-bg w-full"
                    onClick={() => updateRequestStatus(req.id, 'completed')}
                  >
                    Mark Completed
                  </button>
                )}
                {req.status === 'completed' && (
                  <span className="badge badge--completed w-full text-center py-2">
                    Request Completed
                  </span>
                )}
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="requests-empty-state">No requests match this filter.</div>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}
