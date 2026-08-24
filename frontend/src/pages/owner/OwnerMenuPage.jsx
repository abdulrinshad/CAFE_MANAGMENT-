import { useState, useEffect, useRef } from 'react'
import AdminLayout from '../../layouts/AdminLayout'
import Modal from '../../components/Modal'
import { useApp } from '../../context/AppContext'
import { productApi } from '../../api'
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

const EMPTY_FORM = {
  name: '', categoryId: '', price: '', description: '', status: 'active',
  existingImageUrl: null,
}

export default function OwnerMenuPage() {
  const { products, categories, addProduct, updateProduct, fetchProducts } = useApp()
  const [catFilter, setCat]       = useState('All')
  const [search,    setSearch]    = useState('')
  const [modal,     setModal]     = useState(false)
  const [editing,   setEditing]   = useState(null)
  const [form,      setForm]      = useState(EMPTY_FORM)
  const [imageFile, setImageFile] = useState(null)         // File object to upload
  const [imagePreview, setImagePreview] = useState(null)   // Object URL or existing URL
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  // Cleanup object URLs to prevent memory leaks
  useEffect(() => {
    return () => {
      if (imagePreview && imagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreview)
      }
    }
  }, [imagePreview])

  const allCats = ['All', ...categories.map(c => c.name)]

  const filtered = products.filter(i => {
    const matchCat    = catFilter === 'All' || (i.category_name && i.category_name.toLowerCase() === catFilter.toLowerCase()) || (i.categoryLabel && i.categoryLabel.toLowerCase() === catFilter.toLowerCase())
    const matchSearch = !search || i.name.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  const openAdd = () => {
    setForm({ ...EMPTY_FORM, categoryId: categories[0]?.id || '' })
    setEditing(null)
    setImageFile(null)
    setImagePreview(null)
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
      existingImageUrl: item.image || null,
    })
    setEditing(item.id)
    setImageFile(null)
    setImagePreview(item.image || null)
    setError(null)
    setModal(true)
  }

  const closeModal = () => {
    setModal(false)
    setEditing(null)
    setError(null)
    setImageFile(null)
    if (imagePreview && imagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreview)
    }
    setImagePreview(null)
  }

  const handleImageChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (imagePreview && imagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreview)
    }
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const handleRemoveImage = () => {
    if (imagePreview && imagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreview)
    }
    setImageFile(null)
    setImagePreview(null)
    setForm(prev => ({ ...prev, existingImageUrl: null }))
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSave = async () => {
    if (!form.name.trim() || !form.price) {
      setError('Product name and price are required.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      let payload

      if (imageFile) {
        // Build FormData for image upload
        payload = new FormData()
        payload.append('name', form.name.trim())
        if (form.categoryId) payload.append('category', form.categoryId)
        payload.append('price', Number(form.price))
        payload.append('description', form.description || '')
        payload.append('available', form.status === 'active' ? 'true' : 'false')
        payload.append('sold_out', form.status !== 'active' ? 'true' : 'false')
        payload.append('image', imageFile)
        if (!editing) {
          payload.append('available_on_pos', 'true')
          payload.append('available_on_qr', 'true')
        }
      } else {
        // Plain JSON (no image change)
        payload = {
          name: form.name.trim(),
          category: form.categoryId || undefined,
          price: Number(form.price),
          description: form.description,
          available: form.status === 'active',
          sold_out: form.status !== 'active',
        }
        if (!editing) {
          payload.available_on_pos = true
          payload.available_on_qr  = true
          payload.sold_out = false
        }
        // If image was explicitly removed on edit, send null
        if (editing && form.existingImageUrl === null) {
          // Use FormData to send image='' to clear it
          const fd = new FormData()
          Object.entries(payload).forEach(([k, v]) => fd.append(k, v))
          fd.append('image', '')
          payload = fd
        }
      }

      if (editing) {
        await updateProduct(editing, payload)
      } else {
        await addProduct(payload)
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
                  <th style={{ width: 52 }}>Image</th>
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
                    <td colSpan={6}>
                      <div className="owner-empty">
                        <div className="owner-empty__icon">☕</div>
                        <div className="owner-empty__text">No products found in database</div>
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
            <label className="form-label">Product Image</label>
            <div style={{
              border: '2px dashed var(--color-border)',
              borderRadius: 10,
              padding: 16,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 10,
              background: 'var(--color-bg-alt, #faf8f5)',
              transition: 'border-color 0.2s',
            }}>
              {imagePreview ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                  <img
                    src={imagePreview}
                    alt="Preview"
                    style={{ width: 180, height: 120, objectFit: 'cover', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}
                    onError={e => { e.target.src = ''; e.target.style.display = 'none' }}
                  />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      className="btn-outline"
                      style={{ fontSize: 12, padding: '5px 12px' }}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Change Image
                    </button>
                    <button
                      type="button"
                      style={{ fontSize: 12, padding: '5px 12px', background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5', borderRadius: 6, cursor: 'pointer' }}
                      onClick={handleRemoveImage}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>
                  <div style={{ fontSize: 28, marginBottom: 4 }}>📷</div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>Drop an image or click to upload</div>
                  <div style={{ fontSize: 11, marginTop: 2 }}>JPG, PNG, WebP — max 5MB</div>
                  <button
                    type="button"
                    className="btn-outline"
                    style={{ fontSize: 12, padding: '5px 14px', marginTop: 10 }}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Choose File
                  </button>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleImageChange}
                id="inp-menu-image"
              />
            </div>
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
