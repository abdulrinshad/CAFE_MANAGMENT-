import { useState, useMemo, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import AdminLayout from '../layouts/AdminLayout'
import { useApp } from '../context/AppContext'
import { tableApi } from '../api'
import { getCategoryName } from '../utils/categoryHelper'
import './NewOrderPOSPage.css'

export default function NewOrderPOSPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { products, categories, tables, createOrder, currentWaiter } = useApp()

  // Get selected table from URL
  const tableParam = searchParams.get('table')
  const tableNameParam = searchParams.get('tableName')

  const [fetchedTable, setFetchedTable] = useState(null)

  useEffect(() => {
    if (tableParam && (!tables || tables.length === 0)) {
      tableApi.get(tableParam).then(t => setFetchedTable(t)).catch(() => {})
    }
  }, [tableParam, tables])

  const selectedTable = useMemo(() => {
    if (fetchedTable) return fetchedTable
    if (!tables || tables.length === 0) return null
    if (!tableParam) return tables[0]
    return tables.find((t) => String(t.id) === String(tableParam) || t.name === tableParam || t.label === tableParam) || null
  }, [tables, tableParam, fetchedTable])

  const tableLabel = selectedTable
    ? (selectedTable.name || selectedTable.label)
    : (tableNameParam || (tableParam ? (tableParam.startsWith('T-') ? tableParam : `Table ${tableParam}`) : 'Table 01'))


  const [activeCategory, setActiveCategory] = useState('All')
  const [cart, setCart] = useState([])
  const [orderNotes, setOrderNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errMessage, setErrMessage] = useState(null)

  // Build categories list from database
  const categoryList = useMemo(() => {
    const activeCats = categories ? categories.filter((c) => c.active !== false).map((c) => getCategoryName(c)) : []
    return ['All', ...activeCats]
  }, [categories])

  // Filter available products from database
  const filteredProducts = useMemo(() => {
    if (!products) return []
    return products.filter((p) => {
      // Must be available on POS terminal
      if (p.available === false || p.soldOut === true || p.availableOnPOS === false) return false
      if (activeCategory === 'All') return true

      const productCat = getCategoryName(p.category || p.category_name || p.categoryLabel).toLowerCase()
      const activeCat = activeCategory.toLowerCase()

      if (activeCat === 'pastries') return productCat === 'pastry' || productCat === 'pastries'
      if (activeCat === 'cold beverages') return productCat === 'cold beverage' || productCat === 'cold beverages'
      return productCat === activeCat
    })
  }, [products, activeCategory])

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
          id: product.id,
          name: product.name,
          qty: 1,
          unitPrice: Number(product.price),
          total: Number(product.price),
          image: product.image,
          category: getCategoryName(product.category || product.category_name).toLowerCase(),
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
  const tax = Math.round(subtotal * 0.05 * 100) / 100
  const total = Math.round((subtotal + tax) * 100) / 100

  const handleGenerateBill = async () => {
    if (cart.length === 0 || submitting) return
    setSubmitting(true)
    setErrMessage(null)

    try {
      // Find matching table PK ID in PostgreSQL
      const targetTableId = selectedTable
        ? selectedTable.id
        : (tables.find((t) => t.name === tableLabel || t.label === tableLabel)?.id || null)

      const orderPayload = {
        table: targetTableId,
        waiter_name: currentWaiter?.name || 'Waiter',
        customer_name: 'Dine-in Guest',
        notes: orderNotes,
        status: 'pending',
        items: cart.map((item) => ({
          product: item.id,
          product_name: item.name,
          unit_price: item.unitPrice,
          quantity: item.qty,
        })),
      }

      const created = await createOrder(orderPayload)
      // Navigate to order detail page or active order screen
      if (created && created.id) {
        navigate(`/orders/${created.id}`)
      } else {
        navigate('/orders')
      }
    } catch (err) {
      console.error('Failed to create order:', err)
      setErrMessage(err.message || 'Failed to place order in database.')
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
          {categoryList.map((cat) => (
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
          {errMessage && (
            <div style={{ color: '#ef4444', backgroundColor: '#fee2e2', padding: '12px 16px', borderRadius: 8, marginBottom: 16 }}>
              {errMessage}
            </div>
          )}
          <div className="pos-products-grid">
            {filteredProducts.map((product) => {
              const catName = getCategoryName(product.category || product.category_name || product.categoryLabel).toLowerCase()
              return (
                <button
                  key={product.id}
                  type="button"
                  className="pos-product-card"
                  onClick={() => addToCart(product)}
                >
                  {product.popular && <span className="popular-badge">POPULAR</span>}
                  <div className="pos-product-image-container">
                    {product.image ? (
                      <img src={product.image} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }} />
                    ) : (
                      <div className="product-image-placeholder">
                        {catName.includes('coffee') ? '☕' : catName.includes('tea') ? '🫖' : '🥐'}
                      </div>
                    )}
                  </div>
                  <div className="pos-product-details">
                    <h3 className="pos-product-name">{product.name}</h3>
                    <span className="pos-product-price">₹{Number(product.price).toLocaleString('en-IN')}</span>
                  </div>
                </button>
              )
            })}

            {filteredProducts.length === 0 && (
              <div className="pos-empty-products">No items available in this category.</div>
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
              <span>₹{subtotal.toLocaleString('en-IN')}</span>
            </div>
            <div className="pos-summary-row">
              <span>Tax (5%)</span>
              <span>₹{tax.toLocaleString('en-IN')}</span>
            </div>
            <hr className="pos-summary-divider" />
            <div className="pos-summary-row pos-grand-total">
              <span>Total</span>
              <span>₹{total.toLocaleString('en-IN')}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pos-bottom-actions">
            <button
              type="button"
              className="btn-outline pos-action-btn"
              onClick={() => navigate('/tables')}
            >
              Review Order
            </button>
            <button
              type="button"
              className="btn-primary pos-action-btn"
              onClick={handleGenerateBill}
              disabled={cart.length === 0 || submitting}
            >
              {submitting ? 'Creating Order…' : 'Generate Bill'}
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}

