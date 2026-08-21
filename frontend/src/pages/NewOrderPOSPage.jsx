import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import AdminLayout from '../layouts/AdminLayout'
import { useApp } from '../context/AppContext'
import './NewOrderPOSPage.css'

const CATEGORIES = ['All', 'Coffee', 'Tea', 'Pastries', 'Desserts', 'Cold Beverages', 'Snacks']

/**
 * Safely extract a category name string from whatever shape the API returns.
 * product.category may be: a string, an integer FK id, a nested object, null, or undefined.
 * We prefer category_name (string label stored by AppContext normaliser) first.
 */
const getCategoryName = (product) => {
  // AppContext normaliser exposes `category_name` as a plain string
  if (product.category_name && typeof product.category_name === 'string') {
    return product.category_name.trim()
  }
  // category_label is UPPERCASED version — normalise it
  if (product.category_label && typeof product.category_label === 'string') {
    return product.category_label.trim()
  }
  const cat = product.category
  if (cat == null) return ''
  if (typeof cat === 'string') return cat.trim()
  if (typeof cat === 'object') {
    return (
      cat.name ||
      cat.category_name ||
      cat.title ||
      cat.label ||
      ''
    ).toString().trim()
  }
  return String(cat)
}

/** Map a product to a simple emoji icon based on category name. */
const getCategoryIcon = (product) => {
  const cat = getCategoryName(product).toLowerCase()
  if (cat.includes('coffee') || cat.includes('espresso')) return '☕'
  if (cat.includes('tea'))                                  return '🫖'
  if (cat.includes('cold') || cat.includes('beverage'))    return '🧊'
  if (cat.includes('dessert'))                              return '🍰'
  if (cat.includes('snack'))                                return '🍿'
  return '🥐'
}


export default function NewOrderPOSPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { products, tables, createOrder, currentWaiter } = useApp()

  // Table Selection state
  const tableParam = searchParams.get('table')
  const [selectedTableId, setSelectedTableId] = useState(() => {
    if (tableParam) {
      const found = tables?.find((t) => String(t.id) === String(tableParam) || t.name === tableParam)
      if (found) return found.id
    }
    return tables && tables.length > 0 ? tables[0].id : ''
  })

  const currentSelectedTable = tables?.find((t) => String(t.id) === String(selectedTableId)) || null
  const tableLabel = currentSelectedTable ? currentSelectedTable.name : 'Select Table'

  const [activeCategory, setActiveCategory] = useState('All')
  const [cart, setCart] = useState([])
  const [orderNotes, setOrderNotes] = useState('')

  // Filter products by active category — safe against any category shape
  const filteredProducts = products ? products.filter((p) => {
    if (activeCategory === 'All') return true
    const productCat = getCategoryName(p).toLowerCase()
    const activeCat  = activeCategory.toLowerCase()
    if (activeCat === 'pastries')       return productCat.includes('pastry') || productCat.includes('pastri')
    if (activeCat === 'cold beverages') return productCat.includes('cold')   || productCat.includes('beverage')
    if (activeCat === 'desserts')       return productCat.includes('dessert')
    if (activeCat === 'snacks')         return productCat.includes('snack')
    return productCat.includes(activeCat)
  }) : []

  const addToCart = (product) => {
    if (product.soldOut || product.available === false) return
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id)
      if (existing) {
        return prev.map((item) =>
          item.id === product.id
            ? { ...item, qty: item.qty + 1, total: (item.qty + 1) * item.unitPrice }
            : item
        )
      }
      return [
        ...prev,
        {
          id:        product.id,
          name:      product.name,
          qty:       1,
          unitPrice: Number(product.price),
          total:     Number(product.price),
          icon:      getCategoryIcon(product),
        }
      ]
    })
  }

  const updateQty = (productId, delta) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id === productId) {
            const newQty = Math.max(0, item.qty + delta)
            return { ...item, qty: newQty, total: newQty * item.unitPrice }
          }
          return item
        })
        .filter((item) => item.qty > 0)
    )
  }

  const deleteItem = (productId) => {
    setCart((prev) => prev.filter((item) => item.id !== productId))
  }

  // Calculations
  const subtotal = cart.reduce((acc, curr) => acc + curr.total, 0)
  const tax = Math.round(subtotal * 0.05)
  const total = subtotal + tax

  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [customerName,  setCustomerName]  = useState('')
  const [customerPhone, setCustomerPhone] = useState('')

  const handleSendOrder = async () => {
    if (cart.length === 0) return
    if (!selectedTableId) {
      setSubmitError('Please select a table first.')
      return
    }
    setSubmitting(true)
    setSubmitError('')
    try {
      const orderPayload = {
        table:            currentSelectedTable?.id ?? selectedTableId,
        customer_name:    customerName.trim(),
        whatsapp_number:  customerPhone.trim(),
        waiter_name:      currentWaiter?.name || '',
        notes:            orderNotes,
        items: cart.map((item) => ({
          product:    item.id,
          quantity:   item.qty,
        })),
      }
      const created = await createOrder(orderPayload)
      navigate(`/orders/${created.id}`)
    } catch (err) {
      console.error('createOrder failed:', err)
      setSubmitError('Failed to send order to kitchen. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AdminLayout
      searchPlaceholder="Search menu..."
      pageTitle="New Order (POS)"
      pageIcon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>}
    >
      <div className="pos-layout-container">
        {/* Left Category Selection */}
        <div className="pos-categories-sidebar">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              className={`pos-category-pill ${activeCategory === cat ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Center Product Menu Grid */}
        <div className="pos-menu-grid-wrap">
          <div className="pos-products-grid">
            {filteredProducts.map((product) => {
              const isUnavailable = product.soldOut || product.available === false
              return (
                <button
                  key={product.id}
                  type="button"
                  className={`pos-product-card ${isUnavailable ? 'unavailable' : ''}`}
                  onClick={() => addToCart(product)}
                  disabled={isUnavailable}
                >
                  {product.popular && <span className="popular-badge">POPULAR</span>}
                  {isUnavailable && <span className="popular-badge" style={{ background: '#6b7280' }}>SOLD OUT</span>}
                  <div className="pos-product-image-container">
                    <div className="product-image-placeholder">
                      {getCategoryIcon(product)}
                    </div>
                  </div>
                  <div className="pos-product-details">
                    <h3 className="pos-product-name">{product.name}</h3>
                    <span className="pos-product-price">₹{Number(product.price).toLocaleString('en-IN')}</span>
                  </div>
                </button>
              )
            })}
            {filteredProducts.length === 0 && (
              <div className="pos-empty-products">No items found in this category.</div>
            )}
          </div>
        </div>

        {/* Right Active Order/Cart Panel */}
        <div className="pos-active-order-panel">
          <div className="pos-order-header">
            <div>
              <label htmlFor="pos-table-select" style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', display: 'block' }}>SELECT TABLE</label>
              <select
                id="pos-table-select"
                value={selectedTableId}
                onChange={(e) => setSelectedTableId(e.target.value)}
                style={{
                  padding: '6px 10px',
                  borderRadius: 6,
                  border: '1px solid var(--color-border)',
                  fontFamily: 'var(--font-serif)',
                  fontSize: 16,
                  fontWeight: 600,
                  color: 'var(--color-espresso)',
                  background: 'var(--color-cream)',
                  cursor: 'pointer'
                }}
              >
                {tables && tables.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.seats} Seats) - {t.status}
                  </option>
                ))}
              </select>
            </div>
            <div className="pos-order-meta">
              <span>Server: {currentWaiter?.name || 'Waiter'}</span>
            </div>
          </div>

          <hr className="pos-panel-divider" />

          {/* Cart items */}
          <div className="pos-cart-items-list">
            {cart.map((item) => (
              <div key={item.id} className="pos-cart-row">
                <div className="pos-cart-item-info">
                  <span className="pos-cart-item-name">{item.name}</span>
                  <span className="pos-cart-item-unit-price">₹{item.unitPrice.toLocaleString('en-IN')}</span>
                </div>
                <div className="pos-cart-qty-wrap">
                  <div className="item-qty-controls">
                    <button className="qty-btn" onClick={() => updateQty(item.id, -1)}>−</button>
                    <span className="qty-val">{item.qty}</span>
                    <button className="qty-btn" onClick={() => updateQty(item.id, 1)}>+</button>
                  </div>
                </div>
                <span className="pos-cart-item-total">₹{item.total.toLocaleString('en-IN')}</span>
                <button
                  type="button"
                  className="pos-cart-delete-btn"
                  onClick={() => deleteItem(item.id)}
                  aria-label="Remove item"
                >
                  🗑️
                </button>
              </div>
            ))}
            {cart.length === 0 && (
              <div className="pos-cart-empty">
                <div className="empty-cart-icon">🛒</div>
                <p>Order Cart is empty</p>
                <span>Select products from the menu to add items.</span>
              </div>
            )}
          </div>

          {/* Customer Details */}
          <div className="pos-order-notes-wrap">
            <label className="section-title">Customer Details</label>
            <input
              className="pos-notes-textarea"
              style={{ marginBottom: 8, padding: '8px 10px', borderRadius: 6, border: '1px solid var(--color-border)', fontSize: 13, background: 'var(--color-cream, #faf7f4)', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit' }}
              id="pos-customer-name"
              type="text"
              placeholder="Customer Name (optional)"
              value={customerName}
              onChange={e => setCustomerName(e.target.value)}
            />
            <input
              className="pos-notes-textarea"
              style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid var(--color-border)', fontSize: 13, background: 'var(--color-cream, #faf7f4)', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit' }}
              id="pos-customer-phone"
              type="tel"
              placeholder="Phone Number (optional)"
              value={customerPhone}
              onChange={e => setCustomerPhone(e.target.value)}
            />
          </div>

          {/* Order Notes */}
          <div className="pos-order-notes-wrap">
            <label className="section-title" htmlFor="pos-notes-input">Add Notes</label>
            <textarea
              id="pos-notes-input"
              className="pos-notes-textarea"
              placeholder="Special instructions for kitchen (e.g. Extra hot, no sugar)"
              value={orderNotes}
              onChange={(e) => setOrderNotes(e.target.value)}
            />
          </div>

          {/* Totals Summary */}
          <div className="pos-totals-summary">
            <div className="pos-summary-row">
              <span>Subtotal</span>
              <span>₹{subtotal.toLocaleString('en-IN')}</span>
            </div>
            <div className="pos-summary-row">
              <span>Tax (5% GST)</span>
              <span>₹{tax.toLocaleString('en-IN')}</span>
            </div>
            <hr className="pos-summary-divider" />
            <div className="pos-summary-row pos-grand-total">
              <span>Cart Total</span>
              <span>₹{total.toLocaleString('en-IN')}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pos-bottom-actions">
            {submitError && (
              <div style={{ color: '#ef4444', fontSize: 12, marginBottom: 8, textAlign: 'center' }}>
                {submitError}
              </div>
            )}
            <button
              type="button"
              className="btn-outline pos-action-btn"
              onClick={() => navigate('/tables')}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn-primary pos-action-btn"
              onClick={handleSendOrder}
              disabled={cart.length === 0 || submitting}
            >
              {submitting ? 'Sending…' : 'Send Order to Kitchen'}
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
