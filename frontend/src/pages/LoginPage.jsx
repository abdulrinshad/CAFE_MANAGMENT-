import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { authApi } from '../api'
import './LoginPage.css'

export default function LoginPage() {
  const navigate = useNavigate()
  const { login, loginWaiter, loginBranchManager } = useApp()

  // 'admin' | 'waiter' | 'branch_manager' | 'cashier'
  const [loginMode, setLoginMode] = useState('admin')

  // ── Admin credentials ──────────────────────────────────────────────────────
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  // ── Waiter PIN credentials ─────────────────────────────────────────────────
  const [waiters,            setWaiters]           = useState([])
  const [waitersLoading,     setWaitersLoading]    = useState(true)
  const [waitersError,       setWaitersError]      = useState('')
  const [selectedWaiter,     setSelectedWaiter]    = useState(null)
  const [pin,                setPin]               = useState('')
  const [pinError,           setPinError]          = useState('')
  const [waiterLoginLoading, setWaiterLoginLoading] = useState(false)

  // ── Branch Manager credentials ─────────────────────────────────────────────
  const [bmId,      setBmId]      = useState('')
  const [bmPin,     setBmPin]     = useState('')
  const [bmError,   setBmError]   = useState('')
  const [bmLoading, setBmLoading] = useState(false)

  // ── Cashier / POS credentials ──────────────────────────────────────────────
  const [cashierEmail,    setCashierEmail]    = useState('')
  const [cashierPassword, setCashierPassword] = useState('')
  const [cashierError,    setCashierError]    = useState('')
  const [cashierLoading,  setCashierLoading]  = useState(false)

  // Load waiters when waiter tab is active
  useEffect(() => {
    async function loadWaiters() {
      try {
        setWaitersLoading(true)
        const data = await authApi.getWaiters()
        setWaiters(data)
        if (data.length > 0) setSelectedWaiter(data[0])
      } catch (err) {
        console.error(err)
        setWaitersError('Unable to connect to the server. Please try again.')
      } finally {
        setWaitersLoading(false)
      }
    }
    if (loginMode === 'waiter') loadWaiters()
  }, [loginMode])

  // Clear errors when switching tabs
  const switchMode = (mode) => {
    setLoginMode(mode)
    setError('')
    setPinError('')
    setBmError('')
    setCashierError('')
    setPin('')
    setBmId('')
    setBmPin('')
    setCashierEmail('')
    setCashierPassword('')
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
  const handleWaiterLogin = async () => {
    if (!selectedWaiter) return
    setWaiterLoginLoading(true)
    setPinError('')
    try {
      await loginWaiter(selectedWaiter.id, pin)
      navigate('/dashboard')
    } catch (err) {
      console.error(err)
      setPinError(err.message || 'Incorrect PIN. Please try again.')
      setPin('')
    } finally {
      setWaiterLoginLoading(false)
    }
  }

  const handleKeyPress = (num) => {
    setPinError('')
    if (pin.length < 4) setPin(prev => prev + num)
  }
  const handleBackspace = () => setPin(prev => prev.slice(0, -1))
  const handleClear = () => { setPin(''); setPinError('') }

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

  // ── Cashier / POS login ────────────────────────────────────────────────────
  const handleCashierLogin = async (e) => {
    e.preventDefault()
    if (!cashierEmail.trim() || !cashierPassword.trim()) { setCashierError('Please enter both email/username and password.'); return }
    setCashierError('')
    setCashierLoading(true)
    try {
      try { localStorage.removeItem('artisan_waiter') } catch {}
      const user = await login(cashierEmail.trim(), cashierPassword.trim())
      navigate('/pos/dashboard')
    } catch (err) {
      console.error(err)
      setCashierError(err.message || 'Invalid cashier credentials.')
    } finally {
      setCashierLoading(false)
    }
  }

  const subtitleMap = {
    admin:          'Admin Portal',
    waiter:         'Waiter PIN Login',
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
          <div className="waiter-login-wrap">
            <div className="waiter-profiles">
              {waitersLoading && (
                <div style={{ color: '#fff', textAlign: 'center', width: '100%', padding: '1rem' }}>
                  Loading waiters...
                </div>
              )}
              {waitersError && (
                <div style={{ color: '#ff4d4d', textAlign: 'center', width: '100%', padding: '1rem' }}>
                  {waitersError}
                </div>
              )}
              {!waitersLoading && !waitersError && waiters.length === 0 && (
                <div style={{ color: '#aaa', textAlign: 'center', width: '100%', padding: '1rem' }}>
                  No active waiters are currently available.
                </div>
              )}
              {!waitersLoading && !waitersError && waiters.map(w => (
                <button
                  key={w.id}
                  className={`waiter-profile-item ${selectedWaiter?.id === w.id ? 'active' : ''}`}
                  onClick={() => { setSelectedWaiter(w); setPin(''); setPinError('') }}
                >
                  <span className="waiter-profile-avatar">
                    {w.photo
                      ? <img src={w.photo} alt={w.name} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                      : '👤'}
                  </span>
                  <span className="waiter-profile-name">{w.name}</span>
                  <span className="waiter-profile-station">{w.section}</span>
                </button>
              ))}
            </div>

            <div className="pin-display">
              {[0, 1, 2, 3].map(i => (
                <div key={i} className={`pin-dot ${pin.length > i ? 'filled' : ''}`} />
              ))}
            </div>

            {pinError && <div className="pin-error-msg">{pinError}</div>}

            <div className="pin-keypad">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                <button key={num} type="button" className="keypad-btn" onClick={() => handleKeyPress(num.toString())} disabled={waiterLoginLoading}>
                  {num}
                </button>
              ))}
              <button type="button" className="keypad-btn keypad-btn--clear" onClick={handleClear} disabled={waiterLoginLoading}>Clear</button>
              <button type="button" className="keypad-btn" onClick={() => handleKeyPress('0')} disabled={waiterLoginLoading}>0</button>
              <button type="button" className="keypad-btn keypad-btn--del" onClick={handleBackspace} disabled={waiterLoginLoading}>⌫</button>
            </div>

            <button
              type="button"
              className="login-form__submit waiter-submit-btn"
              onClick={handleWaiterLogin}
              disabled={waiterLoginLoading || pin.length !== 4}
            >
              {waiterLoginLoading ? 'Verifying PIN...' : 'Access Waiter Terminal'}
              <span className="login-form__submit-arrow">→</span>
            </button>
          </div>
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

        {/* ── Cashier / POS form ── */}
        {loginMode === 'cashier' && (
          <form className="login-card__form" onSubmit={handleCashierLogin} id="cashier-login-form">
            <div className="login-form__field">
              <label className="login-form__label" htmlFor="cashier-email">Email / Username</label>
              <input
                id="cashier-email"
                type="text"
                className="login-form__input"
                placeholder="cashier@artisanbrew.com"
                value={cashierEmail}
                onChange={e => setCashierEmail(e.target.value)}
                autoComplete="username"
              />
            </div>
            <div className="login-form__field">
              <label className="login-form__label" htmlFor="cashier-password">Password</label>
              <input
                id="cashier-password"
                type="password"
                className="login-form__input"
                placeholder="••••••••"
                value={cashierPassword}
                onChange={e => setCashierPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            {cashierError && <div className="pin-error-msg" style={{ marginBottom: '1rem', textAlign: 'center' }}>{cashierError}</div>}
            <button type="submit" className="login-form__submit" id="btn-cashier-login" disabled={cashierLoading}>
              {cashierLoading ? 'Signing into POS...' : 'Login to POS'}
              <span className="login-form__submit-arrow">→</span>
            </button>
          </form>
        )}

        <p className="login-card__secure">Secure access for authorized personnel only.</p>
      </div>
    </div>
  )
}
