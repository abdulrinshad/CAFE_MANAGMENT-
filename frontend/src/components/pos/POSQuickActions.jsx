import React from 'react'

export default function POSQuickActions({ onAction }) {
  return (
    <div className="quick-actions" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <h2 className="quick-actions__title" style={{ fontFamily: 'var(--font-serif)', fontSize: '16px', fontWeight: '600', color: 'var(--color-espresso)', marginBottom: '4px' }}>
        Quick Actions
      </h2>
      <button
        className="qa-btn qa-btn--dark"
        onClick={() => onAction('new-order')}
      >
        <span className="qa-btn__icon">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </span>
        New Order
        <span className="qa-btn__chevron">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
        </span>
      </button>

      <button
        className="qa-btn qa-btn--outline"
        onClick={() => onAction('bill-requests')}
      >
        View Bill Requests
        <span className="qa-btn__chevron">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
        </span>
      </button>

      <button
        className="qa-btn qa-btn--outline"
        onClick={() => onAction('active-orders')}
      >
        View Active Orders
        <span className="qa-btn__chevron">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
        </span>
      </button>

      <button
        className="qa-btn qa-btn--outline"
        onClick={() => onAction('transactions')}
      >
        View Transactions
        <span className="qa-btn__chevron">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
        </span>
      </button>
    </div>
  )
}
