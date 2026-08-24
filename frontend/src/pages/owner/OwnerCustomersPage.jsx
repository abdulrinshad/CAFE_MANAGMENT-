import { useState, useEffect, useCallback, useMemo } from 'react'
import AdminLayout from '../../layouts/AdminLayout'
import { orderApi, branchApi } from '../../api'
import './owner.css'

export default function OwnerCustomersPage() {
  const [orders,  setOrders]         = useState([])
  const [loading, setLoading]        = useState(true)
  const [search,  setSearch]         = useState('')
  const [selectedKey, setSelectedKey] = useState(null)
  const [branchFilter, setBranchFilter] = useState('all')
  const [branches,     setBranches]   = useState([])

  // Fetch all orders from real API
  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      const data = await orderApi.list({ ordering: '-created_at', page_size: 500 })
      const list = Array.isArray(data) ? data : (data.results ?? [])
      setOrders(list)
    } catch (err) {
      console.error('fetchOrders error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchOrders()
    branchApi.list()
      .then(data => setBranches(Array.isArray(data) ? data : (data.results ?? [])))
      .catch(() => {})
  }, [fetchOrders])

  // Apply branch filter to orders before building customer map
  const branchOrders = useMemo(() =>
    branchFilter === 'all'
      ? orders
      : orders.filter(o => String(o.branch) === branchFilter),
  [orders, branchFilter])

  // Build customer records.
  // Key priority: phone number → customer name → 'walk-in-guest'
  // On merge: always promote a better phone / real name from any order in the group.
  const customersList = useMemo(() => {
    const map = new Map()
    branchOrders.forEach(o => {
      const phone = (o.whatsapp_number || '').trim()
      const name  = (o.customer_name  || '').trim()
      const key   = phone || name.toLowerCase() || 'walk-in-guest'

      // Parse items (now returned by the list API)
      const rawItems = Array.isArray(o.items) ? o.items : []
      const items = rawItems.map(item => ({
        name:     item.product_name || item.name || '—',
        qty:      item.quantity     || 1,
        price:    Number(item.unit_price || item.price || 0),
        subtotal: Number(item.subtotal   || 0),
      }))

      const amt      = Number(o.total ?? 0)
      const dateStr  = o.created_at
        ? new Date(o.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
        : 'Recent'
      const timeStr  = o.created_at
        ? new Date(o.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
        : ''
      const tableLabel = o.table_label || o.table || 'Takeaway'
      const statusStr  = (o.status || 'pending').toUpperCase()

      if (map.has(key)) {
        const rec = map.get(key)
        rec.ordersCount += 1
        rec.totalSpend  += amt
        rec.lastVisit    = dateStr   // orders are newest-first; this ends up being the oldest
        // Promote phone if missing on the record
        if (!rec.phone && phone) rec.phone = phone
        // Promote real name if the record was created with a fallback
        if (!rec.hasRealName && name) { rec.name = name; rec.hasRealName = true }
        rec.recentOrders.push({ id: o.id, orderId: o.order_number, table: tableLabel, date: dateStr, time: timeStr, amount: amt, status: statusStr, items })
      } else {
        const displayName = name || (phone ? `Customer (${phone})` : 'Walk-in Guest')
        map.set(key, {
          id:          key,
          name:        displayName,
          hasRealName: !!name,
          phone,
          ordersCount: 1,
          totalSpend:  amt,
          lastVisit:   dateStr,
          recentOrders: [{ id: o.id, orderId: o.order_number, table: tableLabel, date: dateStr, time: timeStr, amount: amt, status: statusStr, items }],
        })
      }
    })
    return Array.from(map.values())
  }, [branchOrders])

  const filtered = customersList.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search)
  )

  const totalCustomers = customersList.length
  const totalSpend     = customersList.reduce((a, c) => a + c.totalSpend, 0)
  const avgSpend       = totalCustomers > 0 ? totalSpend / totalCustomers : 0
  const topCustomer    = [...customersList].sort((a, b) => b.totalSpend - a.totalSpend)[0]

  const selectedCustomer = selectedKey ? customersList.find(c => c.id === selectedKey) : null

  return (
    <AdminLayout pageTitle="Customers" pageIcon="👥">
      <div className="owner-page">

        <div className="owner-page-header">
          <div className="owner-page-header__left">
            <h1 className="owner-page-header__title">Customers</h1>
            <p className="owner-page-header__sub">Customer order history generated from real database orders.</p>
          </div>
        </div>

        {/* KPIs */}
        <div className="owner-kpi-grid">
          <div className="owner-kpi-card">
            <div className="owner-kpi-card__label">Total Customers</div>
            <div className="owner-kpi-card__value">{loading ? '…' : totalCustomers}</div>
          </div>
          <div className="owner-kpi-card">
            <div className="owner-kpi-card__label">Total Spending</div>
            <div className="owner-kpi-card__value">
              {loading ? '…' : `₹${Number(totalSpend).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
            </div>
          </div>
          <div className="owner-kpi-card">
            <div className="owner-kpi-card__label">Avg. Spend / Customer</div>
            <div className="owner-kpi-card__value">
              {loading ? '…' : `₹${Number(avgSpend).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
            </div>
          </div>
          <div className="owner-kpi-card">
            <div className="owner-kpi-card__label">Top Spender</div>
            <div className="owner-kpi-card__value" style={{ fontSize: 16 }}>{loading ? '…' : (topCustomer?.name || '—')}</div>
            {topCustomer && <div className="owner-kpi-card__sub">₹{Number(topCustomer.totalSpend).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>}
          </div>
        </div>

        <div className="owner-detail-grid">

          {/* Customer List */}
          <div className="owner-section-card" style={{ gridColumn: selectedCustomer ? 'auto' : '1 / -1' }}>
            <div className="owner-section-card__header" style={{ flexWrap: 'wrap', gap: 8 }}>
              <span className="owner-section-card__title">Customer Records</span>
              <div className="owner-filter-bar">
                <input
                  className="form-input"
                  placeholder="Search by name or phone…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{ minWidth: 200, fontSize: 13, padding: '8px 14px' }}
                  id="search-customers"
                />
                <select
                  className="form-select"
                  value={branchFilter}
                  onChange={e => { setBranchFilter(e.target.value); setSelectedKey(null) }}
                  style={{ fontSize: 13, padding: '8px 12px', minWidth: 150 }}
                  id="filter-customers-branch"
                >
                  <option value="all">All Branches</option>
                  {branches.filter(b => b.active).map(b => (
                    <option key={b.id} value={String(b.id)}>{b.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="owner-table-wrap">
              <table className="owner-table">
                <thead>
                  <tr>
                    <th>Customer Name</th>
                    <th>Phone Number</th>
                    <th>Orders</th>
                    <th>Total Spent</th>
                    <th>Last Visit</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={6}>
                      <div className="owner-empty"><div className="owner-empty__text">Loading customers…</div></div>
                    </td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={6}>
                      <div className="owner-empty">
                        <div className="owner-empty__icon">👥</div>
                        <div className="owner-empty__text">No customer records found</div>
                      </div>
                    </td></tr>
                  ) : filtered.map(c => (
                    <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedKey(c.id === selectedKey ? null : c.id)}>
                      <td className="td-name">{c.name}</td>
                      <td className="td-muted">{c.phone || '—'}</td>
                      <td>{c.ordersCount}</td>
                      <td style={{ fontWeight: 600 }}>₹{Number(c.totalSpend).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td className="td-muted">{c.lastVisit}</td>
                      <td>
                        <button
                          className="owner-icon-btn"
                          title="View Profile"
                          onClick={e => { e.stopPropagation(); setSelectedKey(c.id === selectedKey ? null : c.id) }}
                        >👁</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Customer Detail Panel */}
          {selectedCustomer && (
            <div className="owner-section-card">
              <div className="owner-section-card__header">
                <span className="owner-section-card__title">Customer Profile</span>
                <button className="owner-icon-btn" onClick={() => setSelectedKey(null)} title="Close">✕</button>
              </div>
              <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* Identity */}
                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-espresso)' }}>{selectedCustomer.name}</div>
                {selectedCustomer.phone && (
                  <div style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>📞 {selectedCustomer.phone}</div>
                )}

                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, margin: '4px 0' }}>
                  <div style={{ background: 'var(--color-cream, #faf7f0)', padding: 10, borderRadius: 8 }}>
                    <div style={{ fontSize: 10, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Orders</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-espresso)' }}>{selectedCustomer.ordersCount}</div>
                  </div>
                  <div style={{ background: 'var(--color-cream, #faf7f0)', padding: 10, borderRadius: 8 }}>
                    <div style={{ fontSize: 10, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total Spent</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-espresso)' }}>₹{Number(selectedCustomer.totalSpend).toLocaleString('en-IN', { minimumFractionDigits: 0 })}</div>
                  </div>
                </div>

                {/* Order History */}
                <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 4 }}>Order History</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 420, overflowY: 'auto' }}>
                  {selectedCustomer.recentOrders.map(o => (
                    <div key={o.id} style={{ border: '1px solid var(--color-border-light)', borderRadius: 8, overflow: 'hidden' }}>
                      {/* Order header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--color-bg-alt, #f9f6f0)', borderBottom: '1px solid var(--color-border-light)' }}>
                        <div>
                          <span style={{ fontWeight: 600, fontSize: 12 }}>{o.orderId || `#${o.id}`}</span>
                          <span style={{ color: 'var(--color-text-muted)', fontSize: 11, marginLeft: 6 }}>{o.table}</span>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 700, fontSize: 13 }}>₹{Number(o.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                          <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>{o.date} {o.time}</div>
                        </div>
                      </div>
                      {/* Items */}
                      {o.items.length > 0 && (
                        <div style={{ padding: '8px 12px' }}>
                          <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                            <thead>
                              <tr style={{ color: 'var(--color-text-muted)' }}>
                                <th style={{ textAlign: 'left', padding: '2px 0', fontWeight: 500 }}>Item</th>
                                <th style={{ textAlign: 'center', padding: '2px 6px', fontWeight: 500 }}>Qty</th>
                                <th style={{ textAlign: 'right', padding: '2px 0', fontWeight: 500 }}>Amount</th>
                              </tr>
                            </thead>
                            <tbody>
                              {o.items.map((item, idx) => (
                                <tr key={idx}>
                                  <td style={{ padding: '3px 0', color: 'var(--color-text-primary)' }}>{item.name}</td>
                                  <td style={{ textAlign: 'center', padding: '3px 6px', color: 'var(--color-text-muted)' }}>×{item.qty}</td>
                                  <td style={{ textAlign: 'right', padding: '3px 0', fontWeight: 600 }}>
                                    ₹{Number(item.subtotal || item.price * item.qty).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

      </div>
    </AdminLayout>
  )
}
