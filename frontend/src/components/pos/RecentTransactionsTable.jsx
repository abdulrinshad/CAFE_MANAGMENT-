import React from 'react'

export default function RecentTransactionsTable({ transactions, onInvoiceClick }) {
  return (
    <div className="table-wrap">
      <table className="orders-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
        <thead>
          <tr>
            <th style={{ padding: '10px 16px', background: 'var(--color-bg)', fontSize: '11px', fontWeight: '500', color: 'var(--color-text-muted)', textAlign: 'left', letterSpacing: '0.04em' }}>Invoice</th>
            <th style={{ padding: '10px 16px', background: 'var(--color-bg)', fontSize: '11px', fontWeight: '500', color: 'var(--color-text-muted)', textAlign: 'left', letterSpacing: '0.04em' }}>Table / Order</th>
            <th style={{ padding: '10px 16px', background: 'var(--color-bg)', fontSize: '11px', fontWeight: '500', color: 'var(--color-text-muted)', textAlign: 'left', letterSpacing: '0.04em' }}>Payment Method</th>
            <th style={{ padding: '10px 16px', background: 'var(--color-bg)', fontSize: '11px', fontWeight: '500', color: 'var(--color-text-muted)', textAlign: 'left', letterSpacing: '0.04em' }}>Amount</th>
            <th style={{ padding: '10px 16px', background: 'var(--color-bg)', fontSize: '11px', fontWeight: '500', color: 'var(--color-text-muted)', textAlign: 'left', letterSpacing: '0.04em' }}>Status</th>
            <th style={{ padding: '10px 16px', background: 'var(--color-bg)', fontSize: '11px', fontWeight: '500', color: 'var(--color-text-muted)', textAlign: 'left', letterSpacing: '0.04em' }}>Time</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((tx) => (
            <tr
              key={tx.invoice}
              onClick={() => onInvoiceClick && onInvoiceClick(tx)}
              style={{ cursor: 'pointer', transition: 'background var(--transition)' }}
              className="table-row-hover"
            >
              <td style={{ padding: '12px 16px', borderTop: '1px solid var(--color-border-light)', fontWeight: '500' }}>{tx.invoice}</td>
              <td style={{ padding: '12px 16px', borderTop: '1px solid var(--color-border-light)', color: 'var(--color-text-secondary)' }}>{tx.target}</td>
              <td style={{ padding: '12px 16px', borderTop: '1px solid var(--color-border-light)' }}>
                <span style={{
                  fontSize: '11px',
                  fontWeight: '600',
                  color: 'var(--color-text-secondary)',
                  background: 'var(--color-cream)',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  border: '1px solid var(--color-border)'
                }}>
                  {tx.method}
                </span>
              </td>
              <td style={{ padding: '12px 16px', borderTop: '1px solid var(--color-border-light)', fontWeight: '600', color: 'var(--color-espresso)' }}>₹{tx.amount}</td>
              <td style={{ padding: '12px 16px', borderTop: '1px solid var(--color-border-light)' }}>
                <span className="badge badge--completed" style={{ background: 'rgba(74,124,89,0.12)', color: 'var(--color-green)' }}>
                  {tx.status}
                </span>
              </td>
              <td style={{ padding: '12px 16px', borderTop: '1px solid var(--color-border-light)', color: 'var(--color-text-muted)' }}>{tx.time}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
