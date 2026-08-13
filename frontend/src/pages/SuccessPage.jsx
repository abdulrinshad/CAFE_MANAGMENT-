import { useLocation, useNavigate } from 'react-router-dom'
import AdminLayout from '../layouts/AdminLayout'
import './SuccessPage.css'


export default function SuccessPage() {
  const navigate = useNavigate()
  const location = useLocation()

  const { transactionRef, order } = location.state || {}
  const refCode = transactionRef || order?.transaction_ref || '#AB-98274'
  const timeSentStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })

  return (
    <AdminLayout
      searchPlaceholder="Process completed..."
      pageTitle="Success"
      pageIcon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>}
    >
      <div className="success-outer-wrap">
        <div className="success-card">
          {/* Success Icon */}
          <div className="success-icon-container">
            <span className="success-check-mark">✓</span>
          </div>

          {/* Message */}
          <h1 className="success-heading">Bill sent successfully</h1>
          <p className="success-description">
            The receipt has been securely delivered to the customer via WhatsApp.
          </p>

          {/* Actions */}
          <div className="success-action-buttons" style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
            <button
              type="button"
              className="btn-primary py-3 w-full success-cta-btn"
              style={{ backgroundColor: '#2d1810', borderColor: '#2d1810', flex: 1 }}
              onClick={() => navigate('/tables')}
            >
              + New Order
            </button>
            <button
              type="button"
              className="btn-outline py-3 w-full success-dashboard-btn"
              style={{ flex: 1 }}
              onClick={() => navigate('/dashboard')}
            >
              Back to Dashboard
            </button>
          </div>

          {/* Transaction Metadata Footer */}
          <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 16, display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
            <div>
              <div style={{ color: '#6b7280', fontSize: 12, fontWeight: 500 }}>Transaction Ref</div>
              <div style={{ fontWeight: 700, color: '#1f2937' }}>{refCode}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: '#6b7280', fontSize: 12, fontWeight: 500 }}>Time sent</div>
              <div style={{ fontWeight: 600, color: '#374151' }}>{timeSentStr}</div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}

