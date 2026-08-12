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
    category: '',
    displayOrder: 0,
    description: '',
    price: '',
    tax: '',
    available: true,
    popular: false,
    dietaryTags: [],
    image: null,
    imagePreview: null,
    availableOnPOS: true,
    availableOnQR: true,
  })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

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
    const url = URL.createObjectURL(file)
    set('imagePreview', url)
  }

  const validate = () => {
    const e = {}
    if (!form.name.trim()) e.name = 'Product name is required'
    if (!form.category) e.category = 'Please select a category'
    if (!form.price || isNaN(form.price) || Number(form.price) <= 0) e.price = 'Enter a valid price'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = () => {
    if (!validate()) return
    setSaving(true)
    setTimeout(() => {
      addProduct({
        name: form.name,
        category: form.category,
        categoryLabel: form.category.toUpperCase(),
        displayOrder: Number(form.displayOrder) || 0,
        description: form.description,
        price: Number(form.price),
        tax: Number(form.tax) || 0,
        available: form.available,
        popular: form.popular,
        dietaryTags: form.dietaryTags,
        image: form.imagePreview || '/espresso.png',
        availableOnPOS: form.availableOnPOS,
        availableOnQR: form.availableOnQR,
        soldOut: false,
      })
      setSaving(false)
      navigate('/menu')
    }, 500)
  }

  const catNames = categories.map((c) => c.name)

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
                    value={form.category}
                    onChange={(e) => set('category', e.target.value)}
                  >
                    <option value="">Select a category</option>
                    {catNames.map((c) => <option key={c} value={c}>{c}</option>)}
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
                  <img src={form.imagePreview} alt="Preview" className="upload-area__preview" />
                ) : (
                  <>
                    <div className="upload-area__icon">
                      <UploadIcon />
                    </div>
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
                <ToggleSwitch
                  active={form.available}
                  onToggle={() => set('available', !form.available)}
                  id="toggle-available"
                />
              </div>

              <div className="toggle-row">
                <div>
                  <div className="toggle-row__label">Popular / Featured</div>
                  <div className="toggle-row__sub">Highlight product on the top menu</div>
                </div>
                <ToggleSwitch
                  active={form.popular}
                  onToggle={() => set('popular', !form.popular)}
                  id="toggle-popular"
                />
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
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <circle cx="8.5" cy="8.5" r="1.5"/>
      <polyline points="21 15 16 10 5 21"/>
    </svg>
  )
}
