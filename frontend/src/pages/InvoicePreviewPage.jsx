import { useLocation, useNavigate, useParams } from 'react-router-dom'
import AdminLayout from '../layouts/AdminLayout'
import { useApp } from '../context/AppContext'
import './InvoicePreviewPage.css'

export default function InvoicePreviewPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { orders } = useApp()

  const order = orders ? orders.find((o) => o.id === id || o.id === `ORD-${id}`) : null

  // Retrieve state passed from active order page, or default
  const {
    items = order ? order.items : [],
    subtotal = order ? order.subtotal : 610,
    tax = order ? order.tax : 30,
    total = order ? order.amount : 640,
    phone = ''
  } = location.state || {}

  const tableName = order ? order.table : `Table ${id}`
  const dateStr = new Date().toISOString().split('T')[0]
  const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  const handleSendWhatsApp = () => {
    // Navigate to Screen 4 (Payment & Checkout)
    navigate(`/orders/${id}/checkout`, { state: { items, subtotal, tax, total, phone } })
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
          <button className="back-btn-link" onClick={() => navigate(`/orders/${id}/active`)}>
            ← Back to Orders
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
                <p className="invoice-brand-address">128 Brew Street, Suite 400</p>
                <p className="invoice-brand-contact">contact@artisanbrew.com</p>
              </div>
            </div>
            
            <div className="invoice-header-right">
              <span className="payment-status-pill unpaid">Unpaid</span>
              <div className="invoice-meta-list">
                <div className="invoice-meta-row">
                  <span className="meta-lbl">INVOICE:</span>
                  <span className="meta-val">#INV-{dateStr.replace(/-/g, '')}-{id}</span>
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
                      <div className="invoice-item-name">{item.name}</div>
                      {item.custom && <div className="invoice-item-sub">{item.custom}</div>}
                    </td>
                    <td className="text-center">{item.qty}</td>
                    <td className="text-right">₹{item.unitPrice.toLocaleString()}</td>
                    <td className="text-right">₹{item.total.toLocaleString()}</td>
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
                  <span className="payment-box-val">Not Selected</span>
                </div>
                <div className="payment-box-row">
                  <span className="payment-box-lbl">Status:</span>
                  <span className="payment-box-val text-red">Pending Payment</span>
                </div>
              </div>
            </div>

            <div className="invoice-footer-right">
              <div className="totals-table">
                <div className="totals-row">
                  <span>Subtotal</span>
                  <span>₹{subtotal.toLocaleString()}</span>
                </div>
                <div className="totals-row">
                  <span>GST (5%)</span>
                  <span>₹{tax.toLocaleString()}</span>
                </div>
                <div className="totals-row total-grand">
                  <span>TOTAL</span>
                  <span>₹{total.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Invoice Actions */}
        <div className="invoice-actions-footer">
          <button className="btn-primary py-3 px-6 px-lg-8" onClick={handleSendWhatsApp}>
            Send via WhatsApp
          </button>
          <button className="btn-outline py-3 px-6" onClick={handlePrint}>
            Download PDF
          </button>
          <button className="btn-outline py-3 px-6" onClick={handlePrint}>
            Print Bill
          </button>
        </div>
      </div>
    </AdminLayout>
  )
}
