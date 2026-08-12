import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './LoginPage.css'

export default function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [remember, setRemember]   = useState(false)

  const handleLogin = (e) => {
    e.preventDefault()
    navigate('/dashboard')
  }

  return (
    <div className="login-bg">
      <div className="login-card">
        {/* Logo */}
        <div className="login-card__logo-wrap">
          <img src="/logo.png" alt="Artisan Brew Café" className="login-card__logo" />
        </div>

        {/* Title */}
        <h1 className="login-card__title">Artisan Brew</h1>
        <p className="login-card__subtitle">Admin Portal</p>

        {/* Form */}
        <form className="login-card__form" onSubmit={handleLogin} id="login-form">
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

        <p className="login-card__secure">Secure access for authorized personnel only.</p>
      </div>
    </div>
  )
}
