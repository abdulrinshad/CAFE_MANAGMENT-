import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminLayout from '../layouts/AdminLayout'
import { useApp } from '../context/AppContext'
import './NewOrderPOSPage.css' // Reuse NewOrderPOSPage.css for identical layout styling

const getCategoryName = (product) => {
  if (product.category_name && typeof product.category_name === 'string') {
    return product.category_name.trim()
  }
  if (product.category_label && typeof product.category_label === 'string') {
    return product.category_label.trim()
  }
  const cat = product.category
  if (cat == null) return ''
  if (typeof cat === 'string') return cat.trim()
  if (typeof cat === 'object') {
    return (cat.name || cat.category_name || cat.title || cat.label || '').toString().trim()
  }
  return String(cat)
}

const getCategoryIcon = (product) => {
  const cat = getCategoryName(product).toLowerCase()
  if (cat.includes('coffee') || cat.includes('espresso')) return '☕'
  if (cat.includes('tea'))                                  return '🫖'
  if (cat.includes('cold') || cat.includes('beverage'))    return '🧊'
  if (cat.includes('dessert'))                              return '🍰'
  if (cat.includes('snack'))                                return '🍿'
  return '🥐'
}

export default function TakeawayPage() {
  const navigate = useNavigate()
  const { products, createOrder, currentUser } = useApp()

  const derivedCategories = useMemo(() => {
    if (!products) return ['All']
    const cats = new Set(products.map(getCategoryName).filter(Boolean))
    return ['All', ...Array.from(cats)]
  }, [products])

  const [activeCategory, setActiveCategory] = useState('All')

  useEffect(() => {
    if (!derivedCategories.includes(activeCategory)) {
      setActiveCategory('All')
    }
  }, [derivedCategories, activeCategory])

  const [searchQuery, setSearchQuery] = useState('')
  const [cart, setCart] = useState([])
  const [orderNotes, setOrderNotes] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  // Filter products by search and category
  const filteredProducts = products ? products.filter((p) => {
    if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false
    }
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

  const handleSendOrder = async () => {
    if (cart.length === 0) return
    setSubmitting(true)
    setSubmitError('')
    try {
      const orderPayload = {
        customer_name:    customerName.trim(),
        whatsapp_number:  customerPhone.trim(),
        notes:            orderNotes,
        channel:          'TAKEAWAY',
        items: cart.map((item) => ({
          product:    item.id,
          quantity:   item.qty,
        })),
      }
      const created = await createOrder(orderPayload)
      navigate(`/orders/${created.id}`)
    } catch (err) {
      console.error('createOrder takeaway failed:', err)
      setSubmitError('Failed to create takeaway order. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AdminLayout
      searchPlaceholder="Search menu..."
      pageTitle="Takeaway Order"
      pageIcon={
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="2" y="3" width="20" height="14" rx="2"/>
          <line x1="8" y1="21" x2="16" y2="21"/>
          <line x1="12" y1="17" x2="12" y2="21"/>
        </svg>
      }
    >
      <div className="pos-layout-container">
        {/* Left Category Selection */}
        <div className="pos-categories-sidebar">
          <input
            type="text"
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              padding: '10px 14px',
              borderRadius: '20px',
              border: '1px solid var(--color-border)',
              fontSize: '13px',
              width: '100%',
              marginBottom: '10px',
              background: 'var(--color-white)',
              color: 'var(--color-espresso)',
              outline: 'none'
            }}
          />
          {derivedCategories.map((cat) => (
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
            {products.length === 0 ? (
              <div className="pos-empty-products">No menu items are currently available.</div>
            ) : filteredProducts.length === 0 ? (
              <div className="pos-empty-products">No items found matching filter.</div>
            ) : null}
          </div>
        </div>

        {/* Right Active Order/Cart Panel */}
        <div className="pos-active-order-panel">
          <div className="pos-order-header">
            <div>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-espresso)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                TAKEAWAY ORDER
              </span>
            </div>
            <div className="pos-order-meta">
              <span>Cashier: {currentUser?.name || 'Cashier'}</span>
            </div>
          </div>

          {/* Customer Details Form */}
          <div style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.5)', borderBottom: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div>
              <label style={{ fontSize: '10px', fontWeight: 600, color: 'var(--color-text-muted)', display: 'block', marginBottom: '2px' }}>CUSTOMER NAME (OPTIONAL)</label>
              <input
                type="text"
                placeholder="Guest Customer"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid var(--color-border)', fontSize: '13px', outline: 'none' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '10px', fontWeight: 600, color: 'var(--color-text-muted)', display: 'block', marginBottom: '2px' }}>PHONE / WHATSAPP (OPTIONAL)</label>
              <input
                type="text"
                placeholder="e.g. 9876543210"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid var(--color-border)', fontSize: '13px', outline: 'none' }}
              />
            </div>
          </div>

          {/* Cart items list */}
          <div className="pos-cart-items-list">
            {cart.map((item) => (
              <div key={item.id} className="pos-cart-item">
                <span className="pos-cart-item-icon">{item.icon}</span>
                <div className="pos-cart-item-details">
                  <span className="pos-cart-item-name">{item.name}</span>
                  <span className="pos-cart-item-price">₹{item.unitPrice} each</span>
                </div>
                <div className="pos-cart-item-qty-actions">
                  <button type="button" className="qty-btn" onClick={() => updateQty(item.id, -1)}>-</button>
                  <span className="qty-val">{item.qty}</span>
                  <button type="button" className="qty-btn" onClick={() => updateQty(item.id, 1)}>+</button>
                </div>
                <span className="pos-cart-item-total">₹{item.total}</span>
                <button type="button" className="pos-cart-item-delete" onClick={() => deleteItem(item.id)}>×</button>
              </div>
            ))}
            {cart.length === 0 && (
              <div className="pos-cart-empty">
                <span style={{ fontSize: '24px', display: 'block', marginBottom: '8px' }}>🛒</span>
                <span>Order is empty. Add menu items.</span>
              </div>
            )}
          </div>

          {/* Summary & Place Order */}
          <div className="pos-cart-summary-footer">
            <div className="pos-summary-notes">
              <textarea
                placeholder="Kitchen notes (e.g. extra spicy, no ice)..."
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                style={{ width: '100%', height: '40px', padding: '6px 10px', borderRadius: '4px', border: '1px solid var(--color-border)', fontSize: '12px', outline: 'none', resize: 'none' }}
              />
            </div>

            <div className="pos-summary-totals">
              <div className="pos-total-row">
                <span>Subtotal</span>
                <span>₹{subtotal}</span>
              </div>
              <div className="pos-total-row">
                <span>GST (5%)</span>
                <span>₹{tax}</span>
              </div>
              <div className="pos-total-row grand-total">
                <span>Total Amount</span>
                <span>₹{total}</span>
              </div>
            </div>

            {submitError && (
              <div className="pos-submit-error" style={{ color: 'var(--color-red)', fontSize: '12px', marginBottom: '8px', textAlign: 'center', fontWeight: 600 }}>
                {submitError}
              </div>
            )}

            <button
              type="button"
              className="pos-btn-submit-order"
              onClick={handleSendOrder}
              disabled={submitting || cart.length === 0}
            >
              {submitting ? 'Creating Takeaway Order...' : 'Send Takeaway Order to Kitchen'}
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
