import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminLayout from '../layouts/AdminLayout'
import { useApp } from '../context/AppContext'
import { productApi } from '../api'
import { getCategoryName } from '../utils/categoryHelper'
import './MenuPage.css'


/* ── Product Card ── */
function ProductCard({ item, onToggle, onEdit, toggling }) {
  // image: prefer image_url (Django media), fall back to image field
  const imgSrc = item.image_url || item.image || null
  const catLabel = item.category_label || item.categoryLabel || item.category_name || ''

  return (
    <div className={`product-card${!item.available ? ' product-card--inactive' : ''}`}>
      <div className="product-card__img-wrap">
        {imgSrc
          ? <img src={imgSrc} alt={item.name} className="product-card__img" />
          : <div className="product-card__img product-card__img--placeholder" style={{ background: '#1e2535', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4b5563', fontSize: 32 }}>☕</div>
        }
        {item.popular && (
          <div className="product-card__popular-badge">
            <span>☆</span> Popular
          </div>
        )}
      </div>
      <div className="product-card__body">
        <div className="product-card__top">
          <h3 className="product-card__name">{item.name}</h3>
          <span className="product-card__price">₹{item.price}</span>
        </div>
        <div className="product-card__category">{catLabel}</div>
        <hr className="product-card__divider" />
        <div className="product-card__footer">
          <span className={`product-card__status${item.soldOut ? ' product-card__status--sold' : ''}`}>
            <span className="product-card__status-dot" />
            {item.soldOut ? 'Sold Out' : 'Available'}
          </span>
          <div className="product-card__actions">
            <button
              className="product-card__action-btn"
              title="Edit"
              id={`edit-product-${item.id}`}
              onClick={() => onEdit(item)}
            >
              <EditIcon />
            </button>
            <button
              className="product-card__action-btn"
              title={item.available ? 'Deactivate' : 'Activate'}
              id={`toggle-product-${item.id}`}
              onClick={() => onToggle(item.id)}
              disabled={toggling}
              style={{ opacity: toggling ? 0.5 : 1 }}
            >
              {item.available ? <DeactivateIcon /> : <ActivateIcon />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Menu Page ── */
export default function MenuPage() {
  const navigate = useNavigate()
  const { products, categories, loading, apiError, fetchProducts } = useApp()

  const [search, setSearch]                 = useState('')
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterAvail, setFilterAvail]       = useState('all')
  const [popularOnly, setPopularOnly]       = useState(false)
  const [togglingId, setTogglingId]         = useState(null)

  const handleToggle = async (id) => {
    const p = products.find((x) => x.id === id)
    if (!p || togglingId === id) return
    setTogglingId(id)
    try {
      await productApi.setAvailability(id, {
        available: !p.available,
        sold_out:  p.available,   // if was available → now sold out
      })
      await fetchProducts()       // re-sync from DB
    } catch (err) {
      console.error('Toggle availability error:', err)
    } finally {
      setTogglingId(null)
    }
  }

  const handleEdit = (item) => {
    navigate(`/menu/edit/${item.id}`)
  }

  /* ── Filter logic ── */
  const filtered = products.filter((it) => {
    const matchSearch  = it.name.toLowerCase().includes(search.toLowerCase())
    // category is FK id from API; match by category_name
    const catName = getCategoryName(it.category || it.category_name).toLowerCase()
    const matchCat     = filterCategory === 'all' || catName === filterCategory.toLowerCase()

    const matchAvail   =
      filterAvail === 'all' ||
      (filterAvail === 'available' && it.available && !it.soldOut) ||
      (filterAvail === 'soldout'   && it.soldOut)
    const matchPop     = !popularOnly || it.popular
    return matchSearch && matchCat && matchAvail && matchPop
  })

  return (
    <AdminLayout searchPlaceholder="Search menu...">
      <div className="menu-page">
        {/* Header row */}
        <div className="menu-page__header">
          <div className="menu-page__title-block">
            <h1 className="menu-page__title">Menu Items</h1>
            <p className="menu-page__sub">Manage your luxury cafe offerings and availability.</p>
          </div>

          <div className="menu-page__controls">
            <div className="menu-page__filters">
              {/* Category dropdown — populated from live DB */}
              <div className="filter-btn-wrap">
                <span className="filter-btn__icon filter-btn__icon--left"><FilterIcon /></span>
                <select
                  className="filter-btn filter-btn--select"
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  id="filter-category"
                >
                  <option value="all">Category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Availability dropdown */}
              <div className="filter-btn-wrap">
                <span className="filter-btn__icon filter-btn__icon--left"><FilterIcon /></span>
                <select
                  className="filter-btn filter-btn--select"
                  value={filterAvail}
                  onChange={(e) => setFilterAvail(e.target.value)}
                  id="filter-availability"
                >
                  <option value="all">Availability</option>
                  <option value="available">Available</option>
                  <option value="soldout">Sold Out</option>
                </select>
              </div>

              {/* Popular Only toggle */}
              <button
                className={`filter-btn filter-btn--popular${popularOnly ? ' filter-btn--popular-active' : ''}`}
                onClick={() => setPopularOnly((v) => !v)}
                id="filter-popular"
              >
                <span className="filter-btn__check-box">
                  {popularOnly && <span className="filter-btn__check-mark">✓</span>}
                </span>
                Popular Only
              </button>
            </div>

            <button
              className="btn-add-product"
              id="btn-add-product"
              onClick={() => navigate('/menu/add')}
            >
              + Add Product
            </button>
          </div>
        </div>

        {/* API error banner */}
        {apiError && (
          <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, padding: '12px 16px', marginBottom: 20, color: '#991b1b', fontSize: 14 }}>
            ⚠️ Cannot reach Django API: {apiError}. Make sure the backend server is running.
          </div>
        )}

        {/* Loading state */}
        {loading.products && products.length === 0 ? (
          <div className="menu-page__empty">Loading products…</div>
        ) : filtered.length > 0 ? (
          <div className="products-grid">
            {filtered.map((item) => (
              <ProductCard
                key={item.id}
                item={item}
                onToggle={handleToggle}
                onEdit={handleEdit}
                toggling={togglingId === item.id}
              />
            ))}
          </div>
        ) : (
          <div className="menu-page__empty">
            {products.length === 0
              ? 'No products yet. Click \'+ Add Product\' to create your first item.'
              : 'No products match your filters.'}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}

/* ── Icons ── */
function FilterIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="12" y1="18" x2="12" y2="18"/>
    </svg>
  )
}
function EditIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  )
}
function DeactivateIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
    </svg>
  )
}
function ActivateIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><polyline points="12 8 12 12 14 14"/>
    </svg>
  )
}
