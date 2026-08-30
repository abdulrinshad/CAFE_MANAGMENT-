import { useState, useEffect } from 'react'
import AdminLayout from '../../layouts/AdminLayout'
import { useApp } from '../../context/AppContext'
import { branchApi } from '../../api'
import './owner.css'

export default function OwnerPaymentsPage() {
  const { orders, ownerBranchFilter: branchFilter, setOwnerBranchFilter: setBranchFilter } = useApp()
  const [search,       setSearch]       = useState('')
  const [branches,     setBranches]     = useState([])

  useEffect(() => {
    branchApi.list()
      .then(data => setBranches(Array.isArray(data) ? data : (data.results ?? [])))
      .catch(() => {})
  }, [])

  // Backend already filters `orders` globally via AppContext
  const branchOrders = orders

  const paymentsList = branchOrders.map(o => ({
    id:      `PAY-${o.id}`,
    invoice: o.invoice_number || `INV-${o.id}`,
    table:   o.table || 'Takeaway',
    amount:  Number(o.amount) || Number(o.total) || 0,
    status:  o.status === 'COMPLETED' ? 'success' : (o.status === 'CANCELLED' ? 'failed' : 'pending'),
    time:    o.time || (o.created_at ? new Date(o.created_at).toLocaleDateString('en-IN') : 'Recent'),
  }))

  const filtered = paymentsList.filter(p =>
    !search || p.id.toLowerCase().includes(search.toLowerCase()) || p.invoice.toLowerCase().includes(search.toLowerCase())
  )

  const total   = filtered.reduce((a, p) => a + p.amount, 0)
  const success = filtered.filter(p => p.status === 'success').reduce((a, p) => a + p.amount, 0)

  return (
    <AdminLayout pageTitle="Payments" pageIcon="💳">
      <div className="owner-page">

        <div className="owner-page-header">
          <div className="owner-page-header__left">
            <h1 className="owner-page-header__title">Payments</h1>
            <p className="owner-page-header__sub">Payment records and totals calculated from live database orders.</p>
          </div>
        </div>

        {/* KPIs */}
        <div className="owner-kpi-grid">
          <div className="owner-kpi-card">
            <div className="owner-kpi-card__label">Total Payments</div>
            <div className="owner-kpi-card__value">₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          </div>
          <div className="owner-kpi-card">
            <div className="owner-kpi-card__label">Successful Payments</div>
            <div className="owner-kpi-card__value">₹{success.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          </div>
          <div className="owner-kpi-card">
            <div className="owner-kpi-card__label">Completed Orders</div>
            <div className="owner-kpi-card__value">{filtered.filter(p => p.status === 'success').length}</div>
          </div>
        </div>

        {/* Table */}
        <div className="owner-section-card">
          <div className="owner-section-card__header" style={{ flexWrap: 'wrap', gap: 10 }}>
            <span className="owner-section-card__title">Payment Records</span>
            <div className="owner-filter-bar">
              <input
                className="form-input"
                placeholder="Search payment ID, invoice..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ minWidth: 200, fontSize: 13, padding: '8px 14px' }}
                id="search-payments"
              />
              <select
                className="form-select"
                value={branchFilter}
                onChange={e => setBranchFilter(e.target.value)}
                style={{ fontSize: 13, padding: '8px 12px', minWidth: 150 }}
                id="filter-payments-branch"
              >
                <option value="all">All Branches</option>
                {branches.filter(b => b.active).map(b => (
                  <option key={b.id} value={String(b.id)}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="owner-table-wrap">
            <table className="owner-table">
              <thead>
                <tr>
                  <th>Payment ID</th>
                  <th>Invoice Ref</th>
                  <th>Table</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <div className="owner-empty">
                        <div className="owner-empty__icon">💳</div>
                        <div className="owner-empty__text">No payment records found in database</div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map(p => (
                    <tr key={p.id}>
                      <td className="td-name td-mono">{p.id}</td>
                      <td className="td-mono">{p.invoice}</td>
                      <td className="td-muted">{p.table}</td>
                      <td style={{ fontWeight: 600 }}>₹{Number(p.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td>
                        <span className={`owner-badge owner-badge--${p.status}`}>{p.status.toUpperCase()}</span>
                      </td>
                      <td className="td-muted">{p.time}</td>
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
