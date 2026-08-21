import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import './BranchManagerDashboardPage.css'

/**
 * BranchManagerDashboardPage
 *
 * Placeholder landing page shown immediately after a Branch Manager logs in.
 * The full Branch Manager module will be built by another developer.
 * This page intentionally contains no admin/owner functionality.
 */
export default function BranchManagerDashboardPage() {
  const { currentBranchManager, currentBranch, branchManagerLogout } = useApp()
  const navigate = useNavigate()

  const handleLogout = () => {
    branchManagerLogout()
    navigate('/branch-manager/login')
  }

  return (
    <div className="bm-page">
      <div className="bm-card">
        {/* Logo / brand mark */}
        <div className="bm-card__brand">
          <span className="bm-card__brand-icon">🏪</span>
          <span className="bm-card__brand-name">Artisan Brew</span>
        </div>

        {/* Welcome heading */}
        <div className="bm-card__welcome">
          <h1 className="bm-card__title">Welcome, Branch Manager</h1>
          <p className="bm-card__name">{currentBranchManager?.name || 'Manager'}</p>
        </div>

        {/* Branch info */}
        <div className="bm-card__branch-info">
          <div className="bm-info-row">
            <span className="bm-info-row__label">Branch</span>
            <span className="bm-info-row__value">{currentBranch?.name || '—'}</span>
          </div>
          {currentBranch?.address && (
            <div className="bm-info-row">
              <span className="bm-info-row__label">Location</span>
              <span className="bm-info-row__value">{currentBranch.address}</span>
            </div>
          )}
          <div className="bm-info-row">
            <span className="bm-info-row__label">Manager ID</span>
            <span className="bm-info-row__value bm-info-row__value--mono">{currentBranchManager?.manager_id || '—'}</span>
          </div>
          <div className="bm-info-row">
            <span className="bm-info-row__label">Status</span>
            <span className="bm-badge bm-badge--active">Active</span>
          </div>
        </div>

        {/* Placeholder notice */}
        <div className="bm-card__notice">
          <span className="bm-card__notice-icon">🚧</span>
          <p>
            The Branch Manager module is currently under development.
            The full dashboard will be available soon.
          </p>
        </div>

        {/* Logout */}
        <button
          className="bm-card__logout"
          onClick={handleLogout}
          id="btn-bm-logout"
        >
          Sign Out
        </button>
      </div>
    </div>
  )
}
