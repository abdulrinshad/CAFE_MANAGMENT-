import { useState, useEffect } from 'react'
import AdminLayout from '../layouts/AdminLayout'
import { waiterApi } from '../api'
import './WaitersPage.css'

export default function WaitersPage() {
  const [waiters, setWaiters] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterActive, setFilterActive] = useState('all') // 'all' | 'true' | 'false'

  // Modal State
  const [showModal, setShowModal] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [currentWaiterId, setCurrentWaiterId] = useState(null)
  
  // Form State
  const [name, setName] = useState('')
  const [section, setSection] = useState('')
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState('')
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const fetchWaiters = async () => {
    try {
      setLoading(true)
      setError('')
      const params = {}
      if (searchTerm) params.search = searchTerm
      if (filterActive !== 'all') params.is_active = filterActive
      
      const data = await waiterApi.list(params)
      const list = Array.isArray(data) ? data : (data.results ?? [])
      setWaiters(list)
    } catch (err) {
      console.error(err)
      setError(err.message || 'Unable to load waiters. Please check server connection.')
    } finally {
      setLoading(false)
    }
  }


  useEffect(() => {
    fetchWaiters()
  }, [searchTerm, filterActive])

  const handleOpenCreate = () => {
    setIsEditing(false)
    setCurrentWaiterId(null)
    setName('')
    setSection('')
    setPin('')
    setConfirmPin('')
    setIsActive(true)
    setPhotoFile(null)
    setPhotoPreview('')
    setFormError('')
    setShowModal(true)
  }

  const handleOpenEdit = (waiter) => {
    setIsEditing(true)
    setCurrentWaiterId(waiter.id)
    setName(waiter.name)
    setSection(waiter.section)
    setPin('')
    setConfirmPin('')
    setIsActive(waiter.is_active)
    setPhotoFile(null)
    setPhotoPreview(waiter.photo || '')
    setFormError('')
    setShowModal(true)
  }

  const handlePhotoChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setPhotoFile(file)
      setPhotoPreview(URL.createObjectURL(file))
    }
  }

  const handleFormSubmit = async (e) => {
    e.preventDefault()
    if (!name || !section) {
      setFormError('Name and Section are required.')
      return
    }
    if (!isEditing && (!pin || pin.length !== 4 || !/^\d+$/.test(pin))) {
      setFormError('PIN must be exactly 4 digits.')
      return
    }
    if (pin && (pin.length !== 4 || !/^\d+$/.test(pin))) {
      setFormError('PIN must be exactly 4 digits.')
      return
    }
    if (pin !== confirmPin) {
      setFormError('PINs do not match.')
      return
    }

    setSubmitting(true)
    setFormError('')

    try {
      const formData = new FormData()
      formData.append('name', name)
      formData.append('section', section)
      formData.append('is_active', isActive)
      if (pin) {
        formData.append('pin', pin)
        formData.append('confirm_pin', confirmPin)
      }
      if (photoFile) {
        formData.append('photo', photoFile)
      }

      if (isEditing) {
        await waiterApi.update(currentWaiterId, formData)
      } else {
        await waiterApi.create(formData)
      }

      setShowModal(false)
      fetchWaiters()
    } catch (err) {
      console.error(err)
      setFormError(err.message || 'Operation failed.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this waiter?')) return
    try {
      await waiterApi.delete(id)
      fetchWaiters()
    } catch (err) {
      console.error(err)
      alert(err.message || 'Failed to delete waiter.')
    }
  }


  const totalWaiters = waiters.length
  const activeWaiters = waiters.filter(w => w.is_active).length
  const inactiveWaiters = totalWaiters - activeWaiters

  return (
    <AdminLayout
      pageTitle="Waiters"
      headerRight={
        <button className="btn-primary" onClick={handleOpenCreate}>
          + Add Waiter
        </button>
      }
    >
      <div className="waiters-page">
        {error && <div className="error-banner">{error}</div>}

        <div className="waiter-stats-grid">
          <div className="stat-card">
            <div className="stat-card__label">Total Waiters</div>
            <div className="stat-card__value">{totalWaiters}</div>
          </div>
          <div className="stat-card">
            <div className="stat-card__label">Active</div>
            <div className="stat-card__value">{activeWaiters}</div>
          </div>
          <div className="stat-card">
            <div className="stat-card__label">Inactive</div>
            <div className="stat-card__value">{inactiveWaiters}</div>
          </div>
        </div>

        <div className="filters-bar">
          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search waiters by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="filter-group">
            <label>Status:</label>
            <select value={filterActive} onChange={(e) => setFilterActive(e.target.value)}>
              <option value="all">All Waiters</option>
              <option value="true">Active Only</option>
              <option value="false">Inactive Only</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="loading-spinner-wrap">
            <div className="spinner"></div>
            <span>Loading waiters...</span>
          </div>
        ) : (
          <div className="waiters-grid">
            {waiters.map((w) => (
              <div key={w.id} className={`waiter-card ${w.is_active ? '' : 'inactive'}`}>
                <div className="waiter-card-header">
                  <span className={`status-badge ${w.is_active ? 'active' : 'inactive'}`}>
                    {w.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="waiter-card-body">
                  <div className="waiter-card-avatar-wrap">
                    {w.photo ? (
                      <img src={w.photo} alt={w.name} className="waiter-card-photo" />
                    ) : (
                      <div className="waiter-card-avatar-placeholder">👤</div>
                    )}
                  </div>
                  <h3 className="waiter-card-name">{w.name}</h3>
                  <div className="waiter-card-detail">
                    <span className="detail-label">Section:</span>
                    <span className="detail-value">{w.section}</span>
                  </div>
                  <div className="waiter-card-detail">
                    <span className="detail-label">Joined:</span>
                    <span className="detail-value">{new Date(w.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="waiter-card-actions">
                  <button className="btn-secondary btn-sm" onClick={() => handleOpenEdit(w)}>
                    Edit
                  </button>
                  <button className="btn-danger btn-sm" onClick={() => handleDelete(w.id)}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
            {waiters.length === 0 && (
              <div className="no-waiters-state">
                <p>No waiters yet</p>
                <p style={{ fontSize: '0.85rem', color: '#888', marginTop: '0.25rem' }}>Create your first waiter to enable POS PIN login.</p>
              </div>
            )}
          </div>
        )}

        {/* Create/Edit Modal */}
        {showModal && (
          <div className="modal-overlay">
            <div className="modal-container">
              <div className="modal-header">
                <h2>{isEditing ? 'Edit Waiter Details' : 'Create New Waiter'}</h2>
                <button className="btn-close" onClick={() => setShowModal(false)}>×</button>
              </div>
              <form onSubmit={handleFormSubmit}>
                <div className="modal-body">
                  {formError && <div className="modal-error">{formError}</div>}

                  <div className="form-photo-upload">
                    <div className="photo-preview-box">
                      {photoPreview ? (
                        <img src={photoPreview} alt="Preview" />
                      ) : (
                        <span>👤</span>
                      )}
                    </div>
                    <label className="btn-photo-upload">
                      Upload Photo
                      <input type="file" accept="image/*" onChange={handlePhotoChange} style={{ display: 'none' }} />
                    </label>
                  </div>

                  <div className="form-field">
                    <label htmlFor="w-name">Full Name</label>
                    <input
                      id="w-name"
                      type="text"
                      placeholder="e.g. Priya"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-field">
                    <label htmlFor="w-section">Assigned Section / Area</label>
                    <input
                      id="w-section"
                      type="text"
                      placeholder="e.g. Patio, Station 2"
                      value={section}
                      onChange={(e) => setSection(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-field">
                      <label htmlFor="w-pin">{isEditing ? 'New 4-digit PIN (Optional)' : '4-digit PIN'}</label>
                      <input
                        id="w-pin"
                        type="password"
                        placeholder="••••"
                        maxLength="4"
                        value={pin}
                        onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                        required={!isEditing}
                      />
                    </div>
                    <div className="form-field">
                      <label htmlFor="w-confirm-pin">{isEditing ? 'Confirm New PIN' : 'Confirm PIN'}</label>
                      <input
                        id="w-confirm-pin"
                        type="password"
                        placeholder="••••"
                        maxLength="4"
                        value={confirmPin}
                        onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                        required={!!pin}
                      />
                    </div>
                  </div>

                  <div className="form-checkbox-field">
                    <label className="checkbox-wrap">
                      <input
                        type="checkbox"
                        checked={isActive}
                        onChange={(e) => setIsActive(e.target.checked)}
                      />
                      <span>Active Waitstaff Account</span>
                    </label>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn-secondary" onClick={() => setShowModal(false)} disabled={submitting}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary" disabled={submitting}>
                    {submitting ? 'Saving...' : isEditing ? 'Update Waiter' : 'Create Waiter'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
