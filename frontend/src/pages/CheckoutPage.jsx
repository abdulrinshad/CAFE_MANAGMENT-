/**
 * CheckoutPage — /orders/:id/checkout
 *
 * Cashier selects payment method + marks as paid.
 * Calls POST /orders/:id/complete_order/ which atomically:
 *   - marks order completed
 *   - marks invoice paid
 *   - creates payment record
 *   - releases table (for dine-in)
 */
import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import AdminLayout from '../layouts/AdminLayout'
import { useApp } from '../context/AppContext'
import { orderApi, invoiceApi } from '../api'
import './CheckoutPage.css'

const PAYMENT_METHODS = [
  { id: 'cash',  label: 'Cash',  icon: '💵' },
  { id: 'card',  label: 'Card',  icon: '💳' },
  { id: 'upi',   label: 'UPI',   icon: '📲' },
  { id: 'other', label: 'Other', icon: '🧾' },
]

export default function CheckoutPage() {
  const params = useParams()
  const orderId = params.orderId || params.id
  const navigate = useNavigate()
  const { completeOrder } = useApp()

  const [order,         setOrder]         = useState(null)
  const [invoice,       setInvoice]       = useState(null)
  const [loading,       setLoading]       = useState(true)
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [amountReceived, setAmountReceived] = useState('')
  const [transactionRef, setTransactionRef] = useState('')
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [completing,    setCompleting]    = useState(false)
  const [error,         setError]         = useState('')

  // ── Validation check ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!orderId || orderId === 'null' || orderId === 'undefined') {
      alert('Invalid Order ID. Redirecting to Bill Requests.')
      navigate('/cashier/bill-requests')
    }
  }, [orderId, navigate])

  // ── Load order + invoice ───────────────────────────────────────────────────
  useEffect(() => {
    if (!orderId || orderId === 'null' || orderId === 'undefined') return
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const [orderData, invoiceData] = await Promise.allSettled([
          orderApi.get(orderId),
          invoiceApi.getByOrder(orderId),
        ])
        if (!cancelled) {
          if (orderData.status === 'fulfilled') setOrder(orderData.value)
          if (invoiceData.status === 'fulfilled') setInvoice(invoiceData.value)
        }
      } catch (err) {
        console.error('CheckoutPage load error:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [orderId])

  // ── Derived ────────────────────────────────────────────────────────────────
  const amountDue   = invoice ? Number(invoice.total) : (order ? Number(order.total) : 0)
  const orderNumber = order   ? (order.order_number || `#${orderId}`) : `#${orderId}`
  const tableLabel  = order   ? (order.table_label  || '')       : ''

  const parsedReceived = parseFloat(amountReceived) || 0
  const changeReturned = paymentMethod === 'cash' ? Math.max(0, parsedReceived - amountDue) : 0
  const isCashInsufficient = paymentMethod === 'cash' && parsedReceived < amountDue

  // Quick select bill options
  const QUICK_AMOUNTS = [100, 200, 500, 1000].filter(amt => amt >= amountDue)

  // ── Complete order ─────────────────────────────────────────────────────────
  const handleCompleteOrder = async () => {
    if (!orderId || orderId === 'null' || orderId === 'undefined') return
    setCompleting(true)
    setError('')
    try {
      const result = await completeOrder(orderId, {
        method: paymentMethod,
        status: 'paid',
        amount_received: paymentMethod === 'cash' ? parsedReceived : amountDue,
        change_returned: paymentMethod === 'cash' ? changeReturned : 0,
        transaction_ref: paymentMethod !== 'cash' ? transactionRef : '',
      })
      const payment = result.payment || {}
      setShowConfirmModal(false)
      navigate(`/cashier/success/${orderId}`, {
        state: {
          transaction_ref: payment.transaction_ref || transactionRef || '',
          invoice_number:  invoice?.invoice_number  || '',
          payment_method:  paymentMethod,
          total:           amountDue,
          whatsapp_opened: false,
          invoice:         invoice,
        }
      })
    } catch (err) {
      console.error('completeOrder error:', err)
      setError(err.message || 'Payment could not be completed. Please try again.')
      setShowConfirmModal(false)
    } finally {
      setCompleting(false)
    }
  }

  if (loading) {
    return (
      <AdminLayout>
        <div style={{ textAlign: 'center', padding: 80, color: 'var(--color-text-muted)' }}>
          Loading checkout…
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout
      searchPlaceholder="Checkout order..."
      pageTitle="Payment"
      pageIcon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="4" width="20" height="16" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>}
    >
      <div className="checkout-outer-wrap">
        <div className="checkout-card">

          {/* Header */}
          <div className="checkout-card-header">
            <button
              className="checkout-back-btn"
              onClick={() => navigate(`/orders/${orderId}`)}
              aria-label="Go back"
            >←</button>
            <div>
              <div className="checkout-order-tag">Order {orderNumber}</div>
              {tableLabel && <div className="checkout-table-tag">{tableLabel}</div>}
            </div>
          </div>

          {/* Amount Due */}
          <div className="checkout-amount-section">
            <div className="checkout-amount-lbl">Amount Due</div>
            <div className="checkout-amount-val">
              ₹{amountDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </div>

          <hr className="checkout-divider" />

          {/* Payment Method */}
          <div className="checkout-section">
            <div className="checkout-section-title">Payment Method</div>
            <div className="checkout-methods-grid">
              {PAYMENT_METHODS.map((m) => (
                <button
                  key={m.id}
                  className={`checkout-method-btn ${paymentMethod === m.id ? 'active' : ''}`}
                  onClick={() => {
                    setPaymentMethod(m.id)
                    setAmountReceived('')
                    setTransactionRef('')
                    setError('')
                  }}
                  id={`pay-method-${m.id}`}
                  disabled={completing}
                >
                  <span className="checkout-method-icon">{m.icon}</span>
                  <span className="checkout-method-label">{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Cash Payment Section */}
          {paymentMethod === 'cash' && (
            <div className="checkout-section" style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label className="checkout-section-title" htmlFor="amount-received-input">Amount Received</label>
              <input
                id="amount-received-input"
                type="number"
                step="0.01"
                min="0"
                placeholder="Enter amount customer paid"
                value={amountReceived}
                onChange={(e) => setAmountReceived(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '6px',
                  border: '1px solid var(--color-border)',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  background: 'var(--color-cream, #faf7f4)',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
              
              {/* Quick Select Buttons */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                <button
                  type="button"
                  onClick={() => setAmountReceived(amountDue.toFixed(2))}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '4px',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-white)',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Exact (₹{amountDue.toFixed(2)})
                </button>
                {QUICK_AMOUNTS.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setAmountReceived(amt.toFixed(2))}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '4px',
                      border: '1px solid var(--color-border)',
                      background: 'var(--color-white)',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    ₹{amt}
                  </button>
                ))}
              </div>

              {/* Message Outputs */}
              {amountReceived && !isCashInsufficient && (
                <div style={{ marginTop: '8px', padding: '10px 12px', background: 'rgba(22,163,74,0.08)', border: '1px solid rgba(22,163,74,0.2)', borderRadius: '6px', color: '#16a34a', fontWeight: 'bold', fontSize: '13px' }}>
                  Change to Return: ₹{changeReturned.toFixed(2)}
                </div>
              )}
              {isCashInsufficient && (
                <div style={{ marginTop: '8px', padding: '10px 12px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '6px', color: '#ef4444', fontWeight: 'bold', fontSize: '12px' }}>
                  Insufficient amount. Please collect at least ₹{amountDue.toFixed(2)}.
                </div>
              )}
            </div>
          )}

          {/* Non-Cash Transaction Reference */}
          {paymentMethod !== 'cash' && (
            <div className="checkout-section" style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label className="checkout-section-title" htmlFor="transaction-ref-input">Transaction Reference</label>
              <input
                id="transaction-ref-input"
                type="text"
                placeholder="Enter UPI / Card Transaction ID"
                value={transactionRef}
                onChange={(e) => setTransactionRef(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '6px',
                  border: '1px solid var(--color-border)',
                  fontSize: '13px',
                  background: 'var(--color-cream, #faf7f4)',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          )}

          <hr className="checkout-divider" />

          {/* Summary */}
          {invoice && (
            <div className="checkout-section">
              <div className="checkout-section-title">Summary</div>
              <div className="checkout-summary-rows">
                <div className="checkout-summary-row">
                  <span>Subtotal</span>
                  <span>₹{Number(invoice.subtotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="checkout-summary-row">
                  <span>Tax (5% GST)</span>
                  <span>₹{Number(invoice.tax_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="checkout-summary-row checkout-summary-row--total">
                  <span>Total</span>
                  <span>₹{Number(invoice.total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="checkout-error">
              {error}
            </div>
          )}

          {/* Complete button */}
          <button
            className="btn-primary checkout-complete-btn"
            onClick={() => setShowConfirmModal(true)}
            disabled={completing || isCashInsufficient}
            id="complete-order-btn"
          >
            Proceed to Payment
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999
        }}>
          <div style={{
            background: 'var(--color-white, #fff)',
            border: '1px solid var(--color-border)',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '380px',
            width: '90%',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <h3 style={{ margin: 0, color: 'var(--color-espresso)', fontSize: '18px', fontWeight: 'bold', borderBottom: '1px solid var(--color-border-light)', paddingBottom: '10px' }}>
              Confirm Payment
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Order Total:</span>
                <span style={{ fontWeight: 'bold' }}>₹{amountDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Payment Method:</span>
                <span style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>{paymentMethod}</span>
              </div>
              
              {paymentMethod === 'cash' && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--color-text-muted)' }}>Amount Received:</span>
                    <span style={{ fontWeight: 'bold' }}>₹{parsedReceived.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed var(--color-border-light)', paddingTop: '8px' }}>
                    <span style={{ color: 'var(--color-text-muted)' }}>Change Returned:</span>
                    <span style={{ fontWeight: 'bold', color: 'var(--color-green)' }}>₹{changeReturned.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                </>
              )}
              {paymentMethod !== 'cash' && transactionRef && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderTop: '1px dashed var(--color-border-light)', paddingTop: '8px' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>Transaction Reference:</span>
                  <span style={{ fontWeight: 'bold', fontSize: '12px', wordBreak: 'break-all' }}>{transactionRef}</span>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              <button
                type="button"
                className="btn-outline"
                style={{ flex: 1, padding: '10px' }}
                onClick={() => setShowConfirmModal(false)}
                disabled={completing}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                style={{ flex: 1, padding: '10px' }}
                onClick={handleCompleteOrder}
                disabled={completing}
              >
                {completing ? 'Processing…' : 'Complete Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
