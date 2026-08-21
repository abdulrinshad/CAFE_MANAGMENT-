import React from 'react'

export default function POSActivityFeed({ activities }) {
  const getActivityIcon = (type) => {
    switch (type) {
      case 'payment':
        return '💵'
      case 'request':
        return '🛎️'
      case 'order_complete':
        return '☕'
      case 'table_available':
        return '🪑'
      default:
        return '📝'
    }
  }

  return (
    <div className="recent-orders" style={{ padding: '18px 22px' }}>
      <h2 className="recent-orders__title" style={{ fontFamily: 'var(--font-serif)', fontSize: '17px', fontWeight: '600', color: 'var(--color-espresso)', marginBottom: '16px' }}>
        Recent Activity
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative' }}>
        {activities.map((act, index) => (
          <div key={act.id} style={{ display: 'flex', gap: '12px', position: 'relative' }}>
            {/* Timeline connector line */}
            {index !== activities.length - 1 && (
              <div style={{
                position: 'absolute',
                left: '17px',
                top: '32px',
                bottom: '-16px',
                width: '2px',
                background: 'var(--color-border-light)',
                zIndex: 0
              }} />
            )}
            
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: 'var(--color-cream)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px',
              flexShrink: 0,
              zIndex: 1,
              border: '1px solid var(--color-border)'
            }}>
              {getActivityIcon(act.type)}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--color-text-primary)' }}>
                  {act.description}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--color-text-light)' }}>
                  {act.time}
                </span>
              </div>
              {act.detail && (
                <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                  {act.detail}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
