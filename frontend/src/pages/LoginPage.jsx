import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { authApi } from '../api'
import PasswordInput from '../components/PasswordInput'
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
  const [signupData, setSignupData] = useState({ full_name: '', email: '', phone_number: '', password: '', confirm_password: '', business_code: '' })
  const [signupOTP, setSignupOTP] = useState('')
  const [signupError, setSignupError] = useState('')
  const [signupFieldErrors, setSignupFieldErrors] = useState({})
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
    setSignupFieldErrors({})
    setSignupSuccess('')
    if (!signupData.full_name || !signupData.email || !signupData.phone_number || !signupData.password || !signupData.confirm_password) {
      setSignupError('All fields are required.')
      return
    }
    if (!/^\d{10}$/.test(signupData.phone_number.trim())) {
      setSignupError('Phone number must contain exactly 10 digits.')
      return
    }
    if (signupData.password.length < 8) {
      setSignupError('Password must be at least 8 characters long.')
      return
    }
    if (signupData.password !== signupData.confirm_password) {
      setSignupError('Passwords do not match.')
      return
    }
    setSignupLoading(true)
    try {
      const res = await authApi.adminSignup({
        full_name: signupData.full_name,
        email: signupData.email,
        phone_number: signupData.phone_number,
        password: signupData.password,
        confirm_password: signupData.confirm_password,
        business_code: signupData.business_code,
      })
      setSignupStep('otp')
      if (res && res.note) {
        setSignupSuccess(`${res.message || 'Signup successful.'} (${res.note})`)
      } else {
        setSignupSuccess(res?.message || 'OTP sent to your email.')
      }
    } catch (err) {
      if (err.data && typeof err.data === 'object' && !Array.isArray(err.data)) {
        // DRF validation errors are usually arrays of strings per field
        const formattedErrors = {}
        for (const [key, value] of Object.entries(err.data)) {
          formattedErrors[key] = Array.isArray(value) ? value[0] : value
        }
        setSignupFieldErrors(formattedErrors)
      } else {
        setSignupError(err.message || 'Signup failed.')
      }
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
      setSignupData({ full_name: '', email: '', phone_number: '', password: '', confirm_password: '', business_code: '' })
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
      setForgotBizSuccess('Verification code sent to your email.')
    } catch (err) {
      setForgotBizError(err.message || 'Failed to send OTP.')
    } finally {
      setForgotBizLoading(false)
    }
  }

  const handleForgotBizVerifyOTP = async (e) => {
    e.preventDefault()
    if (!forgotBizOTP) { setForgotBizError('Please enter the OTP.'); return }
    setForgotBizError('')
    setForgotBizSuccess('')
    setForgotBizLoading(true)
    try {
      const res = await authApi.verifyBusinessCodeOTP({ email: forgotBizEmail, otp: forgotBizOTP })
      setNewBizCode(res.business_code)
      setForgotBizStep('done')
      setForgotBizSuccess('Business Code retrieved successfully!')
    } catch (err) {
      setForgotBizError(err.message || 'Invalid or expired OTP.')
    } finally {
      setForgotBizLoading(false)
    }
  }

  const handleForgotBizResendOTP = async () => {
    setForgotBizError('')
    setForgotBizSuccess('')
    setForgotBizLoading(true)
    try {
      await authApi.resendBusinessCodeOTP({ email: forgotBizEmail })
      setForgotBizSuccess('New verification code sent to your email.')
    } catch (err) {
      setForgotBizError(err.message || 'Failed to resend OTP.')
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
            {forgotSuccess && <div className="success-msg">{forgotSuccess}</div>}
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
              <PasswordInput
                id="password"
                className="login-form__input"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                title="Password"
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
              <div className="login-form__forgot-links">
                <button type="button" className="login-form__forgot" id="btn-forgot-password" onClick={() => setForgotStep('email')}>
                  Forgot password?
                </button>
                <button type="button" className="login-form__forgot" onClick={() => setForgotBizStep('email')}>
                  Forgot Code?
                </button>
              </div>
            </div>
            {error && <div className="pin-error-msg">{error}</div>}
            <button type="submit" className="login-form__submit" id="btn-login" disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
              <span className="login-form__submit-arrow">→</span>
            </button>
            <div style={{ textAlign: 'center', marginTop: '12px' }}>
              <button type="button" className="login-card__secondary-link" onClick={() => setSignupStep('form')}>
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
              {signupFieldErrors.full_name && <div className="pin-error-msg" style={{marginTop: '4px', fontSize: '0.85rem'}}>{signupFieldErrors.full_name}</div>}
            </div>
            <div className="login-form__field">
              <label className="login-form__label">Email</label>
              <input type="email" className="login-form__input" placeholder="john@example.com" value={signupData.email} onChange={e => setSignupData({ ...signupData, email: e.target.value })} />
              {signupFieldErrors.email && <div className="pin-error-msg" style={{marginTop: '4px', fontSize: '0.85rem'}}>{signupFieldErrors.email}</div>}
            </div>
            <div className="login-form__field">
              <label className="login-form__label">Phone Number</label>
              <input type="text" className="login-form__input" placeholder="1234567890" value={signupData.phone_number} onChange={e => setSignupData({ ...signupData, phone_number: e.target.value })} />
              {signupFieldErrors.phone_number && <div className="pin-error-msg" style={{marginTop: '4px', fontSize: '0.85rem'}}>{signupFieldErrors.phone_number}</div>}
            </div>
            <div className="login-form__field">
              <label className="login-form__label">Password</label>
              <PasswordInput className="login-form__input" placeholder="••••••••" value={signupData.password} onChange={e => setSignupData({ ...signupData, password: e.target.value })} title="Password" />
              {signupFieldErrors.password && <div className="pin-error-msg" style={{marginTop: '4px', fontSize: '0.85rem'}}>{signupFieldErrors.password}</div>}
            </div>
            <div className="login-form__field">
              <label className="login-form__label">Confirm Password</label>
              <PasswordInput className="login-form__input" placeholder="••••••••" value={signupData.confirm_password} onChange={e => setSignupData({ ...signupData, confirm_password: e.target.value })} title="Confirm Password" />
              {signupFieldErrors.confirm_password && <div className="pin-error-msg" style={{marginTop: '4px', fontSize: '0.85rem'}}>{signupFieldErrors.confirm_password}</div>}
            </div>
            <div className="login-form__field">
              <label className="login-form__label">Business Code / Secret PIN (Optional)</label>
              <input type="text" className="login-form__input" placeholder="Leave blank to auto-generate" value={signupData.business_code} onChange={e => setSignupData({ ...signupData, business_code: e.target.value })} />
              {signupFieldErrors.business_code && <div className="pin-error-msg" style={{marginTop: '4px', fontSize: '0.85rem'}}>{signupFieldErrors.business_code}</div>}
            </div>
            {signupError && <div className="pin-error-msg">{signupError}</div>}
            <button type="submit" className="login-form__submit" disabled={signupLoading}>{signupLoading ? 'Creating Account...' : 'Sign Up'}</button>
            <div style={{ textAlign: 'center', marginTop: '12px' }}>
              <button type="button" className="login-card__secondary-link" onClick={() => setSignupStep('none')}>Already have an account? Log In</button>
            </div>
          </form>
        )}

        {loginMode === 'admin' && signupStep === 'otp' && (
          <form className="login-card__form" onSubmit={handleSignupOTPVerify}>
            {signupSuccess && <div className="success-msg">{signupSuccess}</div>}
            <div className="login-form__field">
              <label className="login-form__label">Enter OTP</label>
              <input type="text" className="login-form__input" placeholder="123456" value={signupOTP} onChange={e => setSignupOTP(e.target.value)} />
            </div>
            {signupError && <div className="pin-error-msg">{signupError}</div>}
            <button type="submit" className="login-form__submit" disabled={signupLoading}>{signupLoading ? 'Verifying...' : 'Verify OTP'}</button>
            <div style={{ textAlign: 'center', marginTop: '12px' }}>
              <button type="button" className="login-card__secondary-link" onClick={handleSignupResendOTP} disabled={signupLoading}>Resend OTP</button>
            </div>
          </form>
        )}

        {/* ── Forgot Password ── */}
        {loginMode === 'admin' && forgotStep === 'email' && (
          <form className="login-card__form" onSubmit={handleForgotSendOTP}>
            <div className="login-form__field">
              <label className="login-form__label">Enter your Email</label>
              <input type="email" className="login-form__input" placeholder="admin@artisanbrew.com" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} />
            </div>
            {forgotError && <div className="pin-error-msg">{forgotError}</div>}
            <button type="submit" className="login-form__submit" disabled={forgotLoading}>{forgotLoading ? 'Sending...' : 'Send OTP'}</button>
            <div style={{ textAlign: 'center', marginTop: '12px' }}>
              <button type="button" className="login-card__secondary-link" onClick={() => setForgotStep('none')}>Back to Login</button>
            </div>
          </form>
        )}

        {loginMode === 'admin' && forgotStep === 'otp' && (
          <form className="login-card__form" onSubmit={handleForgotVerifyOTP}>
            {forgotSuccess && <div className="success-msg">{forgotSuccess}</div>}
            <div className="login-form__field">
              <label className="login-form__label">Enter OTP</label>
              <input type="text" className="login-form__input" placeholder="123456" value={forgotOTP} onChange={e => setForgotOTP(e.target.value)} />
            </div>
            {forgotError && <div className="pin-error-msg">{forgotError}</div>}
            <button type="submit" className="login-form__submit" disabled={forgotLoading}>{forgotLoading ? 'Verifying...' : 'Verify OTP'}</button>
            <div style={{ textAlign: 'center', marginTop: '12px' }}>
              <button type="button" className="login-card__secondary-link" onClick={() => setForgotStep('none')}>Cancel</button>
            </div>
          </form>
        )}

        {loginMode === 'admin' && forgotStep === 'reset' && (
          <form className="login-card__form" onSubmit={handleForgotResetPassword}>
            <div className="login-form__field">
              <label className="login-form__label">New Password</label>
              <PasswordInput className="login-form__input" placeholder="••••••••" value={forgotNewPassword} onChange={e => setForgotNewPassword(e.target.value)} title="New Password" />
            </div>
            <div className="login-form__field">
              <label className="login-form__label">Confirm Password</label>
              <PasswordInput className="login-form__input" placeholder="••••••••" value={forgotConfirmPassword} onChange={e => setForgotConfirmPassword(e.target.value)} title="Confirm Password" />
            </div>
            {forgotError && <div className="pin-error-msg">{forgotError}</div>}
            <button type="submit" className="login-form__submit" disabled={forgotLoading}>{forgotLoading ? 'Resetting...' : 'Reset Password'}</button>
          </form>
        )}

        {/* ── Forgot Business Code ── */}
        {loginMode === 'admin' && forgotBizStep === 'email' && (
          <form className="login-card__form" onSubmit={handleForgotBizSendOTP}>
            <div className="login-form__field">
              <label className="login-form__label">Enter Admin Registered Email</label>
              <input type="email" className="login-form__input" placeholder="admin@example.com" value={forgotBizEmail} onChange={e => setForgotBizEmail(e.target.value)} />
            </div>
            {forgotBizError && <div className="pin-error-msg">{forgotBizError}</div>}
            <button type="submit" className="login-form__submit" disabled={forgotBizLoading}>{forgotBizLoading ? 'Sending...' : 'Send OTP'}</button>
            <div style={{ textAlign: 'center', marginTop: '12px' }}>
              <button type="button" className="login-card__secondary-link" onClick={() => setForgotBizStep('none')}>Back to Login</button>
            </div>
          </form>
        )}

        {loginMode === 'admin' && forgotBizStep === 'otp' && (
          <form className="login-card__form" onSubmit={handleForgotBizVerifyOTP}>
            {forgotBizSuccess && <div className="success-msg">{forgotBizSuccess}</div>}
            <div className="login-form__field">
              <label className="login-form__label">Enter Verification OTP</label>
              <input type="text" className="login-form__input" placeholder="123456" value={forgotBizOTP} onChange={e => setForgotBizOTP(e.target.value)} />
            </div>
            {forgotBizError && <div className="pin-error-msg">{forgotBizError}</div>}
            <button type="submit" className="login-form__submit" disabled={forgotBizLoading}>{forgotBizLoading ? 'Verifying...' : 'Verify OTP & Recover Code'}</button>
            <div style={{ textAlign: 'center', marginTop: '12px', display: 'flex', justifyContent: 'space-between' }}>
              <button type="button" className="login-card__secondary-link" onClick={handleForgotBizResendOTP} disabled={forgotBizLoading}>Resend OTP</button>
              <button type="button" className="login-card__secondary-link" onClick={() => setForgotBizStep('none')}>Cancel</button>
            </div>
          </form>
        )}

        {loginMode === 'admin' && forgotBizStep === 'done' && (
          <div className="login-card__form" style={{ textAlign: 'center' }}>
            <div className="success-msg">Business Code Recovered</div>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: '8px', fontSize: '13px' }}>Your Business Code is:</p>
            <div className="biz-code-display">
              {newBizCode}
            </div>
            <button type="button" className="login-form__submit" onClick={() => { setForgotBizStep('none'); setBusinessCode(newBizCode) }}>
              Back to Login
            </button>
          </div>
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
              <PasswordInput
                id="waiter-pin-input"
                className="login-form__input"
                placeholder="••••"
                maxLength={4}
                value={pin}
                onChange={e => setPin(e.target.value)}
                autoComplete="current-password"
                title="PIN"
                isPin
              />
            </div>
            {pinError && <div className="pin-error-msg">{pinError}</div>}
            <button type="submit" className="login-form__submit" id="btn-waiter-login" disabled={waiterLoginLoading}>
              {waiterLoginLoading ? 'Verifying...' : 'Login as Waiter'}
              <span className="login-form__submit-arrow">→</span>
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
              <PasswordInput
                id="bm-pin"
                className="login-form__input"
                placeholder="••••••••"
                value={bmPin}
                onChange={e => setBmPin(e.target.value)}
                autoComplete="current-password"
                title="PIN"
              />
            </div>
            {bmError && <div className="pin-error-msg">{bmError}</div>}
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
              <PasswordInput
                id="cashier-pin-input"
                className="login-form__input"
                placeholder="••••"
                maxLength={4}
                value={cashierPin}
                onChange={e => setCashierPin(e.target.value)}
                autoComplete="current-password"
                title="PIN"
                isPin
              />
            </div>
            {cashierError && <div className="pin-error-msg">{cashierError}</div>}
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
