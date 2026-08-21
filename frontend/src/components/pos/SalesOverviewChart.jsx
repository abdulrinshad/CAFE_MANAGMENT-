import React, { useState } from 'react'
import { salesTrends } from '../../data/posMockData'

export default function SalesOverviewChart() {
  const [period, setPeriod] = useState('weekly') // 'today', 'weekly', 'monthly'

  const data = salesTrends[period] || []
  const values = data.map((d) => d.value)
  const max = Math.max(...values, 1)
  const yMax = Math.ceil(max / 1000) * 1000 || 5000
  const yLabels = [yMax, Math.round(yMax * 0.65), Math.round(yMax * 0.3), 0]

  return (
    <div className="chart-card">
      <div className="chart-card__header">
        <h2 className="chart-card__title">Sales Overview</h2>
        <select 
          className="chart-card__period-select"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          style={{
            fontSize: '12px',
            color: 'var(--color-text-secondary)',
            background: 'var(--color-cream)',
            border: '1px solid var(--color-border)',
            borderRadius: '20px',
            padding: '4px 24px 4px 12px',
            outline: 'none',
            cursor: 'pointer',
            fontFamily: 'var(--font-sans)',
            appearance: 'none',
            backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%236b5a4e' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")",
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 10px center'
          }}
        >
          <option value="today">Today</option>
          <option value="weekly">This Week</option>
          <option value="monthly">This Month</option>
        </select>
      </div>

      <div className="chart" style={{ display: 'flex', gap: '8px', height: '200px', marginTop: '16px' }}>
        <div className="chart__y-axis" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', paddingBottom: '22px', flexShrink: 0 }}>
          {yLabels.map((v) => (
            <span key={v} className="chart__y-label" style={{ fontSize: '10px', color: 'var(--color-text-light)', textAlign: 'right', lineHeight: '1' }}>
              {v === 0 ? '0' : `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
            </span>
          ))}
        </div>
        <div className="chart__bars-wrap" style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column' }}>
          <div className="chart__grid" style={{ position: 'absolute', inset: 0, bottom: '22px' }}>
            {yLabels.slice(0, -1).map((v) => (
              <div key={v} className="chart__grid-line" style={{ position: 'absolute', left: 0, right: 0, height: '1px', background: 'var(--color-border-light)', bottom: `${(v / yMax) * 100}%` }} />
            ))}
          </div>
          <div className="chart__bars" style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: '8px', paddingBottom: '22px', zIndex: 1 }}>
            {data.map((d, i) => (
              <div key={d.label || i} className="chart__bar-col" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', gap: '6px', height: '100%' }}>
                <div
                  className={`chart__bar ${i === data.length - 1 ? 'chart__bar--active' : ''}`}
                  style={{ 
                    height: `${Math.max((d.value / yMax) * 100, d.value > 0 ? 2 : 0)}%`,
                    width: '100%',
                    maxWidth: '36px',
                    borderRadius: '4px 4px 0 0',
                    background: i === data.length - 1 ? 'var(--color-espresso)' : 'var(--color-cream-dark)',
                    transition: 'background 0.2s',
                    minHeight: '4px',
                    cursor: 'pointer'
                  }}
                  title={`${d.label}: ₹${Number(d.value).toLocaleString('en-IN')}`}
                />
                <span className="chart__bar-label" style={{ fontSize: '10px', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>{d.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
