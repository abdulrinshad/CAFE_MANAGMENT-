import { useApp } from '../context/AppContext'
import AdminLayout from '../layouts/AdminLayout'
import './UserSettingsPage.css'

export default function UserSettingsPage() {
  const { currentUser, currentRole, currentWaiter, currentCashier } = useApp()

  const displayName = currentCashier?.name || currentWaiter?.name || currentUser?.name || currentUser?.username || 'Employee'
  const employeeId = currentCashier?.employee_id || currentWaiter?.employee_id || '—'
  const branchName = currentCashier?.branch_name || currentWaiter?.branch_name || currentUser?.branch?.name || 'Main Branch'
  const roleDisplay = currentRole ? currentRole.toUpperCase() : 'EMPLOYEE'

  return (
    <AdminLayout
      pageTitle="Account Settings"
      pageIcon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>}
      searchPlaceholder="Search settings..."
    >
      <div className="user-settings-container">
        <div className="user-settings-header">
          <h1 className="user-settings-title">My Profile</h1>
          <p className="user-settings-sub">Manage your personal account preferences and view your station details.</p>
        </div>

        <div className="user-settings-card">
          <div className="profile-hero">
            <div className="profile-hero-avatar">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="profile-hero-details">
              <h2 className="profile-hero-name">{displayName}</h2>
              <span className="profile-hero-role-badge">{roleDisplay}</span>
            </div>
          </div>

          <hr className="user-settings-divider" />

          <div className="profile-details-grid">
            <div className="detail-item">
              <span className="detail-label">Employee ID</span>
              <span className="detail-value">{employeeId}</span>
            </div>

            <div className="detail-item">
              <span className="detail-label">Assigned Branch</span>
              <span className="detail-value">{branchName}</span>
            </div>

            {currentRole === 'cashier' && currentCashier?.terminal && (
              <div className="detail-item">
                <span className="detail-label">Active POS Terminal</span>
                <span className="detail-value">{currentCashier.terminal.name}</span>
              </div>
            )}

            {currentRole === 'waiter' && currentWaiter?.section && (
              <div className="detail-item">
                <span className="detail-label">Assigned Section</span>
                <span className="detail-value">{currentWaiter.section}</span>
              </div>
            )}
          </div>
        </div>

        <div className="user-settings-card">
          <h2 className="settings-card-title">Security & Credentials</h2>
          <p className="settings-card-subtitle" style={{ color: 'var(--color-text-muted, #7c7c7c)', fontSize: '13px', margin: '0 0 16px 0' }}>
            To change your secure login PIN or credentials, please contact your branch manager or administrator.
          </p>
          <div className="detail-item">
            <span className="detail-label">PIN Authentication Status</span>
            <span className="detail-value" style={{ color: '#16a34a', fontWeight: 'bold' }}>✓ Secured</span>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
