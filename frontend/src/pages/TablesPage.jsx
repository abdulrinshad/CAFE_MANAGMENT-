import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminLayout from '../layouts/AdminLayout'
import { useApp } from '../context/AppContext'
import Modal from '../components/Modal'
import ConfirmModal from '../components/ConfirmModal'
import './TablesPage.css'

const FILTER_TABS = ['All Tables', 'Available', 'Occupied', 'Needs Attention']

export default function TablesPage() {
  const navigate = useNavigate()
  const { tables, addTable, updateTable, currentRole, orders } = useApp()

  const [activeFilter, setActiveFilter] = useState('All Tables')
  const [addTableOpen, setAddTableOpen] = useState(false)
  const [newTable, setNewTable] = useState({ id: '', seats: 4 })
  const [paymentTable, setPaymentTable] = useState(null)

  const countFor = (filter) => {
    if (filter === 'All Tables') return tables.length
    if (filter === 'Available') return tables.filter((t) => t.status === 'available').length
    if (filter === 'Occupied') return tables.filter((t) => t.status === 'occupied').length
    if (filter === 'Needs Attention') return tables.filter((t) => t.status === 'needs_attention').length
    return 0
  }

  const filtered = tables.filter((t) => {
    if (activeFilter === 'All Tables') return true
    if (activeFilter === 'Available') return t.status === 'available'
    if (activeFilter === 'Occupied') return t.status === 'occupied'
    if (activeFilter === 'Needs Attention') return t.status === 'needs_attention'
    return true
  })

  const handleAddTable = () => {
    if (!newTable.id.trim()) return
    addTable({ id: newTable.id.trim(), label: newTable.id.trim(), seats: Number(newTable.seats) || 4 })
    setNewTable({ id: '', seats: 4 })
    setAddTableOpen(false)
  }

  const handleProcessPayment = () => {
    if (!paymentTable) return
    updateTable(paymentTable.id, { status: 'available', currentOrderId: null, amount: null, items: [], seatedMinutes: null, waitingMinutes: null })
    setPaymentTable(null)
  }

  if (currentRole === 'waiter') {
    return (
      <AdminLayout
        searchPlaceholder="Search dining floor..."
        pageTitle="Floor Plan"
        pageIcon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="7" width="18" height="3" rx="1"/><line x1="8" y1="10" x2="8" y2="20"/><line x1="16" y1="10" x2="16" y2="20"/><line x1="5" y1="20" x2="19" y2="20"/></svg>}
      >
        <div className="floor-plan-page">
          {/* Legend and Subtitle Row */}
          <div className="floor-plan__header-row">
            <div className="floor-plan__subtitle-wrap">
              <h2>Main Dining Room</h2>
              <p>Manage tables, guests, and instant table actions.</p>
            </div>
            
            {/* Status Legend */}
            <div className="floor-plan__legend">
              <div className="legend-item">
                <span className="legend-dot legend-dot--available" />
                <span>Available</span>
              </div>
              <div className="legend-item">
                <span className="legend-dot legend-dot--occupied" />
                <span>Occupied</span>
              </div>
              <div className="legend-item">
                <span className="legend-dot legend-dot--action" />
                <span>Action Needed</span>
              </div>
            </div>
          </div>

          {/* Table Cards Grid */}
          <div className="floor-plan__grid">
            {tables.map((table) => {
              const isAvailable = table.status === 'available'
              const isOccupied = table.status === 'occupied'
              const isNeedsAttn = table.status === 'needs_attention'
              
              // Find the active order for this table
              const activeOrd = orders ? orders.find(o => o.table === table.label && o.status !== 'COMPLETED') : null
              const orderId = activeOrd ? activeOrd.id : 'ORD-1041' // Default fallback to a known order

              // Map some guest counts & activities for visual reference
              let guestCount = '2 Guests'
              let activity = 'Coffee · 12m'
              if (table.id === 'T-02') {
                guestCount = '2 Guests'
                activity = 'Dining · 15m'
              } else if (table.id === 'T-04') {
                guestCount = '4 Guests'
                activity = 'Bill Requested'
              }

              return (
                <div 
                  key={table.id} 
                  className={`waiter-table-card ${table.status}`}
                >
                  <div className="waiter-table-card__top">
                    <span className="waiter-table-card__id">{table.label}</span>
                    <span className={`waiter-table-status-pill ${table.status}`}>
                      {table.status.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="waiter-table-card__body">
                    {isAvailable && (
                      <div className="waiter-table-card__available-info">
                        <span className="table-seats-lbl">{table.seats} Seats</span>
                        <div className="waiter-table-card__icon-wrap">🛋️</div>
                      </div>
                    )}
                    {isOccupied && (
                      <div className="waiter-table-card__occupied-info">
                        <span className="table-guests-lbl">{guestCount}</span>
                        <span className="table-activity-lbl">{activity}</span>
                      </div>
                    )}
                    {isNeedsAttn && (
                      <div className="waiter-table-card__attn-info">
                        <span className="table-guests-lbl">{guestCount}</span>
                        <span className="table-amount-lbl">₹{(table.amount || 105.00 * 80).toLocaleString()}</span>
                      </div>
                    )}
                  </div>

                  <div className="waiter-table-card__footer">
                    {isAvailable && (
                      <button 
                        className="btn-primary btn-sm w-full"
                        onClick={() => navigate(`/orders/new?table=${table.id}`)}
                      >
                        Start Order
                      </button>
                    )}
                    {isOccupied && (
                      <div className="waiter-table-card__actions">
                        <button 
                          className="btn-outline btn-sm"
                          onClick={() => navigate(`/orders/${orderId}/active`)}
                        >
                          Add Item
                        </button>
                        <button 
                          className="btn-primary btn-sm"
                          onClick={() => navigate(`/orders/${orderId}/active`)}
                        >
                          View Order
                        </button>
                      </div>
                    )}
                    {isNeedsAttn && (
                      <button 
                        className="btn-primary btn-sm w-full btn-danger-bg"
                        onClick={() => navigate(`/orders/${orderId}/active`)}
                      >
                        Process Payment
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Process Payment Confirm */}
        <ConfirmModal
          open={!!paymentTable}
          onClose={() => setPaymentTable(null)}
          onConfirm={handleProcessPayment}
          title="Process Payment"
          message={paymentTable ? `Mark payment for ${paymentTable.label} (${paymentTable.currentOrderId || 'Current Order'}) as completed and free the table?` : ''}
          confirmLabel="Process Payment"
          cancelLabel="Cancel"
        />
      </AdminLayout>
    )
  }

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

        {/* Cards grid */}
        <div className="tables-grid">
          {filtered.map((table) => (
            <TableCard
              key={table.id}
              table={table}
              onProcessPayment={() => setPaymentTable(table)}
              onAddItem={() => navigate('/menu/add')}
              onView={() => navigate(`/orders`)}
              onQR={() => navigate(`/qr-codes/qr-${table.id.replace('-', '')}`)}
            />
          ))}
          {filtered.length === 0 && (
            <div className="tables-empty">No tables match this filter.</div>
          )}
        </div>
      </div>

      {/* Add Table Modal */}
      <Modal
        open={addTableOpen}
        onClose={() => setAddTableOpen(false)}
        title="Add Table"
        subtitle="Add a new table to your floor plan"
        size="sm"
        footer={
          <>
            <button className="btn-outline" onClick={() => setAddTableOpen(false)}>Cancel</button>
            <button className="btn-primary" onClick={handleAddTable} id="confirm-add-table">Add Table</button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group">
            <label className="form-label" htmlFor="new-table-id">Table ID</label>
            <input
              id="new-table-id"
              className="form-input"
              placeholder="e.g. T-06"
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
        message={paymentTable ? `Mark payment for ${paymentTable.label} (${paymentTable.currentOrderId}) as completed and free the table?` : ''}
        confirmLabel="Process Payment"
        cancelLabel="Cancel"
      />
    </AdminLayout>
  )
}

/* ── Table Card ── */
function TableCard({ table, onProcessPayment, onAddItem, onView, onQR }) {
  const isAvailable     = table.status === 'available'
  const isOccupied      = table.status === 'occupied'
  const isNeedsAttn     = table.status === 'needs_attention'

  return (
    <div className={[
      'table-card',
      isOccupied  ? 'table-card--occupied'   : '',
      isNeedsAttn ? 'table-card--needs-attn' : '',
    ].filter(Boolean).join(' ')}>
      {/* Top */}
      <div className="table-card__top">
        <div className="table-card__id">{table.label}</div>
        <div className="table-card__top-right">
          {isAvailable && <span className="table-card__seats">{table.seats} Seats</span>}
          {(isOccupied || isNeedsAttn) && (
            <div className="table-card__amount-info">
              <span className="table-card__amount">${table.amount?.toFixed(2)}</span>
              <span className="table-card__order-id">{table.currentOrderId}</span>
            </div>
          )}
        </div>
      </div>

      {/* Status badge */}
      {isOccupied   && <span className="table-badge table-badge--occupied">Order in Progress</span>}
      {isNeedsAttn  && <span className="table-badge table-badge--attn">Bill Requested</span>}

      {/* Content */}
      <div className="table-card__content">
        {isAvailable && (
          <div className="table-card__chair-icon">
            <ChairIcon />
          </div>
        )}
        {(isOccupied || isNeedsAttn) && table.items.length > 0 && (
          <div className="table-card__items-list">
            {table.items.map((item, i) => (
              <div key={i} className="table-card__item">{item}</div>
            ))}
            {table.waitingMinutes && (
              <div className="table-card__wait">~ {table.waitingMinutes} mins waiting</div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="table-card__footer">
        {isAvailable && (
          <>
            <span className="table-card__active-badge"><GreenDotIcon /> Active</span>
            <div className="table-card__icon-btns">
              <button className="table-icon-btn" title="View" onClick={onView} id={`view-${table.id}`}><EyeIcon /></button>
              <button className="table-icon-btn" title="QR Code" onClick={onQR} id={`qr-${table.id}`}><QRIcon /></button>
              <button className="table-icon-btn" title="Assign" id={`assign-${table.id}`}><AssignIcon /></button>
            </div>
          </>
        )}
        {isOccupied && (
          <>
            <span className="table-card__seated">
              <ClockIcon /> {table.seatedMinutes}m seated
            </span>
            <div className="table-card__action-btns">
              <button className="btn-outline btn-sm" onClick={onAddItem} id={`add-item-${table.id}`}>Add Item</button>
              <button className="btn-primary btn-sm" onClick={onView} id={`view-order-${table.id}`}>View</button>
            </div>
          </>
        )}
        {isNeedsAttn && (
          <>
            <span className="table-card__waiting-red">
              <ClockRedIcon /> {table.waitingMinutes}m waiting
            </span>
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
      <path d="M3 7h18v10H3z" rx="1"/>
      <path d="M7 17v4M17 17v4"/>
      <path d="M5 7V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v2"/>
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
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/><line x1="12" y1="14" x2="12" y2="21"/><line x1="18" y1="17" x2="6" y2="17"/></svg>
}
function ClockIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
}
function ClockRedIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#e74c3c" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
}
