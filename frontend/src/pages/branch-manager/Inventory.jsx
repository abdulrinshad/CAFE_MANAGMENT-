import { useState, useEffect } from 'react';
import BranchManagerLayout from '../../layouts/BranchManagerLayout';
import { branchManagerService } from '../../services/branchManagerService';
import '../../pages/owner/owner.css';

export default function Inventory() {
  const [inventory, setInventory] = useState([]);
  const [showItemModal, setShowItemModal] = useState(false);
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  
  const [selectedItem, setSelectedItem] = useState(null);
  const [itemForm, setItemForm] = useState({
    name: '',
    category: 'Perishables',
    currentStock: 0,
    unit: 'KG',
    minimumStock: 10,
    cost: 0,
    supplier: ''
  });
  
  const [adjustmentForm, setAdjustmentForm] = useState({
    type: 'add', // add, remove, correction
    quantity: 0,
    reason: 'Purchase delivery',
    notes: ''
  });

  useEffect(() => {
    setInventory(branchManagerService.getInventory());
  }, []);

  const handleOpenAdd = () => {
    setItemForm({
      name: '',
      category: 'Perishables',
      currentStock: 0,
      unit: 'KG',
      minimumStock: 10,
      cost: 0,
      supplier: ''
    });
    setShowItemModal(true);
  };

  const handleOpenAdjust = (item) => {
    setSelectedItem(item);
    setAdjustmentForm({
      type: 'add',
      quantity: 0,
      reason: 'Purchase delivery',
      notes: ''
    });
    setShowAdjustmentModal(true);
  };

  const handleSaveItem = (e) => {
    e.preventDefault();
    branchManagerService.addInventoryItem(itemForm);
    setInventory(branchManagerService.getInventory());
    setShowItemModal(false);
  };

  const handleSaveAdjustment = (e) => {
    e.preventDefault();
    branchManagerService.adjustStock(
      selectedItem.id,
      adjustmentForm.type,
      adjustmentForm.quantity,
      adjustmentForm.reason
    );
    setInventory(branchManagerService.getInventory());
    setShowAdjustmentModal(false);
  };

  // Metrics
  const totalItems = inventory.length;
  const lowStock = inventory.filter(i => i.currentStock > 0 && i.currentStock <= i.minimumStock);
  const outOfStock = inventory.filter(i => i.currentStock === 0);
  const inStockCount = totalItems - lowStock.length - outOfStock.length;
  const inventoryValue = inventory.reduce((sum, i) => sum + (i.currentStock * i.cost), 0);

  const getStockStatusBadge = (item) => {
    if (item.currentStock === 0) return <span className="owner-badge owner-badge--out">OUT OF STOCK</span>;
    if (item.currentStock <= item.minimumStock) return <span className="owner-badge owner-badge--low">LOW STOCK</span>;
    return <span className="owner-badge owner-badge--ok">IN STOCK</span>;
  };

  return (
    <BranchManagerLayout>
      <div className="owner-page">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 className="owner-page-header__title">Inventory Management</h1>
            <p className="owner-page-header__sub">Track branch stock levels, adjustments, and supplier records.</p>
          </div>
          <button className="btn-primary" onClick={handleOpenAdd}>+ Add Item</button>
        </div>

        {/* Summary Cards */}
        <div className="owner-kpi-grid owner-kpi-grid--5">
          <div className="owner-kpi-card">
            <div className="owner-kpi-card__label">Total Ingredients</div>
            <div className="owner-kpi-card__value">{totalItems}</div>
          </div>
          <div className="owner-kpi-card">
            <div className="owner-kpi-card__label">Fully In Stock</div>
            <div className="owner-kpi-card__value" style={{ color: 'var(--color-green)' }}>{inStockCount}</div>
          </div>
          <div className="owner-kpi-card">
            <div className="owner-kpi-card__label">Low Stock</div>
            <div className="owner-kpi-card__value" style={{ color: 'var(--color-orange)' }}>{lowStock.length}</div>
          </div>
          <div className="owner-kpi-card">
            <div className="owner-kpi-card__label">Out of Stock</div>
            <div className="owner-kpi-card__value" style={{ color: 'var(--color-red)' }}>{outOfStock.length}</div>
          </div>
          <div className="owner-kpi-card">
            <div className="owner-kpi-card__label">Inventory Value</div>
            <div className="owner-kpi-card__value">₹{inventoryValue.toLocaleString('en-IN')}</div>
          </div>
        </div>

        {/* Prominent Low Stock Alert Area */}
        {lowStock.length > 0 && (
          <div style={{
            background: 'rgba(212,96,26,0.06)',
            border: '1.5px solid var(--color-orange)',
            borderRadius: '12px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', color: 'var(--color-orange)', fontSize: '14px' }}>
              ⚠️ Low Stock Alerts (Action Required)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px' }}>
              {lowStock.map(item => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--color-border-light)' }}>
                  <div>
                    <span style={{ fontWeight: '600', fontSize: '13px' }}>{item.name}</span>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Only {item.currentStock} {item.unit} left (Min {item.minimumStock})</div>
                  </div>
                  <button className="btn-outline" style={{ padding: '4px 8px', fontSize: '11px' }} onClick={() => handleOpenAdjust(item)}>Quick Restock</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Inventory Table */}
        <div className="owner-section-card">
          <div className="owner-table-wrap">
            <table className="owner-table">
              <thead>
                <tr>
                  <th>Item Name</th>
                  <th>Category</th>
                  <th>Current Stock</th>
                  <th>Minimum Stock</th>
                  <th>Status</th>
                  <th>Cost (per Unit)</th>
                  <th>Last Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {inventory.map(item => (
                  <tr key={item.id}>
                    <td className="td-name">{item.name}</td>
                    <td>{item.category}</td>
                    <td style={{ fontWeight: 'bold' }}>{item.currentStock} {item.unit}</td>
                    <td>{item.minimumStock} {item.unit}</td>
                    <td>{getStockStatusBadge(item)}</td>
                    <td>₹{item.cost.toFixed(2)}</td>
                    <td className="td-muted">{item.lastUpdated}</td>
                    <td>
                      <div className="td-actions">
                        <button className="btn-outline" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={() => handleOpenAdjust(item)}>
                          Adjust Stock
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add Inventory Item Modal */}
        {showItemModal && (
          <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(44, 24, 16, 0.4)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div style={{
              background: '#fff',
              padding: '24px',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '500px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
            }}>
              <h2 style={{ fontFamily: 'var(--font-serif)', color: 'var(--color-espresso)', marginBottom: '16px' }}>Add Stock Item</h2>
              <form onSubmit={handleSaveItem}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Item Name</label>
                    <input
                      type="text"
                      className="form-input"
                      required
                      placeholder="e.g. Fresh milk"
                      value={itemForm.name}
                      onChange={e => setItemForm({ ...itemForm, name: e.target.value })}
                    />
                  </div>

                  <div className="owner-form-grid" style={{ marginTop: 0 }}>
                    <div className="form-group">
                      <label className="form-label">Category</label>
                      <select
                        className="form-select"
                        value={itemForm.category}
                        onChange={e => setItemForm({ ...itemForm, category: e.target.value })}
                      >
                        <option value="Perishables">Perishables</option>
                        <option value="Dry Goods">Dry Goods</option>
                        <option value="Pantry Supplies">Pantry Supplies</option>
                        <option value="Dairy">Dairy</option>
                        <option value="Coffee Supplies">Coffee Supplies</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Measurement Unit</label>
                      <input
                        type="text"
                        className="form-input"
                        required
                        placeholder="e.g. KG, L, Boxes"
                        value={itemForm.unit}
                        onChange={e => setItemForm({ ...itemForm, unit: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="owner-form-grid" style={{ marginTop: 0 }}>
                    <div className="form-group">
                      <label className="form-label">Initial Quantity</label>
                      <input
                        type="number"
                        className="form-input"
                        required
                        min={0}
                        value={itemForm.currentStock}
                        onChange={e => setItemForm({ ...itemForm, currentStock: e.target.value })}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Minimum Level</label>
                      <input
                        type="number"
                        className="form-input"
                        required
                        min={0}
                        value={itemForm.minimumStock}
                        onChange={e => setItemForm({ ...itemForm, minimumStock: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="owner-form-grid" style={{ marginTop: 0 }}>
                    <div className="form-group">
                      <label className="form-label">Unit Cost (₹)</label>
                      <input
                        type="number"
                        className="form-input"
                        required
                        min={0}
                        value={itemForm.cost}
                        onChange={e => setItemForm({ ...itemForm, cost: e.target.value })}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Supplier Name</label>
                      <input
                        type="text"
                        className="form-input"
                        value={itemForm.supplier}
                        onChange={e => setItemForm({ ...itemForm, supplier: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="owner-modal-footer">
                  <button type="button" className="btn-outline" onClick={() => setShowItemModal(false)}>Cancel</button>
                  <button type="submit" className="btn-primary">Add Item</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Stock Adjustment Modal */}
        {showAdjustmentModal && selectedItem && (
          <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(44, 24, 16, 0.4)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div style={{
              background: '#fff',
              padding: '24px',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '450px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
            }}>
              <h2 style={{ fontFamily: 'var(--font-serif)', color: 'var(--color-espresso)', marginBottom: '4px' }}>
                Stock Adjustment
              </h2>
              <span className="td-muted">Item: {selectedItem.name} (Current: {selectedItem.currentStock} {selectedItem.unit})</span>
              
              <form onSubmit={handleSaveAdjustment} style={{ marginTop: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Adjustment Type</label>
                    <select
                      className="form-select"
                      value={adjustmentForm.type}
                      onChange={e => setAdjustmentForm({ ...adjustmentForm, type: e.target.value })}
                    >
                      <option value="add">Add Stock (Receive shipment)</option>
                      <option value="remove">Remove Stock (Consumption/Wastage)</option>
                      <option value="correction">Inventory Correction (Set Absolute)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Quantity ({selectedItem.unit})</label>
                    <input
                      type="number"
                      className="form-input"
                      required
                      min={1}
                      value={adjustmentForm.quantity}
                      onChange={e => setAdjustmentForm({ ...adjustmentForm, quantity: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Reason / Notes</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Regular kitchen use, Spoiled milk"
                      value={adjustmentForm.notes}
                      onChange={e => setAdjustmentForm({ ...adjustmentForm, notes: e.target.value })}
                    />
                  </div>
                </div>

                <div className="owner-modal-footer">
                  <button type="button" className="btn-outline" onClick={() => setShowAdjustmentModal(false)}>Cancel</button>
                  <button type="submit" className="btn-primary">Apply Adjustment</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </BranchManagerLayout>
  );
}
