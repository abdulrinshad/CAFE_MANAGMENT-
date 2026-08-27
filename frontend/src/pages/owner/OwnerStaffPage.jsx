import { useState, useEffect } from 'react'
import AdminLayout from '../../layouts/AdminLayout'
import Modal from '../../components/Modal'
import { branchApi, branchManagerApi, waiterApi, cashierApi } from '../../api'
import './owner.css'

export default function OwnerStaffPage() {
  const [tab, setTab] = useState('managers')
  const [branches, setBranches] = useState([])
  const [managers, setManagers] = useState([])
  const [staff, setStaff] = useState([])
  const [branchFilter, setBranchFilter] = useState('All')
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState(null)

  useEffect(() => {
    fetchBranches()
  }, [])

  useEffect(() => {
    fetchUsers()
  }, [tab, branchFilter])

  const fetchBranches = async () => {
    try {
      const res = await branchApi.list()
      setBranches(Array.isArray(res) ? res : (res.results || []))
    } catch (err) {
      console.error(err)
    }
  }

  const fetchUsers = async () => {
    setLoading(true)
    try {
      if (tab === 'managers') {
        const res = await branchManagerApi.list()
        let data = Array.isArray(res) ? res : (res.results || [])
        if (branchFilter !== 'All') {
          data = data.filter(m => m.branch === parseInt(branchFilter) || m.branch?.id === parseInt(branchFilter))
        }
        setManagers(data)
      } else {
        const [w, c] = await Promise.all([
           waiterApi.list(),
           cashierApi.list()
        ])
        
        let wData = Array.isArray(w) ? w : (w.results || [])
        let cData = Array.isArray(c) ? c : (c.results || [])
        
        let data = [...wData.map(i=>({...i, role:'waiter'})), ...cData.map(i=>({...i, role:'cashier'}))]
        if (branchFilter !== 'All') {
          data = data.filter(s => s.branch === parseInt(branchFilter) || s.branch?.id === parseInt(branchFilter))
        }
        setStaff(data)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const toggleManagerStatus = async (manager) => {
    setProcessingId(manager.id);
    try {
      await branchManagerApi.update(manager.id, {
        is_active: !manager.is_active
      })
      fetchUsers()
    } catch (err) {
      console.error(err)
      alert("Failed to update status.");
    } finally {
      setProcessingId(null);
    }
  }

  const toggleStaffStatus = async (user) => {
    setProcessingId(user.id);
    try {
      if (user.role === 'waiter') {
        await waiterApi.update(user.id, { is_active: !user.is_active })
      } else {
        await cashierApi.setActive(user.id, !user.is_active)
      }
      fetchUsers()
    } catch (err) {
      console.error(err)
      alert("Failed to update status.");
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <AdminLayout pageTitle="Staff & Permissions" pageIcon="👥">
      <div className="owner-page">

        <div className="owner-page-header">
          <div className="owner-page-header__left">
            <h1 className="owner-page-header__title">Staff &amp; Branch Managers</h1>
            <p className="owner-page-header__sub">Manage employee access, roles, and branch assignments.</p>
          </div>
          <div className="owner-page-header__actions">
             <select className="form-select" value={branchFilter} onChange={e => setBranchFilter(e.target.value)} style={{width: 200}}>
                <option value="All">All Branches</option>
                {branches.map(b => (
                   <option key={b.id} value={b.id}>{b.name}</option>
                ))}
             </select>
          </div>
        </div>

        <div className="owner-section-card">
          <div className="owner-tab-bar" style={{ padding: '0 20px', borderBottom: '1px solid var(--color-border)' }}>
            <button className={`owner-tab${tab === 'managers' ? ' owner-tab--active' : ''}`} onClick={() => setTab('managers')}>
              Branch Managers ({managers.length})
            </button>
            <button className={`owner-tab${tab === 'staff' ? ' owner-tab--active' : ''}`} onClick={() => setTab('staff')}>
              Branch Staff ({staff.length})
            </button>
          </div>

          <div className="owner-table-wrap" style={{ border: 'none', borderRadius: 0 }}>
            {loading ? (
               <div style={{padding: 20, textAlign: 'center'}}>Loading...</div>
            ) : tab === 'managers' ? (
              <table className="owner-table">
                <thead>
                  <tr>
                    <th>Manager Name</th>
                    <th>Manager ID</th>
                    <th>Branch</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {managers.map(m => (
                    <tr key={m.id}>
                      <td className="td-name">{m.name}</td>
                      <td>{m.manager_id}</td>
                      <td>{branches.find(b=>b.id === (m.branch?.id || m.branch))?.name || 'Unknown'}</td>
                      <td>
                        <span className={`owner-badge owner-badge--${m.is_active ? 'active' : 'inactive'}`}>
                          {m.is_active ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </td>
                      <td>
                        <div className="td-actions">
                          <button
                            className={`btn ${m.is_active ? 'btn-danger' : 'btn-primary'}`}
                            style={{ padding: '6px 12px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', opacity: processingId === m.id ? 0.6 : 1 }}
                            title={m.is_active ? 'Deactivate' : 'Activate'}
                            disabled={processingId === m.id}
                            onClick={() => {
                              if (m.is_active) {
                                if (window.confirm(`Are you sure you want to deactivate ${m.name}? They will lose access immediately.`)) {
                                  toggleManagerStatus(m)
                                }
                              } else {
                                toggleManagerStatus(m)
                              }
                            }}
                          >
                            {processingId === m.id ? (
                              <span style={{ fontSize: '14px' }}>⏳ Processing...</span>
                            ) : m.is_active ? (
                              <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="9" x2="15" y2="15"></line><line x1="15" y1="9" x2="9" y2="15"></line></svg> Deactivate</>
                            ) : (
                              <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg> Activate</>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {managers.length === 0 && <tr><td colSpan={5} style={{textAlign: 'center'}}>No managers found</td></tr>}
                </tbody>
              </table>
            ) : (
              <table className="owner-table">
                <thead>
                  <tr>
                    <th>Staff Name</th>
                    <th>Employee ID</th>
                    <th>Role</th>
                    <th>Branch</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {staff.map(s => (
                    <tr key={`${s.role}-${s.id}`}>
                      <td className="td-name">{s.name}</td>
                      <td>{s.employee_id}</td>
                      <td style={{textTransform: 'capitalize'}}>{s.role}</td>
                      <td>{branches.find(b=>b.id === (s.branch?.id || s.branch))?.name || 'Unknown'}</td>
                      <td>
                        <span className={`owner-badge owner-badge--${s.is_active ? 'active' : 'inactive'}`}>
                          {s.is_active ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </td>
                      <td>
                        <div className="td-actions">
                          <button
                            className={`btn ${s.is_active ? 'btn-danger' : 'btn-primary'}`}
                            style={{ padding: '6px 12px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', opacity: processingId === s.id ? 0.6 : 1 }}
                            title={s.is_active ? 'Deactivate' : 'Activate'}
                            disabled={processingId === s.id}
                            onClick={() => {
                              if (s.is_active) {
                                if (window.confirm(`Are you sure you want to deactivate ${s.name}? They will lose access immediately.`)) {
                                  toggleStaffStatus(s)
                                }
                              } else {
                                toggleStaffStatus(s)
                              }
                            }}
                          >
                            {processingId === s.id ? (
                              <span style={{ fontSize: '14px' }}>⏳ Processing...</span>
                            ) : s.is_active ? (
                              <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="9" x2="15" y2="15"></line><line x1="15" y1="9" x2="9" y2="15"></line></svg> Deactivate</>
                            ) : (
                              <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg> Activate</>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {staff.length === 0 && <tr><td colSpan={6} style={{textAlign: 'center'}}>No staff found</td></tr>}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>
    </AdminLayout>
  )
}
