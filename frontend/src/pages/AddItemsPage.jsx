/**
 * AddItemsPage — /orders/:id/add-items
 *
 * Waiter adds extra items to an existing active/served order, then can
 * finalise by sending a Bill Request to the Cashier.
 *
 * Flow:
 *  1. Load existing order (items + total).
 *  2. Waiter selects extra products from the branch menu.
 *  3. "Add Items" → POST /orders/:id/add_item/ for each selected product.
 *  4. "Finalize / Request Bill" → POST /orders/:id/request_bill/.
 *
 * Does NOT create a new order or touch invoice/payment/WhatsApp flow.
 *
 * Session-extra tracking:
 *   originalItemIds — IDs captured at first load. Any existing order item
 *   whose ID is NOT in this set was added during the current session and
 *   can be removed (via DELETE /orders/:id/remove_item/:itemId/) before
 *   Finalize is clicked.
 */
import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import AdminLayout from '../layouts/AdminLayout'
import { useApp } from '../context/AppContext'
import { orderApi } from '../api'
import './AddItemsPage.css'

// ── Category helpers ──────────────────────────────────────────────────────────
const getCategoryName = (product) => {
  if (product.category_name && typeof product.category_name === 'string') return product.category_name.trim()
  if (product.category_label && typeof product.category_label === 'string') return product.category_label.trim()
  const cat = product.category
  if (cat == null) return ''
  if (typeof cat === 'string') return cat.trim()
  if (typeof cat === 'object') return (cat.name || cat.category_name || cat.title || cat.label || '').toString().trim()
  return String(cat)
}

export default function AddItemsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { products } = useApp()

  // ── Order state ────────────────────────────────────────────────────────────
  const [order,        setOrder]        = useState(null)
  const [orderLoading, setOrderLoading] = useState(true)
  const [orderError,   setOrderError]   = useState('')

  // Snapshot of item IDs that existed when the page first loaded.
  // Captured ONCE (when order transitions from null → loaded) and never changed.
  // Any item in existingItems whose ID is NOT here = added this session = removable.
  const [originalItemIds, setOriginalItemIds] = useState(null)

  // ── Menu / cart state ──────────────────────────────────────────────────────
  const [activeCategory, setActiveCategory] = useState('All')
  const [search,         setSearch]         = useState('')
  const [cart,           setCart]           = useState([])   // { id, name, qty, unitPrice }

  // ── Submission state ───────────────────────────────────────────────────────
  const [submitting,     setSubmitting]     = useState(false)
  const [submitError,    setSubmitError]    = useState('')
  const [submitSuccess,  setSubmitSuccess]  = useState('')
  const [billLoading,    setBillLoading]    = useState(false)
  const [billError,      setBillError]      = useState('')
  const [removingItemId, setRemovingItemId] = useState(null)  // item being deleted

  // ── Load existing order ────────────────────────────────────────────────────
  const loadOrder = useCallback(async () => {
    setOrderLoading(true)
    setOrderError('')
    try {
      const data = await orderApi.get(id)
      setOrder(data)
    } catch {
      setOrderError('Could not load order details.')
    } finally {
      setOrderLoading(false)
    }
  }, [id])

  // Capture original item IDs exactly once: the first time order loads from null.
  // Subsequent order refreshes (after add/remove) will not overwrite this snapshot.
  useEffect(() => {
    if (order && originalItemIds === null) {
      setOriginalItemIds(new Set((order.items || []).map(i => i.id)))
    }
  }, [order, originalItemIds])

  useEffect(() => { loadOrder() }, [loadOrder])

  // ── Derived menu lists ─────────────────────────────────────────────────────
  const availableProducts = (products || []).filter(p => p.available && !p.sold_out)

  const allCategories = ['All', ...Array.from(
    new Set(availableProducts.map(getCategoryName).filter(Boolean))
  )]

  const filteredProducts = availableProducts.filter(p => {
    const inCat = activeCategory === 'All' || getCategoryName(p).toLowerCase() === activeCategory.toLowerCase()
    const inSearch = !search.trim() || p.name.toLowerCase().includes(search.trim().toLowerCase())
    return inCat && inSearch
  })

  // ── Cart ops ───────────────────────────────────────────────────────────────
  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === product.id)
      if (existing) return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i)
      return [...prev, { id: product.id, name: product.name, qty: 1, unitPrice: Number(product.price) }]
    })
    setSubmitError('')
  }

  const updateQty = (productId, delta) => {
    setCart(prev =>
      prev
        .map(i => i.id === productId ? { ...i, qty: Math.max(0, i.qty + delta) } : i)
        .filter(i => i.qty > 0)
    )
  }

  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(i => i.id !== productId))
  }

  const cartCount = cart.reduce((s, i) => s + i.qty, 0)
  const cartTotal = cart.reduce((s, i) => s + i.qty * i.unitPrice, 0)

  // ── Add items to existing order ────────────────────────────────────────────
  const handleAddItems = async () => {
    if (cart.length === 0) return null
    setSubmitting(true)
    setSubmitError('')
    setSubmitSuccess('')
    try {
      let updatedOrder = null
      for (const item of cart) {
        // Send product ID + quantity; backend snapshots name + price from product FK
        updatedOrder = await orderApi.addItem(id, {
          product:  item.id,
          quantity: item.qty,
        })
      }
      setCart([])
      setSubmitSuccess(`${cartCount} item(s) added successfully.`)
      if (updatedOrder) setOrder(updatedOrder)
      else await loadOrder()
      return true
    } catch (err) {
      console.error('addItem error:', err)
      let msg = 'Failed to add items.'
      try {
        const parsed = typeof err.message === 'string' ? JSON.parse(err.message) : err.message
        msg = parsed?.detail || parsed?.non_field_errors?.[0] || msg
      } catch {
        msg = err.message || msg
      }
      setSubmitError(msg)
      return false
    } finally {
      setSubmitting(false)
    }
  }

  // ── Remove a session-added item from the order (before Finalize) ────────────
  const handleRemoveSessionItem = async (itemId) => {
    setRemovingItemId(itemId)
    setSubmitError('')
    try {
      const updatedOrder = await orderApi.removeItem(id, itemId)
      if (updatedOrder) {
        setOrder(updatedOrder)
      } else {
        await loadOrder()
      }
    } catch (err) {
      let msg = 'Could not remove item.'
      try {
        const parsed = typeof err.message === 'string' ? JSON.parse(err.message) : err.message
        msg = parsed?.detail || msg
      } catch {
        msg = err.message || msg
      }
      setSubmitError(msg)
    } finally {
      setRemovingItemId(null)
    }
  }

  // ── Finalize → request bill ────────────────────────────────────────────────
  const handleRequestBill = async () => {
    // Add any unsaved cart items first
    if (cart.length > 0) {
      const ok = await handleAddItems()
      if (!ok) return  // stop if adding items failed
    }
    setBillLoading(true)
    setBillError('')
    try {
      await orderApi.requestBill(id)
      navigate(`/orders/${id}`, { replace: true })
    } catch (err) {
      let msg = 'Failed to send bill request.'
      try {
        const parsed = typeof err.message === 'string' ? JSON.parse(err.message) : err.message
        msg = parsed?.detail || msg
      } catch {
        msg = err.message || msg
      }
      setBillError(msg)
      setBillLoading(false)
    }
  }

  // ── Derived order data ─────────────────────────────────────────────────────
  const existingItems   = order?.items || []
  const orderTotal      = Number(order?.total ?? 0)
  const orderStatus     = (order?.status || '').toLowerCase()
  const isBillRequested = orderStatus === 'bill_requested'
  const isCancelled     = orderStatus === 'cancelled'
  const canEdit         = !isBillRequested && !isCancelled

  // Which existing items were added in this session (not in original snapshot)
  // Only computed once originalItemIds is populated (after first load).
  const sessionItemIdSet = originalItemIds
    ? new Set(existingItems.filter(i => !originalItemIds.has(i.id)).map(i => i.id))
    : new Set()

  const newSubtotal = cartTotal
  const estimatedTotal = orderTotal + newSubtotal

  // ── Loading / error ────────────────────────────────────────────────────────
  if (orderLoading) {
    return (
      <AdminLayout pageTitle="Add Extra Item">
        <div className="aip-loading">
          <div className="aip-loading__spinner" />
          <span>Loading order…</span>
        </div>
      </AdminLayout>
    )
  }

  if (orderError) {
    return (
      <AdminLayout pageTitle="Add Extra Item">
        <div className="aip-error-state">
          <p>{orderError}</p>
          <button className="aip-btn aip-btn--outline" onClick={() => navigate(`/orders/${id}`)}>
            ← Back to Order
          </button>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout pageTitle="Add Extra Item">
      <div className="aip-page">

        {/* ── Page header ── */}
        <div className="aip-header">
          <button className="aip-back-btn" onClick={() => navigate(`/orders/${id}`)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
            </svg>
            Back
          </button>
          <div className="aip-header__title-wrap">
            <h1 className="aip-header__title">Add Extra Items</h1>
            <span className="aip-header__sub">
              {order?.order_number && <span className="aip-order-badge">{order.order_number}</span>}
              {order?.table_label  && <span className="aip-table-badge">{order.table_label}</span>}
            </span>
          </div>
        </div>

        {/* ── 3-column layout ── */}
        <div className="aip-layout">

          {/* ─── LEFT: Current order summary ─── */}
          <aside className="aip-order-panel">
            <div className="aip-panel-card">
              <div className="aip-panel-card__header">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                  <line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/>
                </svg>
                <span>Current Order</span>
              </div>

              {existingItems.length === 0 ? (
                <p className="aip-empty-items">No items yet.</p>
              ) : (
                <ul className="aip-item-list">
                  {existingItems.map(item => {
                    const isSessionItem = sessionItemIdSet.has(item.id)
                    const isRemoving    = removingItemId === item.id
                    return (
                      <li
                        key={item.id}
                        className={`aip-item-row${isSessionItem ? ' aip-item-row--session' : ''}`}
                      >
                        <div className="aip-item-row__name">
                          {item.product_name || item.name}
                          <span className="aip-item-row__qty">×{item.quantity ?? item.qty}</span>
                          {isSessionItem && (
                            <span className="aip-item-row__new-tag">new</span>
                          )}
                        </div>
                        <span className="aip-item-row__price">
                          ₹{Number(item.subtotal ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                        {/* Remove button — only for session-added items, only while canEdit */}
                        {isSessionItem && canEdit && (
                          <button
                            className="aip-item-remove-btn"
                            onClick={() => handleRemoveSessionItem(item.id)}
                            disabled={isRemoving || !!removingItemId}
                            title="Remove this extra item"
                            aria-label={`Remove ${item.product_name || item.name}`}
                          >
                            {isRemoving ? (
                              <span className="aip-spinner aip-spinner--dark" />
                            ) : (
                              <TrashIcon />
                            )}
                          </button>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}

              <div className="aip-totals">
                <div className="aip-totals__row">
                  <span>Current Total</span>
                  <span>₹{orderTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                {cart.length > 0 && (
                  <>
                    <div className="aip-totals__row aip-totals__row--new">
                      <span>+ New Items</span>
                      <span>₹{newSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="aip-totals__row aip-totals__row--estimated">
                      <span>Estimated Total</span>
                      <span>₹{estimatedTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* ── Selected extras cart ── */}
            {cart.length > 0 && (
              <div className="aip-panel-card aip-cart-card">
                <div className="aip-panel-card__header">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                  </svg>
                  <span>Selected Extra Items</span>
                  <span className="aip-cart-count">{cartCount}</span>
                </div>
                <ul className="aip-cart-list">
                  {cart.map(item => (
                    <li key={item.id} className="aip-cart-row">
                      <div className="aip-cart-row__name">{item.name}</div>
                      <div className="aip-cart-row__controls">
                        <button className="aip-qty-btn" onClick={() => updateQty(item.id, -1)}>−</button>
                        <span className="aip-qty-val">{item.qty}</span>
                        <button className="aip-qty-btn" onClick={() => updateQty(item.id, 1)}>+</button>
                      </div>
                      <span className="aip-cart-row__subtotal">
                        ₹{(item.unitPrice * item.qty).toLocaleString('en-IN')}
                      </span>
                      <button
                        className="aip-remove-btn"
                        onClick={() => removeFromCart(item.id)}
                        title="Remove"
                      >×</button>
                    </li>
                  ))}
                </ul>
                <div className="aip-cart-total">
                  <span>Subtotal</span>
                  <span>₹{cartTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            )}

            {/* ── Feedback messages ── */}
            {submitError  && <div className="aip-msg aip-msg--error">{submitError}</div>}
            {submitSuccess && <div className="aip-msg aip-msg--success">✓ {submitSuccess}</div>}
            {billError    && <div className="aip-msg aip-msg--error">{billError}</div>}

            {/* ── Action buttons ── */}
            {canEdit && (
              <div className="aip-actions">
                <button
                  className="aip-btn aip-btn--primary"
                  onClick={handleAddItems}
                  disabled={cart.length === 0 || submitting || billLoading}
                  id="btn-add-extra-items"
                >
                  {submitting ? (
                    <><span className="aip-spinner" />Adding…</>
                  ) : (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                        <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                      </svg>
                      {cartCount > 0 ? `Add Items (${cartCount})` : 'Add Items'}
                    </>
                  )}
                </button>

                <button
                  className="aip-btn aip-btn--finalize"
                  onClick={handleRequestBill}
                  disabled={submitting || billLoading}
                  id="btn-finalize-request-bill"
                >
                  {billLoading ? (
                    <><span className="aip-spinner" />Sending…</>
                  ) : (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                      Finalize / Request Bill
                    </>
                  )}
                </button>

                <button
                  className="aip-btn aip-btn--outline"
                  onClick={() => navigate(`/orders/${id}`)}
                  disabled={submitting || billLoading}
                  id="btn-cancel-add-items"
                >
                  Cancel
                </button>
              </div>
            )}

            {!canEdit && (
              <div className="aip-locked">
                <p>This order is <strong>{orderStatus}</strong> and cannot be edited.</p>
                <button className="aip-btn aip-btn--outline" onClick={() => navigate(`/orders/${id}`)}>
                  View Order
                </button>
              </div>
            )}
          </aside>

          {/* ─── RIGHT: Menu ─── */}
          {canEdit && (
            <div className="aip-menu-panel">

              {/* Search + category filters */}
              <div className="aip-menu-controls">
                <div className="aip-search-wrap">
                  <svg className="aip-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                  <input
                    className="aip-search"
                    type="text"
                    placeholder="Search menu…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                  {search && (
                    <button className="aip-search-clear" onClick={() => setSearch('')}>×</button>
                  )}
                </div>
                <div className="aip-categories">
                  {allCategories.map(cat => (
                    <button
                      key={cat}
                      className={`aip-cat-pill${activeCategory === cat ? ' active' : ''}`}
                      onClick={() => setActiveCategory(cat)}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Product grid */}
              <div className="aip-products-grid">
                {filteredProducts.length === 0 ? (
                  <div className="aip-no-products">
                    {search ? `No products match "${search}".` : 'No products in this category.'}
                  </div>
                ) : (
                  filteredProducts.map(product => {
                    const inCart = cart.find(i => i.id === product.id)
                    return (
                      <button
                        key={product.id}
                        type="button"
                        className={`aip-product-card${inCart ? ' aip-product-card--selected' : ''}`}
                        onClick={() => addToCart(product)}
                        title={`Add ${product.name}`}
                      >
                        {product.popular && (
                          <span className="aip-popular-badge">Popular</span>
                        )}
                        {inCart && (
                          <span className="aip-in-cart-badge">{inCart.qty}</span>
                        )}
                        <div className="aip-product-card__emoji">
                          {getCategoryEmoji(getCategoryName(product))}
                        </div>
                        <div className="aip-product-card__info">
                          <div className="aip-product-card__name">{product.name}</div>
                          <div className="aip-product-card__cat">{getCategoryName(product)}</div>
                          <div className="aip-product-card__price">
                            ₹{Number(product.price).toLocaleString('en-IN')}
                          </div>
                        </div>
                        <div className="aip-product-card__add">
                          {inCart ? (
                            <span className="aip-product-card__add-icon aip-product-card__add-icon--added">✓</span>
                          ) : (
                            <span className="aip-product-card__add-icon">+</span>
                          )}
                        </div>
                      </button>
                    )
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}

function getCategoryEmoji(cat) {
  const c = (cat || '').toLowerCase()
  if (c.includes('coffee') || c.includes('espresso')) return '☕'
  if (c.includes('tea'))                               return '🫖'
  if (c.includes('cold') || c.includes('iced'))        return '🧊'
  if (c.includes('beverage') || c.includes('drink'))   return '🥤'
  if (c.includes('dessert') || c.includes('cake'))     return '🍰'
  if (c.includes('snack') || c.includes('waffle'))     return '🧇'
  if (c.includes('sandwich') || c.includes('toast'))   return '🥪'
  if (c.includes('salad'))                             return '🥗'
  if (c.includes('breakfast'))                         return '🍳'
  return '🥐'
}

function TrashIcon() {
  return (
    <svg
      width="13" height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
      <path d="M10 11v6"/>
      <path d="M14 11v6"/>
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
    </svg>
  )
}
