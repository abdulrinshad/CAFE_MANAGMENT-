import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { authApi } from '../api'
import './LoginPage.css'

export default function LoginPage() {
  const navigate = useNavigate()
  const { login, loginWaiter } = useApp()
  
  const [loginMode, setLoginMode] = useState('admin') // 'admin' | 'waiter'
  
  // Admin credentials
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  
  // Waiter PIN credentials
  const [waiters, setWaiters] = useState([])
  const [waitersLoading, setWaitersLoading] = useState(true)
  const [waitersError, setWaitersError] = useState('')
  const [selectedWaiter, setSelectedWaiter] = useState(null)
  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState('')
  const [waiterLoginLoading, setWaiterLoginLoading] = useState(false)

  useEffect(() => {
    async function loadWaiters() {
      try {
        setWaitersLoading(true)
        const data = await authApi.getWaiters()
        setWaiters(data)
        if (data.length > 0) {
          setSelectedWaiter(data[0])
        }
      } catch (err) {
        console.error(err)
        setWaitersError('Unable to connect to the server. Please try again.')
      } finally {
        setWaitersLoading(false)
      }
    }
    if (loginMode === 'waiter') {
      loadWaiters()
    }
  }, [loginMode])

  const handleAdminLogin = async (e) => {
    e.preventDefault()
    if (!email || !password) {
      setError('Please enter both email and password.')
      return
    }
    setError('')
    setLoading(true)
    try {
      // Clear any leftover waiter session
      try { localStorage.removeItem('artisan_waiter') } catch {}
      const user = await login(email, password)
      
      // Redirect based on role
      if (user.role === 'ADMIN' || user.role === 'MANAGER' || user.role === 'STAFF') {
        navigate('/dashboard')
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
    if (pin.length < 4) {
      setPin(prev => prev + num)
    }
  }

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1))
  }

  const handleClear = () => {
    setPin('')
    setPinError('')
  }

  return (
    <div className="login-bg">
      <div className="login-card">
        {/* Toggle between Admin and Waiter */}
        <div className="login-toggle-tabs">
          <button 
            type="button" 
            className={`login-toggle-tab ${loginMode === 'admin' ? 'active' : ''}`}
            onClick={() => { setLoginMode('admin'); setPinError(''); }}
          >
            Admin Portal
          </button>
          <button 
            type="button" 
            className={`login-toggle-tab ${loginMode === 'waiter' ? 'active' : ''}`}
            onClick={() => { setLoginMode('waiter'); setPinError(''); }}
          >
            Waiter PIN Login
          </button>
        </div>

        {/* Logo */}
        <div className="login-card__logo-wrap">
          <img src="/logo.png" alt="Artisan Brew Café" className="login-card__logo" />
        </div>

        {/* Title */}
        <h1 className="login-card__title">Artisan Brew</h1>
        <p className="login-card__subtitle">
          {loginMode === 'admin' ? 'Cafe Terminal #04' : 'POS Waiter Terminal'}
        </p>

        {loginMode === 'admin' ? (
          /* Admin Form */
          <form className="login-card__form" onSubmit={handleAdminLogin} id="login-form">
            <div className="login-form__field">
              <label className="login-form__label" htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                className="login-form__input"
                placeholder="admin@artisanbrew.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>

            <div className="login-form__row">
              <label className="login-form__remember">
                <input
                  id="remember-me"
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
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

        ) : (
          /* Waiter PIN Mode */
          <div className="waiter-login-wrap">
            {/* Profiles */}
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
              {!waitersLoading && !waitersError && waiters.map((w) => (
                <button
                  key={w.id}
                  className={`waiter-profile-item ${selectedWaiter?.id === w.id ? 'active' : ''}`}
                  onClick={() => { setSelectedWaiter(w); setPin(''); setPinError(''); }}
                >
                  <span className="waiter-profile-avatar">
                    {w.photo ? (
                      <img
                        src={w.photo}
                        alt={w.name}
                        style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                      />
                    ) : (
                      '👤'
                    )}
                  </span>
                  <span className="waiter-profile-name">{w.name}</span>
                  <span className="waiter-profile-station">{w.section}</span>
                </button>
              ))}
            </div>

            {/* PIN Dots display */}
            <div className="pin-display">
              {[0, 1, 2, 3].map((index) => (
                <div 
                  key={index} 
                  className={`pin-dot ${pin.length > index ? 'filled' : ''}`}
                />
              ))}
            </div>

            {pinError && <div className="pin-error-msg">{pinError}</div>}

            {/* Keypad */}
            <div className="pin-keypad">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button
                  key={num}
                  type="button"
                  className="keypad-btn"
                  onClick={() => handleKeyPress(num.toString())}
                  disabled={waiterLoginLoading}
                >
                  {num}
                </button>
              ))}
              <button type="button" className="keypad-btn keypad-btn--clear" onClick={handleClear} disabled={waiterLoginLoading}>
                Clear
              </button>
              <button
                type="button"
                className="keypad-btn"
                onClick={() => handleKeyPress('0')}
                disabled={waiterLoginLoading}
              >
                0
              </button>
              <button type="button" className="keypad-btn keypad-btn--del" onClick={handleBackspace} disabled={waiterLoginLoading}>
                ⌫
              </button>
            </div>

            {/* Submit */}
            <button
              type="button"
              className="login-form__submit waiter-submit-btn"
              onClick={handleWaiterLogin}
              disabled={pin.length < 4 || waiterLoginLoading}
            >
              {waiterLoginLoading ? 'Verifying PIN...' : `Login as ${selectedWaiter?.name || ''}`}
              <span className="login-form__submit-arrow">→</span>
            </button>
          </div>

        )}

        <p className="login-card__secure">Secure access for authorized personnel only.</p>
      </div>
    </div>
  )
}
