import { useState } from 'react'
import AdminLayout from '../../layouts/AdminLayout'
import { OWNER_EXPENSES, OWNER_EXPENSE_CATEGORIES, OWNER_BRANCHES } from '../../data/ownerMockData'
import './owner.css'

export default function OwnerExpensesPage() {
  const [branchFil, setBranch]   = useState('all')
  const [catFil,    setCat]      = useState('all')
  const [search,    setSearch]   = useState('')

  const filtered = OWNER_EXPENSES.filter(e => {
    const matchBranch = branchFil === 'all' || e.branch === OWNER_BRANCHES.find(b => b.id === Number(branchFil))?.name.replace('Artisan Brew — ', '')
    const matchCat    = catFil === 'all' || e.category === catFil
    const matchSearch = !search || e.name.toLowerCase().includes(search.toLowerCase()) || e.addedBy.toLowerCase().includes(search.toLowerCase())
    return matchBranch && matchCat && matchSearch
  })

  const total    = OWNER_EXPENSES.reduce((a, e) => a + e.amount, 0)
  const today    = OWNER_EXPENSES.filter(e => e.date === '20 Aug 2026').reduce((a, e) => a + e.amount, 0)
  const pending  = OWNER_EXPENSES.filter(e => e.status === 'pending').reduce((a, e) => a + e.amount, 0)

  // Category breakdown
  const catBreakdown = OWNER_EXPENSE_CATEGORIES.map(cat => ({
    cat,
    total: OWNER_EXPENSES.filter(e => e.category === cat).reduce((a, e) => a + e.amount, 0),
  })).filter(c => c.total > 0).sort((a, b) => b.total - a.total)

  return (
    <AdminLayout pageTitle="Expenses" pageIcon="💸">
      <div className="owner-page">

        <div className="owner-page-header">
          <div className="owner-page-header__left">
            <h1 className="owner-page-header__title">Expenses</h1>
            <p className="owner-page-header__sub">Track and review expenses across all branches.</p>
          </div>
        </div>

        {/* KPIs */}
        <div className="owner-kpi-grid">
          <div className="owner-kpi-card">
            <div className="owner-kpi-card__label">Today's Expenses</div>
            <div className="owner-kpi-card__value">₹{today.toLocaleString('en-IN')}</div>
          </div>
          <div className="owner-kpi-card">
            <div className="owner-kpi-card__label">Monthly Total</div>
            <div className="owner-kpi-card__value">₹{(total / 1000).toFixed(0)}k</div>
          </div>
          <div className="owner-kpi-card">
            <div className="owner-kpi-card__label">Total Expenses</div>
            <div className="owner-kpi-card__value">₹{total.toLocaleString('en-IN')}</div>
          </div>
          <div className="owner-kpi-card">
            <div className="owner-kpi-card__label">Pending Approval</div>
            <div className="owner-kpi-card__value">₹{pending.toLocaleString('en-IN')}</div>
            <span className="owner-kpi-badge owner-kpi-badge--orange">{OWNER_EXPENSES.filter(e => e.status === 'pending').length} items</span>
          </div>
        </div>

        {/* Category Breakdown + Expense History */}
        <div className="owner-detail-grid">

          {/* Category Breakdown */}
          <div className="owner-section-card">
            <div className="owner-section-card__header">
              <span className="owner-section-card__title">By Category</span>
            </div>
            <div className="owner-section-card__body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {catBreakdown.map(c => {
                  const pct = Math.round((c.total / total) * 100)
                  return (
                    <div key={c.cat}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 13, color: 'var(--color-text-primary)' }}>{c.cat}</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-espresso)' }}>₹{c.total.toLocaleString('en-IN')}</span>
                      </div>
                      <div style={{ height: 6, background: 'var(--color-cream-dark)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: 'var(--color-tan-dark)', borderRadius: 3, transition: 'width 0.4s ease' }} />
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 2 }}>{pct}%</div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Expense History Table */}
          <div className="owner-section-card">
            <div className="owner-section-card__header" style={{ flexWrap: 'wrap', gap: 8 }}>
              <span className="owner-section-card__title">Expense History</span>
              <div className="owner-filter-bar">
                <select className="form-select" value={branchFil} onChange={e => setBranch(e.target.value)} id="filter-exp-branch" style={{ minWidth: 120 }}>
                  <option value="all">All Branches</option>
                  {OWNER_BRANCHES.map(b => <option key={b.id} value={b.id}>{b.name.replace('Artisan Brew — ', '')}</option>)}
                </select>
                <select className="form-select" value={catFil} onChange={e => setCat(e.target.value)} id="filter-exp-cat" style={{ minWidth: 120 }}>
                  <option value="all">All Categories</option>
                  {OWNER_EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="owner-section-card__body--no-pad">
              <div className="owner-table-wrap">
                <table className="owner-table">
                  <thead>
                    <tr>
                      <th>Expense</th>
                      <th>Branch</th>
                      <th>Category</th>
                      <th>Amount</th>
                      <th>Added By</th>
                      <th>Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0
                      ? <tr><td colSpan={7}><div className="owner-empty"><div className="owner-empty__text">No expenses found</div></div></td></tr>
                      : filtered.map(e => (
                        <tr key={e.id}>
                          <td className="td-name">{e.name}</td>
                          <td className="td-muted">{e.branch}</td>
                          <td className="td-muted">{e.category}</td>
                          <td style={{ fontWeight: 500 }}>₹{e.amount.toLocaleString('en-IN')}</td>
                          <td className="td-muted">{e.addedBy}</td>
                          <td className="td-muted">{e.date}</td>
                          <td><span className={`owner-badge owner-badge--${e.status}`}>{e.status.toUpperCase()}</span></td>
                        </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

        </div>
      </div>
    </AdminLayout>
  )
}
