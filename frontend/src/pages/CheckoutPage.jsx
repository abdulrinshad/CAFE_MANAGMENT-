/**
 * CheckoutPage — /orders/:id/checkout
 *
 * Waiter selects payment method + marks as paid.
 * Calls POST /orders/:id/complete_order/ which atomically:
 *   - marks order completed
 *   - marks invoice paid
 *   - creates payment record
 *   - releases table
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
  const { orderId } = useParams()
  const navigate = useNavigate()
  const { completeOrder } = useApp()

  const [order,         setOrder]         = useState(null)
  const [invoice,       setInvoice]       = useState(null)
  const [loading,       setLoading]       = useState(true)
  const [paymentMethod, setPaymentMethod] = useState('cash')
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

  // ── Complete order ─────────────────────────────────────────────────────────
  const handleCompleteOrder = async () => {
    if (!orderId || orderId === 'null' || orderId === 'undefined') return
    setCompleting(true)
    setError('')
    try {
      // Use AppContext.completeOrder which calls the API AND refreshes
      // tables + orders + notifications so the floor plan updates immediately
      const result = await completeOrder(orderId, {
        method: paymentMethod,
        status: 'paid',
      })
      const payment = result.payment || {}
      navigate(`/cashier/success/${orderId}`, {
        state: {
          transaction_ref: payment.transaction_ref || '',
          invoice_number:  invoice?.invoice_number  || '',
          payment_method:  paymentMethod,
          total:           order?.total             || 0,
          whatsapp_opened: false,
          invoice:         invoice,
        }
      })
    } catch (err) {
      console.error('completeOrder error:', err)
      setError('Payment could not be completed. Please try again.')
    } finally {
      setCompleting(false)
    }
  }

  // ── Derived ────────────────────────────────────────────────────────────────
  const amountDue   = invoice ? Number(invoice.total) : (order ? Number(order.total) : 0)
  const orderNumber = order   ? (order.order_number || `#${orderId}`) : `#${orderId}`
  const tableLabel  = order   ? (order.table_label  || '')       : ''

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
              onClick={() => navigate(`/orders/${orderId}/invoice`)}
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
                  onClick={() => setPaymentMethod(m.id)}
                  id={`pay-method-${m.id}`}
                  disabled={completing}
                >
                  <span className="checkout-method-icon">{m.icon}</span>
                  <span className="checkout-method-label">{m.label}</span>
                </button>
              ))}
            </div>
          </div>

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
            onClick={handleCompleteOrder}
            disabled={completing}
            id="complete-order-btn"
          >
            {completing ? 'Processing…' : 'Complete Order'}
          </button>
        </div>
      </div>
    </AdminLayout>
  )
}
