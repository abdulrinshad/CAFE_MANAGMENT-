import { useState } from 'react'
import AdminLayout from '../../layouts/AdminLayout'
import { useApp } from '../../context/AppContext'
import './owner.css'

export default function OwnerBillingPage() {
  const { orders } = useApp()
  const [search, setSearch] = useState('')

  const invoicesList = orders.map(o => ({
    id: o.invoice_number || `INV-${o.id}`,
    orderId: o.orderId || `ORD-${o.id}`,
    table: o.table || 'Takeaway',
    amount: Number(o.amount) || Number(o.total) || 0,
    status: o.status === 'COMPLETED' ? 'paid' : (o.status === 'CANCELLED' ? 'cancelled' : 'pending'),
    time: o.time || (o.created_at ? new Date(o.created_at).toLocaleDateString('en-IN') : 'Recent'),
  }))

  const filtered = invoicesList.filter(b =>
    !search || b.id.toLowerCase().includes(search.toLowerCase()) || b.orderId.toLowerCase().includes(search.toLowerCase())
  )

  const total = invoicesList.reduce((a, b) => a + b.amount, 0)
  const paid = invoicesList.filter(b => b.status === 'paid').reduce((a, b) => a + b.amount, 0)
  const pending = invoicesList.filter(b => b.status === 'pending').reduce((a, b) => a + b.amount, 0)

  return (
    <AdminLayout pageTitle="Billing" pageIcon="🧾">
      <div className="owner-page">

        {/* Header */}
        <div className="owner-page-header">
          <div className="owner-page-header__left">
            <h1 className="owner-page-header__title">Billing</h1>
            <p className="owner-page-header__sub">All billing records generated from database orders.</p>
          </div>
        </div>

        {/* KPIs */}
        <div className="owner-kpi-grid">
          <div className="owner-kpi-card">
            <div className="owner-kpi-card__label">Total Invoices</div>
            <div className="owner-kpi-card__value">{invoicesList.length}</div>
            <div className="owner-kpi-card__sub">₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2 })} value</div>
          </div>
          <div className="owner-kpi-card">
            <div className="owner-kpi-card__label">Paid Invoices</div>
            <div className="owner-kpi-card__value">₹{paid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
            <span className="owner-kpi-badge owner-kpi-badge--green">{invoicesList.filter(b => b.status === 'paid').length} paid</span>
          </div>
          <div className="owner-kpi-card">
            <div className="owner-kpi-card__label">Pending Bills</div>
            <div className="owner-kpi-card__value">₹{pending.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
            <span className="owner-kpi-badge owner-kpi-badge--orange">{invoicesList.filter(b => b.status === 'pending').length} pending</span>
          </div>
        </div>

        {/* Table */}
        <div className="owner-section-card">
          <div className="owner-section-card__header" style={{ flexWrap: 'wrap', gap: 10 }}>
            <span className="owner-section-card__title">Invoice List</span>
            <div className="owner-filter-bar">
              <input
                className="form-input"
                placeholder="Search invoice number, order..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ minWidth: 220, fontSize: 13, padding: '8px 14px' }}
                id="search-billing"
              />
            </div>
          </div>

          <div className="owner-table-wrap">
            <table className="owner-table">
              <thead>
                <tr>
                  <th>Invoice Number</th>
                  <th>Order Reference</th>
                  <th>Table</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Date / Time</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <div className="owner-empty">
                        <div className="owner-empty__icon">🧾</div>
                        <div className="owner-empty__text">No invoice records found in database</div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map(b => (
                    <tr key={b.id}>
                      <td className="td-name td-mono">{b.id}</td>
                      <td className="td-mono">{b.orderId}</td>
                      <td className="td-muted">{b.table}</td>
                      <td style={{ fontWeight: 600 }}>₹{Number(b.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td>
                        <span className={`owner-badge owner-badge--${b.status}`}>{b.status.toUpperCase()}</span>
                      </td>
                      <td className="td-muted">{b.time}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </AdminLayout>
  )
}
