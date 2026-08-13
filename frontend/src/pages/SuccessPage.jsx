/**
 * SuccessPage — /orders/:id/success
 *
 * Shows order completion confirmation.
 * Receives real transaction_ref + invoice_number from CheckoutPage (or InvoicePreviewPage) via route state.
 * Wording distinguishes between "WhatsApp opened" (click-to-chat) and "order completed".
 */
import { useNavigate, useLocation } from 'react-router-dom'
import AdminLayout from '../layouts/AdminLayout'
import './SuccessPage.css'

export default function SuccessPage() {
  const navigate  = useNavigate()
  const location  = useLocation()

  const {
    transaction_ref = '',
    invoice_number  = '',
    payment_method  = '',
    total           = 0,
    whatsapp_opened = false,
  } = location.state || {}

  const timeStr = new Date().toLocaleTimeString('en-IN', {
    hour:   '2-digit',
    minute: '2-digit',
    hour12: true,
  })

  return (
    <AdminLayout
      searchPlaceholder="Process completed..."
      pageTitle="Success"
      pageIcon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>}
    >
      <div className="success-outer-wrap">
        <div className="success-card">

          {/* Success icon */}
          <div className="success-icon-container">
            <span className="success-check-mark">✓</span>
          </div>

          {/* Message */}
          <h1 className="success-heading">
            {whatsapp_opened ? 'WhatsApp message prepared' : 'Order completed!'}
          </h1>
          <p className="success-description">
            {whatsapp_opened
              ? 'The WhatsApp message was opened with the customer\'s bill. Please confirm it was sent.'
              : 'The order has been marked as completed and the table has been released.'}
          </p>

          {/* Details grid */}
          <div className="success-details-grid">
            {transaction_ref && (
              <div className="success-detail-card">
                <div className="success-detail-lbl">Transaction Ref</div>
                <div className="success-detail-val">#{transaction_ref}</div>
              </div>
            )}
            {invoice_number && (
              <div className="success-detail-card">
                <div className="success-detail-lbl">Invoice</div>
                <div className="success-detail-val">{invoice_number}</div>
              </div>
            )}
            {payment_method && (
              <div className="success-detail-card">
                <div className="success-detail-lbl">Payment Method</div>
                <div className="success-detail-val" style={{ textTransform: 'capitalize' }}>
                  {payment_method}
                </div>
              </div>
            )}
            {total > 0 && (
              <div className="success-detail-card">
                <div className="success-detail-lbl">Amount</div>
                <div className="success-detail-val">
                  ₹{Number(total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>
            )}
            <div className="success-detail-card">
              <div className="success-detail-lbl">Time</div>
              <div className="success-detail-val">{timeStr}</div>
            </div>
          </div>

          {/* Actions */}
          <div className="success-action-buttons">
            <button
              type="button"
              className="btn-primary py-3 w-full success-cta-btn"
              onClick={() => navigate('/tables')}
            >
              + New Order
            </button>
            <button
              type="button"
              className="btn-outline py-3 w-full success-dashboard-btn"
              onClick={() => navigate('/dashboard')}
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
