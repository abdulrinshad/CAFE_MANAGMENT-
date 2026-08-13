import { useNavigate } from 'react-router-dom'
import AdminLayout from '../layouts/AdminLayout'
import './SuccessPage.css'

export default function SuccessPage() {
  const navigate = useNavigate()

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
          <div className="success-action-buttons">
            <button
              type="button"
              className="btn-primary py-3 w-full success-cta-btn"
              onClick={() => navigate('/tables')}
            >
              New Order
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
