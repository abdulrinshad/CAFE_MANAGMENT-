import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import AdminLayout from '../layouts/AdminLayout'
import { useApp } from '../context/AppContext'
import './ActiveOrderPage.css'

export default function ActiveOrderPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { orders, updateTable, tables, taxRate } = useApp()

  // Find order
  const order = orders ? orders.find((o) => o.id === id || o.id === `ORD-${id}`) : null

  // Local state for items list to make quantity controls fully interactive
  const [items, setItems] = useState(
    order ? order.items : [
      { name: 'Artisanal Latte', icon: 'coffee', qty: 2, unitPrice: 140, total: 280, custom: 'Oat Milk, Extra Shot' },
      { name: 'Butter Croissant', icon: 'pastry', qty: 1, unitPrice: 150, total: 150, custom: 'Warm' },
      { name: 'Earl Grey Reserve', icon: 'tea', qty: 1, unitPrice: 180, total: 180, custom: 'Hot' }
    ]
  )

  const [modalOpen, setModalOpen] = useState(false)
  const [phone, setPhone] = useState('')

  if (!order && !id) {
    return (
      <AdminLayout>
        <div className="order-not-found">
          <p>Order not found</p>
          <button className="btn-outline" onClick={() => navigate('/tables')}>Return to Floor Plan</button>
        </div>
      </AdminLayout>
    )
  }

  const tableName = order ? order.table : `Table ${id}`

  const updateQty = (index, delta) => {
    setItems((prev) =>
      prev.map((item, idx) => {
        if (idx === index) {
          const newQty = Math.max(0, item.qty + delta)
          return { ...item, qty: newQty, total: newQty * item.unitPrice }
        }
        return item
      }).filter(item => item.qty > 0)
    )
  }

  // Calculate totals
  const subtotal = items.reduce((acc, curr) => acc + curr.total, 0)
  const tax = Math.round(subtotal * (taxRate / 100))
  const total = subtotal + tax

  const handleGenerateBillSubmit = (e) => {
    e.preventDefault()
    setModalOpen(false)
    // Navigate to Screen 3 (Invoice Preview)
    navigate(`/orders/${id}/invoice`, { state: { items, subtotal, tax, total, phone } })
  }

  return (
    <AdminLayout
      searchPlaceholder="Search active order items..."
      pageTitle="Active Order"
      pageIcon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/></svg>}
    >
      <div className="active-order-container">
        {/* Main Columns */}
        <div className="active-order-main">
          {/* Header Row */}
          <div className="active-order-header-row">
            <div>
              <h1 className="active-order-title">{tableName}</h1>
              <p className="active-order-subtitle">Review items before finalizing the bill.</p>
            </div>
            <div className="active-order-status-wrap">
              <span className="order-status-badge">In Progress</span>
              <span className="order-time-elapsed">⏱️ 24 mins</span>
            </div>
          </div>

          {/* Current Items Card */}
          <div className="current-items-card">
            <h2 className="card-section-title">Current Items</h2>
            <div className="items-list-wrap">
              {items.map((item, index) => (
                <div key={index} className="order-item-row">
                  <div className="item-thumbnail">
                    {item.icon === 'coffee' ? '☕' : item.icon === 'tea' ? '🫖' : '🥐'}
                  </div>
                  <div className="item-details">
                    <h3 className="item-name">{item.name}</h3>
                    {item.custom && <p className="item-customization">{item.custom}</p>}
                  </div>
                  <div className="item-qty-controls">
                    <button className="qty-btn" onClick={() => updateQty(index, -1)} aria-label="Decrease quantity">−</button>
                    <span className="qty-val">{item.qty}</span>
                    <button className="qty-btn" onClick={() => updateQty(index, 1)} aria-label="Increase quantity">+</button>
                  </div>
                  <div className="item-price">₹{item.total.toLocaleString()}</div>
                </div>
              ))}
              {items.length === 0 && (
                <p className="empty-items-text">No items in this order.</p>
              )}
            </div>
          </div>

          {/* Add More Items Area */}
          <button className="add-more-dashed-area" onClick={() => navigate('/menu')}>
            <span className="add-more-plus-icon">+</span>
            <span className="add-more-title">Add More Items</span>
            <span className="add-more-sub">Return to Menu</span>
          </button>
        </div>

        {/* Sidebar Order Summary */}
        <div className="active-order-sidebar">
          <div className="order-summary-card">
            <h2 className="summary-card-title">Order Summary</h2>
            <div className="summary-details">
              <div className="summary-detail-row">
                <span>Subtotal</span>
                <span>₹{subtotal.toLocaleString()}</span>
              </div>
              <div className="summary-detail-row">
                <span>CGST & SGST ({taxRate}%)</span>
                <span>₹{tax.toLocaleString()}</span>
              </div>
              <hr className="summary-divider" />
              <div className="summary-detail-row total-row">
                <span>Total</span>
                <span>₹{total.toLocaleString()}</span>
              </div>
            </div>
            <div className="summary-actions">
              <button className="btn-primary w-full py-3" onClick={() => setModalOpen(true)}>
                Generate Bill
              </button>
              <button className="btn-outline w-full py-3" onClick={() => navigate('/tables')}>
                Transfer Table
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Customer Details Modal (Screen 2) */}
      {modalOpen && (
        <div className="modal-overlay">
          <div className="customer-details-modal">
            <div className="modal-header">
              <h3>Customer Details</h3>
              <button className="modal-close-btn" onClick={() => setModalOpen(false)} aria-label="Close modal">×</button>
            </div>
            <p className="modal-description">
              Enter the customer's WhatsApp number to send the digital receipt instantly.
            </p>
            <form onSubmit={handleGenerateBillSubmit}>
              <div className="form-group">
                <label className="form-label">WhatsApp Number</label>
                <div className="phone-input-wrap">
                  <div className="phone-prefix">+91</div>
                  <input
                    type="tel"
                    required
                    pattern="[0-9]{10}"
                    className="form-input phone-number-input"
                    placeholder="98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>
              <p className="modal-info-text">
                ℹ️ A unique invoice receipt web link will also be generated.
              </p>
              <div className="modal-footer-actions">
                <button type="button" className="btn-outline" onClick={() => setModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary modal-submit-btn">
                  Generate Bill
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
