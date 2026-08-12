import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import AdminLayout from '../layouts/AdminLayout'
import { useApp } from '../context/AppContext'
import './OrderDetailPage.css'

const STATUS_STEPS = ['NEW', 'ACCEPTED', 'PREPARING', 'READY', 'COMPLETED']

const STEP_LABELS = {
  NEW:       'New',
  ACCEPTED:  'Accepted',
  PREPARING: 'Preparing',
  READY:     'Ready',
  COMPLETED: 'Completed',
}

function stepIndex(status) {
  return STATUS_STEPS.indexOf(status)
}

export default function OrderDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { orders, updateOrderStatus } = useApp()

  const order = orders.find((o) => o.id === id)
  const [marking, setMarking] = useState(false)

  if (!order) {
    return (
      <AdminLayout>
        <div style={{ textAlign: 'center', padding: '80px', color: 'var(--color-text-muted)' }}>
          Order not found.{' '}
          <button className="btn-outline" onClick={() => navigate('/orders')}>Back to Orders</button>
        </div>
      </AdminLayout>
    )
  }

  const currentStep = stepIndex(order.status)

  const handleMarkCompleted = () => {
    setMarking(true)
    setTimeout(() => {
      updateOrderStatus(id, 'COMPLETED')
      setMarking(false)
    }, 400)
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <AdminLayout searchPlaceholder="Search orders...">
      <div className="order-detail">
        {/* Header */}
        <div className="order-detail__header">
          <div className="order-detail__header-left">
            <button className="order-detail__back" onClick={() => navigate('/orders')} aria-label="Back to orders">
              <ArrowLeftIcon />
            </button>
            <div>
              <h1 className="order-detail__title">Order {order.orderId}</h1>
              <div className="order-detail__meta">
                <span className="order-detail__meta-item">
                  <TableIcon /> Table: {order.table}
                </span>
                <span className="order-detail__meta-sep">•</span>
                <span className="order-detail__meta-item">
                  <WaiterIcon /> Waiter: {order.waiter}
                </span>
              </div>
            </div>
          </div>
          <div className="order-detail__header-actions">
            <button className="btn-outline" onClick={handlePrint} id="print-receipt">
              Print Receipt
            </button>
            {order.status !== 'COMPLETED' && (
              <button
                className="btn-primary"
                onClick={handleMarkCompleted}
                disabled={marking}
                id="mark-completed"
              >
                {marking ? 'Updating…' : 'Mark Completed'}
              </button>
            )}
            {order.status === 'COMPLETED' && (
              <span className="order-detail__done-badge">✓ Completed</span>
            )}
          </div>
        </div>

        {/* Status Stepper */}
        <div className="order-detail__status-card">
          <h2 className="order-detail__section-title">Status</h2>
          <div className="status-stepper">
            {STATUS_STEPS.map((step, i) => {
              const isDone    = i < currentStep
              const isCurrent = i === currentStep
              const isFuture  = i > currentStep
              return (
                <div key={step} className="status-stepper__item">
                  {/* Connector before */}
                  {i > 0 && (
                    <div className={`status-stepper__line${isDone || isCurrent ? ' status-stepper__line--active' : ''}`} />
                  )}
                  {/* Circle */}
                  <div className={[
                    'status-stepper__circle',
                    isDone    ? 'status-stepper__circle--done'    : '',
                    isCurrent ? 'status-stepper__circle--current' : '',
                    isFuture  ? 'status-stepper__circle--future'  : '',
                  ].filter(Boolean).join(' ')}>
                    {isDone ? <CheckIcon /> : <StepIcon step={step} />}
                  </div>
                  <div className={[
                    'status-stepper__label',
                    isCurrent ? 'status-stepper__label--current' : '',
                    isFuture  ? 'status-stepper__label--future'  : '',
                  ].filter(Boolean).join(' ')}>
                    {STEP_LABELS[step]}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Items + Payment */}
        <div className="order-detail__body">
          {/* Items */}
          <div className="order-detail__items-card">
            <h2 className="order-detail__section-title">Items</h2>
            <hr className="order-detail__divider" />
            {order.items.map((item, i) => (
              <div key={i} className="order-item">
                <div className="order-item__icon">
                  <ItemIcon icon={item.icon} />
                </div>
                <div className="order-item__info">
                  <div className="order-item__name">{item.name}</div>
                  <div className="order-item__qty">{item.qty} × ₹{item.unitPrice}</div>
                </div>
                <div className="order-item__total">₹{item.total}</div>
              </div>
            ))}
          </div>

          {/* Right column: Payment + Summary */}
          <div className="order-detail__right">
            {/* Payment Details */}
            <div className="order-detail__payment-card">
              <h3 className="order-detail__card-title">Payment Details</h3>
              <div className="payment-row">
                <span>Method</span>
                <span>{order.paymentMethod}</span>
              </div>
              <div className="payment-row">
                <span>Status</span>
                <span className={`payment-badge payment-badge--${order.paymentStatus === 'Paid' ? 'paid' : 'pending'}`}>
                  {order.paymentStatus}
                </span>
              </div>
            </div>

            {/* Summary */}
            <div className="order-detail__summary-card">
              <h3 className="order-detail__summary-title">Summary</h3>
              <div className="summary-row">
                <span>Subtotal</span>
                <span>₹{order.subtotal}</span>
              </div>
              <div className="summary-row">
                <span>Tax (GST)</span>
                <span>₹{order.tax || 0}</span>
              </div>
              <div className="summary-row">
                <span>Discount</span>
                <span>-₹{order.discount || 0}</span>
              </div>
              <hr className="order-detail__divider" />
              <div className="summary-row summary-row--total">
                <span>TOTAL</span>
                <span>₹{order.amount}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}

/* ── Icons ── */
function ArrowLeftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
    </svg>
  )
}
function TableIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="7" width="18" height="3" rx="1"/>
      <line x1="8" y1="10" x2="8" y2="20"/><line x1="16" y1="10" x2="16" y2="20"/>
    </svg>
  )
}
function WaiterIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  )
}
function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  )
}
function StepIcon({ step }) {
  const icons = {
    NEW:       <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/></svg>,
    ACCEPTED:  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
    PREPARING: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/></svg>,
    READY:     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
    COMPLETED: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  }
  return icons[step] || null
}
function ItemIcon({ icon }) {
  if (icon === 'coffee') return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8h1a4 4 0 0 1 0 8h-1"/>
      <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/>
    </svg>
  )
  if (icon === 'cold') return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 3h10l-1.5 14.5a2 2 0 0 1-2 1.5h-3a2 2 0 0 1-2-1.5L7 3z"/>
    </svg>
  )
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="2" width="14" height="20" rx="2"/>
      <line x1="9" y1="7" x2="15" y2="7"/>
      <line x1="9" y1="12" x2="15" y2="12"/>
    </svg>
  )
}
