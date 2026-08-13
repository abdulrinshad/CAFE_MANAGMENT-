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

  // Resolve table from URL param — prefer matching by id or name
  const tableParam = searchParams.get('table')  // may be id (e.g. "9") or name (e.g. "T-01")
  const matchedTable = tables?.find(
    (t) => String(t.id) === String(tableParam) || t.name === tableParam
  ) || null
  const tableLabel = matchedTable
    ? matchedTable.name
    : tableParam
    ? tableParam.replace('T-', 'Table ')
    : 'Table 08'

  const [activeCategory, setActiveCategory] = useState('All')
  const [cart, setCart] = useState([])
  const [orderNotes, setOrderNotes] = useState('')

  // Filter products by active category — safe against any category shape
  const filteredProducts = products ? products.filter((p) => {
    if (activeCategory === 'All') return true
    const productCat = getCategoryName(p).toLowerCase()
    const activeCat  = activeCategory.toLowerCase()
    // Alias plurals / short forms used in the sidebar
    if (activeCat === 'pastries')       return productCat.includes('pastry') || productCat.includes('pastri')
    if (activeCat === 'cold beverages') return productCat.includes('cold')   || productCat.includes('beverage')
    if (activeCat === 'desserts')       return productCat.includes('dessert')
    if (activeCat === 'snacks')         return productCat.includes('snack')
    return productCat.includes(activeCat)
  }) : []

  const addToCart = (product) => {
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

  const handleGenerateBill = async () => {
    if (cart.length === 0) return
    setSubmitting(true)
    setSubmitError('')
    try {
      const orderPayload = {
        table:         matchedTable?.id ?? null,
        customer_name: '',
        waiter_name:   currentWaiter?.name || '',
        notes:         orderNotes,
        items: cart.map((item) => ({
          product:    item.id,
          quantity:   item.qty,
        })),
      }
      const created = await createOrder(orderPayload)
      navigate(`/orders/${created.id}`)
    } catch (err) {
      console.error('createOrder failed:', err)
      setSubmitError('Failed to save order. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AdminLayout
      searchPlaceholder="Search menu..."
      pageTitle="New Order"
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
            {filteredProducts.map((product) => (
              <button
                key={product.id}
                type="button"
                className="pos-product-card"
                onClick={() => addToCart(product)}
              >
                {product.popular && <span className="popular-badge">POPULAR</span>}
                <div className="pos-product-image-container">
                  <div className="product-image-placeholder">
                    {getCategoryIcon(product)}
                  </div>
                </div>
                <div className="pos-product-details">
                  <h3 className="pos-product-name">{product.name}</h3>
                  <span className="pos-product-price">₹{product.price.toLocaleString()}</span>
                </div>
              </button>
            ))}
            {filteredProducts.length === 0 && (
              <div className="pos-empty-products">No items found in this category.</div>
            )}
          </div>
        </div>

        {/* Right Active Order/Cart Panel */}
        <div className="pos-active-order-panel">
          <div className="pos-order-header">
            <div>
              <h2 className="pos-order-table">{tableLabel}</h2>
              <span className="pos-order-dine-in">Dine-in</span>
            </div>
            <div className="pos-order-meta">
              <span>Order #4092</span>
              <span>Server: {currentWaiter?.name || 'Alex'}</span>
            </div>
          </div>

          <hr className="pos-panel-divider" />

          {/* Cart items */}
          <div className="pos-cart-items-list">
            {cart.map((item) => (
              <div key={item.id} className="pos-cart-row">
                <div className="pos-cart-item-info">
                  <span className="pos-cart-item-name">{item.name}</span>
                  <span className="pos-cart-item-unit-price">₹{item.unitPrice.toLocaleString()}</span>
                </div>
                <div className="pos-cart-qty-wrap">
                  <div className="item-qty-controls">
                    <button className="qty-btn" onClick={() => updateQty(item.id, -1)}>−</button>
                    <span className="qty-val">{item.qty}</span>
                    <button className="qty-btn" onClick={() => updateQty(item.id, 1)}>+</button>
                  </div>
                </div>
                <span className="pos-cart-item-total">₹{item.total.toLocaleString()}</span>
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
                <p>Order is empty</p>
                <span>Select products to add them to the order.</span>
              </div>
            )}
          </div>

          {/* Order Notes */}
          <div className="pos-order-notes-wrap">
            <label className="section-title" htmlFor="pos-notes-input">Order Notes</label>
            <textarea
              id="pos-notes-input"
              className="pos-notes-textarea"
              placeholder="Add note (e.g. Extra hot)"
              value={orderNotes}
              onChange={(e) => setOrderNotes(e.target.value)}
            />
          </div>

          {/* Totals Summary */}
          <div className="pos-totals-summary">
            <div className="pos-summary-row">
              <span>Subtotal</span>
              <span>₹{subtotal.toLocaleString()}</span>
            </div>
            <div className="pos-summary-row">
              <span>Tax (5%)</span>
              <span>₹{tax.toLocaleString()}</span>
            </div>
            <hr className="pos-summary-divider" />
            <div className="pos-summary-row pos-grand-total">
              <span>Total</span>
              <span>₹{total.toLocaleString()}</span>
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
              Review Order
            </button>
            <button
              type="button"
              className="btn-primary pos-action-btn"
              onClick={handleGenerateBill}
              disabled={cart.length === 0 || submitting}
            >
              {submitting ? 'Saving…' : 'Generate Bill'}
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
