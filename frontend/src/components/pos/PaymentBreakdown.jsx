import React from 'react'

export default function PaymentBreakdown({ data }) {
  const getMethodColor = (method) => {
    switch (method.toUpperCase()) {
      case 'UPI':
        return 'var(--color-green)'
      case 'CASH':
        return 'var(--color-tan-dark)'
      case 'CARD':
        return 'var(--color-brown-light)'
      default:
        return 'var(--color-text-secondary)'
    }
  }

  return (
    <div className="best-sellers" style={{ padding: '18px' }}>
      <h2 className="best-sellers__title" style={{ fontFamily: 'var(--font-serif)', fontSize: '16px', fontWeight: '600', color: 'var(--color-espresso)', marginBottom: '14px' }}>
        Payment Breakdown
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {data.map((item) => {
          const color = getMethodColor(item.method)
          return (
            <div key={item.method} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ fontWeight: '600', color: 'var(--color-text-secondary)', letterSpacing: '0.03em' }}>{item.method}</span>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{ fontWeight: '700', color: 'var(--color-espresso)' }}>₹{item.amount.toLocaleString('en-IN')}</span>
                  <span style={{ color: 'var(--color-text-light)', fontSize: '11px' }}>({item.percentage}%)</span>
                </div>
              </div>
              <div style={{ height: '8px', background: 'var(--color-cream)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${item.percentage}%`, background: color, borderRadius: '4px' }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
