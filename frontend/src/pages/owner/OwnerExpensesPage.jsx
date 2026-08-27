import { useState, useEffect, useMemo } from 'react'
import AdminLayout from '../../layouts/AdminLayout'
import { branchApi, expenseApi } from '../../api'
import './owner.css'

export default function OwnerExpensesPage() {
  const [expenses, setExpenses] = useState([])
  const [branches, setBranches] = useState([])
  const [branchFilter, setBranchFilter] = useState('All')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchBranches()
  }, [])

  useEffect(() => {
    fetchExpenses()
  }, [branchFilter])

  const fetchBranches = async () => {
    try {
      const res = await branchApi.list()
      setBranches(Array.isArray(res) ? res : (res.results || []))
    } catch (err) {
      console.error('Failed to fetch branches', err)
    }
  }

  const fetchExpenses = async () => {
    try {
      setLoading(true)
      const params = branchFilter !== 'All' ? { branch: branchFilter } : {}
      const res = await expenseApi.list(params)
      setExpenses(Array.isArray(res) ? res : (res.results || []))
    } catch (err) {
      console.error('Failed to fetch expenses', err)
    } finally {
      setLoading(false)
    }
  }

  // Create a mapping of branch ID to branch name for easy lookup in the table
  const branchMap = useMemo(() => {
    const map = {}
    branches.forEach(b => map[b.id] = b.name)
    return map
  }, [branches])

  const totalAmount = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0)

  return (
    <AdminLayout pageTitle="Expenses" pageIcon="📉">
      <div className="owner-page">
        <div className="owner-page-header">
          <div className="owner-page-header__left">
            <h1 className="owner-page-header__title">Expenses (View Only)</h1>
            <p className="owner-page-header__sub">Track branch expenses across the business.</p>
          </div>
          <div className="owner-page-header__actions">
             <select className="form-select" value={branchFilter} onChange={e => setBranchFilter(e.target.value)} style={{width: 200}}>
                <option value="All">All Branches</option>
                {branches.map(b => (
                   <option key={b.id} value={b.id}>{b.name}</option>
                ))}
             </select>
          </div>
        </div>

        <div className="owner-kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          <div className="owner-kpi-card">
            <div className="owner-kpi-card__label">Total Expenses</div>
            <div className="owner-kpi-card__value" style={{ color: 'var(--color-danger)' }}>
              ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="owner-kpi-card">
            <div className="owner-kpi-card__label">Expense Records</div>
            <div className="owner-kpi-card__value">{expenses.length}</div>
          </div>
        </div>

        <div className="owner-section-card">
          <div className="owner-table-wrap">
            <table className="owner-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Branch</th>
                  <th>Category</th>
                  <th>Description</th>
                  <th>Amount</th>
                  <th>Added By</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} style={{textAlign: 'center', padding: 20}}>Loading...</td></tr>
                ) : expenses.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <div className="owner-empty">
                        <div className="owner-empty__text">No expenses found</div>
                      </div>
                    </td>
                  </tr>
                ) : expenses.map(e => (
                  <tr key={e.id}>
                    <td>{new Date(e.date).toLocaleDateString()}</td>
                    <td>{e.branch_name || (e.branch ? branchMap[e.branch?.id || e.branch] : '') || `Branch ${e.branch}`}</td>
                    <td>{e.category}</td>
                    <td>{e.description}</td>
                    <td style={{ fontWeight: 600, color: 'var(--color-danger)' }}>
                      ₹{Number(e.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="td-muted">{e.recorded_by_name || 'Staff'}</td>
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
