import React from 'react'

export default function POSStatCard({ label, value, sub, trend, variant = 'default', dot = false }) {
  if (variant === 'dark') {
    return (
      <div className="stat-tables">
        {dot && <div className="stat-tables__dot" />}
        <div className="stat-tables__label">{label}</div>
        <div className="stat-tables__value">{value}</div>
        {sub && <div className="stat-tables__sub">{sub}</div>}
        <div className="stat-tables__watermark">{value}</div>
      </div>
    )
  }

  if (variant === 'sales') {
    return (
      <div className="stat-sales">
        <div className="stat-sales__label">{label}</div>
        <div className="stat-sales__row">
          <span className="stat-sales__value">{value}</span>
          {trend && (
            <span className="stat-sales__badge">
              {trend}
            </span>
          )}
        </div>
        {sub && <div className="stat-sales__sub">{sub}</div>}
        <div className="stat-sales__icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
            <polyline points="17 6 23 6 23 12"/>
          </svg>
        </div>
      </div>
    )
  }

  return (
    <div className="stat-card">
      <div className="stat-card__label">{label}</div>
      <div className="stat-card__value">{value}</div>
      {sub && <div className="stat-card__sub">{sub}</div>}
    </div>
  )
}
