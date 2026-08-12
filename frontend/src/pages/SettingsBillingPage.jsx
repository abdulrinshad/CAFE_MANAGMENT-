import { useState } from 'react'
import AdminLayout from '../layouts/AdminLayout'
import { SettingsSubNav } from './SettingsProfilePage'
import './SettingsBillingPage.css'
import './SettingsProfilePage.css'

const DEFAULT_BILLING = {
  prefix: 'INV-',
  startingNumber: '1001',
  currency: 'INR',
  taxPct: '18',
  footerText: 'Thank you for visiting Artisan Brew! Please visit us again.',
}

const CURRENCIES = [
  { value: 'INR', label: '₹ Indian Rupee (INR)' },
  { value: 'USD', label: '$ US Dollar (USD)'    },
  { value: 'EUR', label: '€ Euro (EUR)'          },
  { value: 'GBP', label: '£ British Pound (GBP)' },
]

export default function SettingsBillingPage() {
  const [billing, setBilling] = useState({ ...DEFAULT_BILLING })
  const [saved,   setSaved]   = useState({ ...DEFAULT_BILLING })
  const [toast,   setToast]   = useState(false)

  const handleSave = () => {
    setSaved({ ...billing })
    setToast(true)
    setTimeout(() => setToast(false), 2500)
  }

  const handleCancel = () => {
    setBilling({ ...saved })
  }

  const set = (key) => (e) => setBilling((b) => ({ ...b, [key]: e.target.value }))

  return (
    <AdminLayout
      pageTitle="Billing Settings"
      searchPlaceholder="Search settings..."
    >
      {/* Sub-nav */}
      <SettingsSubNav active="billing" />

      <div className="settings-page billing-page">
        <div className="settings-page__header">
          <h1 className="settings-page__title">Invoice Configuration</h1>
          <p className="settings-page__sub">Manage your billing formats, tax rates, and receipt details.</p>
        </div>

        {/* Two-column card row */}
        <div className="billing-cards-row">
          {/* Numbering & Currency */}
          <div className="settings-card billing-card">
            <h2 className="settings-card__title billing-card__title">Numbering &amp; Currency</h2>
            <hr className="settings-card__divider" />

            <div className="form-group">
              <label className="form-label" htmlFor="inv-prefix">Invoice Prefix</label>
              <input
                id="inv-prefix"
                className="form-input"
                placeholder="INV-"
                value={billing.prefix}
                onChange={set('prefix')}
              />
              <p className="form-hint">E.g., INV-, AB-, 2024-</p>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="inv-start">Starting Number</label>
              <input
                id="inv-start"
                className="form-input"
                placeholder="1001"
                value={billing.startingNumber}
                onChange={set('startingNumber')}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="inv-currency">Base Currency</label>
              <div className="select-wrap">
                <select
                  id="inv-currency"
                  className="form-select billing-select"
                  value={billing.currency}
                  onChange={set('currency')}
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
                <ChevronIcon />
              </div>
            </div>
          </div>

          {/* Tax & Messaging */}
          <div className="settings-card billing-card">
            <h2 className="settings-card__title billing-card__title">Tax &amp; Messaging</h2>
            <hr className="settings-card__divider" />

            <div className="form-group">
              <label className="form-label" htmlFor="inv-tax">Tax / GST Percentage</label>
              <div className="input-suffix-wrap">
                <input
                  id="inv-tax"
                  className="form-input input-suffix-field"
                  type="number"
                  min="0"
                  max="100"
                  value={billing.taxPct}
                  onChange={set('taxPct')}
                />
                <span className="input-suffix">%</span>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="inv-footer">Invoice Footer Text</label>
              <textarea
                id="inv-footer"
                className="form-textarea billing-textarea"
                rows={5}
                value={billing.footerText}
                onChange={set('footerText')}
              />
              <p className="form-hint">This message appears at the bottom of customer receipts.</p>
            </div>
          </div>
        </div>

        {/* Separator + Footer */}
        <hr className="billing-sep" />
        <div className="settings-footer">
          <button className="btn-outline" onClick={handleCancel} id="billing-cancel">Cancel</button>
          <button className="btn-primary settings-save-btn" onClick={handleSave} id="billing-save">
            Save Changes
          </button>
        </div>
      </div>

      {toast && (
        <div className="toast-success">
          <CheckCircleIcon /> Billing settings saved!
        </div>
      )}
    </AdminLayout>
  )
}

/* ── Icons ── */
function ChevronIcon() {
  return (
    <svg className="select-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  )
}
function CheckCircleIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
}
