import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminLayout from '../layouts/AdminLayout'
import { useApp } from '../context/AppContext'
import './AddProductPage.css'

const DIETARY_OPTIONS = ['Vegan', 'Gluten-Free', 'Contains Nuts', 'Dairy-Free', 'Spicy', 'Halal']

export default function AddProductPage() {
  const navigate = useNavigate()
  const { addProduct, categories } = useApp()

  const [form, setForm] = useState({
    name: '',
    categoryId: '',
    displayOrder: 0,
    description: '',
    price: '',
    tax: '',
    available: true,
    popular: false,
    dietaryTags: [],
    imageFile: null,
    imagePreview: null,
    availableOnPOS: true,
    availableOnQR: true,
  })
  const [errors,  setErrors]  = useState({})
  const [saving,  setSaving]  = useState(false)
  const [apiErr,  setApiErr]  = useState(null)

  const set = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }))
    if (errors[field]) setErrors((e) => ({ ...e, [field]: '' }))
  }

  const toggleTag = (tag) => {
    setForm((f) => ({
      ...f,
      dietaryTags: f.dietaryTags.includes(tag)
        ? f.dietaryTags.filter((t) => t !== tag)
        : [...f.dietaryTags, tag],
    }))
  }

  const handleImage = (e) => {
    const file = e.target.files[0]
    if (!file) return
    set('imageFile', file)
    set('imagePreview', URL.createObjectURL(file))
  }

  const validate = () => {
    const e = {}
    if (!form.name.trim())                                    e.name     = 'Product name is required'
    if (!form.categoryId)                                     e.category = 'Please select a category'
    if (!form.price || isNaN(form.price) || Number(form.price) <= 0) e.price = 'Enter a valid price'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setSaving(true)
    setApiErr(null)
    try {
      // Build FormData so we can include the image file
      const fd = new FormData()
      fd.append('name',             form.name.trim())
      fd.append('category',         form.categoryId)
      fd.append('price',            Number(form.price))
      fd.append('tax',              Number(form.tax) || 0)
      fd.append('description',      form.description)
      fd.append('available',        form.available)
      fd.append('popular',          form.popular)
      fd.append('display_order',    Number(form.displayOrder) || 0)
      fd.append('dietary_tags',     JSON.stringify(form.dietaryTags))
      fd.append('available_on_pos', form.availableOnPOS)
      fd.append('available_on_qr',  form.availableOnQR)
      fd.append('sold_out',         false)
      if (form.imageFile) {
        fd.append('image', form.imageFile)
      }

      await addProduct(fd)
      navigate('/menu')
    } catch (err) {
      console.error('Create product error:', err)
      setApiErr(err.message || 'Failed to create product. Is the Django server running?')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AdminLayout searchPlaceholder="Search products, or...">
      <div className="add-product-page">
        {/* Page Header */}
        <div className="add-product-page__header">
          <div>
            <h1 className="add-product-page__title">Add Product</h1>
            <p className="add-product-page__sub">Create a new item for your digital menu.</p>
          </div>
          <div className="add-product-page__actions">
            <button className="btn-ghost" onClick={() => navigate('/menu')} id="cancel-add">Cancel</button>
            <button className="btn-primary" onClick={handleSubmit} disabled={saving} id="create-product">
              {saving ? 'Saving…' : 'Create Product'}
            </button>
          </div>
        </div>

        {/* API error banner */}
        {apiErr && (
          <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, padding: '12px 16px', marginBottom: 20, color: '#991b1b', fontSize: 14 }}>
            ⚠️ {apiErr}
          </div>
        )}

        {/* Two-column layout */}
        <div className="add-product-page__body">
          {/* LEFT COLUMN */}
          <div className="add-product-page__left">
            {/* Basic Details */}
            <div className="form-card">
              <h2 className="form-card__title">Basic Details</h2>
              <hr className="form-card__divider" />

              <div className="form-group">
                <label className="form-label" htmlFor="prod-name">
                  Product Name <span>*</span>
                </label>
                <input
                  id="prod-name"
                  className={`form-input${errors.name ? ' form-input--error' : ''}`}
                  placeholder="e.g. Artisanal Espresso Blend"
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                />
                {errors.name && <span className="form-error">{errors.name}</span>}
              </div>

              <div className="form-row">
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label" htmlFor="prod-cat">
                    Category <span>*</span>
                  </label>
                  <select
                    id="prod-cat"
                    className={`form-select${errors.category ? ' form-input--error' : ''}`}
                    value={form.categoryId}
                    onChange={(e) => set('categoryId', e.target.value)}
                  >
                    <option value="">Select a category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  {errors.category && <span className="form-error">{errors.category}</span>}
                </div>
                <div className="form-group" style={{ width: 140 }}>
                  <label className="form-label" htmlFor="prod-order">Display Order</label>
                  <input
                    id="prod-order"
                    className="form-input"
                    type="number"
                    placeholder="0"
                    value={form.displayOrder}
                    onChange={(e) => set('displayOrder', e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="prod-desc">Description</label>
                <textarea
                  id="prod-desc"
                  className="form-textarea"
                  placeholder="Describe the flavor profile, origin, or ingredients..."
                  value={form.description}
                  onChange={(e) => set('description', e.target.value)}
                  rows={4}
                />
              </div>
            </div>

            {/* Pricing */}
            <div className="form-card">
              <h2 className="form-card__title">Pricing</h2>
              <hr className="form-card__divider" />
              <div className="form-row">
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label" htmlFor="prod-price">
                    Price (₹) <span>*</span>
                  </label>
                  <div className="input-prefix-wrap">
                    <span className="input-prefix">₹</span>
                    <input
                      id="prod-price"
                      className={`form-input input-prefix-pad${errors.price ? ' form-input--error' : ''}`}
                      type="number"
                      placeholder="0.00"
                      value={form.price}
                      onChange={(e) => set('price', e.target.value)}
                    />
                  </div>
                  {errors.price && <span className="form-error">{errors.price}</span>}
                </div>
                <div className="form-group" style={{ width: 140 }}>
                  <label className="form-label" htmlFor="prod-tax">Tax / GST (%)</label>
                  <div className="input-suffix-wrap">
                    <input
                      id="prod-tax"
                      className="form-input input-suffix-pad"
                      type="number"
                      placeholder="0.0"
                      value={form.tax}
                      onChange={(e) => set('tax', e.target.value)}
                    />
                    <span className="input-suffix">%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="add-product-page__right">
            {/* Media */}
            <div className="form-card">
              <h2 className="form-card__title">Media</h2>
              <label className="upload-area" htmlFor="prod-image">
                {form.imagePreview ? (
                  <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <img src={form.imagePreview} alt="Preview" className="upload-area__preview" style={{ maxHeight: 200, objectFit: 'contain' }} />
                    <div style={{ marginTop: 12, display: 'flex', gap: 10 }}>
                      <span className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: 13, background: 'rgba(0,0,0,0.05)', borderRadius: 4, color: '#333' }}>Change</span>
                      <button type="button" className="btn btn-danger" style={{ padding: '6px 12px', fontSize: 13 }} onClick={(e) => { e.preventDefault(); set('imageFile', null); set('imagePreview', null); }}>Remove</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="upload-area__icon"><UploadIcon /></div>
                    <p className="upload-area__label">Click to upload image</p>
                    <p className="upload-area__hint">SVG, PNG, JPG or GIF (max. 5MB)</p>
                    <p className="upload-area__hint">Recommended 1:1 aspect ratio</p>
                  </>
                )}
                <input id="prod-image" type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImage} />
              </label>
            </div>

            {/* Visibility & Status */}
            <div className="form-card">
              <h2 className="form-card__title">Visibility &amp; Status</h2>
              <hr className="form-card__divider" />

              <div className="toggle-row">
                <div>
                  <div className="toggle-row__label">Available</div>
                  <div className="toggle-row__sub">Show this product on the menu</div>
                </div>
                <ToggleSwitch active={form.available} onToggle={() => set('available', !form.available)} id="toggle-available" />
              </div>

              <div className="toggle-row">
                <div>
                  <div className="toggle-row__label">Popular / Featured</div>
                  <div className="toggle-row__sub">Highlight product on the top menu</div>
                </div>
                <ToggleSwitch active={form.popular} onToggle={() => set('popular', !form.popular)} id="toggle-popular" />
              </div>

              <div className="toggle-row">
                <div>
                  <div className="toggle-row__label">Available on POS</div>
                  <div className="toggle-row__sub">Visible on staff POS terminal</div>
                </div>
                <ToggleSwitch active={form.availableOnPOS} onToggle={() => set('availableOnPOS', !form.availableOnPOS)} id="toggle-pos" />
              </div>

              <div className="toggle-row">
                <div>
                  <div className="toggle-row__label">Available on QR Menu</div>
                  <div className="toggle-row__sub">Customers can view digitally</div>
                </div>
                <ToggleSwitch active={form.availableOnQR} onToggle={() => set('availableOnQR', !form.availableOnQR)} id="toggle-qr" />
              </div>

              <div className="form-group" style={{ marginTop: 12 }}>
                <div className="toggle-row__label">Dietary Tags</div>
                <div className="tag-grid">
                  {DIETARY_OPTIONS.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      className={`tag-btn${form.dietaryTags.includes(tag) ? ' tag-btn--active' : ''}`}
                      onClick={() => toggleTag(tag)}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}

/* ── Reusable Toggle ── */
function ToggleSwitch({ active, onToggle, id }) {
  return (
    <button
      className={`toggle-switch${active ? ' toggle-switch--active' : ''}`}
      onClick={onToggle}
      id={id}
      role="switch"
      aria-checked={active}
    >
      <span className="toggle-switch__knob" />
    </button>
  )
}

function UploadIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
    </svg>
  )
}
