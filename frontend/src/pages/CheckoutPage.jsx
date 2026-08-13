import { useState, useEffect } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import AdminLayout from '../layouts/AdminLayout'
import { useApp } from '../context/AppContext'
import { orderApi } from '../api'
import './CheckoutPage.css'

export default function CheckoutPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { fetchTables, fetchNotifications } = useApp()

  const [order, setOrder] = useState(location.state?.order || null)
  const [loading, setLoading] = useState(!order)
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState(null)

  const passedPhone = location.state?.phone || ''

  useEffect(() => {
    if (!id) return
    let isMounted = true
    orderApi.get(id)
      .then((data) => {
        if (isMounted && data) {
          setOrder(data)
        }
      })
      .catch((e) => {
        console.error('Checkout fetch error:', e)
        if (isMounted) setErr('Unable to load payment details.')
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })
    return () => { isMounted = false }
  }, [id])

  const [paymentMethod, setPaymentMethod] = useState('Cash')
  const [paymentStatus, setPaymentStatus] = useState('Paid') // 'Pending' | 'Paid'

  const handleCompleteOrder = async () => {
    if (!order || submitting) return
    setSubmitting(true)
    setErr(null)

    try {
      const updated = await orderApi.completePayment(order.id, {
        payment_method: paymentMethod,
        payment_status: paymentStatus,
      })

      await fetchTables()
      await fetchNotifications()

      navigate(`/orders/${order.id}/success`, {
        state: {
          phone: passedPhone || order.whatsapp_number || '',
          order: updated,
          transactionRef: updated.transaction_ref || order.transaction_ref || `#AB-${order.id}`,
        }
      })
    } catch (e) {
      console.error('Complete payment error:', e)
      setErr(e.message || 'Payment could not be completed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <AdminLayout searchPlaceholder="Checkout order...">
        <div style={{ textAlign: 'center', padding: '100px 20px', color: '#6b7280' }}>
          <div style={{ fontSize: 24, marginBottom: 12 }}>💳</div>
          <div>Loading payment details from PostgreSQL database…</div>
        </div>
      </AdminLayout>
    )
  }

  if (err && !order) {
    return (
      <AdminLayout searchPlaceholder="Checkout order...">
        <div style={{ textAlign: 'center', padding: '80px 20px', color: '#ef4444' }}>
          <div style={{ fontSize: 28, marginBottom: 12 }}>⚠️</div>
          <h2 style={{ fontSize: 20, color: '#1f2937', marginBottom: 8 }}>Order Not Found</h2>
          <p style={{ color: '#6b7280', marginBottom: 20 }}>{err}</p>
          <button className="btn-primary" onClick={() => navigate('/orders')}>Back to Orders</button>
        </div>
      </AdminLayout>
    )
  }

  const orderNum = order ? (order.order_number || `ORD-${order.id}`) : id
  const totalVal = order ? Number(order.total || 0) : 0

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
            <button className="checkout-back-btn" onClick={() => navigate(`/orders/${order.id}/invoice`)} aria-label="Go back">
              ←
            </button>
            <span className="checkout-order-number">Order #{orderNum}</span>
          </div>

          {err && (
            <div style={{ color: '#ef4444', backgroundColor: '#fee2e2', padding: '10px 14px', borderRadius: 8, marginTop: 12, fontSize: 13 }}>
              {err}
            </div>
          )}

          {/* Amount Due */}
          <div className="amount-due-section">
            <span className="amount-lbl">AMOUNT DUE</span>
            <h1 className="amount-val">₹{totalVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h1>
          </div>

          {/* Payment Methods Grid */}
          <div className="payment-methods-wrapper">
            <h3 className="section-title">Select Payment Method</h3>
            <div className="payment-methods-grid">
              <button
                type="button"
                className={`payment-grid-item ${paymentMethod === 'Cash' ? 'selected' : ''}`}
                onClick={() => setPaymentMethod('Cash')}
              >
                <span className="payment-method-icon">💵</span>
                <span className="payment-method-lbl">Cash</span>
              </button>
              <button
                type="button"
                className={`payment-grid-item ${paymentMethod === 'Card' ? 'selected' : ''}`}
                onClick={() => setPaymentMethod('Card')}
              >
                <span className="payment-method-icon">💳</span>
                <span className="payment-method-lbl">Card</span>
              </button>
              <button
                type="button"
                className={`payment-grid-item ${paymentMethod === 'UPI' ? 'selected' : ''}`}
                onClick={() => setPaymentMethod('UPI')}
              >
                <span className="payment-method-icon">📱</span>
                <span className="payment-method-lbl">UPI</span>
              </button>
              <button
                type="button"
                className={`payment-grid-item ${paymentMethod === 'Other' ? 'selected' : ''}`}
                onClick={() => setPaymentMethod('Other')}
              >
                <span className="payment-method-icon">⚙️</span>
                <span className="payment-method-lbl">Other</span>
              </button>
            </div>
          </div>

          {/* Payment Status Segmented Control */}
          <div className="payment-status-wrapper">
            <h3 className="section-title">Payment Status</h3>
            <div className="segmented-control">
              <button
                type="button"
                className={`segment-btn ${paymentStatus === 'Pending' ? 'active' : ''}`}
                onClick={() => setPaymentStatus('Pending')}
              >
                Pending
              </button>
              <button
                type="button"
                className={`segment-btn ${paymentStatus === 'Paid' ? 'active font-semibold' : ''}`}
                onClick={() => setPaymentStatus('Paid')}
              >
                Paid
              </button>
            </div>
          </div>

          {/* Bottom Actions */}
          <div className="checkout-bottom-actions">
            <button
              type="button"
              className="btn-primary py-3 w-full checkout-complete-btn"
              style={{ backgroundColor: '#2d1810', borderColor: '#2d1810' }}
              onClick={handleCompleteOrder}
              disabled={submitting}
            >
              {submitting ? 'Completing Order…' : 'Complete Order 🧾'}
            </button>
            <button type="button" className="btn-ghost checkout-cancel-btn" onClick={() => navigate(`/orders/${order.id}/invoice`)}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}

