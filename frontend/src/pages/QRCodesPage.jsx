import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminLayout from '../layouts/AdminLayout'
import { useApp } from '../context/AppContext'
import { qrCodeApi } from '../api'
import ConfirmModal from '../components/ConfirmModal'
import './QRCodesPage.css'

export default function QRCodesPage() {
  const navigate = useNavigate()
  const { qrCodes, regenerateQR, updateQRStatus, fetchQRCodes, loading, apiError } = useApp()
  const [confirmRegen, setConfirmRegen] = useState(null)
  const [togglingId,   setTogglingId]   = useState(null)

  // ── Stats ────────────────────────────────────────────────────────────────
  const totalTables      = qrCodes.length
  const activeQRs        = qrCodes.filter((q) => q.status === 'active').length
  const needsReplacement = qrCodes.filter((q) => q.status === 'inactive').length

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleToggle = async (id) => {
    const qr = qrCodes.find((q) => q.id === id)
    if (!qr || togglingId === id) return
    setTogglingId(id)
    try {
      await updateQRStatus(id, qr.status === 'active' ? 'inactive' : 'active')
    } catch (err) {
      console.error('Toggle QR error:', err)
    } finally {
      setTogglingId(null)
    }
  }

  const handleDownload = (qr) => {
    // Trigger real file download from Django API
    const url = qrCodeApi.downloadUrl(qr.id)
    const a   = document.createElement('a')
    a.href     = url
    a.download = `${qr.qrId}.png`
    a.click()
  }

  const handlePrint = (qr) => {
    // Open the QR image in a new tab and trigger print
    const url = qr.image || qrCodeApi.downloadUrl(qr.id)
    const win = window.open('', '_blank')
    win.document.write(`
      <html><head><title>Print QR — ${qr.name}</title>
      <style>body{margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#fff}
      img{max-width:400px;width:100%}</style></head>
      <body><img src="${url}" onload="window.print()" /></body></html>
    `)
    win.document.close()
  }

  const handleConfirmRegen = async () => {
    if (!confirmRegen) return
    try {
      await regenerateQR(confirmRegen.id)
      setConfirmRegen(null)
    } catch (err) {
      console.error('Regenerate QR error:', err)
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <AdminLayout searchPlaceholder="Search tables, QR codes...">
      <div className="qr-page">
        {/* Header */}
        <div className="qr-page__header">
          <div>
            <h1 className="qr-page__title">QR Code Management</h1>
            <p className="qr-page__sub">Manage and generate digital menu access points for all tables.</p>
          </div>
          <button
            className="btn-primary qr-page__gen-btn"
            id="btn-generate-qr"
            onClick={() => fetchQRCodes()}
            title="Refresh QR codes from database"
          >
            ↺ Refresh
          </button>
        </div>

        {/* API error banner */}
        {apiError && (
          <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, padding: '12px 16px', marginBottom: 20, color: '#991b1b', fontSize: 14 }}>
            ⚠️ Cannot reach Django API: {apiError}
          </div>
        )}

        {/* Stats cards */}
        <div className="qr-stats-row">
          <div className="qr-stat-card">
            <div className="qr-stat-card__label">TOTAL TABLES</div>
            <div className="qr-stat-card__value">{totalTables}</div>
          </div>
          <div className="qr-stat-card">
            <div className="qr-stat-card__label">ACTIVE QRS</div>
            <div className="qr-stat-card__value">{activeQRs}</div>
          </div>
          <div className="qr-stat-card">
            <div className="qr-stat-card__label">NEEDS REPLACEMENT</div>
            <div className="qr-stat-card__value">{needsReplacement}</div>
          </div>
        </div>

        {/* Table-Specific QR Cards Grid */}
        {loading.qrCodes && qrCodes.length === 0 ? (
          <div style={{ color: '#9ca3af', textAlign: 'center', padding: '60px 0' }}>Loading QR codes…</div>
        ) : qrCodes.length === 0 ? (
          <div style={{ color: '#9ca3af', textAlign: 'center', padding: '60px 0' }}>
            No QR codes yet. Create a table first — QR codes are auto-generated.
          </div>
        ) : (
          <div className="qr-grid">
            {qrCodes.map((qr) => (
              <QRCard
                key={qr.id}
                qr={qr}
                onClick={() => navigate(`/qr-codes/${qr.id}`)}
                onDownload={() => handleDownload(qr)}
                onPrint={() => handlePrint(qr)}
                onRegenerate={() => setConfirmRegen(qr)}
                onToggle={() => handleToggle(qr.id)}
                toggling={togglingId === qr.id}
              />
            ))}
          </div>
        )}
      </div>



      <ConfirmModal
        open={!!confirmRegen}
        onClose={() => setConfirmRegen(null)}
        onConfirm={handleConfirmRegen}
        title="Regenerate QR Code?"
        message={confirmRegen ? `Regenerating the QR code for ${confirmRegen.name} will invalidate the existing code. Any printed codes will stop working.` : ''}
        confirmLabel="Regenerate"
        cancelLabel="Cancel"
        danger
      />
    </AdminLayout>
  )
}

/* ── QR Card ── */
function QRCard({ qr, onClick, onDownload, onPrint, onRegenerate, onToggle, toggling }) {
  const isActive = qr.status === 'active'

  return (
    <div className={`qr-card${!isActive ? ' qr-card--inactive' : ''}`}>
      {/* Card header */}
      <div className="qr-card__header">
        <div>
          <h3 className="qr-card__name">{qr.name}</h3>
          <p className="qr-card__id">ID: {qr.qrId}</p>
        </div>
        <span className={`qr-badge ${isActive ? 'qr-badge--active' : 'qr-badge--inactive'}`}>
          <span className="qr-badge__dot" />
          {isActive ? 'Active' : 'Inactive'}
        </span>
      </div>

      {/* QR Image area — shows real PNG from Django if available */}
      <div className="qr-card__image-area" onClick={onClick} role="button" tabIndex={0} id={`qr-card-${qr.id}`}>
        <div className="qr-card__image-wrap">
          {qr.image ? (
            <img
              src={qr.image}
              alt={`QR code for ${qr.name}`}
              style={{ width: 120, height: 120, objectFit: 'contain', borderRadius: 4 }}
            />
          ) : (
            <QRCodePlaceholder label={qr.qrId} />
          )}
        </div>
      </div>

      {/* Bottom action row */}
      <div className="qr-card__actions">
        <div className="qr-card__icon-btns">
          <button
            className="qr-icon-btn"
            title="Download"
            onClick={onDownload}
            id={`download-${qr.id}`}
          >
            <DownloadIcon />
          </button>
          <button
            className="qr-icon-btn"
            title="Print"
            onClick={onPrint}
            id={`print-${qr.id}`}
          >
            <PrintIcon />
          </button>
          <button
            className="qr-icon-btn"
            title="Regenerate"
            onClick={onRegenerate}
            id={`regen-${qr.id}`}
          >
            <RegenIcon />
          </button>
        </div>
        <QRToggle
          active={isActive}
          onToggle={onToggle}
          id={`toggle-${qr.id}`}
          disabled={toggling}
        />
      </div>
    </div>
  )
}

/* ── QR Toggle ── */
function QRToggle({ active, onToggle, id, disabled }) {
  return (
    <button
      className={`qr-toggle${active ? ' qr-toggle--active' : ''}`}
      onClick={onToggle}
      id={id}
      role="switch"
      aria-checked={active}
      disabled={disabled}
      style={{ opacity: disabled ? 0.5 : 1 }}
    >
      <span className="qr-toggle__knob" />
    </button>
  )
}

/* ── Placeholder shown when no QR image is generated yet ── */
function QRCodePlaceholder({ label }) {
  return (
    <div className="qr-mockup">
      <div className="qr-mockup__pattern">
        <div className="qr-corner qr-corner--tl" />
        <div className="qr-corner qr-corner--tr" />
        <div className="qr-corner qr-corner--bl" />
        <div className="qr-dots">
          {Array.from({ length: 49 }, (_, i) => {
            const filled = ((i * 7 + 3) % 11) > 4
            return <div key={i} className={`qr-dot${filled ? ' qr-dot--on' : ''}`} />
          })}
        </div>
      </div>
    </div>
  )
}

/* ── Icons ── */
function DownloadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  )
}
function PrintIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>
    </svg>
  )
}
function RegenIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
    </svg>
  )
}
