import { useState } from 'react'
import AdminLayout from '../../layouts/AdminLayout'
import { OWNER_BILLS, OWNER_BRANCHES } from '../../data/ownerMockData'
import './owner.css'

export default function OwnerBillingPage() {
  const [branchFil, setBranch] = useState('all')
  const [payFil,    setPay]    = useState('all')
  const [search,    setSearch] = useState('')

  const filtered = OWNER_BILLS.filter(b => {
    const matchBranch = branchFil === 'all' || b.branch === OWNER_BRANCHES.find(br => br.id === Number(branchFil))?.name.replace('Artisan Brew — ', '')
    const matchPay    = payFil === 'all' || b.status === payFil
    const matchSearch = !search || b.id.toLowerCase().includes(search.toLowerCase()) || b.order.toLowerCase().includes(search.toLowerCase())
    return matchBranch && matchPay && matchSearch
  })

  const total     = OWNER_BILLS.reduce((a, b) => a + b.amount, 0)
  const paid      = OWNER_BILLS.filter(b => b.status === 'paid').reduce((a, b) => a + b.amount, 0)
  const pending   = OWNER_BILLS.filter(b => b.status === 'pending').reduce((a, b) => a + b.amount, 0)
  const cancelled = OWNER_BILLS.filter(b => b.status === 'cancelled').length

  return (
    <AdminLayout pageTitle="Billing" pageIcon="🧾">
      <div className="owner-page">

        {/* Header */}
        <div className="owner-page-header">
          <div className="owner-page-header__left">
            <h1 className="owner-page-header__title">Billing</h1>
            <p className="owner-page-header__sub">All invoices and billing records across branches.</p>
          </div>
        </div>

        {/* KPIs */}
        <div className="owner-kpi-grid">
          <div className="owner-kpi-card">
            <div className="owner-kpi-card__label">Total Bills</div>
            <div className="owner-kpi-card__value">{OWNER_BILLS.length}</div>
            <div className="owner-kpi-card__sub">₹{total.toLocaleString('en-IN')} value</div>
          </div>
          <div className="owner-kpi-card">
            <div className="owner-kpi-card__label">Paid</div>
            <div className="owner-kpi-card__value">₹{paid.toLocaleString('en-IN')}</div>
            <span className="owner-kpi-badge owner-kpi-badge--green">{OWNER_BILLS.filter(b => b.status === 'paid').length} invoices</span>
          </div>
          <div className="owner-kpi-card">
            <div className="owner-kpi-card__label">Pending</div>
            <div className="owner-kpi-card__value">₹{pending.toLocaleString('en-IN')}</div>
            <span className="owner-kpi-badge owner-kpi-badge--orange">{OWNER_BILLS.filter(b => b.status === 'pending').length} invoices</span>
          </div>
          <div className="owner-kpi-card">
            <div className="owner-kpi-card__label">Cancelled</div>
            <div className="owner-kpi-card__value">{cancelled}</div>
            <span className="owner-kpi-badge owner-kpi-badge--red">needs review</span>
          </div>
        </div>

        {/* Table */}
        <div className="owner-section-card">
          <div className="owner-section-card__header" style={{ flexWrap: 'wrap', gap: 10 }}>
            <span className="owner-section-card__title">Invoice List</span>
            <div className="owner-filter-bar">
              <input className="form-input" placeholder="Search invoice, order..." value={search} onChange={e => setSearch(e.target.value)} style={{ minWidth: 200, fontSize: 13, padding: '8px 14px' }} id="search-billing" />
              <select className="form-select" value={branchFil} onChange={e => setBranch(e.target.value)} id="filter-billing-branch">
                <option value="all">All Branches</option>
                {OWNER_BRANCHES.map(b => <option key={b.id} value={b.id}>{b.name.replace('Artisan Brew — ', '')}</option>)}
              </select>
              <select className="form-select" value={payFil} onChange={e => setPay(e.target.value)} id="filter-billing-status">
                <option value="all">All Statuses</option>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div className="owner-table-wrap">
            <table className="owner-table">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Branch</th>
                  <th>Order</th>
                  <th>Amount</th>
                  <th>Payment Method</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0
                  ? <tr><td colSpan={7}><div className="owner-empty"><div className="owner-empty__icon">🧾</div><div className="owner-empty__text">No invoices found</div></div></td></tr>
                  : filtered.map(b => (
                    <tr key={b.id}>
                      <td className="td-name td-mono">{b.id}</td>
                      <td className="td-muted">{b.branch}</td>
                      <td className="td-mono">{b.order}</td>
                      <td style={{ fontWeight: 500 }}>₹{b.amount.toLocaleString('en-IN')}</td>
                      <td className="td-muted">{b.method}</td>
                      <td><span className={`owner-badge owner-badge--${b.status}`}>{b.status.toUpperCase()}</span></td>
                      <td className="td-muted">{b.date}</td>
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
