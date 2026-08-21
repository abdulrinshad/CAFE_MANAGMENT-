import { useState, useMemo } from 'react'
import AdminLayout from '../../layouts/AdminLayout'
import { useApp } from '../../context/AppContext'
import './owner.css'

export default function OwnerCustomersPage() {
  const { orders } = useApp()
  const [search, setSearch] = useState('')
  const [selectedPhone, setSelectedPhone] = useState(null)

  const customersList = useMemo(() => {
    const map = new Map()
    orders.forEach(o => {
      const phone = o.whatsapp_number || o.whatsapp || o.customer_name || 'Walk-in Guest'
      const key = phone.toLowerCase()
      const name = o.customer_name || (phone.startsWith('+') ? phone : `Guest (${phone})`)
      const amt = Number(o.amount) || Number(o.total) || 0
      const dateStr = o.time || (o.created_at ? new Date(o.created_at).toLocaleDateString('en-IN') : 'Recent')

      if (map.has(key)) {
        const item = map.get(key)
        item.ordersCount += 1
        item.totalSpend += amt
        item.lastVisit = dateStr
        item.recentOrders.push(o)
      } else {
        map.set(key, {
          id: key,
          name,
          phone: o.whatsapp_number || '—',
          whatsapp: !!o.whatsapp_number,
          ordersCount: 1,
          totalSpend: amt,
          lastVisit: dateStr,
          table: o.table || 'Takeaway',
          recentOrders: [o],
        })
      }
    })
    return Array.from(map.values())
  }, [orders])

  const filtered = customersList.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search)
  )

  const totalCustomers = customersList.length
  const totalSpend = customersList.reduce((a, c) => a + c.totalSpend, 0)
  const avgSpend = totalCustomers > 0 ? totalSpend / totalCustomers : 0
  const topCustomer = [...customersList].sort((a, b) => b.totalSpend - a.totalSpend)[0]

  return (
    <AdminLayout pageTitle="Customers" pageIcon="👥">
      <div className="owner-page">

        <div className="owner-page-header">
          <div className="owner-page-header__left">
            <h1 className="owner-page-header__title">Customers</h1>
            <p className="owner-page-header__sub">Customer order history and spending generated from database orders.</p>
          </div>
        </div>

        {/* KPIs */}
        <div className="owner-kpi-grid">
          <div className="owner-kpi-card">
            <div className="owner-kpi-card__label">Total Customers</div>
            <div className="owner-kpi-card__value">{totalCustomers}</div>
          </div>
          <div className="owner-kpi-card">
            <div className="owner-kpi-card__label">Total Spending</div>
            <div className="owner-kpi-card__value">₹{Number(totalSpend).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          </div>
          <div className="owner-kpi-card">
            <div className="owner-kpi-card__label">Avg. Spend / Customer</div>
            <div className="owner-kpi-card__value">₹{Number(avgSpend).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          </div>
          <div className="owner-kpi-card">
            <div className="owner-kpi-card__label">Top Spender</div>
            <div className="owner-kpi-card__value" style={{ fontSize: 16 }}>{topCustomer?.name || '—'}</div>
            {topCustomer && <div className="owner-kpi-card__sub">₹{Number(topCustomer.totalSpend).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>}
          </div>
        </div>

        <div className="owner-detail-grid">
          {/* Customer List */}
          <div className="owner-section-card" style={{ gridColumn: selectedPhone ? 'auto' : '1 / -1' }}>
            <div className="owner-section-card__header" style={{ flexWrap: 'wrap', gap: 8 }}>
              <span className="owner-section-card__title">Database Customer Records</span>
              <div className="owner-filter-bar">
                <input
                  className="form-input"
                  placeholder="Search customer name, phone..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{ minWidth: 220, fontSize: 13, padding: '8px 14px' }}
                  id="search-customers"
                />
              </div>
            </div>
            <div className="owner-table-wrap">
              <table className="owner-table">
                <thead>
                  <tr>
                    <th>Customer Name</th>
                    <th>Phone / WhatsApp</th>
                    <th>Orders</th>
                    <th>Total Spending</th>
                    <th>Last Order</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={6}>
                        <div className="owner-empty">
                          <div className="owner-empty__icon">👥</div>
                          <div className="owner-empty__text">No customer orders found in database</div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filtered.map(c => (
                      <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedPhone(c.id === selectedPhone ? null : c.id)}>
                        <td className="td-name">{c.name}</td>
                        <td className="td-muted">{c.phone}</td>
                        <td>{c.ordersCount}</td>
                        <td style={{ fontWeight: 600 }}>₹{Number(c.totalSpend).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        <td className="td-muted">{c.lastVisit}</td>
                        <td>
                          <button className="owner-icon-btn" title="View Profile" onClick={e => { e.stopPropagation(); setSelectedPhone(c.id === selectedPhone ? null : c.id) }}>👁</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Selected Customer Panel */}
          {selectedPhone && (() => {
            const c = customersList.find(x => x.id === selectedPhone)
            if (!c) return null
            return (
              <div className="owner-section-card">
                <div className="owner-section-card__header">
                  <span className="owner-section-card__title">Customer Profile</span>
                  <button className="owner-icon-btn" onClick={() => setSelectedPhone(null)} title="Close">✕</button>
                </div>
                <div className="owner-customer-detail" style={{ padding: 20 }}>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{c.name}</div>
                  <div style={{ color: 'var(--color-text-muted)', fontSize: 13, margin: '4px 0 16px' }}>Phone: {c.phone}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                    <div style={{ background: 'var(--color-bg-subtle, #f9f6f0)', padding: 12, borderRadius: 8 }}>
                      <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Orders</div>
                      <div style={{ fontSize: 18, fontWeight: 700 }}>{c.ordersCount}</div>
                    </div>
                    <div style={{ background: 'var(--color-bg-subtle, #f9f6f0)', padding: 12, borderRadius: 8 }}>
                      <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Spent</div>
                      <div style={{ fontSize: 18, fontWeight: 700 }}>₹{Number(c.totalSpend).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                    </div>
                  </div>
                  <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Order History:</h4>
                  {c.recentOrders.map(o => (
                    <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px dotted var(--color-border-subtle, #eee)' }}>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600 }}>{o.orderId || `ORD-${o.id}`} &middot; {o.table}</div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{o.time}</div>
                      </div>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>₹{Number(o.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}
        </div>

      </div>
    </AdminLayout>
  )
}
