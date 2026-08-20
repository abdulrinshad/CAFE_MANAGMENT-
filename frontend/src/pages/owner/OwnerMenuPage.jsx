import { useState } from 'react'
import AdminLayout from '../../layouts/AdminLayout'
import Modal from '../../components/Modal'
import { OWNER_MENU_ITEMS, OWNER_MENU_CATEGORIES, OWNER_BRANCHES } from '../../data/ownerMockData'
import './owner.css'

const EMPTY_FORM = { name: '', category: 'Hot Coffee', price: '', branches: [], status: 'active' }

export default function OwnerMenuPage() {
  const [items,     setItems]   = useState(OWNER_MENU_ITEMS)
  const [catFilter, setCat]     = useState('All')
  const [search,    setSearch]  = useState('')
  const [modal,     setModal]   = useState(false)
  const [editing,   setEditing] = useState(null)
  const [form,      setForm]    = useState(EMPTY_FORM)

  const allCats = ['All', ...OWNER_MENU_CATEGORIES]

  const filtered = items.filter(i => {
    const matchCat    = catFilter === 'All' || i.category === catFilter
    const matchSearch = !search || i.name.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  const openAdd  = () => { setForm(EMPTY_FORM); setEditing(null); setModal(true) }
  const openEdit = (item) => {
    setForm({ name: item.name, category: item.category, price: item.price, branches: item.branches, status: item.status })
    setEditing(item.id)
    setModal(true)
  }
  const closeModal = () => { setModal(false); setEditing(null) }

  const handleSave = () => {
    if (!form.name.trim() || !form.price) return
    if (editing) {
      setItems(prev => prev.map(i => i.id === editing ? { ...i, ...form, price: Number(form.price) } : i))
    } else {
      setItems(prev => [...prev, { id: Date.now(), ...form, price: Number(form.price) }])
    }
    closeModal()
  }

  const toggleItemStatus = (id) => setItems(prev =>
    prev.map(i => i.id === id ? { ...i, status: i.status === 'active' ? 'inactive' : 'active' } : i)
  )

  const toggleBranch = (branchId) => {
    setForm(prev => ({
      ...prev,
      branches: prev.branches.includes(branchId)
        ? prev.branches.filter(b => b !== branchId)
        : [...prev.branches, branchId],
    }))
  }

  const f = (key) => (e) => setForm(prev => ({ ...prev, [key]: e.target.value }))

  return (
    <AdminLayout pageTitle="Menu" pageIcon="☕">
      <div className="owner-page">

        {/* Header */}
        <div className="owner-page-header">
          <div className="owner-page-header__left">
            <h1 className="owner-page-header__title">Menu</h1>
            <p className="owner-page-header__sub">Manage products, pricing, and branch availability.</p>
          </div>
          <div className="owner-page-header__actions">
            <button className="btn-primary" id="btn-add-menu-item" onClick={openAdd}>+ Add Product</button>
          </div>
        </div>

        {/* Category Tabs + Filters */}
        <div className="owner-section-card">
          <div className="owner-tab-bar">
            {allCats.map(c => (
              <button key={c} className={`owner-tab${catFilter === c ? ' owner-tab--active' : ''}`} onClick={() => setCat(c)} id={`menu-cat-${c.toLowerCase().replace(/\s/g,'-')}`}>{c}</button>
            ))}
          </div>

          <div className="owner-section-card__header" style={{ borderBottom: 'none' }}>
            <div className="owner-filter-bar">
              <input className="form-input" placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} style={{ minWidth: 220, fontSize: 13, padding: '8px 14px' }} id="search-menu" />
            </div>
            <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{filtered.length} products</span>
          </div>

          <div className="owner-table-wrap">
            <table className="owner-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Branch Availability</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0
                  ? <tr><td colSpan={6}><div className="owner-empty"><div className="owner-empty__icon">☕</div><div className="owner-empty__text">No products found</div></div></td></tr>
                  : filtered.map(item => (
                    <tr key={item.id}>
                      <td className="td-name">{item.name}</td>
                      <td className="td-muted">{item.category}</td>
                      <td style={{ fontWeight: 500 }}>₹{item.price}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {item.branches.map(bid => {
                            const b = OWNER_BRANCHES.find(br => br.id === bid)
                            return b ? <span key={bid} className="owner-badge owner-badge--idle" style={{ fontSize: 9 }}>{b.name.replace('Artisan Brew — ', '')}</span> : null
                          })}
                        </div>
                      </td>
                      <td><span className={`owner-badge owner-badge--${item.status}`}>{item.status.toUpperCase()}</span></td>
                      <td>
                        <div className="td-actions">
                          <button className="owner-icon-btn" title="Edit" onClick={() => openEdit(item)}>✏️</button>
                          <button
                            className={`owner-icon-btn${item.status === 'active' ? ' owner-icon-btn--danger' : ' owner-icon-btn--primary'}`}
                            title={item.status === 'active' ? 'Disable' : 'Enable'}
                            onClick={() => toggleItemStatus(item.id)}
                          >{item.status === 'active' ? '⏸' : '▶'}</button>
                        </div>
                      </td>
                    </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Modal */}
      <Modal open={modal} onClose={closeModal} title={editing ? 'Edit Product' : 'Add Product'}>
        <div className="owner-form-grid">
          <div className="form-group owner-form-grid--full">
            <label className="form-label">Product Name <span>*</span></label>
            <input className="form-input" placeholder="e.g. Vanilla Latte" value={form.name} onChange={f('name')} id="inp-menu-name" />
          </div>
          <div className="form-group">
            <label className="form-label">Category</label>
            <select className="form-select" value={form.category} onChange={f('category')} id="sel-menu-category">
              {OWNER_MENU_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Price (₹) <span>*</span></label>
            <input className="form-input" type="number" min="0" placeholder="0" value={form.price} onChange={f('price')} id="inp-menu-price" />
          </div>
          <div className="form-group">
            <label className="form-label">Status</label>
            <select className="form-select" value={form.status} onChange={f('status')} id="sel-menu-status">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="form-group owner-form-grid--full">
            <label className="form-label">Branch Availability</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
              {OWNER_BRANCHES.map(b => (
                <label key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.branches.includes(b.id)} onChange={() => toggleBranch(b.id)} />
                  {b.name.replace('Artisan Brew — ', '')}
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="owner-modal-footer">
          <button className="btn-outline" onClick={closeModal}>Cancel</button>
          <button className="btn-primary" onClick={handleSave} id="btn-save-menu">{editing ? 'Save Changes' : 'Add Product'}</button>
        </div>
      </Modal>
    </AdminLayout>
  )
}
