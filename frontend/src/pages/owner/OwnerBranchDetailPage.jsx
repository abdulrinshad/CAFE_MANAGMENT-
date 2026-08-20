import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import AdminLayout from '../../layouts/AdminLayout'
import {
  OWNER_BRANCHES, OWNER_STAFF, OWNER_POS_TERMINALS,
  OWNER_MENU_ITEMS, OWNER_INVENTORY, OWNER_EXPENSES,
} from '../../data/ownerMockData'
import './owner.css'

const TABS = ['Overview', 'Staff', 'POS Terminals', 'Menu', 'Inventory', 'Expenses']

export default function OwnerBranchDetailPage() {
  const { id }      = useParams()
  const navigate    = useNavigate()
  const [tab, setTab] = useState('Overview')

  const branch = OWNER_BRANCHES.find(b => b.id === Number(id))

  if (!branch) {
    return (
      <AdminLayout pageTitle="Branch Detail" pageIcon="🏪">
        <div className="owner-empty" style={{ marginTop: 60 }}>
          <div className="owner-empty__icon">🏪</div>
          <div className="owner-empty__text">Branch not found.</div>
          <button className="btn-outline" style={{ marginTop: 12 }} onClick={() => navigate('/owner/branches')}>
            ← Back to Branches
          </button>
        </div>
      </AdminLayout>
    )
  }

  const shortName = branch.name.replace('Artisan Brew — ', '')
  const staff     = OWNER_STAFF.filter(s => s.branchId === branch.id)
  const pos       = OWNER_POS_TERMINALS.filter(p => p.branchId === branch.id)
  const menu      = OWNER_MENU_ITEMS.filter(m => m.branches.includes(branch.id))
  const inventory = OWNER_INVENTORY.filter(i => i.branch === shortName)
  const expenses  = OWNER_EXPENSES.filter(e => e.branch === shortName)

  return (
    <AdminLayout pageTitle={shortName} pageIcon="🏪">
      <div className="owner-page">

        {/* Back + Header */}
        <div>
          <button className="btn-ghost" onClick={() => navigate('/owner/branches')} style={{ marginBottom: 6, padding: '5px 0' }}>
            ← Back to Branches
          </button>
          <div className="owner-page-header">
            <div className="owner-page-header__left">
              <h1 className="owner-page-header__title">{branch.name}</h1>
              <p className="owner-page-header__sub">{branch.location} · {branch.phone}</p>
            </div>
            <div className="owner-page-header__actions">
              <span className={`owner-badge owner-badge--${branch.status}`}>{branch.status.toUpperCase()}</span>
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="owner-kpi-grid">
          {[
            { label: "Today's Sales",  value: `₹${branch.todaySales.toLocaleString('en-IN')}` },
            { label: 'Orders Today',   value: branch.orders },
            { label: 'Pending',        value: branch.pendingOrders },
            { label: 'Month Revenue',  value: `₹${(branch.monthSales / 1000).toFixed(0)}k` },
          ].map(k => (
            <div key={k.label} className="owner-kpi-card">
              <div className="owner-kpi-card__label">{k.label}</div>
              <div className="owner-kpi-card__value">{k.value}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="owner-section-card">
          <div className="owner-tab-bar" style={{ paddingLeft: 20 }}>
            {TABS.map(t => (
              <button
                key={t}
                className={`owner-tab${tab === t ? ' owner-tab--active' : ''}`}
                onClick={() => setTab(t)}
                id={`branch-tab-${t.toLowerCase().replace(/\s+/g, '-')}`}
              >{t}</button>
            ))}
          </div>

          <div className="owner-section-card__body--no-pad">

            {/* Overview */}
            {tab === 'Overview' && (
              <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 24px' }}>
                {[
                  ['Branch Name',   branch.name],
                  ['Location',      branch.location],
                  ['Phone',         branch.phone],
                  ['GST / Tax ID',  branch.gst],
                  ['Currency',      branch.currency],
                  ['Opening Time',  branch.opening],
                  ['Closing Time',  branch.closing],
                  ['Tables',        branch.tables],
                  ['POS Terminals', branch.pos],
                  ['Manager',       branch.manager],
                  ['Staff Count',   branch.staff],
                  ['Monthly Sales', `₹${branch.monthSales.toLocaleString('en-IN')}`],
                ].map(([label, value]) => (
                  <div key={label}>
                    <div style={{ fontSize: 10, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{label}</div>
                    <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-espresso)' }}>{value}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Staff */}
            {tab === 'Staff' && (
              <div className="owner-table-wrap">
                <table className="owner-table">
                  <thead><tr><th>Name</th><th>Role</th><th>Contact</th><th>Status</th><th>Performance</th></tr></thead>
                  <tbody>
                    {staff.length === 0
                      ? <tr><td colSpan={5}><div className="owner-empty"><div className="owner-empty__text">No staff assigned</div></div></td></tr>
                      : staff.map(s => (
                        <tr key={s.id}>
                          <td className="td-name">{s.name}</td>
                          <td style={{ textTransform: 'capitalize' }}>{s.role}</td>
                          <td className="td-muted">{s.phone}</td>
                          <td><span className={`owner-badge owner-badge--${s.status}`}>{s.status.toUpperCase()}</span></td>
                          <td>
                            <div className="perf-bar">
                              <div className="perf-bar__track"><div className="perf-bar__fill" style={{ width: `${s.performance}%` }} /></div>
                              <span className="perf-bar__value">{s.performance}%</span>
                            </div>
                          </td>
                        </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* POS */}
            {tab === 'POS Terminals' && (
              <div className="owner-table-wrap">
                <table className="owner-table">
                  <thead><tr><th>Terminal</th><th>Assigned User</th><th>Status</th><th>Last Active</th><th>Today's Sales</th></tr></thead>
                  <tbody>
                    {pos.length === 0
                      ? <tr><td colSpan={5}><div className="owner-empty"><div className="owner-empty__text">No POS terminals</div></div></td></tr>
                      : pos.map(p => (
                        <tr key={p.id}>
                          <td className="td-name">{p.terminal}</td>
                          <td>{p.assignedUser}</td>
                          <td><span className={`owner-badge owner-badge--${p.status}`}>{p.status.toUpperCase()}</span></td>
                          <td className="td-muted">{p.lastActive}</td>
                          <td style={{ fontWeight: 500 }}>₹{p.todaySales.toLocaleString('en-IN')}</td>
                        </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Menu */}
            {tab === 'Menu' && (
              <div className="owner-table-wrap">
                <table className="owner-table">
                  <thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Status</th></tr></thead>
                  <tbody>
                    {menu.map(m => (
                      <tr key={m.id}>
                        <td className="td-name">{m.name}</td>
                        <td className="td-muted">{m.category}</td>
                        <td style={{ fontWeight: 500 }}>₹{m.price}</td>
                        <td><span className={`owner-badge owner-badge--${m.status}`}>{m.status.toUpperCase()}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Inventory */}
            {tab === 'Inventory' && (
              <div className="owner-table-wrap">
                <table className="owner-table">
                  <thead><tr><th>Product</th><th>Current Stock</th><th>Unit</th><th>Min Stock</th><th>Status</th></tr></thead>
                  <tbody>
                    {inventory.length === 0
                      ? <tr><td colSpan={5}><div className="owner-empty"><div className="owner-empty__text">No inventory records</div></div></td></tr>
                      : inventory.map(i => (
                        <tr key={i.id}>
                          <td className="td-name">{i.product}</td>
                          <td>{i.stock}</td>
                          <td className="td-muted">{i.unit}</td>
                          <td className="td-muted">{i.minStock}</td>
                          <td><span className={`owner-badge owner-badge--${i.status}`}>{i.status.toUpperCase()}</span></td>
                        </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Expenses */}
            {tab === 'Expenses' && (
              <div className="owner-table-wrap">
                <table className="owner-table">
                  <thead><tr><th>Expense</th><th>Category</th><th>Amount</th><th>Added By</th><th>Date</th><th>Status</th></tr></thead>
                  <tbody>
                    {expenses.length === 0
                      ? <tr><td colSpan={6}><div className="owner-empty"><div className="owner-empty__text">No expenses recorded</div></div></td></tr>
                      : expenses.map(e => (
                        <tr key={e.id}>
                          <td className="td-name">{e.name}</td>
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
            )}

          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
