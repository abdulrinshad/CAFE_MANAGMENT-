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
import { invoiceApi, orderApi } from '../api'
import './InvoicePreviewPage.css'

export default function InvoicePreviewPage() {
  const { id }   = useParams()   // order ID
  const navigate = useNavigate()

  const [invoice,  setInvoice]  = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState('')
  const [sendingWa, setSendingWa] = useState(false)

  const refreshInvoice = async () => {
    try {
      const data = await invoiceApi.getByOrder(id)
      setInvoice(data)
    } catch (e) {
      console.error(e)
    }
  }

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

  useEffect(() => {
    window.addEventListener('focus', refreshInvoice)
    return () => {
      window.removeEventListener('focus', refreshInvoice)
    }
  }, [id])

  // Helper to normalize the phone number
  const normalizeWhatsAppPhone = (rawPhone) => {
    if (!rawPhone) return ''
    const digits = rawPhone.replace(/[^\d]/g, '')
    if (digits.length === 10) {
      return `91${digits}`
    }
    return digits
  }

  // ── WhatsApp click-to-chat ─────────────────────────────────────────────────
  const handleSendWhatsApp = async () => {
    if (!invoice) return
    
    let phone = invoice.customer_whatsapp || invoice.whatsapp_number
    if (!phone) {
      const input = prompt("Enter customer WhatsApp number (+91XXXXXXXXXX):")
      if (!input) return
      const digitsOnly = input.replace(/[^\d]/g, '')
      phone = digitsOnly.length === 10 ? `+91${digitsOnly}` : `+${digitsOnly}`
    }

    // Validate phone number: length 10 or 12 digits (with 91)
    const digits = phone.replace(/[^\d]/g, '')
    if (!digits || !(digits.length === 10 || (digits.length === 12 && digits.startsWith('91')))) {
      alert("Please enter a valid WhatsApp number.")
      return
    }

    setSendingWa(true)
    try {
      // 1. Update backend receipt status
      const updatedInvoice = await orderApi.markReceiptShared(id, {
        method: 'WHATSAPP',
        customer_whatsapp: phone
      })
      setInvoice(updatedInvoice)

      // 2. Open WhatsApp in new tab
      const phoneDigits = normalizeWhatsAppPhone(phone)
      const invNum = invoice.invoice_number
      const ordNum = invoice.order_number || `ORD-${String(id).padStart(4, '0')}`
      const table = invoice.table_label || `Order #${id}`
      const sub = Number(invoice.subtotal).toFixed(2)
      const tax = Number(invoice.tax_amount).toFixed(2)
      const total = Number(invoice.total).toFixed(2)
      
      const itemsText = (invoice.items || []).map(item => {
        const qty = item.quantity
        const name = item.product_name
        const itemSub = Number(item.subtotal).toFixed(2)
        return `${name} × ${qty} — ₹${itemSub}`
      }).join('\n')

      const rawMessage = 
        `Hello,\n\n` +
        `Thank you for visiting Artisan Brew.\n\n` +
        `Invoice: ${invNum}\n` +
        `Order: ${ordNum}\n` +
        `Table: ${table}\n\n` +
        `Items:\n${itemsText}\n\n` +
        `Subtotal: ₹${sub}\n` +
        `GST (5%): ₹${tax}\n` +
        `Total: ₹${total}\n\n` +
        `Please review your bill.\n\n` +
        `Thank you,\n` +
        `Artisan Brew`

      const msg = encodeURIComponent(rawMessage)
      const url = `https://wa.me/${phoneDigits}?text=${msg}`
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (err) {
      alert("Unable to prepare WhatsApp message. Please try again.")
    } finally {
      setSendingWa(false)
    }
  }

  const handlePrint = async () => {
    window.print()
    try {
      const data = await orderApi.markReceiptPrinted(id)
      setInvoice(data)
    } catch (err) {
      console.error(err)
    }
  }


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

  const isReceiptShared = invoice.receipt_status === 'SHARED'
  const isReceiptPrinted = invoice.receipt_status === 'PRINTED'
  const isReceiptNotShared = invoice.receipt_status === 'NOT_SHARED'

  const isWhatsAppShared = invoice.receipt_status === 'SHARED' && invoice.receipt_method === 'WHATSAPP'


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
                  <span className="payment-box-lbl">Receipt:</span>
                  <span className={`payment-box-val ${
                    isReceiptShared || isReceiptPrinted ? 'text-green' : 'text-red'
                  }`} style={{ fontWeight: 'bold', textTransform: 'capitalize' }}>
                    {invoice.receipt_status ? invoice.receipt_status.replace('_', ' ').toLowerCase() : 'not shared'}
                  </span>
                </div>
                {invoice.customer_whatsapp && (
                  <div className="payment-box-row">
                    <span className="payment-box-lbl">WhatsApp:</span>
                    <span className="payment-box-val">{invoice.customer_whatsapp}</span>
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
          {isPaid ? (
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', width: '100%' }}>
              <div className="receipt-sent-indicator" style={{ display: 'flex', alignItems: 'center', color: 'var(--color-green, #2e7d32)', fontWeight: 'bold', marginRight: 16 }}>
                ✓ PAID & TABLE AVAILABLE
              </div>
              <button className="btn-outline py-3 px-6" onClick={handlePrint}>
                🖨 Print Receipt
              </button>
            </div>
          ) : (
            <>
              {invoice.receipt_method === 'WHATSAPP' && (
                <button
                  type="button"
                  className="btn-primary py-3 px-6"
                  onClick={handleSendWhatsApp}
                  disabled={sendingWa}
                  style={{
                    background: '#16a34a',
                    borderColor: '#16a34a',
                  }}
                >
                  {sendingWa ? 'Sending...' : '✓ Sent via WhatsApp'}
                </button>
              )}

              {invoice.receipt_method === 'PRINT' && (
                <button
                  type="button"
                  className="btn-outline py-3 px-6"
                  onClick={handlePrint}
                >
                  🖨 Print Bill
                </button>
              )}

              <button
                type="button"
                className="btn-primary py-3 px-6"
                onClick={() => navigate(`/orders/${id}/checkout`)}
                style={{
                  background: 'var(--color-espresso)',
                  borderColor: 'var(--color-espresso)',
                  marginLeft: 'auto'
                }}
              >
                💳 Collect Payment
              </button>
            </>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}
