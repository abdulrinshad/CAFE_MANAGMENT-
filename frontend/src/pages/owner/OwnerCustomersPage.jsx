import { useState } from 'react'
import AdminLayout from '../../layouts/AdminLayout'
import { OWNER_CUSTOMERS, OWNER_BRANCHES } from '../../data/ownerMockData'
import './owner.css'

export default function OwnerCustomersPage() {
  const [branchFil,  setBranch]  = useState('all')
  const [search,     setSearch]  = useState('')
  const [selected,   setSelected] = useState(null)

  const filtered = OWNER_CUSTOMERS.filter(c => {
    const matchBranch = branchFil === 'all' || c.branch === OWNER_BRANCHES.find(b => b.id === Number(branchFil))?.name.replace('Artisan Brew — ', '')
    const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search)
    return matchBranch && matchSearch
  })

  const totalCustomers = OWNER_CUSTOMERS.length
  const totalSpend     = OWNER_CUSTOMERS.reduce((a, c) => a + c.spending, 0)
  const avgSpend       = Math.round(totalSpend / (totalCustomers || 1))
  const topCustomer    = [...OWNER_CUSTOMERS].sort((a, b) => b.spending - a.spending)[0]

  return (
    <AdminLayout pageTitle="Customers" pageIcon="👥">
      <div className="owner-page">

        <div className="owner-page-header">
          <div className="owner-page-header__left">
            <h1 className="owner-page-header__title">Customers</h1>
            <p className="owner-page-header__sub">Customer profiles, order history, and spending across branches.</p>
          </div>
        </div>

        {/* KPIs */}
        <div className="owner-kpi-grid">
          <div className="owner-kpi-card"><div className="owner-kpi-card__label">Total Customers</div><div className="owner-kpi-card__value">{totalCustomers}</div></div>
          <div className="owner-kpi-card"><div className="owner-kpi-card__label">Total Spending</div><div className="owner-kpi-card__value">₹{(totalSpend/1000).toFixed(1)}k</div></div>
          <div className="owner-kpi-card"><div className="owner-kpi-card__label">Avg. Spend / Customer</div><div className="owner-kpi-card__value">₹{avgSpend.toLocaleString('en-IN')}</div></div>
          <div className="owner-kpi-card"><div className="owner-kpi-card__label">Top Spender</div><div className="owner-kpi-card__value" style={{ fontSize: 17 }}>{topCustomer?.name}</div><div className="owner-kpi-card__sub">₹{topCustomer?.spending.toLocaleString('en-IN')}</div></div>
        </div>

        <div className="owner-detail-grid">
          {/* Customer List */}
          <div className="owner-section-card" style={{ gridColumn: selected ? 'auto' : '1 / -1' }}>
            <div className="owner-section-card__header" style={{ flexWrap: 'wrap', gap: 8 }}>
              <span className="owner-section-card__title">Customer List</span>
              <div className="owner-filter-bar">
                <input className="form-input" placeholder="Search name, phone..." value={search} onChange={e => setSearch(e.target.value)} style={{ minWidth: 200, fontSize: 13, padding: '8px 14px' }} id="search-customers" />
                <select className="form-select" value={branchFil} onChange={e => setBranch(e.target.value)} id="filter-cust-branch">
                  <option value="all">All Branches</option>
                  {OWNER_BRANCHES.map(b => <option key={b.id} value={b.id}>{b.name.replace('Artisan Brew — ', '')}</option>)}
                </select>
              </div>
            </div>
            <div className="owner-table-wrap">
              <table className="owner-table">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Phone</th>
                    <th>WhatsApp</th>
                    <th>Orders</th>
                    <th>Total Spending</th>
                    <th>Last Visit</th>
                    <th>Favourite</th>
                    <th>Branch</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0
                    ? <tr><td colSpan={9}><div className="owner-empty"><div className="owner-empty__icon">👥</div><div className="owner-empty__text">No customers found</div></div></td></tr>
                    : filtered.map(c => (
                      <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => setSelected(c.id === selected ? null : c.id)}>
                        <td className="td-name">{c.name}</td>
                        <td className="td-muted">{c.phone}</td>
                        <td style={{ textAlign: 'center' }}>{c.whatsapp ? '✅' : '—'}</td>
                        <td>{c.orders}</td>
                        <td style={{ fontWeight: 500 }}>₹{c.spending.toLocaleString('en-IN')}</td>
                        <td className="td-muted">{c.lastVisit}</td>
                        <td className="td-muted">{c.favourites[0]}</td>
                        <td className="td-muted">{c.branch}</td>
                        <td><button className="owner-icon-btn" title="View Details" onClick={e => { e.stopPropagation(); setSelected(c.id === selected ? null : c.id) }}>👁</button></td>
                      </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Customer Detail Panel */}
          {selected && (() => {
            const c = OWNER_CUSTOMERS.find(x => x.id === selected)
            if (!c) return null
            return (
              <div className="owner-section-card">
                <div className="owner-section-card__header">
                  <span className="owner-section-card__title">Customer Profile</span>
                  <button className="owner-icon-btn" onClick={() => setSelected(null)} title="Close">✕</button>
                </div>
                <div className="owner-customer-detail">
                  <div className="owner-customer-info">
                    <div className="owner-customer-avatar">{c.name[0]}</div>
                    <div>
                      <div className="owner-customer-name">{c.name}</div>
                      <div className="owner-customer-meta">
                        <span className="owner-customer-meta-item">📞 {c.phone}</span>
                        <span className="owner-customer-meta-item">{c.whatsapp ? '✅ WhatsApp' : '—'}</span>
                        <span className="owner-customer-meta-item">📍 {c.branch}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    {[
                      ['Total Orders',    c.orders],
                      ['Total Spending',  `₹${c.spending.toLocaleString('en-IN')}`],
                      ['Avg Order Value', `₹${Math.round(c.spending / (c.orders || 1)).toLocaleString('en-IN')}`],
                      ['Last Visit',      c.lastVisit],
                    ].map(([label, value]) => (
                      <div key={label} className="owner-kpi-card" style={{ padding: '12px 14px' }}>
                        <div className="owner-kpi-card__label">{label}</div>
                        <div className="owner-kpi-card__value" style={{ fontSize: 18 }}>{value}</div>
                      </div>
                    ))}
                  </div>

                  <div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Favourite Items</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {c.favourites.map(fav => (
                        <span key={fav} className="owner-badge owner-badge--idle" style={{ fontSize: 11, padding: '4px 10px' }}>{fav}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )
          })()}
        </div>

      </div>
    </AdminLayout>
  )
}
