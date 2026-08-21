import { useState } from 'react'
import AdminLayout from '../../layouts/AdminLayout'
import './owner.css'

export default function OwnerExpensesPage() {
  const [expenses, setExpenses] = useState([])
  const [search, setSearch] = useState('')

  const filtered = expenses.filter(e =>
    !search || e.name.toLowerCase().includes(search.toLowerCase())
  )

  const total = expenses.reduce((a, e) => a + e.amount, 0)

  return (
    <AdminLayout pageTitle="Expenses" pageIcon="💸">
      <div className="owner-page">

        <div className="owner-page-header">
          <div className="owner-page-header__left">
            <h1 className="owner-page-header__title">Expenses</h1>
            <p className="owner-page-header__sub">Track operational expenses logged across cafe branches.</p>
          </div>
        </div>

        {/* KPIs */}
        <div className="owner-kpi-grid">
          <div className="owner-kpi-card">
            <div className="owner-kpi-card__label">Total Expenses</div>
            <div className="owner-kpi-card__value">₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          </div>
          <div className="owner-kpi-card">
            <div className="owner-kpi-card__label">Logged Records</div>
            <div className="owner-kpi-card__value">{expenses.length}</div>
          </div>
        </div>

        {/* Table */}
        <div className="owner-section-card">
          <div className="owner-section-card__header" style={{ flexWrap: 'wrap', gap: 10 }}>
            <span className="owner-section-card__title">Expense Log</span>
            <div className="owner-filter-bar">
              <input
                className="form-input"
                placeholder="Search expenses..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ minWidth: 220, fontSize: 13, padding: '8px 14px' }}
                id="search-expenses"
              />
            </div>
          </div>

          <div className="owner-table-wrap">
            <table className="owner-table">
              <thead>
                <tr>
                  <th>Expense Name</th>
                  <th>Category</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={4}>
                      <div className="owner-empty">
                        <div className="owner-empty__icon">💸</div>
                        <div className="owner-empty__text">No expenses logged yet</div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((e, idx) => (
                    <tr key={idx}>
                      <td className="td-name">{e.name}</td>
                      <td className="td-muted">{e.category}</td>
                      <td style={{ fontWeight: 600 }}>₹{Number(e.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td>
                        <span className="owner-badge owner-badge--active">APPROVED</span>
                      </td>
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
