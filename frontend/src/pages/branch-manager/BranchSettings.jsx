import { useState, useEffect } from 'react';
import BranchManagerLayout from '../../layouts/BranchManagerLayout';
import { branchManagerService } from '../../services/branchManagerService';
import '../../pages/owner/owner.css';

export default function BranchSettings() {
  const [branchInfo, setBranchInfo] = useState({});
  const [activeTab, setActiveTab] = useState('profile');
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    setBranchInfo(branchManagerService.getBranchInfo());
  }, []);

  const handleSave = (e) => {
    e.preventDefault();
    branchManagerService.updateBranchSettings(branchInfo);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const tabs = [
    { key: 'profile', label: 'Branch Profile' },
    { key: 'operations', label: 'Operational Rules' },
    { key: 'notifications', label: 'Alert Preferences' }
  ];

  return (
    <BranchManagerLayout>
      <div className="owner-page">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 className="owner-page-header__title">Branch Settings</h1>
            <p className="owner-page-header__sub">Configure contact card, operating times, tax schemes, and system alerts for Kochi.</p>
          </div>
        </div>

        {/* Settings Navigation */}
        <div className="owner-settings-layout">
          {/* Sidebar Tabs */}
          <div className="owner-settings-nav">
            {tabs.map(tab => (
              <button
                key={tab.key}
                className={`owner-settings-nav-item ${activeTab === tab.key ? 'owner-settings-nav-item--active' : ''}`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Form details */}
          <div className="owner-settings-section">
            <form onSubmit={handleSave}>
              {activeTab === 'profile' && (
                <div className="owner-settings-block">
                  <h3 className="owner-settings-block__title">Branch Profile</h3>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div className="form-group">
                      <label className="form-label">Branch Store Name</label>
                      <input
                        type="text"
                        className="form-input"
                        disabled
                        value={branchInfo.name || ''}
                      />
                      <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                        * Global brand names are set by the corporate owner.
                      </span>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Street Address</label>
                      <textarea
                        className="form-textarea"
                        value={branchInfo.address || ''}
                        onChange={e => setBranchInfo({ ...branchInfo, address: e.target.value })}
                      />
                    </div>

                    <div className="owner-form-grid" style={{ marginTop: 0 }}>
                      <div className="form-group">
                        <label className="form-label">Manager Helpline Phone</label>
                        <input
                          type="text"
                          className="form-input"
                          value={branchInfo.phone || ''}
                          onChange={e => setBranchInfo({ ...branchInfo, phone: e.target.value })}
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Manager Contact Email</label>
                        <input
                          type="email"
                          className="form-input"
                          value={branchInfo.email || ''}
                          onChange={e => setBranchInfo({ ...branchInfo, email: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="owner-form-grid" style={{ marginTop: 0 }}>
                      <div className="form-group">
                        <label className="form-label">Opening Hours</label>
                        <input
                          type="text"
                          className="form-input"
                          value={branchInfo.openingTime || ''}
                          onChange={e => setBranchInfo({ ...branchInfo, openingTime: e.target.value })}
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Closing Hours</label>
                        <input
                          type="text"
                          className="form-input"
                          value={branchInfo.closingTime || ''}
                          onChange={e => setBranchInfo({ ...branchInfo, closingTime: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'operations' && (
                <div className="owner-settings-block">
                  <h3 className="owner-settings-block__title">Operational & Tax Settings</h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div className="owner-form-grid" style={{ marginTop: 0 }}>
                      <div className="form-group">
                        <label className="form-label">Local Tax / GST Scheme (%)</label>
                        <input
                          type="number"
                          className="form-input"
                          value={branchInfo.taxGST || 18}
                          onChange={e => setBranchInfo({ ...branchInfo, taxGST: Number(e.target.value) })}
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Currency Notation</label>
                        <input
                          type="text"
                          className="form-input"
                          disabled
                          value={branchInfo.currency || 'INR'}
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Default Table Service Charge (%)</label>
                      <input
                        type="number"
                        className="form-input"
                        value={branchInfo.serviceCharge || 5}
                        onChange={e => setBranchInfo({ ...branchInfo, serviceCharge: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'notifications' && (
                <div className="owner-settings-block">
                  <h3 className="owner-settings-block__title">Alert & Notification Toggles</h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--color-border-light)' }}>
                      <div>
                        <span style={{ fontWeight: '500', fontSize: '13px' }}>Dine-In Customer Assistance Request Alerts</span>
                        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Ping sound notification when a table scans a QR and clicks Call Waiter.</div>
                      </div>
                      <input type="checkbox" defaultChecked />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--color-border-light)' }}>
                      <div>
                        <span style={{ fontWeight: '500', fontSize: '13px' }}>Digital QR Bill Requests</span>
                        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Send notification alert when customer clicks Request Bill on QR page.</div>
                      </div>
                      <input type="checkbox" defaultChecked />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0' }}>
                      <div>
                        <span style={{ fontWeight: '500', fontSize: '13px' }}>Inventory Shortage / Low Stock Push Notifications</span>
                        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Daily warning log listing ingredients falling below minimum quantities.</div>
                      </div>
                      <input type="checkbox" defaultChecked />
                    </div>
                  </div>
                </div>
              )}

              {/* Submit footer */}
              <div style={{ marginTop: '16px', display: 'flex', gap: '12px', alignItems: 'center', justifyContent: 'flex-end' }}>
                {saveSuccess && (
                  <span style={{ fontSize: '12px', color: 'var(--color-green)', fontWeight: 'bold' }}>
                    ✓ Settings saved successfully!
                  </span>
                )}
                <button type="submit" className="btn-primary">Save Settings</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </BranchManagerLayout>
  );
}
