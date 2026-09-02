import React, { useState } from 'react'

export default function PasswordInput({
  value = '',
  onChange,
  placeholder = '',
  id,
  name,
  className = 'form-input',
  style = {},
  required = false,
  disabled = false,
  autoComplete,
  maxLength,
  pattern,
  title = 'Password',
  isPin = false,
  ...props
}) {
  const [showPassword, setShowPassword] = useState(false)

  const handleToggle = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setShowPassword(prev => !prev)
  }

  const handleChange = (e) => {
    if (isPin) {
      // Filter out non-numeric characters for PIN fields if isPin prop is active
      const val = e.target.value.replace(/\D/g, '')
      e.target.value = val
    }
    if (onChange) {
      onChange(e)
    }
  }

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
      <input
        type={showPassword ? 'text' : 'password'}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        id={id}
        name={name}
        className={className}
        style={{ paddingRight: '40px', ...style }}
        required={required}
        disabled={disabled}
        autoComplete={autoComplete}
        maxLength={maxLength}
        pattern={pattern}
        {...props}
      />
      <button
        type="button"
        onClick={handleToggle}
        title={showPassword ? `Hide ${title}` : `Show ${title}`}
        aria-label={showPassword ? `Hide ${title}` : `Show ${title}`}
        tabIndex={0}
        style={{
          position: 'absolute',
          right: '10px',
          top: '50%',
          transform: 'translateY(-50%)',
          background: 'none',
          border: 'none',
          padding: '4px',
          margin: 0,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: showPassword ? 'var(--color-espresso, #2c1810)' : '#8c7b70',
          borderRadius: '4px',
          outline: 'none',
          transition: 'color 0.2s ease',
          zIndex: 2,
        }}
      >
        {showPassword ? (
          /* Eye Off Icon (Visible state -> click to hide) */
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
            <line x1="1" y1="1" x2="23" y2="23"></line>
          </svg>
        ) : (
          /* Eye Icon (Hidden state -> click to reveal) */
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
        )}
      </button>
    </div>
  )
}
