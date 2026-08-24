import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { authApi } from '../api'
import './LoginPage.css'

export default function LoginPage() {
  const navigate = useNavigate()
  const { login, loginWaiter, loginBranchManager, loginEmployee } = useApp()

  // 'admin' | 'waiter' | 'branch_manager' | 'cashier'
  const [loginMode, setLoginMode] = useState('admin')

  // ── Admin credentials ──────────────────────────────────────────────────────
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  // ── Waiter PIN credentials ─────────────────────────────────────────────────
  const [waiterEmpId,        setWaiterEmpId]       = useState('')
  const [pin,                setPin]               = useState('')
  const [pinError,           setPinError]          = useState('')
  const [waiterLoginLoading, setWaiterLoginLoading] = useState(false)

  // ── Branch Manager credentials ─────────────────────────────────────────────
  const [bmId,      setBmId]      = useState('')
  const [bmPin,     setBmPin]     = useState('')
  const [bmError,   setBmError]   = useState('')
  const [bmLoading, setBmLoading] = useState(false)

  // ── Cashier / POS credentials (Employee ID + PIN) ───────────────────────────
  const [cashierEmpId,  setCashierEmpId]  = useState('')
  const [cashierPin,    setCashierPin]    = useState('')
  const [cashierError,  setCashierError]  = useState('')
  const [cashierLoading,setCashierLoading]= useState(false)

  // Clear errors when switching tabs
  const switchMode = (mode) => {
    setLoginMode(mode)
    setError('')
    setPinError('')
    setBmError('')
    setCashierError('')
    setWaiterEmpId('')
    setPin('')
    setBmId('')
    setBmPin('')
    setCashierEmpId('')
    setCashierPin('')
  }

  // ── Admin login ────────────────────────────────────────────────────────────
  const handleAdminLogin = async (e) => {
    e.preventDefault()
    if (!email || !password) { setError('Please enter both email and password.'); return }
    setError('')
    setLoading(true)
    try {
      try { localStorage.removeItem('artisan_waiter') } catch {}
      const user = await login(email, password)
      if (user.role === 'ADMIN' || user.role === 'MANAGER' || user.role === 'STAFF') {
        navigate('/dashboard')
      } else if (user.role === 'CASHIER' || user.role === 'POS') {
        navigate('/pos/dashboard')
      } else {
        setError('Unauthorized role.')
      }

    } catch (err) {
      console.error(err)
      setError(err.message || 'Invalid email or password.')
    } finally {
      setLoading(false)
    }
  }

  // ── Waiter PIN login ───────────────────────────────────────────────────────
  const handleWaiterLogin = async (e) => {
    if (e) e.preventDefault()
    if (!waiterEmpId.trim()) { setPinError('Please enter your Employee ID.'); return }
    if (!pin.trim())         { setPinError('Please enter your PIN.'); return }
    setWaiterLoginLoading(true)
    setPinError('')
    try {
      const res = await loginEmployee(waiterEmpId.trim(), pin.trim())
      if (res.role === 'waiter') {
        navigate('/dashboard')
      } else {
        setPinError('Unauthorized role. Not a registered Waiter.')
      }
    } catch (err) {
      console.error(err)
      setPinError(err.message || 'Incorrect PIN. Please try again.')
      setPin('')
    } finally {
      setWaiterLoginLoading(false)
    }
  }

  // ── Branch Manager login ───────────────────────────────────────────────────
  const handleBranchManagerLogin = async (e) => {
    e.preventDefault()
    if (!bmId.trim() || !bmPin.trim()) { setBmError('Please enter both Manager ID and PIN.'); return }
    setBmError('')
    setBmLoading(true)
    try {
      await loginBranchManager(bmId.trim(), bmPin.trim())
      navigate('/branch/dashboard')
    } catch (err) {
      console.error(err)
      setBmError(err.message || 'Invalid Manager ID or PIN.')
    } finally {
      setBmLoading(false)
    }
  }

  // ── Cashier / POS Employee ID + PIN login ─────────────────────────────
  const handleCashierLogin = async (e) => {
    e.preventDefault()
    if (!cashierEmpId.trim()) { setCashierError('Please enter your Employee ID.'); return }
    if (!cashierPin.trim())   { setCashierError('Please enter your PIN.'); return }
    setCashierError('')
    setCashierLoading(true)
    try {
      const res = await loginEmployee(cashierEmpId.trim(), cashierPin.trim())
      if (res.role === 'cashier') {
        navigate('/cashier/dashboard')
      } else {
        // Waiter logged in via cashier tab — redirect to waiter dashboard
        navigate('/dashboard')
      }
    } catch (err) {
      console.error(err)
      setCashierError(err.message || 'Invalid Employee ID or PIN.')
    } finally {
      setCashierLoading(false)
    }
  }

  const subtitleMap = {
    admin:          'Admin Portal',
    waiter:         'Waiter Access',
    branch_manager: 'Branch Manager Portal',
    cashier:        'Cashier & POS Desk',
  }

  return (
    <div className="login-bg">
      <div className="login-card">

        {/* ── Tab bar (4 tabs) ── */}
        <div className="login-toggle-tabs">
          <button
            type="button"
            className={`login-toggle-tab ${loginMode === 'admin' ? 'active' : ''}`}
            onClick={() => switchMode('admin')}
            id="tab-admin"
          >
            Admin
          </button>
          <button
            type="button"
            className={`login-toggle-tab ${loginMode === 'waiter' ? 'active' : ''}`}
            onClick={() => switchMode('waiter')}
            id="tab-waiter"
          >
            Waiter
          </button>
          <button
            type="button"
            className={`login-toggle-tab ${loginMode === 'branch_manager' ? 'active' : ''}`}
            onClick={() => switchMode('branch_manager')}
            id="tab-branch-manager"
          >
            Manager
          </button>
          <button
            type="button"
            className={`login-toggle-tab ${loginMode === 'cashier' ? 'active' : ''}`}
            onClick={() => switchMode('cashier')}
            id="tab-cashier"
          >
            Cashier / POS
          </button>
        </div>

        {/* Logo */}
        <div className="login-card__logo-wrap">
          <img src="/logo.png" alt="Artisan Brew Café" className="login-card__logo" />
        </div>

        {/* Title */}
        <h1 className="login-card__title">Artisan Brew</h1>
        <p className="login-card__subtitle">{subtitleMap[loginMode]}</p>

        {/* ── Admin form ── */}
        {loginMode === 'admin' && (
          <form className="login-card__form" onSubmit={handleAdminLogin} id="login-form">
            <div className="login-form__field">
              <label className="login-form__label" htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                className="login-form__input"
                placeholder="admin@artisanbrew.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
            <div className="login-form__field">
              <label className="login-form__label" htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                className="login-form__input"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            <div className="login-form__row">
              <label className="login-form__remember">
                <input
                  id="remember-me"
                  type="checkbox"
                  checked={remember}
                  onChange={e => setRemember(e.target.checked)}
                  className="login-form__checkbox"
                />
                <span>Remember me</span>
              </label>
              <button type="button" className="login-form__forgot" id="btn-forgot-password">
                Forgot password?
              </button>
            </div>
            {error && <div className="pin-error-msg" style={{ marginBottom: '1rem', textAlign: 'center' }}>{error}</div>}
            <button type="submit" className="login-form__submit" id="btn-login" disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
              <span className="login-form__submit-arrow">→</span>
            </button>
          </form>
        )}

        {/* ── Waiter PIN form ── */}
        {loginMode === 'waiter' && (
          <form className="login-card__form" onSubmit={handleWaiterLogin} id="waiter-login-form">
            <div className="login-form__field">
              <label className="login-form__label" htmlFor="waiter-emp-id">Employee ID</label>
              <input
                id="waiter-emp-id"
                type="text"
                className="login-form__input"
                placeholder="e.g. EMP-001"
                value={waiterEmpId}
                onChange={e => setWaiterEmpId(e.target.value)}
                autoComplete="username"
              />
            </div>
            <div className="login-form__field">
              <label className="login-form__label" htmlFor="waiter-pin-input">4-Digit PIN</label>
              <input
                id="waiter-pin-input"
                type="password"
                className="login-form__input"
                placeholder="••••"
                maxLength={4}
                value={pin}
                onChange={e => setPin(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            {pinError && <div className="pin-error-msg" style={{ marginBottom: '1rem', textAlign: 'center' }}>{pinError}</div>}
            <button type="submit" className="login-form__submit" id="btn-waiter-login" disabled={waiterLoginLoading}>
              {waiterLoginLoading ? 'Verifying...' : 'Login as Waiter →'}
            </button>
          </form>
        )}

        {/* ── Branch Manager form ── */}
        {loginMode === 'branch_manager' && (
          <form className="login-card__form" onSubmit={handleBranchManagerLogin} id="bm-login-form">
            <div className="login-form__field">
              <label className="login-form__label" htmlFor="bm-manager-id">Manager ID</label>
              <input
                id="bm-manager-id"
                type="text"
                className="login-form__input"
                placeholder="e.g. MGR-001"
                value={bmId}
                onChange={e => setBmId(e.target.value)}
                autoComplete="username"
              />
            </div>
            <div className="login-form__field">
              <label className="login-form__label" htmlFor="bm-pin">PIN / Password</label>
              <input
                id="bm-pin"
                type="password"
                className="login-form__input"
                placeholder="••••••••"
                value={bmPin}
                onChange={e => setBmPin(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            {bmError && <div className="pin-error-msg" style={{ marginBottom: '1rem', textAlign: 'center' }}>{bmError}</div>}
            <button type="submit" className="login-form__submit" id="btn-bm-login" disabled={bmLoading}>
              {bmLoading ? 'Logging in...' : 'Login as Branch Manager'}
              <span className="login-form__submit-arrow">→</span>
            </button>
          </form>
        )}

        {/* ── Cashier / POS form (Employee ID + PIN) ── */}
        {loginMode === 'cashier' && (
          <form className="login-card__form" onSubmit={handleCashierLogin} id="cashier-login-form">
            <div className="login-form__field">
              <label className="login-form__label" htmlFor="cashier-emp-id">Employee ID</label>
              <input
                id="cashier-emp-id"
                type="text"
                className="login-form__input"
                placeholder="e.g. EMP-001"
                value={cashierEmpId}
                onChange={e => setCashierEmpId(e.target.value)}
                autoComplete="username"
              />
            </div>
            <div className="login-form__field">
              <label className="login-form__label" htmlFor="cashier-pin-input">4-Digit PIN</label>
              <input
                id="cashier-pin-input"
                type="password"
                className="login-form__input"
                placeholder="••••"
                maxLength={4}
                value={cashierPin}
                onChange={e => setCashierPin(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            {cashierError && <div className="pin-error-msg" style={{ marginBottom: '1rem', textAlign: 'center' }}>{cashierError}</div>}
            <button type="submit" className="login-form__submit" id="btn-cashier-login" disabled={cashierLoading}>
              {cashierLoading ? 'Verifying...' : 'Login to POS'}
              <span className="login-form__submit-arrow">→</span>
            </button>
          </form>
        )}

        <p className="login-card__secure">Secure access for authorized personnel only.</p>
      </div>
    </div>
  )
}
