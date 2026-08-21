import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import AdminLayout from '../../layouts/AdminLayout'
import { useApp } from '../../context/AppContext'
import './owner.css'

const TABS = ['Overview', 'Tables', 'Menu', 'Orders']

export default function OwnerBranchDetailPage() {
  const { id }      = useParams()
  const navigate    = useNavigate()
  const { tables, products, orders } = useApp()
  const [tab, setTab] = useState('Overview')

  const branchName = `Artisan Brew — Main Branch`
  const shortName = `Main Branch`

  const todaySales = orders.filter(o => o.status === 'COMPLETED').reduce((s, o) => s + (o.amount || 0), 0)

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
              <h1 className="owner-page-header__title">{branchName}</h1>
              <p className="owner-page-header__sub">Connected to main database floor plan & orders.</p>
            </div>
            <div className="owner-page-header__actions">
              <span className="owner-badge owner-badge--active">ACTIVE</span>
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="owner-kpi-grid">
          <div className="owner-kpi-card"><div className="owner-kpi-card__label">Today's Sales</div><div className="owner-kpi-card__value">₹{Number(todaySales).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div></div>
          <div className="owner-kpi-card"><div className="owner-kpi-card__label">Live Database Orders</div><div className="owner-kpi-card__value">{orders.length}</div></div>
          <div className="owner-kpi-card"><div className="owner-kpi-card__label">DB Floor Tables</div><div className="owner-kpi-card__value">{tables.length}</div></div>
          <div className="owner-kpi-card"><div className="owner-kpi-card__label">Active Products</div><div className="owner-kpi-card__value">{products.length}</div></div>
        </div>

        {/* Tabs */}
        <div className="owner-section-card">
          <div className="owner-tab-bar">
            {TABS.map(t => (
              <button key={t} className={`owner-tab${tab === t ? ' owner-tab--active' : ''}`} onClick={() => setTab(t)}>{t}</button>
            ))}
          </div>

          <div className="owner-section-card__body">
            {tab === 'Overview' && (
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Branch Details &amp; Operational Status</h3>
                <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>This branch is operating on the primary database cluster. All table plans, product items, and live order receipts synchronize instantly across Waiter and Owner dashboards.</p>
              </div>
            )}
            {tab === 'Tables' && (
              <div className="owner-table-wrap">
                <table className="owner-table">
                  <thead>
                    <tr><th>Table Name</th><th>Seats</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {tables.map(t => (
                      <tr key={t.id}>
                        <td className="td-name">{t.label || t.name}</td>
                        <td>{t.seats} seats</td>
                        <td><span className={`owner-badge owner-badge--${t.status === 'available' ? 'active' : 'orange'}`}>{t.status.toUpperCase()}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {tab === 'Menu' && (
              <div className="owner-table-wrap">
                <table className="owner-table">
                  <thead>
                    <tr><th>Product</th><th>Category</th><th>Price</th></tr>
                  </thead>
                  <tbody>
                    {products.map(p => (
                      <tr key={p.id}>
                        <td className="td-name">{p.name}</td>
                        <td className="td-muted">{p.category_name || p.categoryLabel || '—'}</td>
                        <td style={{ fontWeight: 600 }}>₹{Number(p.price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {tab === 'Orders' && (
              <div className="owner-table-wrap">
                <table className="owner-table">
                  <thead>
                    <tr><th>Order Ref</th><th>Table</th><th>Amount</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {orders.map(o => (
                      <tr key={o.id}>
                        <td className="td-name td-mono">{o.orderId || `ORD-${o.id}`}</td>
                        <td>{o.table}</td>
                        <td style={{ fontWeight: 600 }}>₹{Number(o.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        <td><span className="owner-badge owner-badge--active">{o.status}</span></td>
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
