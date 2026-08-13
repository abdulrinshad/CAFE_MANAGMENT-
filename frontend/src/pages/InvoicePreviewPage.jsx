import { useState, useEffect } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import AdminLayout from '../layouts/AdminLayout'
import { orderApi } from '../api'
import './InvoicePreviewPage.css'

export default function InvoicePreviewPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()

  const [order, setOrder] = useState(location.state?.order || null)
  const [loading, setLoading] = useState(!order)
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
        console.error('Invoice fetch error:', e)
        if (isMounted) setErr('Unable to load invoice details.')
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })
    return () => { isMounted = false }
  }, [id])

  if (loading) {
    return (
      <AdminLayout searchPlaceholder="Search invoice details...">
        <div style={{ textAlign: 'center', padding: '100px 20px', color: '#6b7280' }}>
          <div style={{ fontSize: 24, marginBottom: 12 }}>🧾</div>
          <div>Loading invoice details from PostgreSQL database…</div>
        </div>
      </AdminLayout>
    )
  }

  if (err || !order) {
    return (
      <AdminLayout searchPlaceholder="Search invoice details...">
        <div style={{ textAlign: 'center', padding: '80px 20px', color: '#ef4444' }}>
          <div style={{ fontSize: 28, marginBottom: 12 }}>⚠️</div>
          <h2 style={{ fontSize: 20, color: '#1f2937', marginBottom: 8 }}>Invoice Not Found</h2>
          <p style={{ color: '#6b7280', marginBottom: 20 }}>{err || `Invoice for order #${id} could not be loaded.`}</p>
          <button className="btn-primary" onClick={() => navigate('/orders')}>Back to Orders</button>
        </div>
      </AdminLayout>
    )
  }

  const items = order.items || []
  const subtotal = Number(order.subtotal || 0)
  const tax = Number(order.tax_amount || 0)
  const total = Number(order.total || 0)
  const phone = passedPhone || order.whatsapp_number || ''
  const invoiceNo = order.invoice_number || `INV-${String(order.id).zfill ? String(order.id).zfill(5) : order.id}`
  const tableName = order.table_label || (order.table ? `Table ${order.table}` : 'Takeaway')

  const dateObj = order.created_at ? new Date(order.created_at) : new Date()
  const dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
  const timeStr = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })

  const isPaid = order.payment_status === 'paid' || order.status === 'completed'

  const handleSendWhatsApp = () => {
    const cleanPhone = phone.replace(/\D/g, '')
    const receiptLink = `${window.location.origin}/orders/${order.id}/invoice`
    const msgText = `☕ *Artisan Brew Digital Receipt*\n\nInvoice: *${invoiceNo}*\nTable: *${tableName}*\nDate: ${dateStr} ${timeStr}\n\n*Order Summary:*\n${items.map(it => `• ${it.quantity}x ${it.product_name} - ₹${Number(it.subtotal).toFixed(2)}`).join('\n')}\n\n*Subtotal:* ₹${subtotal.toFixed(2)}\n*GST (5%):* ₹${tax.toFixed(2)}\n*Total:* ₹${total.toFixed(2)}\n\n*Digital Bill:* ${receiptLink}\n\nThank you for visiting Artisan Brew!`

    if (cleanPhone) {
      window.open(`https://wa.me/91${cleanPhone}?text=${encodeURIComponent(msgText)}`, '_blank')
    }

    // Navigate to Checkout / Payment or Success page
    navigate(`/orders/${order.id}/checkout`, { state: { phone, order, total, subtotal, tax } })
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <AdminLayout
      searchPlaceholder="Search invoice details..."
      pageTitle="Invoice Preview"
      pageIcon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>}
    >
      <div className="invoice-preview-container">
        {/* Navigation header */}
        <div className="invoice-nav-header">
          <button className="back-btn-link" onClick={() => navigate(`/orders/${order.id}`)}>
            ← Back to Order #{order.order_number || order.id}
          </button>
          <div className="invoice-actions-top">
            <button className="btn-outline btn-sm" onClick={handlePrint}>Print</button>
          </div>
        </div>

        {/* Invoice Card */}
        <div className="invoice-card-container">
          {/* Logo & Header Info */}
          <div className="invoice-card-header">
            <div className="invoice-header-left">
              <div className="invoice-logo-wrap">
                <img src="/logo.png" alt="Artisan Brew Logo" className="invoice-logo" />
              </div>
              <div>
                <h2 className="invoice-brand-title">Artisan Brew</h2>
                <p className="invoice-brand-subtitle">Management Suite</p>
                <p className="invoice-brand-address">123 Espresso Lane, Coffee District</p>
                <p className="invoice-brand-contact">contact@artisanbrew.com</p>
              </div>
            </div>
            
            <div className="invoice-header-right">
              <span className={`payment-status-pill ${isPaid ? 'paid' : 'unpaid'}`}>
                {isPaid ? 'PAID' : 'UNPAID'}
              </span>
              <div className="invoice-meta-list">
                <div className="invoice-meta-row">
                  <span className="meta-lbl">INVOICE:</span>
                  <span className="meta-val">{invoiceNo}</span>
                </div>
                <div className="invoice-meta-row">
                  <span className="meta-lbl">TABLE:</span>
                  <span className="meta-val">{tableName}</span>
                </div>
                <div className="invoice-meta-row">
                  <span className="meta-lbl">DATE:</span>
                  <span className="meta-val">{dateStr}</span>
                </div>
                <div className="invoice-meta-row">
                  <span className="meta-lbl">TIME:</span>
                  <span className="meta-val">{timeStr}</span>
                </div>
              </div>
            </div>
          </div>

          <hr className="invoice-hr" />

          {/* Items Table */}
          <div className="invoice-table-wrap">
            <table className="invoice-items-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th className="text-center">Qty</th>
                  <th className="text-right">Price</th>
                  <th className="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={idx}>
                    <td>
                      <div className="invoice-item-name">{item.product_name}</div>
                    </td>
                    <td className="text-center">{item.quantity}</td>
                    <td className="text-right">₹{Number(item.unit_price).toLocaleString('en-IN')}</td>
                    <td className="text-right">₹{Number(item.subtotal).toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <hr className="invoice-hr" />

          {/* Footer Details: Payment Info + Totals */}
          <div className="invoice-card-footer">
            <div className="invoice-footer-left">
              <h3 className="invoice-section-heading">Payment Details</h3>
              <div className="payment-detail-box">
                <div className="payment-box-row">
                  <span className="payment-box-lbl">Method:</span>
                  <span className="payment-box-val">{order.payment_method ? order.payment_method.toUpperCase() : 'Pending'}</span>
                </div>
                <div className="payment-box-row">
                  <span className="payment-box-lbl">Status:</span>
                  <span className={`payment-box-val ${isPaid ? 'text-green' : 'text-red'}`}>
                    {isPaid ? 'Paid' : 'Unpaid'}
                  </span>
                </div>
              </div>
            </div>

            <div className="invoice-footer-right">
              <div className="totals-table">
                <div className="totals-row">
                  <span>Subtotal</span>
                  <span>₹{subtotal.toLocaleString('en-IN')}</span>
                </div>
                <div className="totals-row">
                  <span>Tax (GST 5%)</span>
                  <span>₹{tax.toLocaleString('en-IN')}</span>
                </div>
                <div className="totals-row total-grand">
                  <span>TOTAL</span>
                  <span>₹{total.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Invoice Actions */}
        <div className="invoice-actions-footer">
          <button
            className="btn-primary py-3 px-6 px-lg-8"
            style={{ backgroundColor: '#2d1810', borderColor: '#2d1810' }}
            onClick={handleSendWhatsApp}
          >
            📱 Send via WhatsApp
          </button>
          <button className="btn-outline py-3 px-6" onClick={() => navigate(`/orders/${order.id}/checkout`, { state: { phone, order } })}>
            Proceed to Payment 💳
          </button>
          <button className="btn-outline py-3 px-6" onClick={handlePrint}>
            Print Bill / PDF
          </button>
        </div>
      </div>
    </AdminLayout>
  )
}

