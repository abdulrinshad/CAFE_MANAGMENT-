import { useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import AdminLayout from '../layouts/AdminLayout'
import { useApp } from '../context/AppContext'
import './CheckoutPage.css'

export default function CheckoutPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { updateTable, updateOrderStatus, orders } = useApp()

  const order = orders ? orders.find((o) => o.id === id || o.id === `ORD-${id}`) : null

  // Retrieve pricing state
  const {
    total = order ? order.amount : 640,
    phone = ''
  } = location.state || {}

  const [paymentMethod, setPaymentMethod] = useState('Cash')
  const [paymentStatus, setPaymentStatus] = useState('Paid') // 'Pending' | 'Paid'

  const handleCompleteOrder = () => {
    // If order exists in state, update its status and free the table
    if (order) {
      updateOrderStatus(order.id, 'COMPLETED')
      // Find the table and clear it
      const tableId = order.table
      if (tableId) {
        // Find if table matches, e.g. T-02, T-04, etc.
        const cleanedId = tableId.replace('Table ', 'T-')
        updateTable(cleanedId, {
          status: 'available',
          currentOrderId: null,
          amount: null,
          items: [],
          seatedMinutes: null,
          waitingMinutes: null
        })
      }
    }

    // Navigate to Screen 5 (Success page)
    navigate(`/orders/${id}/success`, { state: { phone } })
  }

  return (
    <AdminLayout
      searchPlaceholder="Checkout order..."
      pageTitle="Checkout"
      pageIcon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="4" width="20" height="16" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>}
    >
      <div className="checkout-outer-wrap">
        <div className="checkout-card">
          {/* Header */}
          <div className="checkout-card-header">
            <button className="checkout-back-btn" onClick={() => navigate(`/orders/${id}/invoice`)} aria-label="Go back">
              ←
            </button>
            <span className="checkout-order-number">Order #{order ? order.orderId.replace('#', '') : id}</span>
          </div>

          {/* Amount Due */}
          <div className="amount-due-section">
            <span className="amount-lbl">AMOUNT DUE</span>
            <h1 className="amount-val">₹{total.toLocaleString()}</h1>
          </div>

          {/* Payment Methods Grid */}
          <div className="payment-methods-wrapper">
            <h3 className="section-title">Payment Method</h3>
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
            <button type="button" className="btn-primary py-3 w-full checkout-complete-btn" onClick={handleCompleteOrder}>
              Complete Order
            </button>
            <button type="button" className="btn-ghost checkout-cancel-btn" onClick={() => navigate(`/orders/${id}/invoice`)}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
