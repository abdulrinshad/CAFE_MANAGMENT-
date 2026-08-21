import { useState } from 'react'
import AdminLayout from '../../layouts/AdminLayout'
import { useApp } from '../../context/AppContext'
import './owner.css'

export default function OwnerInventoryPage() {
  const { products } = useApp()
  const [search, setSearch] = useState('')

  const inventoryList = products.map(p => ({
    id: p.id,
    product: p.name,
    category: p.category_name || p.categoryLabel || 'Beverages',
    stock: p.sold_out ? 0 : 50,
    status: p.sold_out ? 'out' : (p.available ? 'ok' : 'low'),
  }))

  const filtered = inventoryList.filter(i =>
    !search || i.product.toLowerCase().includes(search.toLowerCase())
  )

  const lowCount = inventoryList.filter(i => i.status === 'low').length
  const outCount = inventoryList.filter(i => i.status === 'out').length

  return (
    <AdminLayout pageTitle="Inventory" pageIcon="📦">
      <div className="owner-page">

        <div className="owner-page-header">
          <div className="owner-page-header__left">
            <h1 className="owner-page-header__title">Inventory</h1>
            <p className="owner-page-header__sub">Stock availability status driven by live product database.</p>
          </div>
        </div>

        {/* KPIs */}
        <div className="owner-kpi-grid">
          <div className="owner-kpi-card">
            <div className="owner-kpi-card__label">Total Products Tracked</div>
            <div className="owner-kpi-card__value">{products.length}</div>
          </div>
          <div className="owner-kpi-card">
            <div className="owner-kpi-card__label">Low Stock / Inactive</div>
            <div className="owner-kpi-card__value">{lowCount}</div>
          </div>
          <div className="owner-kpi-card">
            <div className="owner-kpi-card__label">Sold Out / Out of Stock</div>
            <div className="owner-kpi-card__value">{outCount}</div>
          </div>
        </div>

        {/* Table */}
        <div className="owner-section-card">
          <div className="owner-section-card__header" style={{ flexWrap: 'wrap', gap: 10 }}>
            <span className="owner-section-card__title">Inventory List</span>
            <div className="owner-filter-bar">
              <input
                className="form-input"
                placeholder="Search product name..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ minWidth: 220, fontSize: 13, padding: '8px 14px' }}
                id="search-inventory"
              />
            </div>
          </div>

          <div className="owner-table-wrap">
            <table className="owner-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Stock Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={3}>
                      <div className="owner-empty">
                        <div className="owner-empty__icon">📦</div>
                        <div className="owner-empty__text">No inventory records found in database</div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map(i => (
                    <tr key={i.id}>
                      <td className="td-name">{i.product}</td>
                      <td className="td-muted">{i.category}</td>
                      <td>
                        <span className={`owner-badge owner-badge--${i.status === 'ok' ? 'active' : (i.status === 'out' ? 'danger' : 'idle')}`}>
                          {i.status === 'ok' ? 'IN STOCK' : (i.status === 'out' ? 'SOLD OUT' : 'LOW STOCK')}
                        </span>
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
