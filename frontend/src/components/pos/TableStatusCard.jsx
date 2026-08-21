import React from 'react'

export default function TableStatusCard({ tables, onTableClick }) {
  const getStatusColor = (status) => {
    switch (status) {
      case 'Available':
        return { bg: 'rgba(74, 124, 89, 0.1)', text: 'var(--color-green)', dot: '#4a7c59' }
      case 'Occupied':
        return { bg: 'rgba(74, 44, 26, 0.08)', text: 'var(--color-espresso)', dot: '#4a2c1a' }
      case 'Order in Progress':
        return { bg: 'rgba(212, 165, 116, 0.15)', text: 'var(--color-tan-dark)', dot: '#b8935a' }
      case 'Bill Requested':
        return { bg: 'rgba(192, 57, 43, 0.1)', text: 'var(--color-red)', dot: '#c0392b' }
      case 'Payment Pending':
        return { bg: 'rgba(212, 96, 26, 0.12)', text: 'var(--color-orange)', dot: '#d4601a' }
      default:
        return { bg: 'rgba(0,0,0,0.05)', text: '#777', dot: '#777' }
    }
  }

  return (
    <div className="table-status-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '10px' }}>
      {tables.map((t) => {
        const colors = getStatusColor(t.status)
        return (
          <div
            key={t.table}
            onClick={() => onTableClick && onTableClick(t)}
            style={{
              background: 'var(--color-white)',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              padding: '12px',
              cursor: 'pointer',
              transition: 'transform var(--transition), border-color var(--transition)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: '75px'
            }}
            className="table-item-hover"
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: 'var(--font-serif)', fontSize: '15px', fontWeight: '700', color: 'var(--color-espresso)' }}>
                {t.table}
              </span>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: colors.dot }} />
            </div>
            
            <div style={{ marginTop: '8px' }}>
              <span style={{
                fontSize: '10px',
                fontWeight: '600',
                textTransform: 'uppercase',
                padding: '2px 6px',
                borderRadius: '4px',
                backgroundColor: colors.bg,
                color: colors.text,
                letterSpacing: '0.02em',
                display: 'inline-block'
              }}>
                {t.status}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
