import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import AdminLayout from '../layouts/AdminLayout'
import { useApp } from '../context/AppContext'
import { orderApi } from '../api'
import { getCategoryName } from '../utils/categoryHelper'
import Modal from '../components/Modal'
import './OrderDetailPage.css'


const STATUS_STEPS = ['PENDING', 'PREPARING', 'READY', 'COMPLETED']

const STEP_LABELS = {
  PENDING:   'New',
  PREPARING: 'Preparing',
  READY:     'Ready',
  COMPLETED: 'Completed',
}

function stepIndex(status) {
  const normalized = status ? status.toUpperCase() : 'PENDING'
  if (normalized === 'NEW') return 0
  const idx = STATUS_STEPS.indexOf(normalized)
  return idx >= 0 ? idx : 0
}

export default function OrderDetailPage() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { products, setTableStatus, fetchTables, fetchNotifications, createWaiterRequest } = useApp()

  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [addItemModalOpen, setAddItemModalOpen] = useState(searchParams.get('addItem') === 'true')
  const [customerModalOpen, setCustomerModalOpen] = useState(false)
  const [whatsappPhone, setWhatsappPhone] = useState('')
  const [whatsappError, setWhatsappError] = useState('')
  const [selectedCat, setSelectedCat] = useState('All')
  const [searchProd, setSearchProd] = useState('')



  const normaliseOrder = useCallback((o) => {
    if (!o) return null
    return {
      id: o.id,
      orderNumber: o.order_number || `ORD-${o.id}`,
      tableId: o.table,
      tableLabel: o.table_label || (o.table ? `Table ${o.table}` : 'Takeaway'),
      waiterName: o.waiter_name || 'Staff',
      customerName: o.customer_name || 'Dine-in Guest',
      notes: o.notes || '',
      status: (o.status || 'pending').toUpperCase(),
      subtotal: parseFloat(o.subtotal || 0),
      taxAmount: parseFloat(o.tax_amount || 0),
      total: parseFloat(o.total || 0),
      createdAt: o.created_at,
      time: o.created_at
        ? new Date(o.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
        : '',
      date: o.created_at ? new Date(o.created_at).toLocaleDateString('en-IN') : '',
      items: (o.items || []).map((item) => {
        // Look up product image from context products list if not in serializer
        const matchedProd = products ? products.find((p) => p.id === item.product) : null
        return {
          id: item.id,
          productId: item.product,
          name: item.product_name || matchedProd?.name || 'Item',
          unitPrice: parseFloat(item.unit_price || matchedProd?.price || 0),
          qty: item.quantity,
          total: parseFloat(item.subtotal || (item.quantity * (item.unit_price || 0))),
          image: item.product_image || matchedProd?.image || null,
          category: matchedProd?.category ? getCategoryName(matchedProd.category).toLowerCase() : '',
        }
      }),

    }
  }, [products])

  const fetchOrderDetails = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const data = await orderApi.get(id)
      if (data) {
        setOrder(normaliseOrder(data))
      } else {
        setError('Order not found.')
      }
    } catch (err) {
      console.error('Fetch order detail error:', err)
      setError('Order not found or unable to fetch from backend database.')
    } finally {
      setLoading(false)
    }
  }, [id, normaliseOrder])

  useEffect(() => {
    fetchOrderDetails()
  }, [fetchOrderDetails])

  // Category list for Add Item Modal
  const categoriesList = useMemo(() => {
    if (!products) return ['All']
    const cats = new Set(products.map((p) => p.categoryLabel || p.category).filter(Boolean))
    return ['All', ...Array.from(cats)]
  }, [products])

  // Filtered available products for Add Item Modal
  const availableProducts = useMemo(() => {
    if (!products) return []
    return products.filter((p) => {
      if (p.available === false || p.soldOut === true) return false
      if (selectedCat !== 'All' && (p.categoryLabel || p.category) !== selectedCat) return false
      if (searchProd.trim()) {
        return p.name.toLowerCase().includes(searchProd.toLowerCase())
      }
      return true
    })
  }, [products, selectedCat, searchProd])

  // Actions
  const handleStatusChange = async (newStatus) => {
    if (!order || actionLoading) return
    setActionLoading(true)
    try {
      const updated = await orderApi.setStatus(order.id, { status: newStatus.toLowerCase() })
      setOrder(normaliseOrder(updated))
      await fetchTables()
      await fetchNotifications()
    } catch (err) {
      console.error('Status change error:', err)
      setError(err.message || 'Failed to update order status.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleAddItemToOrder = async (product) => {
    if (!order || actionLoading) return
    setActionLoading(true)
    try {
      const updated = await orderApi.addItem(order.id, {
        product: product.id,
        product_name: product.name,
        unit_price: String(product.price),
        quantity: 1,
      })
      setOrder(normaliseOrder(updated))
    } catch (err) {
      console.error('Add item error:', err)
    } finally {
      setActionLoading(false)
    }
  }

  const handleUpdateItemQty = async (item, delta) => {
    if (!order || actionLoading) return
    if (item.qty + delta <= 0) {
      handleRemoveItem(item.id)
      return
    }
    setActionLoading(true)
    try {
      const updated = await orderApi.updateItemQty(order.id, {
        item_id: item.id,
        delta: delta,
      })
      setOrder(normaliseOrder(updated))
    } catch (err) {
      console.error('Update item qty error:', err)
    } finally {
      setActionLoading(false)
    }
  }

  const handleGenerateBillSubmit = async () => {
    const cleaned = whatsappPhone.trim().replace(/\s/g, '').replace(/-/g, '').replace(/^\+91/, '')
    if (!cleaned || !/^\d{10}$/.test(cleaned)) {
      setWhatsappError('Please enter a valid 10-digit WhatsApp number.')
      return
    }
    setWhatsappError('')
    setActionLoading(true)
    try {
      const updated = await orderApi.generateBill(order.id, { whatsapp_number: cleaned })
      setCustomerModalOpen(false)
      navigate(`/orders/${order.id}/invoice`, { state: { phone: cleaned, order: updated } })
    } catch (err) {
      console.error('Generate bill error:', err)
      setWhatsappError(err.message || 'Failed to generate bill.')
    } finally {
      setActionLoading(false)
    }
  }


  const handleRemoveItem = async (itemId) => {
    if (!order || actionLoading) return
    setActionLoading(true)
    try {
      const updated = await orderApi.removeItem(order.id, itemId)
      setOrder(normaliseOrder(updated))
    } catch (err) {
      console.error('Remove item error:', err)
    } finally {
      setActionLoading(false)
    }
  }

  const handleRequestBill = async () => {
    if (!order || !order.tableId) return
    try {
      await setTableStatus(order.tableId, 'bill_requested')
      if (createWaiterRequest) {
        await createWaiterRequest({
          table: order.tableId,
          request_type: 'Bill Request',
          message: `Bill requested for ${order.orderNumber}`,
          amount: order.total,
          status: 'new',
        })
      }
      fetchOrderDetails()
    } catch (err) {
      console.error('Request bill error:', err)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  if (loading) {
    return (
      <AdminLayout searchPlaceholder="Search orders...">
        <div style={{ textAlign: 'center', padding: '100px 20px', color: '#6b7280' }}>
          <div style={{ fontSize: 24, marginBottom: 12 }}>☕</div>
          <div>Loading order details from PostgreSQL database…</div>
        </div>
      </AdminLayout>
    )
  }

  if (error || !order) {
    return (
      <AdminLayout searchPlaceholder="Search orders...">
        <div style={{ textAlign: 'center', padding: '80px 20px', color: '#ef4444' }}>
          <div style={{ fontSize: 28, marginBottom: 12 }}>⚠️</div>
          <h2 style={{ fontSize: 20, color: '#1f2937', marginBottom: 8 }}>Order Not Found</h2>
          <p style={{ color: '#6b7280', marginBottom: 20 }}>
            {error || `No order found with ID "${id}".`}
          </p>
          <button className="btn-primary" onClick={() => navigate('/orders')}>
            Back to Orders
          </button>
        </div>
      </AdminLayout>
    )
  }

  const currentStep = stepIndex(order.status)
  const isCompleted = order.status === 'COMPLETED'
  const isCancelled = order.status === 'CANCELLED'

  return (
    <AdminLayout searchPlaceholder="Search orders...">
      <div className="order-detail">
        {/* Header */}
        <div className="order-detail__header">
          <div className="order-detail__header-left">
            <button className="order-detail__back" onClick={() => navigate('/orders')} aria-label="Back to orders">
              <ArrowLeftIcon />
            </button>
            <div>
              <h1 className="order-detail__title">Order {order.orderNumber}</h1>
              <div className="order-detail__meta">
                <span className="order-detail__meta-item">
                  <TableIcon /> Table: {order.tableLabel}
                </span>
                <span className="order-detail__meta-sep">•</span>
                <span className="order-detail__meta-item">
                  <WaiterIcon /> Waiter: {order.waiterName}
                </span>
                {order.time && (
                  <>
                    <span className="order-detail__meta-sep">•</span>
                    <span className="order-detail__meta-item">⏱️ {order.time}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="order-detail__header-actions">
            <button className="btn-outline" onClick={handlePrint} id="print-receipt">
              Print Receipt
            </button>

            {/* Workflow Quick Action Buttons */}
            {order.status === 'PENDING' && (
              <>
                <button
                  className="btn-outline"
                  style={{ color: '#ef4444', borderColor: '#fca5a5' }}
                  onClick={() => handleStatusChange('CANCELLED')}
                  disabled={actionLoading}
                >
                  Cancel Order
                </button>
                <button
                  className="btn-primary"
                  onClick={() => handleStatusChange('PREPARING')}
                  disabled={actionLoading}
                  id="mark-preparing"
                >
                  {actionLoading ? 'Updating…' : 'Mark Preparing'}
                </button>
              </>
            )}

            {order.status === 'PREPARING' && (
              <button
                className="btn-primary"
                onClick={() => handleStatusChange('READY')}
                disabled={actionLoading}
                id="mark-ready"
              >
                {actionLoading ? 'Updating…' : 'Mark Ready'}
              </button>
            )}

            {order.status === 'READY' && (
              <>
                <button
                  className="btn-outline"
                  onClick={handleRequestBill}
                  disabled={actionLoading}
                >
                  Request Bill
                </button>
                <button
                  className="btn-primary"
                  style={{ backgroundColor: '#10b981', borderColor: '#10b981' }}
                  onClick={() => handleStatusChange('COMPLETED')}
                  disabled={actionLoading}
                  id="complete-payment"
                >
                  {actionLoading ? 'Updating…' : 'Complete Payment'}
                </button>
              </>
            )}

            {isCompleted && (
              <span className="order-detail__done-badge">✓ Payment Completed</span>
            )}
            {isCancelled && (
              <span className="order-detail__done-badge" style={{ backgroundColor: '#fee2e2', color: '#991b1b' }}>
                ✕ Order Cancelled
              </span>
            )}
          </div>
        </div>

        {/* Status Stepper */}
        {!isCancelled && (
          <div className="order-detail__status-card">
            <h2 className="order-detail__section-title">Status Workflow</h2>
            <div className="status-stepper">
              {STATUS_STEPS.map((step, i) => {
                const isDone    = i < currentStep
                const isCurrent = i === currentStep
                const isFuture  = i > currentStep
                return (
                  <div key={step} className="status-stepper__item">
                    {i > 0 && (
                      <div className={`status-stepper__line${isDone || isCurrent ? ' status-stepper__line--active' : ''}`} />
                    )}
                    <div className={[
                      'status-stepper__circle',
                      isDone    ? 'status-stepper__circle--done'    : '',
                      isCurrent ? 'status-stepper__circle--current' : '',
                      isFuture  ? 'status-stepper__circle--future'  : '',
                    ].filter(Boolean).join(' ')}>
                      {isDone ? <CheckIcon /> : <StepIcon step={step} />}
                    </div>
                    <div className={[
                      'status-stepper__label',
                      isCurrent ? 'status-stepper__label--current' : '',
                      isFuture  ? 'status-stepper__label--future'  : '',
                    ].filter(Boolean).join(' ')}>
                      {STEP_LABELS[step]}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Body: Items + Right Summary Column */}
        <div className="order-detail__body">
          {/* Left: Items List */}
          <div className="order-detail__items-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h2 className="order-detail__section-title" style={{ marginBottom: 0 }}>Order Items</h2>
              {!isCompleted && !isCancelled && (
                <button className="btn-outline btn-sm" onClick={() => setAddItemModalOpen(true)}>
                  + Add Products
                </button>
              )}
            </div>
            <hr className="order-detail__divider" />

            {order.items.map((item) => (
              <div key={item.id} className="order-item" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                  <div className="order-item__icon" style={{ width: 44, height: 44, overflow: 'hidden', borderRadius: 8 }}>
                    {item.image ? (
                      <img src={item.image} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <ItemIcon icon={item.category} />
                    )}
                  </div>
                  <div>
                    <div className="order-item__name" style={{ fontWeight: 600 }}>{item.name}</div>
                    <div className="order-item__qty" style={{ fontSize: 12, color: '#6b7280' }}>
                      ₹{item.unitPrice.toLocaleString('en-IN')} each
                    </div>
                  </div>
                </div>

                {/* Quantity Controls */}
                {!isCompleted && !isCancelled ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div className="item-qty-controls" style={{ display: 'flex', alignItems: 'center', gap: 6, border: '1px solid #e5e7eb', borderRadius: 6, padding: '2px 6px' }}>
                      <button className="qty-btn" onClick={() => handleUpdateItemQty(item, -1)} disabled={actionLoading}>−</button>
                      <span className="qty-val" style={{ fontWeight: 600, minWidth: 20, textAlign: 'center' }}>{item.qty}</span>
                      <button className="qty-btn" onClick={() => handleUpdateItemQty(item, 1)} disabled={actionLoading}>+</button>
                    </div>
                    <div className="order-item__total" style={{ width: 75, textAlign: 'right', fontWeight: 600 }}>
                      ₹{item.total.toLocaleString('en-IN')}
                    </div>
                    <button
                      type="button"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, padding: 4 }}
                      onClick={() => handleRemoveItem(item.id)}
                      disabled={actionLoading}
                      title="Remove item"
                    >
                      🗑️
                    </button>
                  </div>
                ) : (
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 13, color: '#4b5563' }}>{item.qty} × ₹{item.unitPrice.toLocaleString('en-IN')}</div>
                    <div className="order-item__total" style={{ fontWeight: 600 }}>₹{item.total.toLocaleString('en-IN')}</div>
                  </div>
                )}
              </div>
            ))}

            {order.items.length === 0 && (
              <div style={{ textAlign: 'center', padding: '30px 0', color: '#9ca3af' }}>
                No items in this order yet. Click "+ Add Products" to add items.
              </div>
            )}
          </div>

          {/* Right Column: Payment + Summary + Notes */}
          <div className="order-detail__right">
            {/* Payment Info */}
            <div className="order-detail__payment-card">
              <h3 className="order-detail__card-title">Payment Info</h3>
              <div className="payment-row">
                <span>Method</span>
                <span>Cash / POS</span>
              </div>
              <div className="payment-row">
                <span>Status</span>
                <span className={`payment-badge payment-badge--${isCompleted ? 'paid' : 'pending'}`}>
                  {isCompleted ? 'Paid' : 'Pending'}
                </span>
              </div>
              <div className="payment-row">
                <span>Table</span>
                <span>{order.tableLabel}</span>
              </div>
            </div>

            {/* Notes Card */}
            {order.notes && (
              <div className="order-detail__payment-card" style={{ backgroundColor: '#fdfbf7' }}>
                <h3 className="order-detail__card-title">Order Notes</h3>
                <p style={{ fontSize: 13, color: '#4b5563', margin: 0, fontStyle: 'italic' }}>
                  "{order.notes}"
                </p>
              </div>
            )}

            {/* Summary */}
            <div className="order-detail__summary-card">
              <h3 className="order-detail__summary-title">Summary</h3>
              <div className="summary-row">
                <span>Subtotal</span>
                <span>₹{order.subtotal.toLocaleString('en-IN')}</span>
              </div>
              <div className="summary-row">
                <span>Tax (GST 5%)</span>
                <span>₹{order.taxAmount.toLocaleString('en-IN')}</span>
              </div>
              <hr className="order-detail__divider" />
              <div className="summary-row summary-row--total">
                <span>TOTAL</span>
                <span>₹{order.total.toLocaleString('en-IN')}</span>
              </div>

              {!isCompleted && !isCancelled && (
                <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <button
                    className="btn-primary w-full py-3"
                    style={{ backgroundColor: '#2d1810', borderColor: '#2d1810', fontSize: 15, fontWeight: 600 }}
                    onClick={() => setCustomerModalOpen(true)}
                  >
                    🧾 Generate Bill
                  </button>
                  <button
                    className="btn-outline w-full py-2"
                    onClick={() => setAddItemModalOpen(true)}
                  >
                    + Add More Items
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal: Customer Details / WhatsApp Bill Generation */}
        <Modal
          open={customerModalOpen}
          onClose={() => setCustomerModalOpen(false)}
          title="Customer Details"
          size="sm"
        >
          <div className="customer-modal-body" style={{ padding: '8px 4px' }}>
            <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 18, lineHeight: 1.5 }}>
              Enter the customer's WhatsApp number to send the digital receipt instantly.
            </p>

            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                WhatsApp Number
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ padding: '10px 14px', backgroundColor: '#fdfbf7', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, fontWeight: 600, color: '#4b5563', display: 'flex', alignItems: 'center' }}>
                  +91
                </div>
                <input
                  type="tel"
                  placeholder="98765 43210"
                  value={whatsappPhone}
                  onChange={(e) => { setWhatsappPhone(e.target.value); setWhatsappError(''); }}
                  style={{ flex: 1, padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 15 }}
                />
              </div>
              {whatsappError && (
                <div style={{ color: '#ef4444', fontSize: 12, marginTop: 6, fontWeight: 500 }}>
                  {whatsappError}
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#9ca3af', fontSize: 12, marginTop: 10 }}>
                <span>ⓘ</span>
                <span>A link will also be generated.</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
              <button className="btn-outline" onClick={() => setCustomerModalOpen(false)}>
                Cancel
              </button>
              <button
                className="btn-primary"
                style={{ backgroundColor: '#2d1810', borderColor: '#2d1810' }}
                onClick={handleGenerateBillSubmit}
                disabled={actionLoading}
              >
                {actionLoading ? 'Generating…' : 'Generate Bill 🧾'}
              </button>
            </div>
          </div>
        </Modal>


        {/* Modal: Add Product to Order */}
        <Modal
          open={addItemModalOpen}
          onClose={() => setAddItemModalOpen(false)}
          title="Add Product to Order"
          subtitle={`Adding items to ${order.orderNumber} (${order.tableLabel})`}
          size="md"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {categoriesList.map((cat) => (
                <button
                  key={cat}
                  className={`btn-sm ${selectedCat === cat ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setSelectedCat(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>

            <input
              type="text"
              className="top-header__search-input"
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6 }}
              placeholder="Search products…"
              value={searchProd}
              onChange={(e) => setSearchProd(e.target.value)}
            />

            <div style={{ maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {availableProducts.map((prod) => (
                <div
                  key={prod.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justify: 'space-between',
                    padding: '8px 12px',
                    border: '1px solid #e5e7eb',
                    borderRadius: 8,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {prod.image ? (
                      <img src={prod.image} alt={prod.name} style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: 36, height: 36, borderRadius: 6, backgroundColor: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>☕</div>
                    )}
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{prod.name}</div>
                      <div style={{ fontSize: 12, color: '#6b7280' }}>₹{Number(prod.price).toLocaleString('en-IN')}</div>
                    </div>
                  </div>
                  <button
                    className="btn-primary btn-sm"
                    onClick={() => handleAddItemToOrder(prod)}
                    disabled={actionLoading}
                  >
                    + Add
                  </button>
                </div>
              ))}
              {availableProducts.length === 0 && (
                <div style={{ textAlign: 'center', padding: 20, color: '#9ca3af' }}>No available products match.</div>
              )}
            </div>
          </div>
        </Modal>
      </div>
    </AdminLayout>
  )
}

/* ── Icons ── */
function ArrowLeftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
    </svg>
  )
}
function TableIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="7" width="18" height="3" rx="1"/>
      <line x1="8" y1="10" x2="8" y2="20"/><line x1="16" y1="10" x2="16" y2="20"/>
    </svg>
  )
}
function WaiterIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  )
}
function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  )
}
function StepIcon({ step }) {
  const icons = {
    PENDING:   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/></svg>,
    PREPARING: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/></svg>,
    READY:     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
    COMPLETED: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  }
  return icons[step] || null
}
function ItemIcon({ icon }) {
  if (icon?.includes('coffee')) return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8h1a4 4 0 0 1 0 8h-1"/>
      <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/>
    </svg>
  )
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="2" width="14" height="20" rx="2"/>
      <line x1="9" y1="7" x2="15" y2="7"/>
      <line x1="9" y1="12" x2="15" y2="12"/>
    </svg>
  )
}
