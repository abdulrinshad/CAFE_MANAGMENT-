import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminLayout from '../layouts/AdminLayout'
import { SettingsSubNav } from './SettingsProfilePage'
import { useApp } from '../context/AppContext'
import Modal from '../components/Modal'
import './SettingsMenuPage.css'
import './SettingsProfilePage.css'

const MAX_WELCOME = 300

const DEFAULT_MENU_SETTINGS = {
  layout: 'grid',
  showPrices: true,
  dietaryTags: true,
  soldOutBadges: false,
  headline: 'A premium boutique coffee experience.',
  welcome: 'Welcome to Artisan Brew. We source our beans ethically and roast them locally to bring you the finest coffee in the city. Pair your drink with our daily baked pastries.',
  bannerUrl: null,
  featuredIds: [1, 2, 3],
}

/* ── Toggle Switch ── */
function SettingsToggle({ active, onToggle, id }) {
  return (
    <button
      className={`settings-toggle${active ? ' settings-toggle--active' : ''}`}
      onClick={onToggle}
      role="switch"
      aria-checked={active}
      id={id}
    >
      <span className="settings-toggle__knob" />
    </button>
  )
}

export default function SettingsMenuPage() {
  const navigate  = useNavigate()
  const { products } = useApp()
  const bannerRef = useRef(null)

  const [ms,     setMS]     = useState({ ...DEFAULT_MENU_SETTINGS })
  const [saved,  setSaved]  = useState({ ...DEFAULT_MENU_SETTINGS })
  const [toast,  setToast]  = useState(false)
  const [addItemOpen, setAddItemOpen] = useState(false)

  const featuredProducts = products.filter((p) => ms.featuredIds.includes(p.id))
  const availableToAdd   = products.filter((p) => !ms.featuredIds.includes(p.id))

  const handleBannerChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setMS((m) => ({ ...m, bannerUrl: URL.createObjectURL(file) }))
  }

  const toggle = (key) => setMS((m) => ({ ...m, [key]: !m[key] }))

  const handleSave = () => {
    setSaved({ ...ms })
    setToast(true)
    setTimeout(() => setToast(false), 2500)
  }

  const handleDiscard = () => setMS({ ...saved })

  const handleAddFeatured = (product) => {
    setMS((m) => ({ ...m, featuredIds: [...m.featuredIds, product.id] }))
    setAddItemOpen(false)
  }

  const handleRemoveFeatured = (id) => {
    setMS((m) => ({ ...m, featuredIds: m.featuredIds.filter((f) => f !== id) }))
  }

  return (
    <AdminLayout
      pageTitle="Menu Settings"
      searchPlaceholder="Search settings..."
    >
      <SettingsSubNav active="menu" />

      <div className="settings-page menu-settings-page">
        <div className="settings-page__header">
          <h1 className="settings-page__title">Menu Settings</h1>
          <p className="settings-page__sub">Configure the visual presentation and core details of your digital menu experience.</p>
        </div>

        <div className="menu-settings-layout">
          {/* Left column */}
          <div className="menu-settings-left">
            {/* Menu Banner */}
            <div className="settings-card">
              <div className="menu-banner-header">
                <div>
                  <h2 className="settings-card__title">Menu Banner</h2>
                  <p className="settings-card__sub">The hero image displayed at the top of your digital menu.</p>
                </div>
                <button
                  className="btn-outline btn-replace"
                  onClick={() => bannerRef.current?.click()}
                  id="replace-banner"
                >
                  <UploadIcon /> Replace
                </button>
                <input
                  ref={bannerRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleBannerChange}
                />
              </div>
              <div className="menu-banner-img-wrap">
                {ms.bannerUrl ? (
                  <img src={ms.bannerUrl} alt="Menu banner" className="menu-banner-img" />
                ) : (
                  <div className="menu-banner-placeholder">
                    <div className="menu-banner-placeholder__inner">
                      <BannerPlaceholderIcon />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Café Description */}
            <div className="settings-card">
              <h2 className="settings-card__title">Café Description</h2>
              <p className="settings-card__sub">Introduce your brand to customers viewing the menu.</p>
              <hr className="settings-card__divider" />

              <div className="form-group">
                <label className="form-label" htmlFor="menu-headline">Menu Headline</label>
                <input
                  id="menu-headline"
                  className="form-input"
                  value={ms.headline}
                  onChange={(e) => setMS((m) => ({ ...m, headline: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="menu-welcome">Welcome Message</label>
                <textarea
                  id="menu-welcome"
                  className="form-textarea"
                  rows={5}
                  maxLength={MAX_WELCOME}
                  value={ms.welcome}
                  onChange={(e) => setMS((m) => ({ ...m, welcome: e.target.value }))}
                />
                <p className="form-hint menu-char-count">{ms.welcome.length} / {MAX_WELCOME} characters</p>
              </div>
            </div>

            {/* Featured Selection */}
            <div className="settings-card">
              <div className="featured-header">
                <div>
                  <h2 className="settings-card__title">Featured Selection</h2>
                  <p className="settings-card__sub">Highlight key items at the top of the menu.</p>
                </div>
                <button
                  className="btn-outline btn-manage"
                  onClick={() => navigate('/menu')}
                  id="manage-items"
                >
                  Manage Items
                </button>
              </div>
              <div className="featured-grid">
                {featuredProducts.map((p) => (
                  <div key={p.id} className="featured-item" id={`featured-item-${p.id}`}>
                    <div className="featured-item__img-wrap">
                      <img src={p.image} alt={p.name} className="featured-item__img" />
                      <button
                        className="featured-item__remove"
                        onClick={() => handleRemoveFeatured(p.id)}
                        title="Remove"
                        id={`remove-featured-${p.id}`}
                      >
                        ×
                      </button>
                    </div>
                    <span className="featured-item__name">{p.name}</span>
                  </div>
                ))}
                {/* Add Item button */}
                <div className="featured-add-btn" onClick={() => setAddItemOpen(true)} id="add-featured-item" role="button" tabIndex={0}>
                  <div className="featured-add-btn__inner">
                    <PlusCircleIcon />
                    <span>Add Item</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right column — Display Options */}
          <div className="menu-settings-right">
            <div className="settings-card display-options-card">
              <div className="display-options-header">
                <OptionsIcon />
                <h2 className="settings-card__title display-options-title">Display Options</h2>
              </div>

              {/* Default Layout */}
              <div className="display-option-section">
                <p className="display-option__label">Default Layout</p>
                <div className="layout-toggle-row">
                  <button
                    className={`layout-btn${ms.layout === 'grid' ? ' layout-btn--active' : ''}`}
                    onClick={() => setMS((m) => ({ ...m, layout: 'grid' }))}
                    id="layout-grid"
                  >
                    <GridIcon /> Grid
                  </button>
                  <button
                    className={`layout-btn${ms.layout === 'list' ? ' layout-btn--active' : ''}`}
                    onClick={() => setMS((m) => ({ ...m, layout: 'list' }))}
                    id="layout-list"
                  >
                    <ListIcon /> List
                  </button>
                </div>
                <p className="display-option__hint">Grid emphasizes photography. List is more compact.</p>
              </div>

              <hr className="settings-card__divider" />

              {/* Show Prices */}
              <div className="display-option-row">
                <div>
                  <p className="display-option__name">Show Prices</p>
                  <p className="display-option__hint">Display item pricing on main view.</p>
                </div>
                <SettingsToggle
                  active={ms.showPrices}
                  onToggle={() => toggle('showPrices')}
                  id="toggle-show-prices"
                />
              </div>

              {/* Dietary Tags */}
              <div className="display-option-row">
                <div>
                  <p className="display-option__name">Dietary Tags</p>
                  <p className="display-option__hint">Show V, GF, DF icons.</p>
                </div>
                <SettingsToggle
                  active={ms.dietaryTags}
                  onToggle={() => toggle('dietaryTags')}
                  id="toggle-dietary"
                />
              </div>

              {/* Sold Out Badges */}
              <div className="display-option-row">
                <div>
                  <p className="display-option__name">Sold Out Badges</p>
                  <p className="display-option__hint">Display instead of hiding item.</p>
                </div>
                <SettingsToggle
                  active={ms.soldOutBadges}
                  onToggle={() => toggle('soldOutBadges')}
                  id="toggle-soldout"
                />
              </div>

              <hr className="settings-card__divider" />

              {/* Card Buttons */}
              <div className="display-options-footer">
                <button className="btn-outline" onClick={handleDiscard} id="menu-discard">Discard</button>
                <button className="btn-primary" onClick={handleSave} id="menu-save">Save Changes</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Item Modal */}
      <Modal
        open={addItemOpen}
        onClose={() => setAddItemOpen(false)}
        title="Add Featured Item"
        subtitle="Choose a product to feature on the menu"
        size="sm"
        footer={
          <button className="btn-outline" onClick={() => setAddItemOpen(false)}>Cancel</button>
        }
      >
        <div className="add-item-list">
          {availableToAdd.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
              All products are already featured.
            </p>
          ) : (
            availableToAdd.map((p) => (
              <div
                key={p.id}
                className="add-item-row"
                onClick={() => handleAddFeatured(p)}
                role="button"
                tabIndex={0}
                id={`add-item-${p.id}`}
              >
                <img src={p.image} alt={p.name} className="add-item-row__img" />
                <div className="add-item-row__info">
                  <p className="add-item-row__name">{p.name}</p>
                  <p className="add-item-row__cat">{p.categoryLabel}</p>
                </div>
                <span className="add-item-row__price">₹{p.price}</span>
              </div>
            ))
          )}
        </div>
      </Modal>

      {toast && (
        <div className="toast-success">
          <CheckCircleIcon /> Menu settings saved!
        </div>
      )}
    </AdminLayout>
  )
}

/* ── Icons ── */
function UploadIcon() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg> }
function BannerPlaceholderIcon() { return <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{opacity:0.2}}><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg> }
function PlusCircleIcon() { return <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg> }
function GridIcon() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg> }
function ListIcon() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg> }
function OptionsIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/><circle cx="9" cy="6" r="2" fill="currentColor"/></svg> }
function CheckCircleIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> }
