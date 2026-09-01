import React from 'react'
import './Toast.css'

export function ToastContainer({ toasts = [], onClose }) {
  if (!toasts || toasts.length === 0) return null

  return (
    <div className="toast-container" aria-live="polite">
      {toasts.map(t => (
        <div key={t.id} className={`toast-item toast-item--${t.type || 'success'}`}>
          <div className="toast-icon">
            {t.type === 'error' ? '✕' : t.type === 'info' ? 'ℹ' : '✓'}
          </div>
          <div className="toast-message">{t.message}</div>
          <button
            type="button"
            className="toast-close"
            onClick={() => onClose && onClose(t.id)}
            title="Close notification"
            aria-label="Close notification"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}
