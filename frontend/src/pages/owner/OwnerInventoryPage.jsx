import { useState } from 'react'
import AdminLayout from '../../layouts/AdminLayout'
import { OWNER_INVENTORY, OWNER_BRANCHES } from '../../data/ownerMockData'
import './owner.css'

export default function OwnerInventoryPage() {
  const [branchFil, setBranch] = useState('all')
  const [statusFil, setStatus] = useState('all')
  const [search,    setSearch] = useState('')

  const filtered = OWNER_INVENTORY.filter(i => {
    const matchBranch = branchFil === 'all' || i.branch === OWNER_BRANCHES.find(b => b.id === Number(branchFil))?.name.replace('Artisan Brew — ', '')
    const matchStatus = statusFil === 'all' || i.status === statusFil
    const matchSearch = !search || i.product.toLowerCase().includes(search.toLowerCase())
    return matchBranch && matchStatus && matchSearch
  })

  const lowCount = OWNER_INVENTORY.filter(i => i.status === 'low').length
  const outCount = OWNER_INVENTORY.filter(i => i.status === 'out').length
  const okCount  = OWNER_INVENTORY.filter(i => i.status === 'ok').length

  return (
    <AdminLayout pageTitle="Inventory" pageIcon="📦">
      <div className="owner-page">

        <div className="owner-page-header">
          <div className="owner-page-header__left">
            <h1 className="owner-page-header__title">Inventory</h1>
            <p className="owner-page-header__sub">Stock levels across all branches. Read-only overview — manage stock in Branch Manager.</p>
          </div>
        </div>

        {/* KPIs */}
        <div className="owner-kpi-grid--3 owner-kpi-grid">
          <div className="owner-kpi-card">
            <div className="owner-kpi-card__label">Total Items Tracked</div>
            <div className="owner-kpi-card__value">{OWNER_INVENTORY.length}</div>
          </div>
          <div className="owner-kpi-card">
            <div className="owner-kpi-card__label">Low Stock Alerts</div>
            <div className="owner-kpi-card__value">{lowCount}</div>
            <span className="owner-kpi-badge owner-kpi-badge--orange">needs restock</span>
          </div>
          <div className="owner-kpi-card">
            <div className="owner-kpi-card__label">Out of Stock</div>
            <div className="owner-kpi-card__value">{outCount}</div>
            <span className="owner-kpi-badge owner-kpi-badge--red">urgent action</span>
          </div>
        </div>

        {/* Low / Out Alerts Banner */}
        {(lowCount > 0 || outCount > 0) && (
          <div style={{ background: 'rgba(212,96,26,0.06)', border: '1px solid rgba(212,96,26,0.2)', borderRadius: 10, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 18 }}>⚠️</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-orange)' }}>Stock Alert</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}>
                {outCount} items are out of stock and {lowCount} items are running low across branches. Contact branch managers to restock.
              </div>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="owner-section-card">
          <div className="owner-section-card__header" style={{ flexWrap: 'wrap', gap: 10 }}>
            <span className="owner-section-card__title">Stock Overview</span>
            <div className="owner-filter-bar">
              <input className="form-input" placeholder="Search product..." value={search} onChange={e => setSearch(e.target.value)} style={{ minWidth: 200, fontSize: 13, padding: '8px 14px' }} id="search-inventory" />
              <select className="form-select" value={branchFil} onChange={e => setBranch(e.target.value)} id="filter-inv-branch">
                <option value="all">All Branches</option>
                {OWNER_BRANCHES.map(b => <option key={b.id} value={b.id}>{b.name.replace('Artisan Brew — ', '')}</option>)}
              </select>
              <select className="form-select" value={statusFil} onChange={e => setStatus(e.target.value)} id="filter-inv-status">
                <option value="all">All Status</option>
                <option value="ok">OK</option>
                <option value="low">Low Stock</option>
                <option value="out">Out of Stock</option>
              </select>
            </div>
          </div>

          <div className="owner-table-wrap">
            <table className="owner-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Branch</th>
                  <th>Current Stock</th>
                  <th>Min Stock</th>
                  <th>Unit</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0
                  ? <tr><td colSpan={6}><div className="owner-empty"><div className="owner-empty__icon">📦</div><div className="owner-empty__text">No inventory items found</div></div></td></tr>
                  : filtered.map(i => (
                    <tr key={i.id}>
                      <td className="td-name">{i.product}</td>
                      <td className="td-muted">{i.branch}</td>
                      <td style={{ fontWeight: i.status !== 'ok' ? 600 : 400, color: i.status === 'out' ? 'var(--color-red)' : i.status === 'low' ? 'var(--color-orange)' : 'inherit' }}>
                        {i.stock}
                      </td>
                      <td className="td-muted">{i.minStock}</td>
                      <td className="td-muted">{i.unit}</td>
                      <td><span className={`owner-badge owner-badge--${i.status}`}>{i.status === 'ok' ? 'OK' : i.status === 'low' ? 'LOW STOCK' : 'OUT OF STOCK'}</span></td>
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
