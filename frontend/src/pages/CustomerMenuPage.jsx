import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { getCategoryName } from '../utils/categoryHelper'
import './CustomerMenuPage.css'

const CATEGORIES = ['All', 'Coffee', 'Tea', 'Pastries', 'Desserts', 'Cold Beverages', 'Snacks']

export default function CustomerMenuPage() {
  const [searchParams] = useSearchParams()
  const { products, createWaiterRequest, tables } = useApp()


  // Dynamic table parameter from URL (?table=T-12 or similar)
  const tableParam = searchParams.get('table')
  const tableLabel = tableParam ? tableParam.replace('T-', 'Table ') : 'Table 12'

  // View States: 'splash' | 'menu' | 'request_loading' | 'request_sent' | 'empty'
  const [viewState, setViewState] = useState('splash')
  const [activeCategory, setActiveCategory] = useState('All')
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Handle Initial Splash Screen Animation
  useEffect(() => {
    const timer = setTimeout(() => {
      setViewState('menu')
    }, 1200)
    return () => clearTimeout(timer)
  }, [])

  // Filter products by category and availability
  const filteredProducts = products ? products.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase())
    if (!matchSearch) return false

    if (activeCategory === 'All') return true
    const productCat = getCategoryName(p.category || p.category_name || p.categoryLabel).toLowerCase()
    const activeCat = activeCategory.toLowerCase()
    if (activeCat === 'pastries') return productCat === 'pastry' || productCat === 'pastries'
    if (activeCat === 'cold beverages') return productCat === 'cold beverage' || productCat === 'cold beverages'
    return productCat === activeCat
  }) : []

  // Call Waiter Request Handler
  const handleCallWaiter = async () => {
    setViewState('request_loading')
    try {
      let targetTableId = null
      if (tables && tableParam) {
        const found = tables.find((t) => t.name === tableParam || String(t.id) === String(tableParam) || t.label === tableParam)
        if (found) targetTableId = found.id
      }
      if (!targetTableId && tables && tables.length > 0) {
        targetTableId = tables[0].id
      }

      if (createWaiterRequest && targetTableId) {
        await createWaiterRequest({
          table: targetTableId,
          request_type: 'Call Waiter',
          message: `Customer requested assistance at table ${tableLabel}`,
          status: 'new',
        })
      }
      setViewState('request_sent')
    } catch (err) {
      console.error('Call waiter error:', err)
      setViewState('request_sent')
    }
  }

  const handleCancelRequest = () => {
    setViewState('menu')
  }

  // Render Splash Screen (intro animation)
  if (viewState === 'splash') {
    return (
      <div className="splash-screen">
        <div className="splash-content">
          <div className="splash-logo">☕</div>
          <h1 className="splash-title">Artisan Brew</h1>
          <p className="splash-subtitle">L&apos;Essence Café</p>
        </div>
      </div>
    )
  }

  // Render Request Loading Splash
  if (viewState === 'request_loading') {
    return (
      <div className="splash-screen">
        <div className="splash-content">
          <div className="loading-spinner"></div>
          <p className="splash-subtitle">Sending request to staff...</p>
        </div>
      </div>
    )
  }

  // Render Request Sent Screen
  if (viewState === 'request_sent') {
    return (
      <div className="qr-layout">
        <div className="request-sent-container">
          <div className="success-icon-wrap">✓</div>
          <h1 className="request-sent-heading">Request Sent</h1>
          <p className="request-sent-desc">
            A waiter will assist you shortly at {tableLabel}.
          </p>
          <div className="request-sent-actions">
            <button className="btn-primary py-3 w-full" onClick={() => setViewState('menu')}>
              Back to Menu
            </button>
            <button className="btn-outline py-3 w-full" onClick={handleCancelRequest}>
              Cancel Request
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="qr-layout">
      {/* Menu Header */}
      <header className="qr-header">
        <div className="header-left-group">
          <span className="hamburger-menu-icon">☰</span>
          <span className="header-cafe-name">L&apos;Essence Café &middot; {tableLabel}</span>
        </div>
        <button className="btn-primary btn-sm call-waiter-btn" onClick={handleCallWaiter}>
          Call Waiter
        </button>
      </header>

      {/* Main Container */}
      <main className="qr-main-content">
        {/* Café Branding Area */}
        <section className="cafe-branding-area">
          <div className="cafe-branding-logo">☕</div>
          <h2 className="cafe-branding-name">Artisan Brew</h2>
          <p className="cafe-branding-desc">A premium boutique coffee experience.</p>
          <span className="cafe-branding-table-badge">{tableLabel}</span>
        </section>

        {/* Horizontal Category Navigation */}
        <div className="qr-categories-bar">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              className={`qr-category-pill ${activeCategory === cat ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search menu */}
        <div className="qr-search-wrap">
          <input
            type="text"
            className="qr-search-input"
            placeholder="Search menu..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Product Showcase */}
        {filteredProducts.length > 0 ? (
          <div className="qr-product-grid">
            {filteredProducts.map((p) => {
              // Simulate product unavailable state for Matcha Latte (soldOut: true)
              const isUnavailable = p.soldOut || !p.available

              return (
                <div
                  key={p.id}
                  className={`qr-product-card ${isUnavailable ? 'unavailable' : ''}`}
                  onClick={() => setSelectedProduct(p)}
                >
                  <div className="qr-card-image-wrap">
                    {p.popular && <span className="popular-badge">POPULAR</span>}
                    {isUnavailable && <span className="unavailable-overlay-badge">CURRENTLY UNAVAILABLE</span>}
                    <div className={`qr-product-thumbnail ${isUnavailable ? 'grayscale' : ''}`}>
                      {getCategoryName(p.category).toLowerCase().includes('coffee') ? '☕' : getCategoryName(p.category).toLowerCase().includes('tea') ? '🫖' : '🥐'}
                    </div>
                  </div>
                  <div className="qr-card-body">
                    <div className="qr-card-top-row">
                      <h3 className="qr-card-title">{p.name}</h3>
                      <span className="qr-card-price">₹{p.price.toLocaleString()}</span>
                    </div>
                    <p className="qr-card-desc">{p.description}</p>
                    <span className={`qr-card-stock-status ${isUnavailable ? 'out-of-stock' : 'in-stock'}`}>
                      {isUnavailable ? 'Sold Out' : 'Available'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          /* Empty Menu State */
          <div className="empty-menu-state">
            <div className="empty-menu-icon">🫙</div>
            <h3 className="empty-menu-heading">Our Menu is Resting</h3>
            <p className="empty-menu-desc">
              We are currently updating our offerings to ensure perfection. Please check back shortly.
            </p>
            <button className="btn-primary py-3 px-6" onClick={() => { setActiveCategory('All'); setSearchQuery(''); }}>
              Refresh Menu
            </button>
          </div>
        )}
      </main>

      {/* Bottom Sticky Navigation */}
      <nav className="qr-bottom-nav">
        <button className="nav-item active">
          <span className="nav-icon">📖</span>
          <span className="nav-label">Menu</span>
        </button>
        <button className="nav-item" onClick={() => alert('Favorites section coming soon!')}>
          <span className="nav-icon">♡</span>
          <span className="nav-label">Favorites</span>
        </button>
        <button className="nav-item" onClick={handleCallWaiter}>
          <span className="nav-icon">🛎️</span>
          <span className="nav-label">Staff</span>
        </button>
        <button className="nav-item" onClick={() => alert('Artisan Brew Boutique Cafe\nOpen: 8:00 AM - 10:00 PM')}>
          <span className="nav-icon">ℹ️</span>
          <span className="nav-label">Info</span>
        </button>
      </nav>

      {/* Product Details Bottom Sheet / Modal */}
      {selectedProduct && (
        <div className="bottom-sheet-overlay" onClick={() => setSelectedProduct(null)}>
          <div className="bottom-sheet-card" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-header">
              <button className="sheet-close-btn" onClick={() => setSelectedProduct(null)}>×</button>
            </div>
            
            {/* Image banner */}
            <div className="sheet-image-banner">
              {(selectedProduct.soldOut || !selectedProduct.available) && (
                <span className="sheet-unavailable-overlay">CURRENTLY UNAVAILABLE</span>
              )}
              <div className={`sheet-thumbnail-large ${(selectedProduct.soldOut || !selectedProduct.available) ? 'grayscale' : ''}`}>
                {getCategoryName(selectedProduct.category).toLowerCase().includes('coffee') ? '☕' : getCategoryName(selectedProduct.category).toLowerCase().includes('tea') ? '🫖' : '🥐'}
              </div>
            </div>

            {/* Content info */}
            <div className="sheet-body">
              <div className="sheet-title-row">
                <h3 className="sheet-product-title">{selectedProduct.name}</h3>
                <span className="sheet-product-price">₹{selectedProduct.price.toLocaleString()}</span>
              </div>

              <span className={`sheet-stock-status ${(selectedProduct.soldOut || !selectedProduct.available) ? 'out' : 'in'}`}>
                {(selectedProduct.soldOut || !selectedProduct.available) ? 'Currently Unavailable' : 'In Stock'}
              </span>

              <p className="sheet-desc-text">{selectedProduct.description}</p>

              {/* Ingredients */}
              <div className="sheet-ingredients-wrap">
                <h4 className="sheet-sub-heading">Ingredients</h4>
                <p className="sheet-ingredients-text">
                  {getCategoryName(selectedProduct.category).toLowerCase().includes('coffee') ? 'Ethopian Espresso Roast, Whole Milk, Velvet Crema' : getCategoryName(selectedProduct.category).toLowerCase().includes('tea') ? 'Black Loose Tea leaves, Bergamot Citrus, Hot Water' : 'Organic Croissant Dough, Almond Paste filling, Butter'}
                </p>
              </div>


              {/* Dietary Badges */}
              <div className="sheet-dietary-badges">
                {selectedProduct.dietaryTags && selectedProduct.dietaryTags.map((tag) => (
                  <span key={tag} className="dietary-badge-pill">{tag}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
