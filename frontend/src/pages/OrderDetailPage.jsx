/**
 * OrderDetailPage — /orders/:id
 *
 * Waiter workflow:
 *   New → [Mark Preparing] → [Mark Ready] → [Mark Completed] → [Generate Bill]
 *
 * Rules:
 *  - Status advances one step at a time (enforced by backend too)
 *  - Generate Bill is ONLY available once status = COMPLETED
 *  - Qty +/− controls persist to backend
 *  - Table stays OCCUPIED until bill/payment is done
 */
import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import AdminLayout from '../layouts/AdminLayout'
import { orderApi } from '../api'
import './OrderDetailPage.css'

// ── Status config ──────────────────────────────────────────────────────────────
const STATUS_STEPS  = ['PENDING', 'PREPARING', 'READY', 'COMPLETED']
const STEP_LABELS   = {
  PENDING:   'New',
  PREPARING: 'Preparing',
  READY:     'Ready',
  COMPLETED: 'Completed',
}

// next step to advance to (from current)
const NEXT_STATUS = {
  PENDING:   { api: 'preparing', label: 'Mark Preparing' },
  PREPARING: { api: 'ready',     label: 'Mark Ready'     },
  READY:     { api: 'completed', label: 'Mark Completed'  },
}

function stepIndex(s) {
  const i = STATUS_STEPS.indexOf((s || '').toUpperCase())
  return i === -1 ? 0 : i
}

// ── Safe normalise ────────────────────────────────────────────────────────────
function normaliseOrder(o) {
  const items = (o.items || []).map((item) => ({
    id:        item.id,
    name:      item.product_name || item.name || 'Item',
    qty:       item.quantity ?? item.qty ?? 1,
    unitPrice: Number(item.unit_price ?? item.unitPrice ?? 0),
    subtotal:  Number(item.subtotal ?? 0),
  }))
  const rawStatus = (o.status || 'pending').toUpperCase()
  return {
    ...o,
    items,
    status:   rawStatus,
    orderId:  o.order_number || `#${o.id}`,
    table:    o.table_label  || '',
    waiter:   o.waiter_name  || '',
    subtotal: Number(o.subtotal   ?? 0),
    tax:      Number(o.tax_amount ?? 0),
    total:    Number(o.total      ?? 0),
  }
}

function validateWhatsApp(num) {
  const digits = num.replace(/[^\d]/g, '')
  return digits.length === 10 || (digits.length === 12 && digits.startsWith('91'))
}

export default function OrderDetailPage() {
  const { id }   = useParams()
  const navigate = useNavigate()

  const [order,       setOrder]       = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState('')
  const [advancing,   setAdvancing]   = useState(false)  // advancing status
  const [advError,    setAdvError]    = useState('')
  const [updating,    setUpdating]    = useState(null)    // item id being updated

  // ── Generate Bill modal ───────────────────────────────────────────────────
  const [showBillModal, setShowBillModal] = useState(false)
  const [billStep,      setBillStep]      = useState('choose') // 'choose' | 'whatsapp'
  const [whatsapp,      setWhatsapp]      = useState('')
  const [waError,       setWaError]       = useState('')
  const [billLoading,   setBillLoading]   = useState(false)
  const [billError,     setBillError]     = useState('')

  // ── Load ─────────────────────────────────────────────────────────────────
  const loadOrder = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await orderApi.get(id)
      setOrder(normaliseOrder(data))
    } catch {
      setError('Order not found or could not be loaded.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { loadOrder() }, [loadOrder])

  // ── Advance status ────────────────────────────────────────────────────────
  const handleAdvanceStatus = async () => {
    if (!order) return
    const next = NEXT_STATUS[order.status]
    if (!next) return
    setAdvancing(true)
    setAdvError('')
    try {
      const updated = await orderApi.setStatus(id, { status: next.api })
      setOrder(normaliseOrder(updated))
    } catch (err) {
      const msg = err.message || ''
      // Try to extract Django's 'detail' message
      try {
        const obj = JSON.parse(msg)
        setAdvError(obj.detail || 'Failed to update status.')
      } catch {
        setAdvError('Failed to update status. Please try again.')
      }
    } finally {
      setAdvancing(false)
    }
  }

  // ── Qty change ────────────────────────────────────────────────────────────
  const handleQtyChange = async (item, delta) => {
    const newQty = item.qty + delta
    if (newQty < 1) return
    // Optimistic
    setOrder((prev) => ({
      ...prev,
      items: prev.items.map((it) =>
        it.id === item.id
          ? { ...it, qty: newQty, subtotal: it.unitPrice * newQty }
          : it
      ),
    }))
    setUpdating(item.id)
    try {
      const updated = await orderApi.updateItem(id, item.id, { quantity: newQty })
      setOrder(normaliseOrder(updated))
    } catch {
      loadOrder()
    } finally {
      setUpdating(null)
    }
  }

  // ── Remove item ───────────────────────────────────────────────────────────
  const handleRemoveItem = async (item) => {
    if (!window.confirm(`Remove "${item.name}" from this order?`)) return
    setUpdating(item.id)
    try {
      const updated = await orderApi.removeItem(id, item.id)
      if (updated) setOrder(normaliseOrder(updated))
    } catch {
      loadOrder()
    } finally {
      setUpdating(null)
    }
  }

  // ── Generate Bill submit ──────────────────────────────────────────────────
  const handleGenerateBillSubmit = async (method, phoneVal = '') => {
    setWaError('')
    setBillError('')
    let normalized = ''

    if (method === 'whatsapp') {
      const trimmed = phoneVal.trim()
      if (!trimmed) {
        setWaError('WhatsApp number is required.')
        return
      }
      if (!validateWhatsApp(trimmed)) {
        setWaError('Please enter a valid WhatsApp number.')
        return
      }
      const digitsOnly = trimmed.replace(/[^\d]/g, '')
      normalized = digitsOnly.length === 10 ? `+91${digitsOnly}` : `+${digitsOnly}`
    }

    setBillLoading(true)
    try {
      await orderApi.generateBill(id, {
        delivery_method: method,
        whatsapp_number: normalized
      })
      setShowBillModal(false)
      navigate(`/orders/${id}/invoice`)
    } catch (err) {
      setBillError(err.message || 'Unable to generate bill. Please try again.')
    } finally {
      setBillLoading(false)
    }
  }

  // ── Derived ───────────────────────────────────────────────────────────────
  const liveSubtotal = order ? order.items.reduce((s, it) => s + it.subtotal, 0) : 0
  const liveTax      = Math.round(liveSubtotal * 0.05 * 100) / 100
  const liveTotal    = liveSubtotal + liveTax

  // ── Loading / error states ────────────────────────────────────────────────
  if (loading) {
    return <AdminLayout><div className="order-detail-loading">Loading order…</div></AdminLayout>
  }
  if (error || !order) {
    return (
      <AdminLayout>
        <div className="order-detail-error">
          {error || 'Order not found.'}{' '}
          <button className="btn-outline" onClick={() => navigate('/orders')}>Back to Orders</button>
        </div>
      </AdminLayout>
    )
  }

  const currentStep = stepIndex(order.status)
  const nextStep    = NEXT_STATUS[order.status]           // null when COMPLETED / CANCELLED
  const isCompleted = order.status === 'COMPLETED'
  const isCancelled = order.status === 'CANCELLED'
  const isEditable  = !isCompleted && !isCancelled

  return (
    <AdminLayout searchPlaceholder="Search orders...">
      <div className="order-detail">

        {/* ── Header ── */}
        <div className="order-detail__header">
          <div className="order-detail__header-left">
            <button className="order-detail__back" onClick={() => navigate('/orders')} aria-label="Back">
              <ArrowLeftIcon />
            </button>
            <div>
              <h1 className="order-detail__title">Order {order.orderId}</h1>
              <div className="order-detail__meta">
                {order.table && (
                  <span className="order-detail__meta-item"><TableIcon /> {order.table}</span>
                )}
                {order.waiter && (
                  <>
                    <span className="order-detail__meta-sep">•</span>
                    <span className="order-detail__meta-item"><WaiterIcon /> {order.waiter}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="order-detail__header-actions">
            <button className="btn-outline" onClick={() => window.print()} id="print-receipt">
              Print Receipt
            </button>

            {/* Step-advance button (New→Preparing→Ready→Completed) */}
            {nextStep && (
              <button
                className="btn-secondary"
                onClick={handleAdvanceStatus}
                disabled={advancing}
                id="advance-status-btn"
                style={{
                  background: 'var(--color-latte, #8b6347)',
                  color: '#fff',
                  border: 'none',
                }}
              >
                {advancing ? 'Updating…' : nextStep.label}
              </button>
            )}

            {/* Generate Bill — ONLY after Completed */}
            {isCompleted && (
              <button
                className="btn-primary"
                onClick={() => {
                  setShowBillModal(true)
                  setWhatsapp('')
                  setWaError('')
                  setBillError('')
                }}
                id="generate-bill-btn"
              >
                Generate Bill
              </button>
            )}
          </div>
        </div>

        {/* ── Status advance error ── */}
        {advError && (
          <div style={{
            background: '#fee2e2', color: '#dc2626', borderRadius: 8,
            padding: '10px 16px', fontSize: 13,
          }}>
            {advError}
          </div>
        )}

        {/* ── Status Stepper ── */}
        <div className="order-detail__status-card">
          <h2 className="order-detail__section-title">Status</h2>
          <div className="status-stepper">
            {STATUS_STEPS.map((step, i) => {
              const isDone    = i < currentStep
              const isCurrent = i === currentStep
              const isFuture  = i > currentStep
              return (
                <div key={step} className="status-stepper__item">
                  {i > 0 && (
                    <div className={`status-stepper__line${isDone || isCurrent ? ' status-stepper__line--active' : ''}`} />
                  )}
                  <div className={[
                    'status-stepper__circle',
                    isDone    ? 'status-stepper__circle--done'    : '',
                    isCurrent ? 'status-stepper__circle--current' : '',
                    isFuture  ? 'status-stepper__circle--future'  : '',
                  ].filter(Boolean).join(' ')}>
                    {isDone ? <CheckIcon /> : <StepDotIcon />}
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

          {/* Inline next-step CTA below stepper */}
          {nextStep && (
            <div className="stepper-advance-wrap">
              <button
                className="btn-primary stepper-advance-btn"
                onClick={handleAdvanceStatus}
                disabled={advancing}
              >
                {advancing ? 'Updating…' : `→ ${nextStep.label}`}
              </button>
              <span className="stepper-advance-hint">
                {order.status === 'PENDING' && 'Kitchen received? Mark as Preparing.'}
                {order.status === 'PREPARING' && 'Food ready? Mark as Ready.'}
                {order.status === 'READY' && 'Served to customer? Mark as Completed to enable billing.'}
              </span>
            </div>
          )}
          {isCompleted && (
            <div className="stepper-complete-note">
              ✓ Order served. You can now <strong>Generate Bill</strong>.
            </div>
          )}
        </div>

        {/* ── Items + Summary ── */}
        <div className="order-detail__body">

          <div className="order-detail__items-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 className="order-detail__section-title">Current Items</h2>
              {isEditable && (
                <button
                  className="btn-outline btn-sm"
                  onClick={() => navigate(`/orders/${id}/add-items`)}
                  id="add-more-items-btn"
                >
                  + Add More Items
                </button>
              )}
            </div>
            <hr className="order-detail__divider" />

            {order.items.length === 0 && (
              <p className="order-detail__empty-items">No items yet.</p>
            )}

            {order.items.map((item) => (
              <div key={item.id} className="order-item order-item--with-controls">
                <div className="order-item__icon"><ItemDotIcon /></div>
                <div className="order-item__info">
                  <div className="order-item__name">{item.name}</div>
                  <div className="order-item__unit-price">₹{Number(item.unitPrice).toLocaleString('en-IN')}</div>
                </div>

                {isEditable ? (
                  <div className="order-item__qty-controls">
                    <button
                      className="qty-ctrl-btn"
                      onClick={() => handleQtyChange(item, -1)}
                      disabled={updating === item.id || item.qty <= 1}
                    >−</button>
                    <span className="qty-ctrl-val">{updating === item.id ? '…' : item.qty}</span>
                    <button
                      className="qty-ctrl-btn"
                      onClick={() => handleQtyChange(item, 1)}
                      disabled={updating === item.id}
                    >+</button>
                  </div>
                ) : (
                  <div className="order-item__qty-readonly">×{item.qty}</div>
                )}

                <div className="order-item__total">
                  ₹{Number(item.subtotal).toLocaleString('en-IN')}
                </div>

                {isEditable && (
                  <button
                    className="order-item__remove-btn"
                    onClick={() => handleRemoveItem(item)}
                    disabled={updating === item.id}
                    aria-label={`Remove ${item.name}`}
                  >×</button>
                )}
              </div>
            ))}
          </div>

          {/* Right: Summary */}
          <div className="order-detail__right">
            <div className="order-detail__summary-card">
              <h3 className="order-detail__summary-title">Order Summary</h3>
              <div className="summary-row">
                <span>Subtotal</span>
                <span>₹{liveSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="summary-row">
                <span>Tax (5% GST)</span>
                <span>₹{liveTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <hr className="order-detail__divider" />
              <div className="summary-row summary-row--total">
                <span>Total</span>
                <span>₹{liveTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            {order.notes && (
              <div className="order-detail__payment-card" style={{ marginTop: 16 }}>
                <h3 className="order-detail__card-title">Notes</h3>
                <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 6 }}>
                  {order.notes}
                </p>
              </div>
            )}

            {/* Generate Bill — bottom of right column, ONLY when completed */}
            {isCompleted && (
              <button
                className="btn-primary"
                style={{ width: '100%', marginTop: 16 }}
                onClick={() => {
                  setShowBillModal(true)
                  setWhatsapp('')
                  setWaError('')
                  setBillError('')
                }}
              >
                Generate Bill
              </button>
            )}

            {/* Hint when not completed yet */}
            {!isCompleted && !isCancelled && (
              <div className="summary-not-ready-hint">
                Complete all steps first to generate the bill.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Generate Bill Modal ── */}
      {showBillModal && (
        <div className="od-modal-backdrop" onClick={() => !billLoading && setShowBillModal(false)}>
          <div className="od-modal" onClick={(e) => e.stopPropagation()}>
            <div className="od-modal__header">
              <h2 className="od-modal__title">
                {billStep === 'choose' ? 'Generate Customer Bill' : 'Send Bill via WhatsApp'}
              </h2>
              <button
                className="od-modal__close"
                onClick={() => !billLoading && setShowBillModal(false)}
                disabled={billLoading}
              >×</button>
            </div>

            {billError && <p className="od-modal__api-error" style={{ marginBottom: 16 }}>{billError}</p>}

            {billStep === 'choose' ? (
              <>
                <p className="od-modal__desc">
                  Choose how you would like to deliver the bill to the customer.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
                  <button
                    className="btn-primary"
                    style={{ background: 'var(--color-espresso)', width: '100%', display: 'flex', flexDirection: 'column', padding: '12px', alignItems: 'center' }}
                    onClick={() => setBillStep('whatsapp')}
                    disabled={billLoading}
                  >
                    <span style={{ fontWeight: 'bold' }}>📱 WhatsApp</span>
                    <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>Send a digital copy to the customer.</span>
                  </button>

                  <button
                    className="btn-outline"
                    style={{ width: '100%', display: 'flex', flexDirection: 'column', padding: '12px', alignItems: 'center' }}
                    onClick={() => handleGenerateBillSubmit('print')}
                    disabled={billLoading}
                  >
                    <span style={{ fontWeight: 'bold' }}>🧾 Print Bill</span>
                    <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>Print a physical copy of the bill.</span>
                  </button>

                  <button
                    className="btn-outline"
                    style={{ width: '100%', display: 'flex', flexDirection: 'column', padding: '12px', alignItems: 'center' }}
                    onClick={() => handleGenerateBillSubmit('none')}
                    disabled={billLoading}
                  >
                    <span style={{ fontWeight: 'bold' }}>→ Continue Without Sharing</span>
                    <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>Continue directly to payment without sharing.</span>
                  </button>
                </div>

                <div className="od-modal__actions" style={{ marginTop: 20 }}>
                  <button className="btn-outline" onClick={() => setShowBillModal(false)} disabled={billLoading} style={{ width: '100%' }}>
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="od-modal__field" style={{ marginTop: 12 }}>
                  <label className="od-modal__label" htmlFor="whatsapp-input">
                    WhatsApp Number
                  </label>
                  <div className="od-modal__phone-row">
                    <span className="od-modal__prefix">+91</span>
                    <input
                      id="whatsapp-input"
                      type="tel"
                      className={`od-modal__input${waError ? ' od-modal__input--error' : ''}`}
                      placeholder="98765 43210"
                      value={whatsapp}
                      maxLength={11}
                      onChange={(e) => { setWhatsapp(e.target.value); setWaError('') }}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleGenerateBillSubmit('whatsapp', whatsapp) }}
                      disabled={billLoading}
                      autoFocus
                    />
                  </div>
                  {waError && <p className="od-modal__field-error">{waError}</p>}
                </div>

                <div className="od-modal__actions" style={{ marginTop: 24 }}>
                  <button className="btn-outline" onClick={() => setBillStep('choose')} disabled={billLoading}>
                    Cancel
                  </button>
                  <button
                    className="btn-primary"
                    onClick={() => handleGenerateBillSubmit('whatsapp', whatsapp)}
                    disabled={billLoading}
                    id="confirm-generate-bill"
                  >
                    {billLoading ? 'Generating…' : 'Send Bill'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </AdminLayout>
  )
}

/* ── Icons ── */
function ArrowLeftIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
}
function TableIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="7" width="18" height="3" rx="1"/><line x1="8" y1="10" x2="8" y2="20"/><line x1="16" y1="10" x2="16" y2="20"/></svg>
}
function WaiterIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
}
function CheckIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
}
function StepDotIcon() {
  return <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor"><circle cx="4" cy="4" r="4"/></svg>
}
function ItemDotIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="9" y1="7" x2="15" y2="7"/><line x1="9" y1="12" x2="15" y2="12"/></svg>
}
