/**
 * InvoicePreviewPage — /orders/:id/invoice
 *
 * Loads the real Invoice from Django API.
 * Shows: invoice number, table, date/time, items, totals.
 * Actions: Send via WhatsApp, Print, go to Payment.
 */
import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import AdminLayout from '../layouts/AdminLayout'
import { invoiceApi } from '../api'
import './InvoicePreviewPage.css'

export default function InvoicePreviewPage() {
  const { id }   = useParams()   // order ID
  const navigate = useNavigate()

  const [invoice,  setInvoice]  = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState('')

  // ── Load invoice from API ──────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError('')
      try {
        const data = await invoiceApi.getByOrder(id)
        if (!cancelled) setInvoice(data)
      } catch (err) {
        if (!cancelled) {
          const msg = err.message || ''
          if (msg.includes('404') || msg.toLowerCase().includes('no invoice')) {
            setError('No invoice found. Please generate the bill first.')
          } else {
            setError('Unable to load invoice. Please try again.')
          }
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [id])

  // ── WhatsApp click-to-chat ─────────────────────────────────────────────────
  const handleSendWhatsApp = () => {
    if (!invoice) return
    const phone   = invoice.whatsapp_number ? `91${invoice.whatsapp_number}` : ''
    const invNum  = invoice.invoice_number
    const table   = invoice.table_label || `Order #${id}`
    const sub     = Number(invoice.subtotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })
    const tax     = Number(invoice.tax_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })
    const total   = Number(invoice.total).toLocaleString('en-IN', { minimumFractionDigits: 2 })
    const receipt = invoice.receipt_url || ''

    const msg = encodeURIComponent(
      `🍵 *Artisan Brew*\n\n` +
      `Invoice: ${invNum}\n` +
      `Table: ${table}\n\n` +
      `Subtotal: ₹${sub}\n` +
      `Tax (GST): ₹${tax}\n` +
      `*Total: ₹${total}*\n\n` +
      (receipt ? `Digital Bill: ${receipt}\n\n` : '') +
      `Thank you for visiting! ☕`
    )

    const url = phone
      ? `https://wa.me/${phone}?text=${msg}`
      : `https://wa.me/?text=${msg}`

    window.open(url, '_blank', 'noopener,noreferrer')
    // Navigate to success after opening WhatsApp
    navigate(`/orders/${id}/success`, {
      state: {
        invoice_number:  invNum,
        transaction_ref: invoice.id ? `AB-${String(invoice.id).padStart(5, '0')}` : '',
        whatsapp_number: invoice.whatsapp_number,
        whatsapp_opened: true,
      }
    })
  }

  const handleGoToPayment = () => navigate(`/orders/${id}/checkout`)
  const handlePrint       = () => window.print()

  // ── Render states ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <AdminLayout>
        <div style={{ textAlign: 'center', padding: 80, color: 'var(--color-text-muted)' }}>
          Loading invoice…
        </div>
      </AdminLayout>
    )
  }

  if (error || !invoice) {
    return (
      <AdminLayout>
        <div style={{ textAlign: 'center', padding: 80, color: 'var(--color-text-muted)' }}>
          <p>{error || 'Invoice not found.'}</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 16 }}>
            <button className="btn-outline" onClick={() => navigate(`/orders/${id}`)}>
              ← Back to Order
            </button>
          </div>
        </div>
      </AdminLayout>
    )
  }

  const items    = invoice.items || []
  const subtotal = Number(invoice.subtotal)
  const tax      = Number(invoice.tax_amount)
  const total    = Number(invoice.total)
  const isPaid   = invoice.status === 'paid'
  const dateInfo = invoice.created_at_str || {}

  return (
    <AdminLayout
      searchPlaceholder="Search invoice details..."
      pageTitle="Invoice Preview"
      pageIcon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>}
    >
      <div className="invoice-preview-container">

        {/* Nav header */}
        <div className="invoice-nav-header">
          <button className="back-btn-link" onClick={() => navigate(`/orders/${id}`)}>
            ← Back to Order
          </button>
          <div className="invoice-actions-top">
            <button className="btn-outline btn-sm" onClick={handlePrint}>Print</button>
          </div>
        </div>

        {/* Invoice Card */}
        <div className="invoice-card-container">

          {/* Header: brand + meta */}
          <div className="invoice-card-header">
            <div className="invoice-header-left">
              <div className="invoice-logo-wrap">
                <img src="/logo.png" alt="Artisan Brew" className="invoice-logo"
                  onError={(e) => { e.target.style.display='none' }} />
              </div>
              <div>
                <h2 className="invoice-brand-title">Artisan Brew</h2>
                <p className="invoice-brand-subtitle">Cafe Management Suite</p>
                <p className="invoice-brand-address">128 Brew Street, Suite 400</p>
                <p className="invoice-brand-contact">contact@artisanbrew.com</p>
              </div>
            </div>

            <div className="invoice-header-right">
              <span className={`payment-status-pill ${isPaid ? 'paid' : 'unpaid'}`}>
                {isPaid ? 'Paid' : 'Unpaid'}
              </span>
              <div className="invoice-meta-list">
                <div className="invoice-meta-row">
                  <span className="meta-lbl">INVOICE:</span>
                  <span className="meta-val">{invoice.invoice_number}</span>
                </div>
                <div className="invoice-meta-row">
                  <span className="meta-lbl">TABLE:</span>
                  <span className="meta-val">{invoice.table_label || `Order #${id}`}</span>
                </div>
                <div className="invoice-meta-row">
                  <span className="meta-lbl">DATE:</span>
                  <span className="meta-val">{dateInfo.date || '—'}</span>
                </div>
                <div className="invoice-meta-row">
                  <span className="meta-lbl">TIME:</span>
                  <span className="meta-val">{dateInfo.time || '—'}</span>
                </div>
              </div>
            </div>
          </div>

          <hr className="invoice-hr" />

          {/* Items table */}
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
                {items.length === 0 && (
                  <tr><td colSpan={4} style={{ textAlign: 'center', color: '#aaa', padding: 20 }}>
                    No items
                  </td></tr>
                )}
                {items.map((item, idx) => (
                  <tr key={item.id || idx}>
                    <td>
                      <div className="invoice-item-name">{item.product_name}</div>
                    </td>
                    <td className="text-center">{item.quantity}</td>
                    <td className="text-right">
                      ₹{Number(item.unit_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="text-right">
                      ₹{Number(item.subtotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <hr className="invoice-hr" />

          {/* Footer: payment details + totals */}
          <div className="invoice-card-footer">
            <div className="invoice-footer-left">
              <h3 className="invoice-section-heading">Payment Details</h3>
              <div className="payment-detail-box">
                <div className="payment-box-row">
                  <span className="payment-box-lbl">Method:</span>
                  <span className="payment-box-val">Pending</span>
                </div>
                <div className="payment-box-row">
                  <span className="payment-box-lbl">Status:</span>
                  <span className={`payment-box-val ${isPaid ? 'text-green' : 'text-red'}`}>
                    {isPaid ? 'Paid' : 'Unpaid'}
                  </span>
                </div>
                {invoice.whatsapp_number && (
                  <div className="payment-box-row">
                    <span className="payment-box-lbl">WhatsApp:</span>
                    <span className="payment-box-val">+91 {invoice.whatsapp_number}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="invoice-footer-right">
              <div className="totals-table">
                <div className="totals-row">
                  <span>Subtotal</span>
                  <span>₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="totals-row">
                  <span>GST (5%)</span>
                  <span>₹{tax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="totals-row total-grand">
                  <span>TOTAL</span>
                  <span>₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Actions footer */}
        <div className="invoice-actions-footer">
          {invoice.whatsapp_number ? (
            <button
              className="btn-primary py-3 px-6"
              onClick={handleSendWhatsApp}
              id="send-whatsapp-btn"
            >
              📱 Send via WhatsApp
            </button>
          ) : (
            <button
              className="btn-outline py-3 px-6"
              onClick={() => navigate(`/orders/${id}`)}
            >
              ← Edit Order
            </button>
          )}
          <button
            className="btn-primary py-3 px-6"
            onClick={handleGoToPayment}
            id="go-to-payment-btn"
            style={{ background: 'var(--color-espresso)' }}
          >
            Proceed to Payment →
          </button>
          <button className="btn-outline py-3 px-6" onClick={handlePrint}>
            🖨 Print Bill
          </button>
        </div>
      </div>
    </AdminLayout>
  )
}
