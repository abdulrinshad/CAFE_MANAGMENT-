import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import './LoginPage.css'

const WAITERS = [
  { id: 'priya', name: 'Priya', avatar: '👩‍🍳', station: 'Station 2 - Patio', pin: '1234' },
  { id: 'rahul', name: 'Rahul', avatar: '👨‍🍳', station: 'Station 1 - Indoor', pin: '4321' },
  { id: 'amit', name: 'Amit', avatar: '🧑‍🍳', station: 'Station 3 - Lounge', pin: '1111' },
  { id: 'sarah', name: 'Sarah Jenkins', avatar: '👩‍💼', station: 'Station 4 - Terrace', pin: '2222' },
]

export default function LoginPage() {
  const navigate = useNavigate()
  const { setCurrentRole, setCurrentWaiter } = useApp()
  
  const [loginMode, setLoginMode] = useState('admin') // 'admin' | 'waiter'
  
  // Admin credentials
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  
  // Waiter PIN credentials
  const [selectedWaiter, setSelectedWaiter] = useState(WAITERS[0])
  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState('')

  const handleAdminLogin = (e) => {
    e.preventDefault()
    // Clear any leftover waiter session
    try { localStorage.removeItem('artisan_waiter') } catch {}
    setCurrentRole('admin')
    setCurrentWaiter(null)
    navigate('/dashboard')
  }

  const handleWaiterLogin = () => {
    if (pin === selectedWaiter.pin) {
      setCurrentRole('waiter')
      setCurrentWaiter(selectedWaiter)
      setPinError('')
      navigate('/dashboard')
    } else {
      setPinError('Incorrect PIN. Please try again.')
      setPin('')
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

            <button type="submit" className="login-form__submit" id="btn-login">
              Login
              <span className="login-form__submit-arrow">→</span>
            </button>
          </form>
        ) : (
          /* Waiter PIN Mode */
          <div className="waiter-login-wrap">
            {/* Profiles */}
            <div className="waiter-profiles">
              {WAITERS.map((w) => (
                <button
                  key={w.id}
                  className={`waiter-profile-item ${selectedWaiter.id === w.id ? 'active' : ''}`}
                  onClick={() => { setSelectedWaiter(w); setPin(''); setPinError(''); }}
                >
                  <span className="waiter-profile-avatar">{w.avatar}</span>
                  <span className="waiter-profile-name">{w.name}</span>
                  <span className="waiter-profile-station">{w.station.split(' - ')[1]}</span>
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
                >
                  {num}
                </button>
              ))}
              <button type="button" className="keypad-btn keypad-btn--clear" onClick={handleClear}>
                Clear
              </button>
              <button
                type="button"
                className="keypad-btn"
                onClick={() => handleKeyPress('0')}
              >
                0
              </button>
              <button type="button" className="keypad-btn keypad-btn--del" onClick={handleBackspace}>
                ⌫
              </button>
            </div>

            {/* Submit */}
            <button
              type="button"
              className="login-form__submit waiter-submit-btn"
              onClick={handleWaiterLogin}
              disabled={pin.length < 4}
            >
              Login as {selectedWaiter.name}
              <span className="login-form__submit-arrow">→</span>
            </button>
          </div>
        )}

        <p className="login-card__secure">Secure access for authorized personnel only.</p>
      </div>
    </div>
  )
}
