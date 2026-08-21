import React from 'react'

export default function PendingBillRequestCard({ req, onOpenBill }) {
  return (
    <div 
      className="waiter-request-card new" 
      style={{ 
        background: 'var(--color-white)',
        border: '1px solid var(--color-border)',
        borderLeft: '4px solid var(--color-red)',
        borderRadius: '12px',
        padding: '16px 18px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.01)'
      }}
    >
      <div className="waiter-request-card__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="request-table-badge" style={{
          fontSize: '12px',
          fontWeight: '600',
          color: 'var(--color-espresso)',
          background: 'var(--color-cream)',
          padding: '2px 8px',
          borderRadius: '4px',
          border: '1px solid var(--color-border)'
        }}>Table {req.table}</span>
        <span className="request-time" style={{ fontSize: '11px', color: 'var(--color-text-light)' }}>{req.requestedAt}</span>
      </div>

      <div className="waiter-request-card__body" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Order: {req.orderId}</span>
          <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Waiter: {req.waiter}</span>
        </div>
        <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '4px', fontStyle: 'italic' }}>
          {req.items}
        </p>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', borderTop: '1px dashed var(--color-border-light)', paddingTop: '8px' }}>
          <span style={{ fontSize: '11px', fontWeight: '500', color: 'var(--color-orange)' }}>{req.status}</span>
          <span style={{ fontSize: '15px', fontWeight: '700', color: 'var(--color-espresso)' }}>₹{req.amount}</span>
        </div>
      </div>

      <div className="waiter-request-card__actions" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
        <button 
          className="btn-primary btn-sm" 
          onClick={() => onOpenBill(req)}
          style={{
            padding: '6px 14px',
            fontSize: '12px',
            borderRadius: '6px'
          }}
        >
          Open Bill
        </button>
      </div>
    </div>
  )
}
