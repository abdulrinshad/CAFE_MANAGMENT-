import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminLayout from '../layouts/AdminLayout'
import { useApp } from '../context/AppContext'
import ConfirmModal from '../components/ConfirmModal'
import './QRCodesPage.css'

export default function QRCodesPage() {
  const navigate   = useNavigate()
  const { qrCodes, regenerateQR, updateQRStatus } = useApp()
  const [confirmRegen, setConfirmRegen] = useState(null)

  const totalTables       = qrCodes.length
  const activeQRs         = qrCodes.filter((q) => q.status === 'active').length
  const needsReplacement  = qrCodes.filter((q) => q.status === 'inactive').length

  const handleToggle = (id) => {
    const qr = qrCodes.find((q) => q.id === id)
    if (!qr) return
    updateQRStatus(id, qr.status === 'active' ? 'inactive' : 'active')
  }

  const handleDownload = (qr) => {
    alert(`Downloading QR code for ${qr.name}…`)
  }

  const handlePrint = () => window.print()

  const handleConfirmRegen = () => {
    if (!confirmRegen) return
    regenerateQR(confirmRegen.id)
    setConfirmRegen(null)
  }

  return (
    <AdminLayout searchPlaceholder="Search tables, QR codes...">
      <div className="qr-page">
        {/* Header */}
        <div className="qr-page__header">
          <div>
            <h1 className="qr-page__title">QR Code Management</h1>
            <p className="qr-page__sub">Manage and generate digital menu access points for all tables.</p>
          </div>
          <button className="btn-primary qr-page__gen-btn" id="btn-generate-qr">
            + Generate QR
          </button>
        </div>

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

        {/* QR Cards Grid */}
        <div className="qr-grid">
          {qrCodes.map((qr) => (
            <QRCard
              key={qr.id}
              qr={qr}
              onClick={() => navigate(`/qr-codes/${qr.id}`)}
              onDownload={() => handleDownload(qr)}
              onPrint={handlePrint}
              onRegenerate={() => setConfirmRegen(qr)}
              onToggle={() => handleToggle(qr.id)}
            />
          ))}
        </div>
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
function QRCard({ qr, onClick, onDownload, onPrint, onRegenerate, onToggle }) {
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

      {/* QR Image area */}
      <div className="qr-card__image-area" onClick={onClick} role="button" tabIndex={0} id={`qr-card-${qr.id}`}>
        <div className="qr-card__image-wrap">
          <QRCodeMockup image={qr.image} label={qr.qrId} />
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
        />
      </div>
    </div>
  )
}

/* ── QR Toggle ── */
function QRToggle({ active, onToggle, id }) {
  return (
    <button
      className={`qr-toggle${active ? ' qr-toggle--active' : ''}`}
      onClick={onToggle}
      id={id}
      role="switch"
      aria-checked={active}
    >
      <span className="qr-toggle__knob" />
    </button>
  )
}

/* ── QR Code Mockup visual ── */
function QRCodeMockup({ label }) {
  return (
    <div className="qr-mockup">
      {/* QR pattern */}
      <div className="qr-mockup__pattern">
        {/* Corner markers */}
        <div className="qr-corner qr-corner--tl" />
        <div className="qr-corner qr-corner--tr" />
        <div className="qr-corner qr-corner--bl" />
        {/* Dot grid */}
        <div className="qr-dots">
          {Array.from({ length: 49 }, (_, i) => {
            // Make a deterministic "random" based on index
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
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  )
}
function PrintIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 6 2 18 2 18 9"/>
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
      <rect x="6" y="14" width="12" height="8"/>
    </svg>
  )
}
function RegenIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10"/>
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
    </svg>
  )
}
