import { useState, useEffect } from 'react'
import AdminLayout from '../../layouts/AdminLayout'
import Modal from '../../components/Modal'
import { useApp } from '../../context/AppContext'
import './owner.css'

const EMPTY_FORM = { name: '', categoryId: '', price: '', description: '', status: 'active' }

export default function OwnerMenuPage() {
  const { products, categories, addProduct, updateProduct, fetchProducts } = useApp()
  const [catFilter, setCat]     = useState('All')
  const [search,    setSearch]  = useState('')
  const [modal,     setModal]   = useState(false)
  const [editing,   setEditing] = useState(null)
  const [form,      setForm]    = useState(EMPTY_FORM)
  const [saving,    setSaving]  = useState(false)
  const [error,     setError]   = useState(null)

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  const allCats = ['All', ...categories.map(c => c.name)]

  const filtered = products.filter(i => {
    const matchCat    = catFilter === 'All' || (i.category_name && i.category_name.toLowerCase() === catFilter.toLowerCase()) || (i.categoryLabel && i.categoryLabel.toLowerCase() === catFilter.toLowerCase())
    const matchSearch = !search || i.name.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  const openAdd = () => {
    setForm({ ...EMPTY_FORM, categoryId: categories[0]?.id || '' })
    setEditing(null)
    setError(null)
    setModal(true)
  }

  const openEdit = (item) => {
    setForm({
      name: item.name,
      categoryId: item.category || categories[0]?.id || '',
      price: item.price,
      description: item.description || '',
      status: item.available ? 'active' : 'inactive',
    })
    setEditing(item.id)
    setError(null)
    setModal(true)
  }

  const closeModal = () => {
    setModal(false)
    setEditing(null)
    setError(null)
  }

  const handleSave = async () => {
    if (!form.name.trim() || !form.price) {
      setError('Product name and price are required.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      if (editing) {
        await updateProduct(editing, {
          name: form.name.trim(),
          category: form.categoryId || undefined,
          price: Number(form.price),
          description: form.description,
          available: form.status === 'active',
          sold_out: form.status !== 'active',
        })
      } else {
        await addProduct({
          name: form.name.trim(),
          category: form.categoryId || (categories[0]?.id || undefined),
          price: Number(form.price),
          description: form.description,
          available: form.status === 'active',
          available_on_pos: true,
          available_on_qr: true,
          sold_out: false,
        })
      }
      await fetchProducts()
      closeModal()
    } catch (err) {
      console.error('Save product error:', err)
      setError(err.message || 'Failed to save product to database.')
    } finally {
      setSaving(false)
    }
  }

  const toggleItemStatus = async (item) => {
    try {
      await updateProduct(item.id, {
        available: !item.available,
        sold_out: item.available,
      })
      await fetchProducts()
    } catch (err) {
      console.error('Toggle product error:', err)
    }
  }

  const f = (key) => (e) => setForm(prev => ({ ...prev, [key]: e.target.value }))

  return (
    <AdminLayout pageTitle="Menu" pageIcon="☕">
      <div className="owner-page">

        {/* Header */}
        <div className="owner-page-header">
          <div className="owner-page-header__left">
            <h1 className="owner-page-header__title">Menu</h1>
            <p className="owner-page-header__sub">Manage live products, pricing, and branch availability.</p>
          </div>
          <div className="owner-page-header__actions">
            <button className="btn-primary" id="btn-add-menu-item" onClick={openAdd}>+ Add Product</button>
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
                  <th>Product</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5}>
                      <div className="owner-empty">
                        <div className="owner-empty__icon">☕</div>
                        <div className="owner-empty__text">No products found in database</div>
                      </div>
                    </td>
                  </tr>
                ) : filtered.map(item => (
                  <tr key={item.id}>
                    <td className="td-name">{item.name}</td>
                    <td className="td-muted">{item.category_name || item.categoryLabel || 'Default'}</td>
                    <td style={{ fontWeight: 500 }}>₹{Number(item.price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td>
                      <span className={`owner-badge owner-badge--${item.available ? 'active' : 'inactive'}`}>
                        {item.available ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </td>
                    <td>
                      <div className="td-actions">
                        <button className="owner-icon-btn" title="Edit" onClick={() => openEdit(item)}>✏️</button>
                        <button
                          className={`owner-icon-btn${item.available ? ' owner-icon-btn--danger' : ' owner-icon-btn--primary'}`}
                          title={item.available ? 'Disable' : 'Enable'}
                          onClick={() => toggleItemStatus(item)}
                        >
                          {item.available ? '⏸' : '▶'}
                        </button>
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
        {error && (
          <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 6, padding: '8px 12px', color: '#991b1b', fontSize: 13, marginBottom: 14 }}>
            {error}
          </div>
        )}
        <div className="owner-form-grid">
          <div className="form-group owner-form-grid--full">
            <label className="form-label">Product Name <span>*</span></label>
            <input className="form-input" placeholder="e.g. Vanilla Latte" value={form.name} onChange={f('name')} id="inp-menu-name" />
          </div>
          <div className="form-group">
            <label className="form-label">Category</label>
            <select className="form-select" value={form.categoryId} onChange={f('categoryId')} id="sel-menu-category">
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Price (₹) <span>*</span></label>
            <input className="form-input" type="number" min="0" placeholder="0" value={form.price} onChange={f('price')} id="inp-menu-price" />
          </div>
          <div className="form-group owner-form-grid--full">
            <label className="form-label">Description</label>
            <textarea className="form-input" rows={2} placeholder="Product details..." value={form.description} onChange={f('description')} />
          </div>
          <div className="form-group owner-form-grid--full">
            <label className="form-label">Status</label>
            <select className="form-select" value={form.status} onChange={f('status')} id="sel-menu-status">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
        <div className="owner-modal-footer">
          <button className="btn-outline" onClick={closeModal}>Cancel</button>
          <button className="btn-primary" onClick={handleSave} id="btn-save-menu" disabled={saving}>
            {saving ? 'Saving…' : (editing ? 'Save Changes' : 'Add Product')}
          </button>
        </div>
      </Modal>
    </AdminLayout>
  )
}
