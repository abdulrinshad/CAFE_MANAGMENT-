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
  const [businessCode, setBusinessCode] = useState('')
  const [branchCode, setBranchCode] = useState('')

  // ── Admin credentials ──────────────────────────────────────────────────────
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  // ── Admin Signup State ──────────────────────────────────────────────────────
  const [signupStep, setSignupStep] = useState('none') // 'none' | 'form' | 'otp'
  const [signupData, setSignupData] = useState({ full_name: '', email: '', phone: '', password: '', confirm_password: '', business_code: '' })
  const [signupOTP, setSignupOTP] = useState('')
  const [signupError, setSignupError] = useState('')
  const [signupSuccess, setSignupSuccess] = useState('')
  const [signupLoading, setSignupLoading] = useState(false)

  // ── Forgot Password State ──────────────────────────────────────────────────
  const [forgotStep, setForgotStep] = useState('none') // 'none' | 'email' | 'otp' | 'reset'
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotOTP, setForgotOTP] = useState('')
  const [forgotNewPassword, setForgotNewPassword] = useState('')
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('')
  const [forgotError, setForgotError] = useState('')
  const [forgotSuccess, setForgotSuccess] = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)

  // ── Forgot Business Code State ───────────────────────────────────────────────
  const [forgotBizStep, setForgotBizStep] = useState('none') // 'none' | 'email' | 'otp' | 'done'
  const [forgotBizEmail, setForgotBizEmail] = useState('')
  const [forgotBizOTP, setForgotBizOTP] = useState('')
  const [forgotBizError, setForgotBizError] = useState('')
  const [forgotBizSuccess, setForgotBizSuccess] = useState('')
  const [forgotBizLoading, setForgotBizLoading] = useState(false)
  const [newBizCode, setNewBizCode] = useState('')


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


  // ── Admin Signup Handlers ─────────────────────────────────────────────────
  const handleSignupSubmit = async (e) => {
    e.preventDefault()
    setSignupError('')
    setSignupSuccess('')
    if (!signupData.full_name || !signupData.email || !signupData.password || !signupData.confirm_password) {
      setSignupError('All fields are required.')
      return
    }
    setSignupLoading(true)
    try {
      await authApi.adminSignup(signupData)
      setSignupStep('otp')
      setSignupSuccess('OTP sent to your email.')
    } catch (err) {
      setSignupError(err.message || 'Signup failed.')
    } finally {
      setSignupLoading(false)
    }
  }

  const handleSignupOTPVerify = async (e) => {
    e.preventDefault()
    setSignupError('')
    if (!signupOTP) {
      setSignupError('Please enter the OTP.')
      return
    }
    setSignupLoading(true)
    try {
      await authApi.adminVerifySignupOTP({ email: signupData.email, otp: signupOTP, business_code: signupData.business_code })
      setSignupStep('none')
      setForgotSuccess('Signup successful! You can now log in.')
      setSignupData({ full_name: '', email: '', phone: '', password: '', confirm_password: '', business_code: '' })
      setSignupOTP('')
    } catch (err) {
      setSignupError(err.message || 'Invalid OTP.')
    } finally {
      setSignupLoading(false)
    }
  }
  
  const handleSignupResendOTP = async () => {
    setSignupError('')
    setSignupSuccess('')
    setSignupLoading(true)
    try {
      await authApi.adminResendSignupOTP({ email: signupData.email })
      setSignupSuccess('OTP resent successfully.')
    } catch (err) {
      setSignupError(err.message || 'Failed to resend OTP.')
    } finally {
      setSignupLoading(false)
    }
  }

  // ── Forgot Password Handlers ───────────────────────────────────────────────
  const handleForgotSendOTP = async (e) => {
    e.preventDefault()
    if (!forgotEmail) { setForgotError('Please enter your email.'); return }
    setForgotError('')
    setForgotSuccess('')
    setForgotLoading(true)
    try {
      await authApi.adminForgotPassword({ email: forgotEmail })
      setForgotStep('otp')
      setForgotSuccess('OTP sent to your email.')
    } catch (err) {
      setForgotError(err.message || 'Failed to send OTP.')
    } finally {
      setForgotLoading(false)
    }
  }

  const handleForgotVerifyOTP = async (e) => {
    e.preventDefault()
    if (!forgotOTP) { setForgotError('Please enter the OTP.'); return }
    setForgotError('')
    setForgotSuccess('')
    setForgotLoading(true)
    try {
      await authApi.adminVerifyOTP({ email: forgotEmail, otp: forgotOTP })
      setForgotStep('reset')
    } catch (err) {
      setForgotError(err.message || 'Invalid OTP.')
    } finally {
      setForgotLoading(false)
    }
  }

  const handleForgotResetPassword = async (e) => {
    e.preventDefault()
    if (!forgotNewPassword || !forgotConfirmPassword) {
      setForgotError('Please fill both password fields.')
      return
    }
    if (forgotNewPassword !== forgotConfirmPassword) {
      setForgotError('Passwords do not match.')
      return
    }
    setForgotError('')
    setForgotSuccess('')
    setForgotLoading(true)
    try {
      await authApi.adminResetPassword({
        email: forgotEmail,
        otp: forgotOTP,
        new_password: forgotNewPassword,
        confirm_password: forgotConfirmPassword
      })
      setForgotSuccess('Password reset successfully! You can now log in.')
      setForgotStep('none')
      setForgotEmail('')
      setForgotOTP('')
      setForgotNewPassword('')
      setForgotConfirmPassword('')
    } catch (err) {
      setForgotError(err.message || 'Failed to reset password.')
    } finally {
      setForgotLoading(false)
    }
  }

  const handleForgotBizSendOTP = async (e) => {
    e.preventDefault()
    if (!forgotBizEmail) { setForgotBizError('Please enter your admin email.'); return }
    setForgotBizError('')
    setForgotBizSuccess('')
    setForgotBizLoading(true)
    try {
      await authApi.forgotBusinessCode({ email: forgotBizEmail })
      setForgotBizStep('otp')
      setForgotBizSuccess('OTP sent to your email.')
    } catch (err) {
      setForgotBizError(err.message || 'Failed to send OTP.')
    } finally {
      setForgotBizLoading(false)
    }
  }

  const handleForgotBizRegenerate = async (e) => {
    e.preventDefault()
    if (!forgotBizOTP) { setForgotBizError('Please enter the OTP.'); return }
    setForgotBizError('')
    setForgotBizLoading(true)
    try {
      const res = await authApi.regenerateBusinessCode({ email: forgotBizEmail, otp: forgotBizOTP })
      setNewBizCode(res.business_code)
      setForgotBizStep('done')
      setForgotBizSuccess('Business Code regenerated successfully!')
    } catch (err) {
      setForgotBizError(err.message || 'Invalid OTP.')
    } finally {
      setForgotBizLoading(false)
    }
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
    if (!businessCode.trim()) { setPinError('Please enter the Business Code.'); return }
    if (!branchCode.trim()) { setPinError('Please enter the Branch Code.'); return }
    if (!waiterEmpId.trim()) { setPinError('Please enter your Employee ID.'); return }
    if (!pin.trim())         { setPinError('Please enter your PIN.'); return }
    setWaiterLoginLoading(true)
    setPinError('')
    try {
      const res = await loginWaiter(businessCode.trim(), branchCode.trim(), waiterEmpId.trim(), pin.trim())
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
    if (!businessCode.trim()) { setBmError('Please enter the Business Code.'); return }
    if (!branchCode.trim()) { setBmError('Please enter the Branch Code.'); return }
    if (!bmId.trim() || !bmPin.trim()) { setBmError('Please enter both Manager ID and PIN.'); return }
    setBmError('')
    setBmLoading(true)
    try {
      await loginBranchManager(businessCode.trim(), branchCode.trim(), bmId.trim(), bmPin.trim())
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
    if (!businessCode.trim()) { setCashierError('Please enter the Business Code.'); return }
    if (!branchCode.trim()) { setCashierError('Please enter the Branch Code.'); return }
    if (!cashierEmpId.trim()) { setCashierError('Please enter your Employee ID.'); return }
    if (!cashierPin.trim())   { setCashierError('Please enter your PIN.'); return }
    setCashierError('')
    setCashierLoading(true)
    try {
      const res = await loginEmployee(businessCode.trim(), branchCode.trim(), cashierEmpId.trim(), cashierPin.trim())
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
        {loginMode === 'admin' && signupStep === 'none' && forgotStep === 'none' && forgotBizStep === 'none' && (
          <form className="login-card__form" onSubmit={handleAdminLogin} id="login-form">
            {forgotSuccess && <div className="success-msg" style={{ marginBottom: '1rem', textAlign: 'center', color: 'green' }}>{forgotSuccess}</div>}
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
              <button type="button" className="login-form__forgot" id="btn-forgot-password" onClick={() => setForgotStep('email')}>
                Forgot password?
              </button>
              <button type="button" className="login-form__forgot" onClick={() => setForgotBizStep('email')}>
                Forgot Business Code?
              </button>
            </div>
            {error && <div className="pin-error-msg" style={{ marginBottom: '1rem', textAlign: 'center', color: 'red' }}>{error}</div>}
            <button type="submit" className="login-form__submit" id="btn-login" disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
              <span className="login-form__submit-arrow">→</span>
            </button>
            <div style={{ textAlign: 'center', marginTop: '1rem' }}>
              <button type="button" onClick={() => setSignupStep('form')} style={{ background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', textDecoration: 'underline' }}>
                Don't have an account? Sign Up
              </button>
            </div>
          </form>
        )}

        {/* ── Admin Signup ── */}
        {loginMode === 'admin' && signupStep === 'form' && (
          <form className="login-card__form" onSubmit={handleSignupSubmit}>
            <div className="login-form__field">
              <label className="login-form__label">Full Name</label>
              <input type="text" className="login-form__input" placeholder="John Doe" value={signupData.full_name} onChange={e => setSignupData({ ...signupData, full_name: e.target.value })} />
            </div>
            <div className="login-form__field">
              <label className="login-form__label">Email</label>
              <input type="email" className="login-form__input" placeholder="john@example.com" value={signupData.email} onChange={e => setSignupData({ ...signupData, email: e.target.value })} />
            </div>
            <div className="login-form__field">
              <label className="login-form__label">Phone Number</label>
              <input type="text" className="login-form__input" placeholder="1234567890" value={signupData.phone} onChange={e => setSignupData({ ...signupData, phone: e.target.value })} />
            </div>
            <div className="login-form__field">
              <label className="login-form__label">Password</label>
              <input type="password" className="login-form__input" placeholder="••••••••" value={signupData.password} onChange={e => setSignupData({ ...signupData, password: e.target.value })} />
            </div>
            <div className="login-form__field">
              <label className="login-form__label">Confirm Password</label>
              <input type="password" className="login-form__input" placeholder="••••••••" value={signupData.confirm_password} onChange={e => setSignupData({ ...signupData, confirm_password: e.target.value })} />
            </div>
            <div className="login-form__field">
              <label className="login-form__label">Business Code / Secret PIN (Optional)</label>
              <input type="text" className="login-form__input" placeholder="Leave blank to auto-generate" value={signupData.business_code} onChange={e => setSignupData({ ...signupData, business_code: e.target.value })} />
            </div>
            {signupError && <div className="pin-error-msg" style={{ color: 'red', textAlign: 'center' }}>{signupError}</div>}
            <button type="submit" className="login-form__submit" disabled={signupLoading}>{signupLoading ? 'Creating Account...' : 'Sign Up'}</button>
            <div style={{ textAlign: 'center', marginTop: '1rem' }}>
              <button type="button" onClick={() => setSignupStep('none')} style={{ background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', textDecoration: 'underline' }}>Already have an account? Log In</button>
            </div>
          </form>
        )}

        {loginMode === 'admin' && signupStep === 'otp' && (
          <form className="login-card__form" onSubmit={handleSignupOTPVerify}>
            {signupSuccess && <div className="success-msg" style={{ color: 'green', textAlign: 'center', marginBottom: '1rem' }}>{signupSuccess}</div>}
            <div className="login-form__field">
              <label className="login-form__label">Enter OTP</label>
              <input type="text" className="login-form__input" placeholder="123456" value={signupOTP} onChange={e => setSignupOTP(e.target.value)} />
            </div>
            {signupError && <div className="pin-error-msg" style={{ color: 'red', textAlign: 'center' }}>{signupError}</div>}
            <button type="submit" className="login-form__submit" disabled={signupLoading}>{signupLoading ? 'Verifying...' : 'Verify OTP'}</button>
            <div style={{ textAlign: 'center', marginTop: '1rem' }}>
              <button type="button" onClick={handleSignupResendOTP} disabled={signupLoading} style={{ background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', textDecoration: 'underline' }}>Resend OTP</button>
            </div>
          </form>
        )}

        {/* ── Forgot Password ── */}
        {loginMode === 'admin' && forgotStep === 'email' && (
          <form className="login-card__form" onSubmit={handleForgotSendOTP}>
            <div className="login-form__field">
              <label className="login-form__label">Enter your Email</label>
              <input type="email" className="login-form__input" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} />
            </div>
            {forgotError && <div className="pin-error-msg" style={{ color: 'red', textAlign: 'center' }}>{forgotError}</div>}
            <button type="submit" className="login-form__submit" disabled={forgotLoading}>{forgotLoading ? 'Sending...' : 'Send OTP'}</button>
            <div style={{ textAlign: 'center', marginTop: '1rem' }}>
              <button type="button" onClick={() => setForgotStep('none')} style={{ background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', textDecoration: 'underline' }}>Back to Login</button>
            </div>
          </form>
        )}

        {loginMode === 'admin' && forgotStep === 'otp' && (
          <form className="login-card__form" onSubmit={handleForgotVerifyOTP}>
            {forgotSuccess && <div className="success-msg" style={{ color: 'green', textAlign: 'center', marginBottom: '1rem' }}>{forgotSuccess}</div>}
            <div className="login-form__field">
              <label className="login-form__label">Enter OTP</label>
              <input type="text" className="login-form__input" value={forgotOTP} onChange={e => setForgotOTP(e.target.value)} />
            </div>
            {forgotError && <div className="pin-error-msg" style={{ color: 'red', textAlign: 'center' }}>{forgotError}</div>}
            <button type="submit" className="login-form__submit" disabled={forgotLoading}>{forgotLoading ? 'Verifying...' : 'Verify OTP'}</button>
            <div style={{ textAlign: 'center', marginTop: '1rem' }}>
              <button type="button" onClick={() => setForgotStep('none')} style={{ background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', textDecoration: 'underline' }}>Cancel</button>
            </div>
          </form>
        )}

        {loginMode === 'admin' && forgotStep === 'reset' && (
          <form className="login-card__form" onSubmit={handleForgotResetPassword}>
            <div className="login-form__field">
              <label className="login-form__label">New Password</label>
              <input type="password" className="login-form__input" value={forgotNewPassword} onChange={e => setForgotNewPassword(e.target.value)} />
            </div>
            <div className="login-form__field">
              <label className="login-form__label">Confirm Password</label>
              <input type="password" className="login-form__input" value={forgotConfirmPassword} onChange={e => setForgotConfirmPassword(e.target.value)} />
            </div>
            {forgotError && <div className="pin-error-msg" style={{ color: 'red', textAlign: 'center' }}>{forgotError}</div>}
            <button type="submit" className="login-form__submit" disabled={forgotLoading}>{forgotLoading ? 'Resetting...' : 'Reset Password'}</button>
          </form>
        )}

        {/* ── Waiter PIN form ── */}
        {loginMode === 'waiter' && (
          <form className="login-card__form" onSubmit={handleWaiterLogin} id="waiter-login-form">
            <div className="login-form__field">
              <label className="login-form__label">Business Code</label>
              <input
                type="text"
                className="login-form__input"
                placeholder="e.g. AB1234"
                value={businessCode}
                onChange={e => setBusinessCode(e.target.value)}
              />
            </div>
            <div className="login-form__field">
              <label className="login-form__label">Branch Code</label>
              <input
                type="text"
                className="login-form__input"
                placeholder="e.g. 001"
                value={branchCode}
                onChange={e => setBranchCode(e.target.value)}
              />
            </div>
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
              <label className="login-form__label">Business Code</label>
              <input
                type="text"
                className="login-form__input"
                placeholder="e.g. AB1234"
                value={businessCode}
                onChange={e => setBusinessCode(e.target.value)}
              />
            </div>
            <div className="login-form__field">
              <label className="login-form__label">Branch Code</label>
              <input
                type="text"
                className="login-form__input"
                placeholder="e.g. 001"
                value={branchCode}
                onChange={e => setBranchCode(e.target.value)}
              />
            </div>
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
              <label className="login-form__label">Business Code</label>
              <input
                type="text"
                className="login-form__input"
                placeholder="e.g. AB1234"
                value={businessCode}
                onChange={e => setBusinessCode(e.target.value)}
              />
            </div>
            <div className="login-form__field">
              <label className="login-form__label">Branch Code</label>
              <input
                type="text"
                className="login-form__input"
                placeholder="e.g. 001"
                value={branchCode}
                onChange={e => setBranchCode(e.target.value)}
              />
            </div>
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
