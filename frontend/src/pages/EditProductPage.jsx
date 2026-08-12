import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import ConfirmModal from '../components/ConfirmModal'
import './EditProductPage.css'

export default function EditProductPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { products, updateProduct, deactivateProduct, categories } = useApp()

  const product = products.find((p) => String(p.id) === id)

  const [form, setForm] = useState(null)
  const [confirmDeactivate, setConfirmDeactivate] = useState(false)
  const [saving, setSaving] = useState(false)
  const [imagePreview, setImagePreview] = useState(null)

  useEffect(() => {
    if (product) {
      setForm({
        name:           product.name,
        category:       product.category,
        price:          product.price,
        tax:            product.tax ?? 0,
        description:    product.description || '',
        available:      product.available,
        availableOnPOS: product.availableOnPOS ?? true,
        availableOnQR:  product.availableOnQR  ?? true,
      })
      setImagePreview(product.image || null)
    }
  }, [product])

  if (!product || !form) {
    return (
      <div className="edit-product-wrap">
        <div className="edit-product-not-found">
          <p>Product not found.</p>
          <button className="btn-primary" onClick={() => navigate('/menu')}>Back to Menu</button>
        </div>
      </div>
    )
  }

  const set = (field, val) => setForm((f) => ({ ...f, [field]: val }))

  const handleImage = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setImagePreview(URL.createObjectURL(file))
  }

  const handleSave = () => {
    setSaving(true)
    setTimeout(() => {
      updateProduct(product.id, {
        ...form,
        price: Number(form.price),
        tax:   Number(form.tax),
        image: imagePreview,
        categoryLabel: form.category.toUpperCase(),
      })
      setSaving(false)
      navigate('/menu')
    }, 500)
  }

  const handleDeactivate = () => {
    deactivateProduct(product.id)
    navigate('/menu')
  }

  const catNames = categories.map((c) => c.name)

  return (
    <div className="edit-product-wrap">
      {/* Top bar */}
      <div className="edit-product-topbar">
        <div className="edit-product-topbar__left">
          <button className="edit-product-back" onClick={() => navigate('/menu')} aria-label="Back">
            <ArrowLeftIcon />
          </button>
          <div>
            <p className="edit-product-topbar__label">MENU MANAGEMENT</p>
            <h1 className="edit-product-topbar__title">Edit Product</h1>
          </div>
        </div>
        <div className="edit-product-topbar__actions">
          <button className="btn-ghost" onClick={() => navigate('/menu')} id="cancel-edit">Cancel</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving} id="save-changes">
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="edit-product-content">
        {/* Basic Details */}
        <div className="ep-card">
          <h2 className="ep-card__section-title">Basic Details</h2>

          <div className="form-group">
            <label className="form-label" htmlFor="ep-name">Product Name</label>
            <input
              id="ep-name"
              className="form-input"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
            />
          </div>

          <div className="form-row">
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label" htmlFor="ep-cat">Category</label>
              <select
                id="ep-cat"
                className="form-select"
                value={form.category}
                onChange={(e) => set('category', e.target.value)}
              >
                {catNames.map((c) => <option key={c} value={c}>{c}</option>)}
                <option value="Hot Coffee">Hot Coffee</option>
                <option value="Cold Beverage">Cold Beverage</option>
              </select>
            </div>
            <div className="form-group" style={{ width: 150 }}>
              <label className="form-label" htmlFor="ep-price">Price ($)</label>
              <input
                id="ep-price"
                className="form-input"
                type="number"
                value={form.price}
                onChange={(e) => set('price', e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="ep-desc">Description (Menu Display)</label>
            <textarea
              id="ep-desc"
              className="form-textarea"
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              rows={4}
            />
          </div>
        </div>

        {/* Media */}
        <div className="ep-card">
          <h2 className="ep-card__section-title">Media</h2>
          <div className="ep-media-row">
            {imagePreview && (
              <div className="ep-media-current">
                <img src={imagePreview} alt="Current" />
              </div>
            )}
            <label className="upload-area ep-upload" htmlFor="ep-image">
              <div className="upload-area__icon">
                <UploadCloudIcon />
              </div>
              <p className="upload-area__label">Click to upload new image</p>
              <p className="upload-area__hint">PNG, JPG or WEBP (Max 5MB)</p>
              <p className="upload-area__hint">Recommended size: 1080×1080px</p>
              <input id="ep-image" type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImage} />
            </label>
          </div>
        </div>

        {/* Status & Options */}
        <div className="ep-card">
          <h2 className="ep-card__section-title">Status &amp; Options</h2>
          <div className="ep-toggle-row">
            <div>
              <div className="ep-toggle-label">Available on POS</div>
              <div className="ep-toggle-sub">Product can be rung up by staff</div>
            </div>
            <ToggleSwitch
              active={form.availableOnPOS}
              onToggle={() => set('availableOnPOS', !form.availableOnPOS)}
              id="toggle-pos"
            />
          </div>
          <div className="ep-toggle-row">
            <div>
              <div className="ep-toggle-label">Available on QR Menu</div>
              <div className="ep-toggle-sub">Customers can view and order digitally</div>
            </div>
            <ToggleSwitch
              active={form.availableOnQR}
              onToggle={() => set('availableOnQR', !form.availableOnQR)}
              id="toggle-qr"
            />
          </div>
        </div>

        {/* Danger Zone */}
        <div className="ep-card ep-card--danger">
          <h2 className="ep-card__danger-title">Danger Zone</h2>
          <p className="ep-card__danger-text">
            Deactivating this product will hide it from all menus and POS terminals immediately. Historical order data will be preserved.
          </p>
          <button
            className="btn-danger-outline"
            onClick={() => setConfirmDeactivate(true)}
            id="deactivate-product"
          >
            Deactivate Product
          </button>
        </div>
      </div>

      {/* Confirm Deactivate */}
      <ConfirmModal
        open={confirmDeactivate}
        onClose={() => setConfirmDeactivate(false)}
        onConfirm={handleDeactivate}
        title="Deactivate Product?"
        message={`"${product.name}" will be hidden from all menus and POS terminals immediately. This action can be reversed later.`}
        confirmLabel="Deactivate"
        cancelLabel="Keep Active"
        danger
      />
    </div>
  )
}

/* ── Toggle Switch ── */
function ToggleSwitch({ active, onToggle, id }) {
  return (
    <button
      className={`ep-toggle${active ? ' ep-toggle--active' : ''}`}
      onClick={onToggle}
      id={id}
      role="switch"
      aria-checked={active}
    >
      <span className="ep-toggle__knob" />
    </button>
  )
}

function ArrowLeftIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12"/>
      <polyline points="12 19 5 12 12 5"/>
    </svg>
  )
}

function UploadCloudIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 16 12 12 8 16"/>
      <line x1="12" y1="12" x2="12" y2="21"/>
      <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
    </svg>
  )
}
