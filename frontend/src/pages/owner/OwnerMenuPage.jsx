import { useState, useEffect, useMemo } from 'react'
import AdminLayout from '../../layouts/AdminLayout'
import { useApp } from '../../context/AppContext'
import { branchApi, productApi } from '../../api'
import './owner.css'

// Fallback SVG for products without images
function ProductImageFallback({ size = 40 }) {
  return (
    <div style={{
      width: size, height: size,
      borderRadius: 6,
      background: 'linear-gradient(135deg, #f5e6d3 0%, #e8cba3 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.5, flexShrink: 0,
    }}>
      ☕
    </div>
  )
}

export default function OwnerMenuPage() {
  const { 
    products, categories,
    fetchProducts, fetchCategories,
    ownerBranchFilter: branchFilter, setOwnerBranchFilter: setBranchFilter
  } = useApp()
  const [catFilter, setCat]       = useState('All')
  const [search,    setSearch]    = useState('')
  const [branches, setBranches] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    branchApi.list()
      .then(res => setBranches(Array.isArray(res) ? res : (res.results || [])))
      .catch(() => {})
  }, [])

  // Create a mapping of branch ID to branch name for easy lookup in the table
  const branchMap = useMemo(() => {
    const map = {}
    branches.forEach(b => map[b.id] = b.name)
    return map
  }, [branches])

  const allCats = ['All', ...categories.map(c => c.name)]

  const filtered = products.filter(i => {
    const matchCat    = catFilter === 'All' || (i.category_name && i.category_name.toLowerCase() === catFilter.toLowerCase()) || (i.categoryLabel && i.categoryLabel.toLowerCase() === catFilter.toLowerCase())
    const matchSearch = !search || i.name.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  return (
    <AdminLayout pageTitle="Menu" pageIcon="☕">
      <div className="owner-page">

        {/* Header */}
        <div className="owner-page-header">
          <div className="owner-page-header__left">
            <h1 className="owner-page-header__title">Menu (View Only)</h1>
            <p className="owner-page-header__sub">View live products, pricing, and branch availability.</p>
          </div>
          <div className="owner-page-header__actions">
             <select className="form-select" value={branchFilter} onChange={e => setBranchFilter(e.target.value)} style={{width: 200}}>
                <option value="all">All Branches</option>
                {branches.map(b => (
                   <option key={b.id} value={b.id}>{b.name}</option>
                ))}
             </select>
          </div>
        </div>

        {/* Category Tabs + Filters */}
        <div className="owner-section-card">
          <div className="owner-tab-bar">
            {allCats.map(c => (
              <button
                key={c}
                className={`owner-tab${catFilter === c ? ' owner-tab--active' : ''}`}
                onClick={() => setCat(c)}
                id={`menu-cat-${c.toLowerCase().replace(/\s/g,'-')}`}
              >
                {c}
              </button>
            ))}
          </div>

          <div className="owner-section-card__header" style={{ borderBottom: 'none' }}>
            <div className="owner-filter-bar">
              <input
                className="form-input"
                placeholder="Search products..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ minWidth: 220, fontSize: 13, padding: '8px 14px' }}
                id="search-menu"
              />
            </div>
            <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{filtered.length} products</span>
          </div>

          <div className="owner-table-wrap">
            <table className="owner-table">
              <thead>
                <tr>
                  <th style={{ width: 52 }}>Image</th>
                  <th>Product</th>
                  <th className="hide-mobile">Category</th>
                  <th className="hide-mobile">Branch</th>
                  <th>Price</th>
                  <th className="hide-mobile">Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '20px' }}>Loading products...</td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <div className="owner-empty" style={{ padding: '40px 20px', textAlign: 'center' }}>
                        <div className="owner-empty__icon" style={{ fontSize: '48px', marginBottom: '16px' }}>☕</div>
                        <h3 className="owner-empty__text" style={{ fontSize: '18px', fontWeight: '600', color: 'var(--color-espresso)', marginBottom: '8px' }}>No menu items yet</h3>
                        <p style={{ color: 'var(--color-text-muted)', fontSize: '14px', marginBottom: '20px' }}>Add your first menu item to start building your menu.</p>
                        <button className="btn btn-primary" onClick={() => window.location.href = '/menu/add'} style={{ padding: '8px 16px', background: 'var(--color-espresso)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}>
                          + Add Menu Item
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : filtered.map(item => (
                  <tr key={item.id}>
                    <td style={{ padding: '6px 8px' }}>
                      {item.image ? (
                        <div style={{ position: 'relative', width: 40, height: 40 }}>
                          <img
                            src={item.image}
                            alt={item.name}
                            style={{ width: 40, height: 40, borderRadius: 6, objectFit: 'cover', display: 'block' }}
                            onError={e => {
                              e.target.style.display = 'none'
                              e.target.parentNode.querySelector('.img-fallback').style.display = 'flex'
                            }}
                          />
                          <div className="img-fallback" style={{ display: 'none', position: 'absolute', inset: 0 }}>
                            <ProductImageFallback size={40} />
                          </div>
                        </div>
                      ) : (
                        <ProductImageFallback size={40} />
                      )}
                    </td>
                    <td className="td-name">{item.name}</td>
                    <td className="td-muted hide-mobile">{item.category_name || item.categoryLabel || 'Default'}</td>
                    <td className="td-muted hide-mobile">{item.branch ? branchMap[item.branch] || `Branch ${item.branch}` : 'Global'}</td>
                    <td style={{ fontWeight: 500 }}>₹{Number(item.price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td className="hide-mobile">
                      <span className={`owner-badge owner-badge--${item.available ? 'active' : 'inactive'}`}>
                        {item.available ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </td>
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
