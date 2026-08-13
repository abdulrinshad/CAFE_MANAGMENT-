/**
 * AddItemsPage — /orders/:id/add-items
 *
 * POS-style product selector for adding more items to an EXISTING order.
 * Does NOT create a new order.
 * Posts each selected item to /orders/:id/add_item/ and returns to /orders/:id.
 */
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import AdminLayout from '../layouts/AdminLayout'
import { useApp } from '../context/AppContext'
import { orderApi } from '../api'
import './NewOrderPOSPage.css'

const CATEGORIES = ['All', 'Coffee', 'Tea', 'Pastries', 'Desserts', 'Cold Beverages', 'Snacks']

const getCategoryName = (product) => {
  if (product.category_name && typeof product.category_name === 'string')
    return product.category_name.trim()
  if (product.category_label && typeof product.category_label === 'string')
    return product.category_label.trim()
  const cat = product.category
  if (cat == null) return ''
  if (typeof cat === 'string') return cat.trim()
  if (typeof cat === 'object')
    return (cat.name || cat.category_name || cat.title || cat.label || '').toString().trim()
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

export default function AddItemsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { products } = useApp()

  const [activeCategory, setActiveCategory] = useState('All')
  const [cart,           setCart]           = useState([])  // { id, name, qty, unitPrice }
  const [submitting,     setSubmitting]     = useState(false)
  const [submitError,    setSubmitError]    = useState('')

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
    setCart((prev) => {
      const existing = prev.find((i) => i.id === product.id)
      if (existing) {
        return prev.map((i) => i.id === product.id ? { ...i, qty: i.qty + 1 } : i)
      }
      return [...prev, {
        id:        product.id,
        name:      product.name,
        qty:       1,
        unitPrice: Number(product.price),
      }]
    })
  }

  const updateQty = (productId, delta) => {
    setCart((prev) =>
      prev
        .map((i) => i.id === productId ? { ...i, qty: Math.max(0, i.qty + delta) } : i)
        .filter((i) => i.qty > 0)
    )
  }

  const totalItems = cart.reduce((s, i) => s + i.qty, 0)

  const handleAddItems = async () => {
    if (cart.length === 0) return
    setSubmitting(true)
    setSubmitError('')
    try {
      for (const item of cart) {
        await orderApi.addItem(id, { product: item.id, quantity: item.qty })
      }
      navigate(`/orders/${id}`)
    } catch (err) {
      console.error('addItem error:', err)
      setSubmitError('Failed to add items. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AdminLayout
      searchPlaceholder="Search menu..."
      pageTitle="Add Items"
      pageIcon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>}
    >
      <div className="pos-layout-container">
        {/* Categories */}
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

        {/* Product Grid */}
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
                  <div className="product-image-placeholder">{getCategoryIcon(product)}</div>
                </div>
                <div className="pos-product-details">
                  <h3 className="pos-product-name">{product.name}</h3>
                  <span className="pos-product-price">₹{Number(product.price).toLocaleString('en-IN')}</span>
                </div>
              </button>
            ))}
            {filteredProducts.length === 0 && (
              <div className="pos-empty-products">No items in this category.</div>
            )}
          </div>
        </div>

        {/* Cart / Add Panel */}
        <div className="pos-active-order-panel">
          <div className="pos-order-header">
            <div>
              <h2 className="pos-order-table">Add to Order #{id}</h2>
              <span className="pos-order-dine-in">Select items to add</span>
            </div>
          </div>

          <hr className="pos-panel-divider" />

          <div className="pos-cart-items-list">
            {cart.length === 0 && (
              <div className="pos-cart-empty">
                <div className="empty-cart-icon">+</div>
                <p>No items selected</p>
                <span>Tap products to add them.</span>
              </div>
            )}
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
                <span className="pos-cart-item-total">
                  ₹{(item.unitPrice * item.qty).toLocaleString('en-IN')}
                </span>
              </div>
            ))}
          </div>

          {submitError && (
            <div style={{ color: '#ef4444', fontSize: 12, margin: '8px 0', textAlign: 'center' }}>
              {submitError}
            </div>
          )}

          <div className="pos-bottom-actions">
            <button
              type="button"
              className="btn-outline pos-action-btn"
              onClick={() => navigate(`/orders/${id}`)}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn-primary pos-action-btn"
              onClick={handleAddItems}
              disabled={cart.length === 0 || submitting}
            >
              {submitting ? 'Adding…' : `Add ${totalItems > 0 ? `(${totalItems}) ` : ''}Items`}
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
