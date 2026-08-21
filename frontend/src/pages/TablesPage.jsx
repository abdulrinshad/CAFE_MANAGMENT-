import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminLayout from '../layouts/AdminLayout'
import { useApp } from '../context/AppContext'
import Modal from '../components/Modal'
import ConfirmModal from '../components/ConfirmModal'
import './TablesPage.css'

const FILTER_TABS = ['All Tables', 'Assigned', 'Available', 'Occupied', 'Order In Progress', 'Bill Requested']

export default function TablesPage() {
  const navigate = useNavigate()
  const {
    tables, addTable, updateTable, deleteTable, setTableStatus, setTableActive,
    currentRole, orders, loading, apiError, fetchTables, fetchOrders, currentWaiter
  } = useApp()

  useEffect(() => {
    fetchTables()
    fetchOrders()
  }, [fetchTables, fetchOrders])

  const [activeFilter,   setActiveFilter]   = useState('All Tables')
  const [addTableOpen,   setAddTableOpen]   = useState(false)
  const [newTable,       setNewTable]       = useState({ id: '', seats: 4 })
  const [addSaving,      setAddSaving]      = useState(false)
  const [addErr,         setAddErr]         = useState(null)
  const [paymentTable,   setPaymentTable]   = useState(null)
  const [deleteTarget,   setDeleteTarget]   = useState(null)

  const countFor = (filter) => {
    if (filter === 'All Tables')         return tables.length
    if (filter === 'Assigned')           return tables.filter((t) => t.assigned_waiter === currentWaiter?.name || t.active).length
    if (filter === 'Available')          return tables.filter((t) => t.status === 'available').length
    if (filter === 'Occupied')           return tables.filter((t) => t.status === 'occupied').length
    if (filter === 'Order In Progress')  return tables.filter((t) => t.status === 'occupied' || t.status === 'in_progress').length
    if (filter === 'Bill Requested')     return tables.filter((t) => t.status === 'bill_requested' || t.status === 'needs_attention').length
    return 0
  }

  const filtered = tables.filter((t) => {
    if (activeFilter === 'All Tables')         return true
    if (activeFilter === 'Assigned')           return t.assigned_waiter === currentWaiter?.name || t.active
    if (activeFilter === 'Available')          return t.status === 'available'
    if (activeFilter === 'Occupied')           return t.status === 'occupied'
    if (activeFilter === 'Order In Progress')  return t.status === 'occupied' || t.status === 'in_progress'
    if (activeFilter === 'Bill Requested')     return t.status === 'bill_requested' || t.status === 'needs_attention'
    return true
  })

  const handleAddTable = async () => {
    if (!newTable.id.trim()) return
    setAddSaving(true)
    setAddErr(null)
    try {
      await addTable({ id: newTable.id.trim(), seats: Number(newTable.seats) || 4 })
      setNewTable({ id: '', seats: 4 })
      setAddTableOpen(false)
    } catch (err) {
      setAddErr(err.message || 'Failed to create table.')
    } finally {
      setAddSaving(false)
    }
  }

  const handleProcessPayment = async () => {
    if (!paymentTable) return
    try {
      await setTableStatus(paymentTable.id, 'available')
      setPaymentTable(null)
    } catch (err) {
      console.error('Process payment error:', err)
    }
  }

  const handleDeleteTable = async () => {
    if (!deleteTarget) return
    try {
      await deleteTable(deleteTarget.id)
      setDeleteTarget(null)
    } catch (err) {
      console.error('Delete table error:', err)
    }
  }

  // ── Waiter view ──────────────────────────────────────────────────────────
  if (currentRole === 'waiter') {
    // Helper: minutes seated from order creation time
    const seatedTime = (order) => {
      if (!order?.created_at) return null
      const mins = Math.floor((Date.now() - new Date(order.created_at)) / 60000)
      if (mins < 60) return `${mins}m`
      return `${Math.floor(mins / 60)}h ${mins % 60}m`
    }

    return (
      <AdminLayout
        searchPlaceholder="Search dining floor..."
        pageTitle="Floor Plan"
        pageIcon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="7" width="18" height="3" rx="1"/><line x1="8" y1="10" x2="8" y2="20"/><line x1="16" y1="10" x2="16" y2="20"/><line x1="5" y1="20" x2="19" y2="20"/></svg>}
      >
        <div className="floor-plan-page">
          <div className="floor-plan__header-row">
            <div className="floor-plan__subtitle-wrap">
              <h2>Main Dining Room</h2>
              <p>Manage tables, guests, and instant table actions.</p>
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <button
                className="btn-primary"
                id="btn-add-table-waiter"
                onClick={() => setAddTableOpen(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', fontSize: 13 }}
              >
                + Create Table
              </button>
              <div className="floor-plan__legend">
                <div className="legend-item"><span className="legend-dot legend-dot--available" /><span>Available</span></div>
                <div className="legend-item"><span className="legend-dot legend-dot--occupied" /><span>Occupied</span></div>
                <div className="legend-item"><span className="legend-dot legend-dot--action" /><span>Action Needed</span></div>
              </div>
            </div>
          </div>

          {loading.tables && tables.length === 0 ? (
            <div style={{ color: '#9ca3af', textAlign: 'center', padding: '40px 0' }}>Loading tables…</div>
          ) : tables.length === 0 ? (
            <div style={{ color: '#9ca3af', textAlign: 'center', padding: '40px 0' }}>No tables found. Ask admin to add tables.</div>
          ) : (
            <div className="floor-plan__grid">
              {tables.map((table) => {
                const isAvailable = table.status === 'available'
                const isOccupied  = table.status === 'occupied'
                const isBillReq   = table.status === 'bill_requested'
                const isNeedsAttn = table.status === 'needs_attention' || isBillReq

                // Find active order: prefer current_order_ref stored on table
                const orderRef  = table.current_order_ref || table.currentOrderId
                const activeOrd = orders
                  ? orders.find((o) =>
                      (orderRef && (o.order_number === orderRef || String(o.id) === String(orderRef))) ||
                      (o.table === table.label && !['COMPLETED', 'CANCELLED'].includes(o.status))
                    )
                  : null
                const orderId = activeOrd ? activeOrd.id : null

                // Display amount: prefer live order total, fallback to table.amount
                const displayAmount = activeOrd?.total ?? activeOrd?.amount ?? table.amount ?? null
                const itemCount     = activeOrd?.item_count ?? activeOrd?.itemCount ?? null

                return (
                  <div key={table.id} className={`waiter-table-card ${table.status}`}>
                    {/* Top row: table number + dining pill */}
                    <div className="waiter-table-card__top">
                      <span className="waiter-table-card__num">
                        {(table.label || '').replace(/\D/g, '') || table.label}
                      </span>
                      {(isOccupied || isBillReq) && (
                        <span className={`waiter-table-status-pill ${table.status}`}>
                          {isBillReq
                            ? '● Bill Requested'
                            : `● Dining${seatedTime(activeOrd) ? ` • ${seatedTime(activeOrd)}` : ''}`}
                        </span>
                      )}
                    </div>

                    {/* Body: amount / seats / status */}
                    <div className="waiter-table-card__body">
                      {isAvailable && (
                        <div className="waiter-table-card__available-info">
                          <span className="table-seats-lbl">{table.seats} Seats</span>
                          <span className="waiter-table-status-pill available">● Available</span>
                        </div>
                      )}
                      {(isOccupied || isBillReq) && (
                        <div className="waiter-table-card__occupied-info">
                          {displayAmount != null && Number(displayAmount) > 0 && (
                            <span className="table-amount-lbl">
                              ₹{Number(displayAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </span>
                          )}
                          {itemCount != null && (
                            <span className="table-item-count">
                              {itemCount} item{itemCount !== 1 ? 's' : ''}
                            </span>
                          )}
                          {!displayAmount && !itemCount && (
                            <span className="table-seats-lbl">Occupied</span>
                          )}
                        </div>
                      )}
                      {isNeedsAttn && !isBillReq && (
                        <div className="waiter-table-card__attn-info">
                          <span className="table-guests-lbl">Needs Attention</span>
                        </div>
                      )}
                    </div>

                    {/* Footer: action buttons */}
                    <div className="waiter-table-card__footer">
                      {isAvailable && (
                        <div className="waiter-table-card__actions">
                          <button
                            className="btn-primary btn-sm"
                            onClick={() => navigate(`/orders/new?table=${table.id}`)}
                            id={`start-order-table-${table.id}`}
                          >
                            + Create Order
                          </button>
                          {table.qrCodeId && (
                            <button
                              className="btn-outline btn-sm"
                              title="View QR Code"
                              onClick={() => navigate(`/qr-codes/${table.qrCodeId}`)}
                              id={`qr-table-${table.id}`}
                              style={{ flex: '0 0 auto', padding: '0 10px' }}
                            >
                              QR
                            </button>
                          )}
                        </div>
                      )}

                      {isBillReq && (
                        <div className="waiter-table-card__actions">
                          <button
                            className="btn-primary btn-sm w-full"
                            onClick={() => {
                              if (activeOrd) {
                                navigate(`/orders/${activeOrd.id}/invoice`)
                              } else {
                                navigate('/bill-requests')
                              }
                            }}
                            id={`view-bill-table-${table.id}`}
                          >
                            View Bill
                          </button>
                        </div>
                      )}

                      {isOccupied && !isBillReq && (
                        <div className="waiter-table-card__actions">
                          <button
                            className="btn-outline btn-sm"
                            onClick={() => orderId
                              ? navigate(`/orders/${orderId}/add-items`)
                              : navigate(`/orders/new?table=${table.id}`)
                            }
                            id={`add-item-table-${table.id}`}
                          >
                            Add Item
                          </button>
                          <button
                            className="btn-primary btn-sm"
                            onClick={() => {
                              if (activeOrd) {
                                navigate(`/orders/${activeOrd.id}`)
                              } else {
                                navigate('/orders')
                              }
                            }}
                            id={`view-order-table-${table.id}`}
                          >
                            View Order
                          </button>
                        </div>
                      )}
                      {isNeedsAttn && !isBillReq && (
                        <button
                          className="btn-primary btn-sm w-full btn-danger-bg"
                          onClick={() => setPaymentTable(table)}
                        >
                          Process Payment
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <ConfirmModal
          open={!!paymentTable}
          onClose={() => setPaymentTable(null)}
          onConfirm={handleProcessPayment}
          title="Process Payment"
          message={paymentTable ? `Mark payment for ${paymentTable.label} as completed and free the table?` : ''}
          confirmLabel="Process Payment"
          cancelLabel="Cancel"
        />

        {/* Add Table Modal */}
        <Modal
          open={addTableOpen}
          onClose={() => { setAddTableOpen(false); setAddErr(null) }}
          title="Create Table"
          subtitle="Add a new dining table to the database floor plan"
          size="sm"
          footer={
            <>
              <button className="btn-outline" onClick={() => { setAddTableOpen(false); setAddErr(null) }}>Cancel</button>
              <button className="btn-primary" onClick={handleAddTable} id="confirm-add-table-waiter" disabled={addSaving}>
                {addSaving ? 'Adding…' : 'Create Table'}
              </button>
            </>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {addErr && (
              <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 6, padding: '8px 12px', color: '#991b1b', fontSize: 13 }}>
                {addErr}
              </div>
            )}

            <div className="form-group">
              <label className="form-label" htmlFor="table-id-waiter">Table Name / Number <span>*</span></label>
              <input
                id="table-id-waiter"
                className="form-input"
                placeholder="e.g. T-09 or Bar-2"
                value={newTable.id}
                onChange={(e) => setNewTable((prev) => ({ ...prev, id: e.target.value }))}
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="table-seats-waiter">Seat Capacity</label>
              <select
                id="table-seats-waiter"
                className="form-select"
                value={newTable.seats}
                onChange={(e) => setNewTable((prev) => ({ ...prev, seats: Number(e.target.value) }))}
              >
                <option value={2}>2 Seats (Small)</option>
                <option value={4}>4 Seats (Standard)</option>
                <option value={6}>6 Seats (Medium)</option>
                <option value={8}>8 Seats (Large)</option>
                <option value={10}>10 Seats (Banquet)</option>
              </select>
            </div>
          </div>
        </Modal>
      </AdminLayout>
    )
  }

  // ── Admin view ───────────────────────────────────────────────────────────
  return (
    <AdminLayout searchPlaceholder="Search tables...">
      <div className="tables-page">
        {/* Header */}
        <div className="tables-page__header">
          <h1 className="tables-page__title">Table Management</h1>
          <button className="btn-add-table" id="btn-add-table" onClick={() => setAddTableOpen(true)}>
            <PlusIcon /> Add Table
          </button>
        </div>

        {/* API error banner */}
        {apiError && (
          <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, padding: '12px 16px', marginBottom: 20, color: '#991b1b', fontSize: 14 }}>
            ⚠️ Cannot reach Django API: {apiError}. Make sure the backend server is running.
          </div>
        )}

        {/* Filters */}
        <div className="tables-filter-bar">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab}
              className={`tables-filter-tab${activeFilter === tab ? ' tables-filter-tab--active' : ''}`}
              onClick={() => setActiveFilter(tab)}
              id={`table-tab-${tab.toLowerCase().replace(/\s/g, '-')}`}
            >
              {tab} {tab !== 'All Tables' ? `(${countFor(tab)})` : ''}
            </button>
          ))}
        </div>

        {/* Loading / Empty / Grid */}
        {loading.tables && tables.length === 0 ? (
          <div className="tables-empty">Loading tables…</div>
        ) : filtered.length === 0 ? (
          <div className="tables-empty">
            {tables.length === 0
              ? "No tables yet. Click '+ Add Table' to create your first table."
              : 'No tables match this filter.'}
          </div>
        ) : (
          <div className="tables-grid">
            {filtered.map((table) => (
              <TableCard
                key={table.id}
                table={table}
                onProcessPayment={() => setPaymentTable(table)}
                onAddItem={() => navigate('/menu/add')}
                onView={() => {
                  const activeOrd = orders?.find(o => o.table === table.label && !['COMPLETED', 'CANCELLED'].includes(o.status))
                  if (activeOrd) {
                    if (activeOrd.receipt_method) {
                      navigate(`/orders/${activeOrd.id}/invoice`)
                    } else {
                      navigate(`/orders/${activeOrd.id}`)
                    }
                  } else {
                    navigate('/orders')
                  }
                }}
                onQR={() => table.qrCodeId && navigate(`/qr-codes/${table.qrCodeId}`)}
                onDelete={() => setDeleteTarget(table)}
                onToggleActive={() => setTableActive(table.id, !table.active)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add Table Modal */}
      <Modal
        open={addTableOpen}
        onClose={() => { setAddTableOpen(false); setAddErr(null) }}
        title="Add Table"
        subtitle="Add a new table to your floor plan"
        size="sm"
        footer={
          <>
            <button className="btn-outline" onClick={() => { setAddTableOpen(false); setAddErr(null) }}>Cancel</button>
            <button className="btn-primary" onClick={handleAddTable} id="confirm-add-table" disabled={addSaving}>
              {addSaving ? 'Adding…' : 'Add Table'}
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {addErr && (
            <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 6, padding: '8px 12px', color: '#991b1b', fontSize: 13 }}>
              {addErr}
            </div>
          )}
          <div className="form-group">
            <label className="form-label" htmlFor="new-table-id">Table ID / Name</label>
            <input
              id="new-table-id"
              className="form-input"
              placeholder="e.g. T-06 or Rooftop-1"
              value={newTable.id}
              onChange={(e) => setNewTable((t) => ({ ...t, id: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="new-table-seats">Number of Seats</label>
            <input
              id="new-table-seats"
              className="form-input"
              type="number"
              min={1}
              max={20}
              value={newTable.seats}
              onChange={(e) => setNewTable((t) => ({ ...t, seats: e.target.value }))}
            />
          </div>
        </div>
      </Modal>

      {/* Process Payment Confirm */}
      <ConfirmModal
        open={!!paymentTable}
        onClose={() => setPaymentTable(null)}
        onConfirm={handleProcessPayment}
        title="Process Payment"
        message={paymentTable ? `Mark payment for ${paymentTable.label} as completed and free the table?` : ''}
        confirmLabel="Process Payment"
        cancelLabel="Cancel"
      />

      {/* Delete Confirm */}
      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteTable}
        title="Delete Table?"
        message={deleteTarget ? `Delete "${deleteTarget.label}"? This will also remove its QR code. This cannot be undone.` : ''}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        danger
      />
    </AdminLayout>
  )
}

/* ── Table Card (admin view) ── */
function TableCard({ table, onProcessPayment, onAddItem, onView, onQR, onDelete, onToggleActive }) {
  const isAvailable  = table.status === 'available'
  const isOccupied   = table.status === 'occupied'
  const isNeedsAttn  = table.status === 'needs_attention' || table.status === 'bill_requested'

  return (
    <div className={[
      'table-card',
      isOccupied  ? 'table-card--occupied'   : '',
      isNeedsAttn ? 'table-card--needs-attn' : '',
      !table.active ? 'table-card--inactive' : '',
    ].filter(Boolean).join(' ')}>
      {/* Top */}
      <div className="table-card__top">
        <div className="table-card__id">{table.label || table.name}</div>
        <div className="table-card__top-right">
          {isAvailable && <span className="table-card__seats">{table.seats} Seats</span>}
          {(isOccupied || isNeedsAttn) && table.amount != null && (
            <div className="table-card__amount-info">
              <span className="table-card__amount">₹{parseFloat(table.amount).toFixed(2)}</span>
              {table.currentOrderId && <span className="table-card__order-id">{table.currentOrderId}</span>}
            </div>
          )}
        </div>
      </div>

      {/* Status badge */}
      {isOccupied  && <span className="table-badge table-badge--occupied">Order in Progress</span>}
      {isNeedsAttn && <span className="table-badge table-badge--attn">Bill Requested</span>}
      {!table.active && <span className="table-badge" style={{ background: '#374151', color: '#9ca3af' }}>Inactive</span>}

      {/* Content */}
      <div className="table-card__content">
        {isAvailable && (
          <div className="table-card__chair-icon"><ChairIcon /></div>
        )}
        {(isOccupied || isNeedsAttn) && table.items && table.items.length > 0 && (
          <div className="table-card__items-list">
            {table.items.map((item, i) => (
              <div key={i} className="table-card__item">{item}</div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="table-card__footer">
        {isAvailable && (
          <>
            <span className="table-card__active-badge"><GreenDotIcon /> {table.active ? 'Active' : 'Inactive'}</span>
            <div className="table-card__icon-btns">
              <button className="table-icon-btn" title="View Orders" onClick={onView} id={`view-${table.id}`}><EyeIcon /></button>
              <button className="table-icon-btn" title="QR Code" onClick={onQR} id={`qr-${table.id}`}><QRIcon /></button>
              <button className="table-icon-btn" title={table.active ? 'Deactivate' : 'Activate'} onClick={onToggleActive} id={`active-${table.id}`}><AssignIcon /></button>
              <button className="table-icon-btn" title="Delete" onClick={onDelete} id={`delete-${table.id}`} style={{ color: '#ef4444' }}><DeleteIcon /></button>
            </div>
          </>
        )}
        {isOccupied && (
          <>
            <span className="table-card__seated"><ClockIcon /> Occupied</span>
            <div className="table-card__action-btns">
              <button className="btn-outline btn-sm" onClick={onAddItem} id={`add-item-${table.id}`}>Add Item</button>
              <button className="btn-primary btn-sm" onClick={onView} id={`view-order-${table.id}`}>View</button>
            </div>
          </>
        )}
        {isNeedsAttn && (
          <>
            <span className="table-card__waiting-red"><ClockRedIcon /> Waiting</span>
            <button className="btn-primary btn-sm" onClick={onProcessPayment} id={`pay-${table.id}`}>
              Process Payment
            </button>
          </>
        )}
      </div>
    </div>
  )
}

/* ── Icons ── */
function PlusIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
}
function ChairIcon() {
  return (
    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.15 }}>
      <path d="M3 7h18v10H3z" rx="1"/><path d="M7 17v4M17 17v4"/><path d="M5 7V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v2"/>
    </svg>
  )
}
function GreenDotIcon() {
  return <svg width="8" height="8" viewBox="0 0 8 8"><circle cx="4" cy="4" r="4" fill="#16a34a"/></svg>
}
function EyeIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
}
function QRIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><line x1="14" y1="14" x2="14" y2="14.01"/></svg>
}
function AssignIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
}
function DeleteIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
}
function ClockIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
}
function ClockRedIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#e74c3c" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
}
