import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import PasswordInput from '../components/PasswordInput'
import './LoginPage.css'

/**
 * BranchManagerLoginPage
 *
 * Standalone login page for Branch Managers.
 * Uses manager_id + PIN credential pair.
 * On success, redirects to /branch-manager/dashboard.
 * Has zero access to any Admin/Owner functionality.
 */
export default function BranchManagerLoginPage() {
  const navigate = useNavigate()
  const { loginBranchManager } = useApp()

  const [managerId, setManagerId] = useState('')
  const [pin,       setPin]       = useState('')
  const [error,     setError]     = useState('')
  const [loading,   setLoading]   = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!managerId.trim() || !pin.trim()) {
      setError('Please enter both Manager ID and PIN.')
      return
    }
    setError('')
    setLoading(true)
    try {
      await loginBranchManager(managerId.trim(), pin.trim())
      navigate('/branch/dashboard')
    } catch (err) {
      setError(err.message || 'Invalid Manager ID or PIN.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-bg">
      <div className="login-card">
        {/* Logo */}
        <div className="login-card__logo-wrap">
          <img src="/logo.png" alt="Artisan Brew Café" className="login-card__logo" />
        </div>

        <h1 className="login-card__title">Artisan Brew</h1>
        <p className="login-card__subtitle">Branch Manager Portal</p>

        <form className="login-card__form" onSubmit={handleSubmit} id="bm-login-form">
          <div className="login-form__field">
            <label className="login-form__label" htmlFor="bm-manager-id">Manager ID</label>
            <input
              id="bm-manager-id"
              type="text"
              className="login-form__input"
              placeholder="e.g. MGR-001"
              value={managerId}
              onChange={e => setManagerId(e.target.value)}
              autoComplete="username"
            />
          </div>

          <div className="login-form__field">
            <label className="login-form__label" htmlFor="bm-pin">PIN / Password</label>
            <PasswordInput
              id="bm-pin"
              className="login-form__input"
              placeholder="••••••••"
              value={pin}
              onChange={e => setPin(e.target.value)}
              autoComplete="current-password"
              title="PIN"
            />
          </div>

          {error && (
            <div className="pin-error-msg" style={{ marginBottom: '1rem', textAlign: 'center' }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            className="login-form__submit"
            id="btn-bm-login"
            disabled={loading}
          >
            {loading ? 'Logging in…' : 'Login'}
            <span className="login-form__submit-arrow">→</span>
          </button>
        </form>

        <p className="login-card__secure">Branch Manager access only. This portal is restricted to authorized managers.</p>
      </div>
    </div>
  )
}
