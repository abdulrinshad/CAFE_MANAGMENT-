import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import AdminLayout from '../layouts/AdminLayout'
import { useApp } from '../context/AppContext'
import ConfirmModal from '../components/ConfirmModal'
import './QRPreviewPage.css'

export default function QRPreviewPage() {
  const { id }     = useParams()
  const navigate   = useNavigate()
  const { qrCodes, regenerateQR } = useApp()

  const qr = qrCodes.find((q) => q.id === id)
  const [confirmRegen, setConfirmRegen] = useState(false)

  if (!qr) {
    return (
      <AdminLayout>
        <div className="qr-preview-notfound">
          <p>QR code not found.</p>
          <button className="btn-outline" onClick={() => navigate('/qr-codes')}>Back to QR Codes</button>
        </div>
      </AdminLayout>
    )
  }

  const handleDownload = () => alert(`Downloading QR for ${qr.name}…`)
  const handlePrint    = () => window.print()
  const handleRegen    = () => { regenerateQR(id); setConfirmRegen(false) }

  return (
    <AdminLayout searchPlaceholder="Search QR codes...">
      <div className="qr-preview-page">
        {/* Back link */}
        <button
          className="qr-preview-back"
          onClick={() => navigate('/qr-codes')}
          id="back-to-qr-codes"
        >
          <ArrowLeftIcon />
          Back to QR Codes
        </button>

        {/* Centered content */}
        <div className="qr-preview-center">
          <h1 className="qr-preview-title">{qr.name}</h1>
          <p className="qr-preview-subtitle">Preview &amp; Export</p>

          {/* QR Ticket Card */}
          <div className="qr-ticket">
            <div className="qr-ticket__brand">ARTISAN BREW</div>

            {/* QR image area */}
            <div className="qr-ticket__img-area">
              <QRTicketVisual qrId={qr.qrId} />
            </div>

            <div className="qr-ticket__footer">
              <p className="qr-ticket__id">{qr.qrId}</p>
              <p className="qr-ticket__cta">Scan to view<br />our menu</p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="qr-preview-actions">
            <button className="btn-primary qr-preview-btn" onClick={handleDownload} id="qr-download">
              <DownloadIcon /> Download
            </button>
            <button className="btn-outline qr-preview-btn" onClick={handlePrint} id="qr-print">
              <PrintIcon /> Print
            </button>
            <button className="btn-ghost qr-preview-btn" onClick={() => setConfirmRegen(true)} id="qr-regen">
              <RegenIcon /> Regenerate
            </button>
          </div>
        </div>
      </div>

      <ConfirmModal
        open={confirmRegen}
        onClose={() => setConfirmRegen(false)}
        onConfirm={handleRegen}
        title="Regenerate QR Code?"
        message={`Regenerating the QR code for ${qr.name} will invalidate the existing code. Any printed codes will stop working.`}
        confirmLabel="Regenerate"
        cancelLabel="Cancel"
        danger
      />
    </AdminLayout>
  )
}

/* ── QR Ticket Visual ── */
function QRTicketVisual({ qrId }) {
  return (
    <div className="qr-tv">
      <div className="qr-tv__corners">
        <div className="qr-tv__corner qr-tv__corner--tl" />
        <div className="qr-tv__corner qr-tv__corner--tr" />
        <div className="qr-tv__corner qr-tv__corner--bl" />
      </div>
      <div className="qr-tv__dots">
        {Array.from({ length: 81 }, (_, i) => {
          const filled = ((i * 11 + 5) % 13) > 5
          return <div key={i} className={`qr-tv__dot${filled ? ' qr-tv__dot--on' : ''}`} />
        })}
      </div>
      <div className="qr-tv__center-mark" />
    </div>
  )
}

/* ── Icons ── */
function ArrowLeftIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
    </svg>
  )
}
function DownloadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  )
}
function PrintIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 6 2 18 2 18 9"/>
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
      <rect x="6" y="14" width="12" height="8"/>
    </svg>
  )
}
function RegenIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10"/>
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
    </svg>
  )
}
