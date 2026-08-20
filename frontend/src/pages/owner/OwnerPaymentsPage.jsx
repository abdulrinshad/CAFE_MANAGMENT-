import { useState } from 'react'
import AdminLayout from '../../layouts/AdminLayout'
import { OWNER_PAYMENTS, OWNER_BRANCHES } from '../../data/ownerMockData'
import './owner.css'

export default function OwnerPaymentsPage() {
  const [branchFil, setBranch] = useState('all')
  const [methodFil, setMethod] = useState('all')
  const [statusFil, setStatus] = useState('all')
  const [search,    setSearch] = useState('')

  const filtered = OWNER_PAYMENTS.filter(p => {
    const matchBranch = branchFil === 'all' || p.branch === OWNER_BRANCHES.find(b => b.id === Number(branchFil))?.name.replace('Artisan Brew — ', '')
    const matchMethod = methodFil === 'all' || p.method.toLowerCase() === methodFil
    const matchStatus = statusFil === 'all' || p.status === statusFil
    const matchSearch = !search || p.id.toLowerCase().includes(search.toLowerCase()) || p.invoice.toLowerCase().includes(search.toLowerCase())
    return matchBranch && matchMethod && matchStatus && matchSearch
  })

  const total  = OWNER_PAYMENTS.reduce((a, p) => a + p.amount, 0)
  const cash   = OWNER_PAYMENTS.filter(p => p.method === 'Cash').reduce((a, p) => a + p.amount, 0)
  const upi    = OWNER_PAYMENTS.filter(p => p.method === 'UPI').reduce((a, p) => a + p.amount, 0)
  const card   = OWNER_PAYMENTS.filter(p => p.method === 'Card').reduce((a, p) => a + p.amount, 0)
  const online = OWNER_PAYMENTS.filter(p => p.method === 'Online').reduce((a, p) => a + p.amount, 0)

  return (
    <AdminLayout pageTitle="Payments" pageIcon="💳">
      <div className="owner-page">

        <div className="owner-page-header">
          <div className="owner-page-header__left">
            <h1 className="owner-page-header__title">Payments</h1>
            <p className="owner-page-header__sub">Payment breakdown by method, branch, and status.</p>
          </div>
        </div>

        {/* KPIs */}
        <div className="owner-kpi-grid--5 owner-kpi-grid">
          {[
            { label: 'Total Payments', value: `₹${total.toLocaleString('en-IN')}` },
            { label: 'Cash',           value: `₹${cash.toLocaleString('en-IN')}` },
            { label: 'UPI',            value: `₹${upi.toLocaleString('en-IN')}` },
            { label: 'Card',           value: `₹${card.toLocaleString('en-IN')}` },
            { label: 'Online / Other', value: `₹${online.toLocaleString('en-IN')}` },
          ].map(k => (
            <div key={k.label} className="owner-kpi-card">
              <div className="owner-kpi-card__label">{k.label}</div>
              <div className="owner-kpi-card__value">{k.value}</div>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="owner-section-card">
          <div className="owner-section-card__header" style={{ flexWrap: 'wrap', gap: 10 }}>
            <span className="owner-section-card__title">Payment Records</span>
            <div className="owner-filter-bar">
              <input className="form-input" placeholder="Search payment ID, invoice..." value={search} onChange={e => setSearch(e.target.value)} style={{ minWidth: 200, fontSize: 13, padding: '8px 14px' }} id="search-payments" />
              <select className="form-select" value={branchFil} onChange={e => setBranch(e.target.value)} id="filter-pay-branch">
                <option value="all">All Branches</option>
                {OWNER_BRANCHES.map(b => <option key={b.id} value={b.id}>{b.name.replace('Artisan Brew — ', '')}</option>)}
              </select>
              <select className="form-select" value={methodFil} onChange={e => setMethod(e.target.value)} id="filter-pay-method">
                <option value="all">All Methods</option>
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
                <option value="card">Card</option>
                <option value="online">Online</option>
              </select>
              <select className="form-select" value={statusFil} onChange={e => setStatus(e.target.value)} id="filter-pay-status">
                <option value="all">All Statuses</option>
                <option value="success">Success</option>
                <option value="failed">Failed</option>
                <option value="refunded">Refunded</option>
              </select>
            </div>
          </div>

          <div className="owner-table-wrap">
            <table className="owner-table">
              <thead>
                <tr>
                  <th>Payment ID</th>
                  <th>Branch</th>
                  <th>Invoice</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>POS / Cashier</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0
                  ? <tr><td colSpan={8}><div className="owner-empty"><div className="owner-empty__icon">💳</div><div className="owner-empty__text">No payments found</div></div></td></tr>
                  : filtered.map(p => (
                    <tr key={p.id}>
                      <td className="td-name td-mono">{p.id}</td>
                      <td className="td-muted">{p.branch}</td>
                      <td className="td-mono">{p.invoice}</td>
                      <td style={{ fontWeight: 500 }}>₹{p.amount.toLocaleString('en-IN')}</td>
                      <td>{p.method}</td>
                      <td className="td-muted">{p.pos}</td>
                      <td><span className={`owner-badge owner-badge--${p.status}`}>{p.status.toUpperCase()}</span></td>
                      <td className="td-muted">{p.date}</td>
                    </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </AdminLayout>
  )
}
