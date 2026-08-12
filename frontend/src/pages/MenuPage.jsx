import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminLayout from '../layouts/AdminLayout'
import { useApp } from '../context/AppContext'
import './MenuPage.css'

/* ── Product Card ── */
function ProductCard({ item, onToggle, onEdit }) {
  return (
    <div className={`product-card${!item.available ? ' product-card--inactive' : ''}`}>
      <div className="product-card__img-wrap">
        <img src={item.image} alt={item.name} className="product-card__img" />
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
        <div className="product-card__category">{item.categoryLabel}</div>
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
  const { products, updateProduct } = useApp()

  const [search, setSearch]                 = useState('')
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterAvail, setFilterAvail]       = useState('all')
  const [popularOnly, setPopularOnly]       = useState(false)

  const handleToggle = (id) => {
    const p = products.find((x) => x.id === id)
    if (!p) return
    updateProduct(id, { available: !p.available, soldOut: p.available })
  }

  const handleEdit = (item) => {
    navigate(`/menu/edit/${item.id}`)
  }

  /* ── Filter logic ── */
  const filtered = products.filter((it) => {
    const matchSearch  = it.name.toLowerCase().includes(search.toLowerCase())
    const matchCat     = filterCategory === 'all' || it.category.toLowerCase() === filterCategory.toLowerCase()
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
              {/* Category dropdown */}
              <div className="filter-btn-wrap">
                <span className="filter-btn__icon filter-btn__icon--left"><FilterIcon /></span>
                <select
                  className="filter-btn filter-btn--select"
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  id="filter-category"
                >
                  <option value="all">Category</option>
                  <option value="Coffee">Coffee</option>
                  <option value="Tea">Tea</option>
                  <option value="Pastry">Pastry</option>
                  <option value="Pastries">Pastries</option>
                  <option value="Desserts">Desserts</option>
                  <option value="Cold Beverage">Cold Beverage</option>
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

        {/* Products Grid */}
        {filtered.length > 0 ? (
          <div className="products-grid">
            {filtered.map((item) => (
              <ProductCard
                key={item.id}
                item={item}
                onToggle={handleToggle}
                onEdit={handleEdit}
              />
            ))}
          </div>
        ) : (
          <div className="menu-page__empty">No products match your filters.</div>
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
