import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import AdminLayout from '../layouts/AdminLayout'
import { useApp } from '../context/AppContext'
import { qrCodeApi } from '../api'
import ConfirmModal from '../components/ConfirmModal'
import './QRPreviewPage.css'

export default function QRPreviewPage() {
  const { id }   = useParams()
  const navigate = useNavigate()
  const { qrCodes, regenerateQR, loading } = useApp()

  const [confirmRegen, setConfirmRegen] = useState(false)
  const [regenerating, setRegenerating] = useState(false)

  // Find the QR code by id (string or number match)
  const qr = qrCodes.find((q) => String(q.id) === String(id))

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleDownload = () => {
    if (!qr) return
    const url = qrCodeApi.downloadUrl(qr.id)
    const a   = document.createElement('a')
    a.href     = url
    a.download = `${qr.qrId}.png`
    a.click()
  }

  const handlePrint = () => {
    if (!qr) return
    const imgSrc = qr.image || qrCodeApi.downloadUrl(qr.id)
    const win = window.open('', '_blank')
    win.document.write(`
      <html>
        <head>
          <title>Print QR — ${qr.name}</title>
          <style>
            body { margin: 0; display: flex; flex-direction: column; justify-content: center;
                   align-items: center; min-height: 100vh; background: #fff; font-family: sans-serif; }
            .brand { font-size: 20px; font-weight: 700; letter-spacing: 3px; margin-bottom: 16px; color: #111; }
            img { width: 280px; height: 280px; object-fit: contain; }
            .label { margin-top: 12px; font-size: 13px; color: #555; letter-spacing: 1px; }
            .cta { margin-top: 6px; font-size: 12px; color: #888; }
          </style>
        </head>
        <body>
          <div class="brand">ARTISAN BREW</div>
          <img src="${imgSrc}" onload="window.print()" />
          <div class="label">${qr.qrId}</div>
          <div class="cta">Scan to view our menu</div>
        </body>
      </html>
    `)
    win.document.close()
  }

  const handleRegen = async () => {
    setRegenerating(true)
    try {
      await regenerateQR(qr.id)
      setConfirmRegen(false)
    } catch (err) {
      console.error('Regenerate error:', err)
    } finally {
      setRegenerating(false)
    }
  }

  // ── Loading / not found states ────────────────────────────────────────────
  if (loading.qrCodes && qrCodes.length === 0) {
    return (
      <AdminLayout>
        <div className="qr-preview-notfound"><p>Loading…</p></div>
      </AdminLayout>
    )
  }

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

            {/* QR image area — real PNG from Django */}
            <div className="qr-ticket__img-area">
              {qr.image ? (
                <img
                  src={qr.image}
                  alt={`QR code — ${qr.name}`}
                  style={{
                    width: 200,
                    height: 200,
                    objectFit: 'contain',
                    borderRadius: 4,
                    display: 'block',
                  }}
                />
              ) : (
                <QRTicketVisual qrId={qr.qrId} />
              )}
            </div>

            <div className="qr-ticket__footer">
              <p className="qr-ticket__id">{qr.qrId}</p>
              <p className="qr-ticket__cta">Scan to view<br />our menu</p>
            </div>
          </div>

          {/* Menu URL info */}
          {qr.menu_url && (
            <p style={{ fontSize: 12, color: '#6b7280', marginTop: 12, wordBreak: 'break-all' }}>
              {qr.menu_url}
            </p>
          )}

          {/* Action buttons */}
          <div className="qr-preview-actions">
            <button className="btn-primary qr-preview-btn" onClick={handleDownload} id="qr-download">
              <DownloadIcon /> Download
            </button>
            <button className="btn-outline qr-preview-btn" onClick={handlePrint} id="qr-print">
              <PrintIcon /> Print
            </button>
            <button
              className="btn-ghost qr-preview-btn"
              onClick={() => setConfirmRegen(true)}
              id="qr-regen"
              disabled={regenerating}
            >
              <RegenIcon /> {regenerating ? 'Regenerating…' : 'Regenerate'}
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

/* ── QR Ticket Visual (placeholder when no image) ── */
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
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  )
}
function PrintIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>
    </svg>
  )
}
function RegenIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
    </svg>
  )
}
