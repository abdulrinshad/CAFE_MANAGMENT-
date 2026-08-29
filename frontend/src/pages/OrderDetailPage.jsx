/**
 * OrderDetailPage — /orders/:id
 *
 * Waiter workflow:
 *   New → [Mark Preparing] → [Mark Ready] → [Mark Served] → [+ Add Extra Item] → [✓ Finalize / Request Bill]
 *   After bill request: read-only status view (Requested / Processing / Ready / Completed)
 *
 * Rules:
 *  - Status advances one step at a time (enforced by backend too)
 *  - "+ Add Extra Item" navigates to /orders/:id/add-items (existing flow)
 *  - "✓ Finalize / Request Bill" calls /orders/:id/request_bill/ → BILL_REQUESTED
 *  - Once BILL_REQUESTED: waiter can only see status, cannot modify anything
 *  - Generate Bill, complete_order, complete_payment are Cashier-only (hidden from waiter)
 */
import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import AdminLayout from '../layouts/AdminLayout'
import { useApp } from '../context/AppContext'
import { orderApi, waiterRequestApi } from '../api'
import './OrderDetailPage.css'

// ── Status config ──────────────────────────────────────────────────────────────
const STATUS_STEPS  = ['PENDING', 'PREPARING', 'READY', 'COMPLETED', 'BILL_REQUESTED']
const STEP_LABELS   = {
  PENDING:        'NEW',
  PREPARING:      'PREPARING',
  READY:          'READY',
  COMPLETED:      'SERVED',
  BILL_REQUESTED: 'BILL REQUESTED',
}

// next step to advance to (from current) — waiter kitchen progression only
const NEXT_STATUS = {
  PENDING:   { api: 'preparing', label: 'Mark Preparing' },
  PREPARING: { api: 'ready',     label: 'Mark Ready'     },
  READY:     { api: 'completed', label: 'Mark Served'    },
  // COMPLETED → waiter uses "Finalize / Request Bill" instead of status advance
  // BILL_REQUESTED → no further advance by waiter
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

// Map WaiterRequest status → display label for waiter read-only view
function billRequestStatusLabel(rawStatus) {
  if (!rawStatus) return 'Requested'
  const s = rawStatus.toLowerCase()
  if (s === 'new')         return 'Requested'
  if (s === 'in_progress') return 'Processing'
  if (s === 'ready')       return 'Ready'
  if (s === 'completed')   return 'Completed'
  return rawStatus
}

export default function OrderDetailPage() {
  const { id }   = useParams()
  const navigate = useNavigate()
  const { currentRole, taxRate } = useApp()

  const [order,       setOrder]       = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState('')
  const [advancing,   setAdvancing]   = useState(false)
  const [advError,    setAdvError]    = useState('')
  const [updating,    setUpdating]    = useState(null)    // item id being updated
  const [editingItemId, setEditingItemId] = useState(null) // item id currently being edited
  const [editingQty,    setEditingQty]    = useState(1)    // temp quantity being edited

  // ── Bill request state ────────────────────────────────────────────────────
  const [requestingBill,  setRequestingBill]  = useState(false)
  const [requestBillErr,  setRequestBillErr]  = useState('')
  const [requestBillOk,   setRequestBillOk]   = useState(false)
  const [billRequestData, setBillRequestData] = useState(null)  // WaiterRequest data after submission

  // ── Generate Bill modal (cashier/admin/manager only) ──────────────────────
  const [showBillModal, setShowBillModal] = useState(false)
  const [billStep,      setBillStep]      = useState('choose')
  const [customerName,  setCustomerName]  = useState('')
  const [whatsapp,      setWhatsapp]      = useState('')
  const [waError,       setWaError]       = useState('')
  const [nameError,     setNameError]     = useState('')
  const [billLoading,   setBillLoading]   = useState(false)
  const [billError,     setBillError]     = useState('')

  const isWaiter = currentRole === 'waiter'

  // ── Load ─────────────────────────────────────────────────────────────────
  const loadOrder = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await orderApi.get(id)
      const norm = normaliseOrder(data)
      setOrder(norm)
      // If already bill_requested, try to find the associated bill request
      if (norm.status === 'BILL_REQUESTED' && !billRequestData) {
        try {
          const requests = await waiterRequestApi.list()
          const items = Array.isArray(requests) ? requests : (requests.results ?? [])
          // Find the most recent open bill request linked to this order's table
          const linked = items.find(r =>
            r.request_type === 'Bill Request' &&
            r.table === norm.table_id
          ) || items.find(r =>
            r.request_type === 'Bill Request' &&
            r.order_id === norm.id
          ) || items.find(r => r.request_type === 'Bill Request')
          if (linked) setBillRequestData(linked)
        } catch (_) {}
      }
    } catch {
      setError('Order not found or could not be loaded.')
    } finally {
      setLoading(false)
    }
  }, [id, billRequestData])

  useEffect(() => { loadOrder() }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Poll bill request status every 10s when in BILL_REQUESTED state
  useEffect(() => {
    if (!order || order.status !== 'BILL_REQUESTED') return
    const interval = setInterval(async () => {
      try {
        const fresh = await orderApi.get(id)
        setOrder(normaliseOrder(fresh))
        // Refresh bill request data
        const requests = await waiterRequestApi.list()
        const items = Array.isArray(requests) ? requests : (requests.results ?? [])
        const linked = items.find(r =>
          r.request_type === 'Bill Request' && (
            r.order_id === fresh.id ||
            r.table === fresh.table_id ||
            r.table === fresh.table
          )
        )
        if (linked) setBillRequestData(linked)
      } catch (_) {}
    }, 10000)
    return () => clearInterval(interval)
  }, [id, order?.status]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Advance status (kitchen progression: pending→preparing→ready→completed) ──
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
      try {
        const obj = JSON.parse(msg)
        setAdvError(obj.detail || 'Failed to update status.')
      } catch {
        setAdvError(msg || 'Failed to update status. Please try again.')
      }
    } finally {
      setAdvancing(false)
    }
  }

  // ── Request Bill (waiter → cashier) ───────────────────────────────────────
  const handleRequestBill = async () => {
    setRequestingBill(true)
    setRequestBillErr('')
    setRequestBillOk(false)
    try {
      const res = await orderApi.requestBill(id)
      setRequestBillOk(true)
      if (res?.request) setBillRequestData(res.request)
      // Reload order to get BILL_REQUESTED status
      const fresh = await orderApi.get(id)
      setOrder(normaliseOrder(fresh))
    } catch (err) {
      setRequestBillErr(err.message || 'Failed to send bill request.')
    } finally {
      setRequestingBill(false)
    }
  }

  // ── Item Inline Editing ──────────────────────────────────────────────────
  const handleStartEdit = (item) => {
    setEditingItemId(item.id)
    setEditingQty(item.qty)
  }

  const handleCancelEdit = () => {
    setEditingItemId(null)
  }

  const handleSaveEdit = async (item) => {
    const newQty = parseInt(editingQty, 10)
    if (isNaN(newQty) || newQty < 1) {
      if (window.confirm(`Quantity is ${isNaN(newQty) ? 0 : newQty}. Remove "${item.name}" from this order?`)) {
        await handleRemoveItem(item)
      }
      return
    }
    setUpdating(item.id)
    try {
      const updated = await orderApi.updateItem(id, item.id, { quantity: newQty })
      if (updated) {
        setOrder(normaliseOrder(updated))
      }
      setEditingItemId(null)
    } catch (err) {
      alert(err.message || 'Failed to update item.')
      loadOrder()
    } finally {
      setUpdating(null)
    }
  }

  // ── Qty change ────────────────────────────────────────────────────────────
  const handleQtyChange = async (item, delta) => {
    const newQty = item.qty + delta
    if (newQty < 1) return
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
      setEditingItemId(null)
    } catch {
      loadOrder()
    } finally {
      setUpdating(null)
    }
  }

  // ── Generate Bill submit (cashier/admin/manager only) ─────────────────────
  const handleGenerateBillSubmit = async (method, phoneVal = '') => {
    setWaError('')
    setNameError('')
    setBillError('')
    let normalized = ''

    if (method === 'whatsapp') {
      if (!customerName.trim()) {
        setNameError('Customer name is required.')
        return
      }
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
        whatsapp_number: normalized,
        customer_name:   customerName.trim(),
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
  const liveTax      = Math.round(liveSubtotal * (taxRate / 100) * 100) / 100
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

  const isTakeaway = (order.orderType || order.channel) === 'TAKEAWAY'
  const steps = isTakeaway
    ? ['PENDING', 'PREPARING', 'READY', 'COMPLETED']
    : ['PENDING', 'PREPARING', 'READY', 'COMPLETED', 'BILL_REQUESTED']

  const STEP_LABELS = {
    PENDING:        'NEW',
    PREPARING:      'PREPARING',
    READY:          isTakeaway ? 'READY FOR PICKUP' : 'READY',
    COMPLETED:      isTakeaway ? 'COMPLETED' : 'SERVED',
    BILL_REQUESTED: 'BILL REQUESTED',
  }

  const currentStep     = steps.indexOf(order.status) === -1 ? 0 : steps.indexOf(order.status)
  
  let nextStep = null
  if (isTakeaway) {
    if (order.status === 'PENDING') {
      nextStep = { api: 'preparing', label: 'Send to Kitchen' }
    } else if (order.status === 'PREPARING') {
      nextStep = { api: 'ready', label: 'Mark Ready for Pickup' }
    }
  } else {
    nextStep = NEXT_STATUS[order.status]
  }

  const isCompleted     = order.status === 'COMPLETED'
  const isCancelled     = order.status === 'CANCELLED'
  const isBillRequested = order.status === 'BILL_REQUESTED'
  const isEditable      = !isCancelled && !isBillRequested && !order.invoice_number

  // Bill request display status
  const brStatus = billRequestData
    ? billRequestStatusLabel(billRequestData.status)
    : (isBillRequested ? 'Requested' : null)

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
                {order.table ? (
                  <span className="order-detail__meta-item"><TableIcon /> {order.table}</span>
                ) : (
                  <span className="order-detail__meta-item" style={{ color: 'var(--color-text-muted)', fontSize: '13px', fontWeight: '500' }}>
                    🥡 Takeaway order — no table assigned.
                  </span>
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

            {/* Kitchen step-advance */}
            {nextStep && (
              <button
                className="advance-status-btn"
                onClick={handleAdvanceStatus}
                disabled={advancing}
                id="advance-status-btn"
                aria-label={advancing ? 'Updating order status…' : nextStep.label}
              >
                {advancing ? (
                  <>
                    <SpinnerIcon />
                    <span>Updating…</span>
                  </>
                ) : (
                  <>
                    <ChefHatIcon />
                    <span>{nextStep.label}</span>
                    <ArrowRightIcon />
                  </>
                )}
              </button>
            )}

            {/* Proceed to Payment (Takeaway, Ready status) */}
            {isTakeaway && order.status === 'READY' && !isWaiter && (
              <button
                className="btn-primary"
                onClick={() => navigate(`/orders/${order.id}/checkout`)}
                id="proceed-to-payment-btn"
              >
                Proceed to Payment
              </button>
            )}

            {/* Generate Bill — cashier/admin/manager only, ONLY after Completed or Bill Requested */}
            {!isTakeaway && (isCompleted || isBillRequested) && !isWaiter && (
              <button
                className="btn-primary"
                onClick={() => {
                  setShowBillModal(true)
                  setBillStep('choose')
                  setCustomerName(order.customer_name || '')
                  setWhatsapp(order.whatsapp_number ? order.whatsapp_number.replace(/^\+91/, '') : '')
                  setWaError('')
                  setNameError('')
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
            {steps.map((step, i) => {
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

          {/* Kitchen next-step CTA below stepper */}
          {nextStep && (
            <div className="stepper-advance-wrap">
              <button
                className="advance-status-btn advance-status-btn--stepper"
                onClick={handleAdvanceStatus}
                disabled={advancing}
              >
                {advancing ? (
                  <>
                    <SpinnerIcon />
                    <span>Updating…</span>
                  </>
                ) : (
                  <>
                    <ChefHatIcon />
                    <span>{nextStep.label}</span>
                    <ArrowRightIcon />
                  </>
                )}
              </button>
              <span className="stepper-advance-hint">
                {order.status === 'PENDING'   && (isTakeaway ? 'Kitchen received? Send to Kitchen.' : 'Kitchen received? Mark as Preparing.')}
                {order.status === 'PREPARING' && (isTakeaway ? 'Food ready? Mark Ready for Pickup.' : 'Food ready? Mark as Ready.')}
                {order.status === 'READY'     && !isTakeaway && 'Delivered to customer’s table? Mark as Served.'}
              </span>
            </div>
          )}

          {/* After COMPLETED — waiter sees extra items + finalize CTA */}
          {isCompleted && (
            <div className="stepper-complete-note">
              ✓ Order served. Add extra items if needed, then <strong>Request Bill from Cashier</strong>.
            </div>
          )}

          {/* BILL_REQUESTED — read-only status for waiter */}
          {isBillRequested && brStatus && (
            <div className="stepper-complete-note" style={{
              background: 'linear-gradient(135deg, rgba(22,163,74,0.12), rgba(21,128,61,0.08))',
              border: '1px solid rgba(22,163,74,0.25)',
              color: '#4ade80',
            }}>
              ✓ Bill request sent to Cashier.{' '}
              <strong>Status: {brStatus}</strong>
              {brStatus === 'Completed' && ' — Bill processed by Cashier.'}
            </div>
          )}
        </div>

        {/* ── Items + Summary ── */}
        <div className="order-detail__body">

          <div className="order-detail__items-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 className="order-detail__section-title">Current Items</h2>
              {/* + Add Extra Item — waiter, when order is COMPLETED and NOT yet bill-requested */}
              {isCompleted && !isBillRequested && (
                <button
                  className="btn-outline btn-sm"
                  onClick={() => navigate(`/orders/${id}/add-items`)}
                  id="add-extra-item-btn"
                >
                  + Add Extra Item
                </button>
              )}
              {/* Add More Items — when order is still active (pre-served) */}
              {isEditable && !isCompleted && (
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

            {order.items.map((item) => {
              const isEditingThis = editingItemId === item.id

              if (isEditingThis) {
                return (
                  <div key={item.id} className="order-item order-item--editing">
                    <div className="order-item__edit-row-top">
                      <div className="order-item__info">
                        <div className="order-item__name">{item.name}</div>
                        <div className="order-item__unit-price">
                          ₹{Number(item.unitPrice).toLocaleString('en-IN')} / unit
                        </div>
                      </div>
                      <div className="order-item__total">
                        ₹{(Number(item.unitPrice) * Math.max(1, parseInt(editingQty) || 1)).toLocaleString('en-IN')}
                      </div>
                    </div>

                    <div className="order-item__edit-controls">
                      <div className="qty-edit-stepper">
                        <button
                          type="button"
                          className="qty-ctrl-btn"
                          onClick={() => setEditingQty(q => Math.max(1, (parseInt(q) || 1) - 1))}
                          disabled={updating === item.id || (parseInt(editingQty) || 1) <= 1}
                        >−</button>
                        <input
                          type="number"
                          min="1"
                          className="qty-edit-input"
                          value={editingQty}
                          onChange={(e) => setEditingQty(e.target.value)}
                          disabled={updating === item.id}
                        />
                        <button
                          type="button"
                          className="qty-ctrl-btn"
                          onClick={() => setEditingQty(q => (parseInt(q) || 1) + 1)}
                          disabled={updating === item.id}
                        >+</button>
                      </div>

                      <div className="order-item__edit-actions">
                        <button
                          type="button"
                          className="btn-item-save"
                          onClick={() => handleSaveEdit(item)}
                          disabled={updating === item.id}
                        >
                          {updating === item.id ? 'Saving…' : 'Save'}
                        </button>

                        <button
                          type="button"
                          className="btn-item-delete"
                          onClick={() => handleRemoveItem(item)}
                          disabled={updating === item.id}
                        >
                          Remove
                        </button>

                        <button
                          type="button"
                          className="btn-item-cancel"
                          onClick={handleCancelEdit}
                          disabled={updating === item.id}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )
              }

              return (
                <div key={item.id} className="order-item order-item--with-controls">
                  <div className="order-item__icon"><ItemDotIcon /></div>
                  <div className="order-item__info">
                    <div className="order-item__name">{item.name}</div>
                    <div className="order-item__unit-price">
                      ₹{Number(item.unitPrice).toLocaleString('en-IN')}
                    </div>
                  </div>

                  <div className="order-item__qty-readonly">×{item.qty}</div>

                  <div className="order-item__total">
                    ₹{Number(item.subtotal).toLocaleString('en-IN')}
                  </div>

                  {isEditable && (
                    <button
                      type="button"
                      className="order-item__edit-btn"
                      onClick={() => handleStartEdit(item)}
                      disabled={updating === item.id}
                    >
                      Edit
                    </button>
                  )}
                </div>
              )
            })}
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
                <span>Tax ({taxRate}% GST)</span>
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

            {order.payment_status?.toLowerCase() === 'paid' && (
              <div className="order-detail__payment-card" style={{ marginTop: 16, background: '#fdfdfd', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '16px' }}>
                <h3 className="order-detail__card-title" style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-espresso)', marginBottom: '10px' }}>
                  💳 Payment Details
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--color-text-muted)' }}>Payment Method:</span>
                    <span style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>{order.payment_method}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--color-text-muted)' }}>Payment Status:</span>
                    <span className="order-badge" style={{ background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0', fontWeight: 'bold', padding: '2px 8px', borderRadius: '10px', fontSize: '10px' }}>
                      PAID
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed var(--color-border-light)', paddingTop: '6px', marginTop: '4px' }}>
                    <span style={{ color: 'var(--color-text-muted)' }}>Order Total:</span>
                    <span style={{ fontWeight: 'bold' }}>₹{Number(order.total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  
                  {order.payment_method?.toLowerCase() === 'cash' && (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--color-text-muted)' }}>Amount Received:</span>
                        <span style={{ fontWeight: 'bold' }}>₹{Number(order.amount_received || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--color-text-muted)' }}>Change Returned:</span>
                        <span style={{ fontWeight: 'bold', color: 'var(--color-green)' }}>₹{Number(order.change_returned || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </>
                  )}

                  {order.payment_method?.toLowerCase() !== 'cash' && order.transaction_ref && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', borderTop: '1px dashed var(--color-border-light)', paddingTop: '6px' }}>
                      <span style={{ color: 'var(--color-text-muted)' }}>Transaction Reference:</span>
                      <span style={{ fontWeight: 'bold', fontSize: '12px', wordBreak: 'break-all' }}>{order.transaction_ref}</span>
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', borderTop: '1px dashed var(--color-border-light)', paddingTop: '6px' }}>
                    <span style={{ color: 'var(--color-text-muted)' }}>Paid At:</span>
                    <span style={{ fontWeight: '500', color: 'var(--color-text-secondary)' }}>
                      {order.completed_at ? new Date(order.completed_at).toLocaleString('en-IN') : '—'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* ── Waiter: COMPLETED state — Add Extra Item + Finalize / Request Bill ── */}
            {isCompleted && !isCancelled && !isTakeaway && (
              <div style={{ marginTop: 16 }}>
                {/* Add Extra Item button */}
                <button
                  className="btn-outline"
                  style={{
                    width: '100%',
                    marginBottom: 10,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    padding: '11px 16px',
                    fontWeight: 600,
                  }}
                  onClick={() => navigate(`/orders/${id}/add-items`)}
                  id="btn-add-extra-item"
                >
                  + Add Extra Item
                </button>

                {/* Finalize / Request Bill */}
                {requestBillErr && (
                  <div style={{ color: '#f87171', fontSize: 12, marginBottom: 8, textAlign: 'center',
                    background: 'rgba(248,113,113,0.08)', padding: '6px 8px', borderRadius: 6 }}>
                    {requestBillErr}
                  </div>
                )}
                {requestBillOk && (
                  <div style={{ color: '#4ade80', fontSize: 12, marginBottom: 8, textAlign: 'center',
                    background: 'rgba(74,222,128,0.08)', padding: '6px 8px', borderRadius: 6 }}>
                    ✓ Bill request sent to Cashier!
                  </div>
                )}
                <button
                  className="btn-primary"
                  style={{
                    width: '100%',
                    background: 'linear-gradient(135deg,#16a34a 0%,#15803d 100%)',
                    boxShadow: '0 4px 14px rgba(22,163,74,.35)',
                  }}
                  onClick={handleRequestBill}
                  disabled={requestingBill || requestBillOk}
                  id="btn-request-bill-cashier"
                >
                  {requestingBill ? 'Sending…' : requestBillOk ? '✓ Sent!' : '✓ Finalize / Request Bill'}
                </button>
              </div>
            )}

            {/* ── BILL_REQUESTED: waiter read-only status ── */}
            {isBillRequested && (
              <div style={{ marginTop: 16 }}>
                <div style={{
                  borderRadius: 10,
                  background: 'linear-gradient(135deg, rgba(22,163,74,0.10), rgba(21,128,61,0.06))',
                  border: '1px solid rgba(22,163,74,0.2)',
                  padding: '14px 16px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 18 }}>🧾</span>
                    <span style={{ fontWeight: 700, color: '#4ade80', fontSize: 14 }}>Bill Requested</span>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6 }}>
                    Request sent to Cashier. Current status:
                  </div>
                  <div style={{
                    display: 'inline-block',
                    padding: '4px 12px',
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: 0.5,
                    background: brStatus === 'Completed'
                      ? 'rgba(22,163,74,0.2)' : 'rgba(99,102,241,0.15)',
                    color: brStatus === 'Completed' ? '#4ade80' : '#a5b4fc',
                    border: brStatus === 'Completed'
                      ? '1px solid rgba(22,163,74,0.3)' : '1px solid rgba(99,102,241,0.25)',
                  }}>
                    {brStatus || 'Requested'}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 10 }}>
                    The Cashier will process payment and generate the bill.
                  </div>
                </div>
              </div>
            )}

            {/* Generate Bill — cashier/admin/manager only, when completed or bill_requested */}
            {!isTakeaway && (isCompleted || isBillRequested) && !isWaiter && (
              <button
                className="btn-primary"
                style={{ width: '100%', marginTop: 8 }}
                onClick={() => {
                  setShowBillModal(true)
                  setBillStep('choose')
                  setCustomerName(order.customer_name || '')
                  setWhatsapp(order.whatsapp_number ? order.whatsapp_number.replace(/^\+91/, '') : '')
                  setWaError('')
                  setNameError('')
                  setBillError('')
                }}
                id="generate-bill-summary-btn"
              >
                Generate Bill (Invoice)
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Generate Bill Modal (cashier/admin/manager only) ── */}
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
                  <label className="od-modal__label" htmlFor="customer-name-input">
                    Customer Name
                  </label>
                  <input
                    id="customer-name-input"
                    type="text"
                    className={`od-modal__input${nameError ? ' od-modal__input--error' : ''}`}
                    placeholder="e.g. Ravi Kumar"
                    value={customerName}
                    onChange={(e) => { setCustomerName(e.target.value); setNameError('') }}
                    disabled={billLoading}
                    autoFocus
                  />
                  {nameError && <p className="od-modal__field-error">{nameError}</p>}
                </div>

                <div className="od-modal__field" style={{ marginTop: 14 }}>
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
function ArrowRightIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
}
function ChefHatIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z"/>
      <line x1="6" y1="17" x2="18" y2="17"/>
    </svg>
  )
}
function SpinnerIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" style={{ animation: 'advance-btn-spin 0.7s linear infinite' }}>
      <circle cx="12" cy="12" r="10" strokeOpacity="0.25"/>
      <path d="M12 2a10 10 0 0 1 10 10"/>
    </svg>
  )
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
