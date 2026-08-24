import { useState, useEffect } from 'react';
import BranchManagerLayout from '../../layouts/BranchManagerLayout';
import { branchManagerService } from '../../services/branchManagerService';
import '../../pages/owner/owner.css';

export default function BranchMenu() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [loading, setLoading] = useState(true);

  const loadProducts = async () => {
    try {
      const data = await branchManagerService.getProducts();
      setProducts(data || []);
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

  if (loading) {
    return (
      <BranchManagerLayout>
        <div className="owner-page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', color: 'var(--color-espresso)' }}>
          <h3>Loading menu settings...</h3>
        </div>
      </BranchManagerLayout>
    );
  }

  // Get categories from products for filter dropdown
  const categories = ['ALL', ...new Set(products.map(p => p.category))];

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
            <p className="owner-page-header__sub">Enable or disable items from the global menu specifically for Kochi Branch.</p>
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
            {categories.map(c => (
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
          {filteredProducts.map(p => (
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
              {/* Product Placeholder Image */}
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '8px',
                backgroundColor: 'var(--color-cream)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                flexShrink: 0
              }}>
                ☕
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
                  <span style={{ color: 'var(--color-text-muted)' }}>Global: {p.globalStatus}</span>
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
          ))}
        </div>
      </div>
    </BranchManagerLayout>
  );
}
