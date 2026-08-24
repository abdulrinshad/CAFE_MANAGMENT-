import { useState, useEffect } from 'react';
import BranchManagerLayout from '../../layouts/BranchManagerLayout';
import { branchManagerService } from '../../services/branchManagerService';
import { categoryApi } from '../../api';
import Modal from '../../components/Modal';
import { renderCategoryIcon, detectCategoryGroup } from '../../utils/categoryIconHelper';
import '../../pages/owner/owner.css';

export default function BranchMenu() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [loading, setLoading] = useState(true);
  
  const [allCategories, setAllCategories] = useState([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  // Category Modal State (handles both Add and Edit)
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null); // null = Add, object = Edit
  const [categoryNameInput, setCategoryNameInput] = useState('');
  const [selectedIconKey, setSelectedIconKey] = useState('');
  const [hasManuallySelectedIcon, setHasManuallySelectedIcon] = useState(false);

  // New product item inputs
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('');

  const loadProducts = async () => {
    try {
      const data = await branchManagerService.getProducts();
      setProducts(data || []);
      const cats = await categoryApi.list();
      setAllCategories(Array.isArray(cats) ? cats : (cats.results || []));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const handleToggle = async (id) => {
    try {
      await branchManagerService.toggleProductAvailability(id);
      await loadProducts();
    } catch (err) {
      alert(err.message || 'Failed to update product availability');
    }
  };

  const handleAddProductSubmit = async (e) => {
    e.preventDefault();
    if (!newItemName || !newItemPrice || !newItemCategory) {
      alert("Name, price, and category are required.");
      return;
    }
    try {
      await branchManagerService.addProduct({
        name: newItemName,
        price: newItemPrice,
        category: newItemCategory
      });
      setIsAddModalOpen(false);
      setNewItemName('');
      setNewItemPrice('');
      setNewItemCategory('');
      await loadProducts();
    } catch (err) {
      alert(err.message || 'Failed to add product');
    }
  };

  // Open modal to Create new category
  const handleOpenAddCategory = () => {
    setEditingCategory(null);
    setCategoryNameInput('');
    setSelectedIconKey('beverages_coffee');
    setHasManuallySelectedIcon(false);
    setIsCategoryModalOpen(true);
  };

  // Open modal to Edit existing category icon
  const handleOpenEditCategory = (cat) => {
    setEditingCategory(cat);
    setCategoryNameInput(cat.name || '');
    setSelectedIconKey(cat.icon || 'default');
    setHasManuallySelectedIcon(true);
    setIsCategoryModalOpen(true);
  };

  // Auto-detect group suggestions based on current categoryNameInput
  const detectedGroup = detectCategoryGroup(categoryNameInput);

  // Auto update default icon key when user types category name, if not manually selected
  const handleCategoryNameChange = (e) => {
    const val = e.target.value;
    setCategoryNameInput(val);
    if (!hasManuallySelectedIcon) {
      const group = detectCategoryGroup(val);
      if (group && group.suggestions && group.suggestions.length > 0) {
        setSelectedIconKey(group.suggestions[0].key);
      }
    }
  };

  const handleCategorySubmit = async (e) => {
    e.preventDefault();
    if (!categoryNameInput.trim()) {
      alert("Category name is required.");
      return;
    }

    const iconToSave = selectedIconKey || (detectedGroup.suggestions[0]?.key ?? 'default');

    try {
      if (editingCategory) {
        // PATCH existing category
        await categoryApi.patch(editingCategory.id, {
          name: categoryNameInput.trim(),
          icon: iconToSave
        });
      } else {
        // CREATE new category
        await categoryApi.create({
          name: categoryNameInput.trim(),
          icon: iconToSave
        });
      }

      setIsCategoryModalOpen(false);
      setEditingCategory(null);
      setCategoryNameInput('');
      setSelectedIconKey('');
      setHasManuallySelectedIcon(false);

      const cats = await categoryApi.list();
      setAllCategories(Array.isArray(cats) ? cats : (cats.results || []));
    } catch (err) {
      alert(err.message || 'Failed to save category');
    }
  };
  if (loading) {
    return (
      <BranchManagerLayout>
        <div className="owner-page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', color: 'var(--color-espresso)' }}>
          <h3>Loading menu settings...</h3>
        </div>
      </BranchManagerLayout>
    );
  }

  // Get category filter list from products & category objects
  const categoriesFilterList = ['ALL', ...new Set([
    ...allCategories.map(c => c.name),
    ...products.map(p => p.category)
  ])];

  const filteredProducts = products.filter(p => {
    const matchesSearch = String(p.name ?? "").toLowerCase().includes(search.toLowerCase()) ||
                          String(p.category ?? "").toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'ALL' || p.category === categoryFilter;
    const matchesStatus = statusFilter === 'ALL' || 
                          (statusFilter === 'available' && p.branchStatus) ||
                          (statusFilter === 'unavailable' && !p.branchStatus);

    return matchesSearch && matchesCategory && matchesStatus;
  });

  return (
    <BranchManagerLayout>
      <div className="owner-page">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 className="owner-page-header__title">Branch Menu Settings</h1>
            <p className="owner-page-header__sub">Manage menu items specifically for your branch.</p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              className="btn btn-secondary"
              onClick={handleOpenAddCategory}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              + Add Category
            </button>
            <button 
              className="btn btn-primary"
              onClick={() => setIsAddModalOpen(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              + Add Item
            </button>
          </div>
        </div>

        {/* Categories Bar / Quick View & Settings */}
        <div style={{ margin: '18px 0', background: 'var(--color-white, #FFF)', border: '1px solid var(--color-border, #E5E0D8)', borderRadius: '12px', padding: '14px 18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--color-espresso)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Category Overview & Icon Settings ({allCategories.length})
            </span>
            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
              Click any category card to customize its illustration icon
            </span>
          </div>
          <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '6px' }}>
            {allCategories.map(cat => {
              const count = products.filter(p => p.category === cat.name || String(p.category) === String(cat.id)).length;
              return (
                <div
                  key={cat.id}
                  onClick={() => handleOpenEditCategory(cat)}
                  style={{
                    minWidth: '140px',
                    padding: '10px 14px',
                    border: '1px solid var(--color-border, #E5E0D8)',
                    borderRadius: '10px',
                    backgroundColor: 'var(--color-cream-light, #FFFDF8)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                  }}
                  title="Click to customize illustration icon"
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {renderCategoryIcon(cat.icon, 36, cat.name)}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--color-espresso)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {cat.name}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                      {count} items
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Filters */}
        <div className="owner-filter-bar">
          <input
            type="text"
            className="form-input"
            placeholder="Search items..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select className="form-select" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
            {categoriesFilterList.map(c => (
              <option key={c} value={c}>{c === 'ALL' ? 'All Categories' : c}</option>
            ))}
          </select>
          <select className="form-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="ALL">All Statuses</option>
            <option value="available">Available Locally</option>
            <option value="unavailable">Temp Unavailable</option>
          </select>
        </div>

        {/* Product Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
          {filteredProducts.map(p => {
            const catObj = allCategories.find(c => c.name === p.category || String(c.id) === String(p.category));
            return (
              <div
                key={p.id}
                style={{
                  background: 'var(--color-white)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '12px',
                  padding: '16px',
                  display: 'flex',
                  gap: '14px',
                  position: 'relative'
                }}
              >
                {/* Product Illustration / Image */}
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '10px',
                  backgroundColor: 'var(--color-cream-light, #FFF8F0)',
                  border: '1px solid var(--color-border-light, #F0EAE1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  overflow: 'hidden'
                }}>
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    renderCategoryIcon(catObj?.icon, 42, p.category)
                  )}
                </div>

                {/* Product Info */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span className="owner-badge owner-badge--dine-in" style={{ fontSize: '9px', width: 'fit-content' }}>
                    {p.category}
                  </span>
                  <span style={{ fontWeight: 'bold', color: 'var(--color-espresso)', fontSize: '15px' }}>{p.name}</span>
                  <span style={{ fontWeight: '600', fontSize: '13px' }}>₹{Number(p.basePrice ?? p.price ?? 0).toFixed(2)}</span>
                  
                  {/* Status indicator tags */}
                  <div style={{ display: 'flex', gap: '4px', marginTop: '6px', fontSize: '10px' }}>
                    <span style={{ color: 'var(--color-text-muted)' }}>Global: {p.globalStatus || 'Available'}</span>
                  </div>
                </div>

                {/* Availability Switch */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-end',
                  justifyContent: 'space-between',
                  paddingLeft: '10px'
                }}>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: '600',
                    color: p.branchStatus ? 'var(--color-green)' : 'var(--color-red)'
                  }}>
                    {p.branchStatus ? 'Serving' : 'Off Menu'}
                  </span>

                  {/* Styled slider toggle */}
                  <label style={{ position: 'relative', display: 'inline-block', width: '40px', height: '22px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={p.branchStatus}
                      onChange={() => handleToggle(p.id)}
                      style={{ opacity: 0, width: 0, height: 0 }}
                    />
                    <span style={{
                      position: 'absolute',
                      top: 0, left: 0, right: 0, bottom: 0,
                      backgroundColor: p.branchStatus ? 'var(--color-green)' : 'var(--color-cream-dark)',
                      borderRadius: '34px',
                      transition: '.2s'
                    }}>
                      <span style={{
                        position: 'absolute',
                        content: '',
                        height: '14px', width: '14px',
                        left: p.branchStatus ? '20px' : '4px',
                        bottom: '4px',
                        backgroundColor: 'white',
                        borderRadius: '50%',
                        transition: '.2s'
                      }} />
                    </span>
                  </label>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Add Item Modal */}
        <Modal 
          open={isAddModalOpen} 
          onClose={() => setIsAddModalOpen(false)}
          title="Add New Item"
        >
          <form onSubmit={handleAddProductSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group">
              <label>Name</label>
              <input 
                type="text" 
                className="form-input" 
                value={newItemName}
                onChange={e => setNewItemName(e.target.value)}
                required
              />
            </div>
            
            <div className="form-group">
              <label>Category</label>
              <select 
                className="form-select"
                value={newItemCategory}
                onChange={e => setNewItemCategory(e.target.value)}
                required
              >
                <option value="">Select a category...</option>
                {allCategories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            
            <div className="form-group">
              <label>Price (₹)</label>
              <input 
                type="number" 
                step="0.01"
                min="0"
                className="form-input" 
                value={newItemPrice}
                onChange={e => setNewItemPrice(e.target.value)}
                required
              />
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => setIsAddModalOpen(false)}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Add Item
              </button>
            </div>
          </form>
        </Modal>

        {/* Add / Edit Category Modal */}
        <Modal 
          open={isCategoryModalOpen} 
          onClose={() => setIsCategoryModalOpen(false)}
          title={editingCategory ? `Customize Category Icon — ${editingCategory.name}` : "Add New Category"}
        >
          <form onSubmit={handleCategorySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Category Name</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="e.g. Desserts, Fresh Juices, Snacks"
                value={categoryNameInput}
                onChange={handleCategoryNameChange}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Category Icon Suggestion ({detectedGroup.groupLabel})</span>
                <span style={{ fontSize: '11px', fontWeight: 'normal', color: 'var(--color-text-muted)' }}>
                  Clean vector logo style
                </span>
              </label>

              {/* 2 to 3 vector icon card choices */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
                gap: '12px',
                marginTop: '8px'
              }}>
                {detectedGroup.suggestions.map(sugg => {
                  const isSelected = selectedIconKey === sugg.key;
                  const IconComp = sugg.component;
                  return (
                    <div
                      key={sugg.key}
                      onClick={() => {
                        setSelectedIconKey(sugg.key);
                        setHasManuallySelectedIcon(true);
                      }}
                      style={{
                        border: isSelected ? '2px solid var(--color-espresso, #3D2314)' : '1px solid var(--color-border, #E5E0D8)',
                        backgroundColor: isSelected ? '#FFF8F0' : '#FFFFFF',
                        borderRadius: '12px',
                        padding: '12px 10px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        position: 'relative',
                        transition: 'all 0.15s ease-in-out',
                        boxShadow: isSelected ? '0 2px 8px rgba(61,35,20,0.12)' : 'none'
                      }}
                    >
                      <IconComp size={40} />
                      <span style={{
                        fontSize: '11px',
                        fontWeight: isSelected ? '700' : '600',
                        marginTop: '6px',
                        color: 'var(--color-espresso, #3D2314)',
                        textAlign: 'center'
                      }}>
                        {sugg.label}
                      </span>

                      {isSelected && (
                        <span style={{
                          position: 'absolute',
                          top: '6px',
                          right: '6px',
                          background: 'var(--color-espresso, #3D2314)',
                          color: '#FFF',
                          borderRadius: '50%',
                          width: '16px',
                          height: '16px',
                          fontSize: '10px',
                          fontWeight: 'bold',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>✓</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => setIsCategoryModalOpen(false)}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                {editingCategory ? 'Save Icon Settings' : 'Add Category'}
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </BranchManagerLayout>
  );
}
