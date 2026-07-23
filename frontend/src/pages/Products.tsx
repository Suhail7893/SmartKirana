import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import type { Product } from '../context/AppContext';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Filter, 
  Package, 
  Barcode, 
  AlertTriangle 
} from 'lucide-react';

export const Products: React.FC = () => {
  const { products, addProduct, updateProduct, deleteProduct } = useApp();
  
  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  // Form Fields
  const [name, setName] = useState('');
  const [barcode, setBarcode] = useState('');
  const [category, setCategory] = useState('Grocery');
  const [price, setPrice] = useState('0');
  const [costPrice, setCostPrice] = useState('0');
  const [minStock, setMinStock] = useState('10');
  const [unit, setUnit] = useState('units');
  const [description, setDescription] = useState('');
  const [initialStock, setInitialStock] = useState('0');

  const categories = ['All', 'Grocery', 'Dairy', 'Snacks', 'Beverages', 'Spices', 'Household', 'Personal Care', 'Baby Care', 'Stationery'];


  // Handle Edit click
  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setName(p.name);
    setBarcode(p.barcode);
    setCategory(p.category);
    setPrice(p.price.toString());
    setCostPrice(p.cost_price.toString());
    setMinStock(p.min_stock_level.toString());
    setUnit(p.unit);
    setDescription(p.description);
    setIsModalOpen(true);
  };

  // Handle Add click
  const openAddModal = () => {
    setEditingProduct(null);
    setName('');
    setBarcode('');
    setCategory('Grocery');
    setPrice('0');
    setCostPrice('0');
    setMinStock('10');
    setUnit('units');
    setDescription('');
    setInitialStock('0');
    setIsModalOpen(true);
  };

  // Submit form
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const productPayload = {
      name,
      barcode,
      category,
      price: parseFloat(price) || 0,
      cost_price: parseFloat(costPrice) || 0,
      min_stock_level: parseInt(minStock) || 0,
      unit,
      description
    };

    if (editingProduct) {
      updateProduct(editingProduct.id, productPayload);
    } else {
      addProduct({
        ...productPayload,
        initial_stock: parseInt(initialStock) || 0
      });
    }

    setIsModalOpen(false);
  };

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            p.barcode.includes(searchTerm);
      const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, selectedCategory]);

  return (
    <div className="page-container">
      {/* Header controls */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        {/* Search and Filters */}
        <div style={{ display: 'flex', gap: '0.75rem', flex: '1', minWidth: '280px', maxWidth: '600px' }}>
          <div style={{ position: 'relative', flex: '1' }}>
            <Search size={18} color="var(--color-text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              className="form-input"
              placeholder="Search products by name or barcode..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '2.5rem', width: '100%' }}
            />
          </div>
          
          <div style={{ position: 'relative', width: '160px' }}>
            <Filter size={16} color="var(--color-text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <select
              className="form-select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={{ paddingLeft: '2.3rem', width: '100%', height: '100%' }}
            >
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Add Product Button */}
        <button className="btn btn-primary" onClick={openAddModal}>
          <Plus size={18} />
          <span>Add Product</span>
        </button>
      </div>

      {/* Product Catalog Grid */}
      {filteredProducts.length === 0 ? (
        <div className="card" style={{ padding: '4rem', textAlign: 'center' }}>
          <Package size={48} color="var(--color-text-muted)" style={{ marginBottom: '1rem' }} />
          <h3 style={{ marginBottom: '0.5rem' }}>No Products Found</h3>
          <p style={{ color: 'var(--color-text-muted)' }}>Try refining your search query or category filters.</p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '1.5rem'
        }}>
          {filteredProducts.map((p) => {
            const margin = p.price > 0 ? ((p.price - p.cost_price) / p.price) * 100 : 0;
            const isLowStock = p.current_stock <= p.min_stock_level;

            return (
              <div 
                key={p.id} 
                className="card" 
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  textAlign: 'left',
                  borderLeft: isLowStock ? '4px solid var(--danger)' : '1px solid var(--border-color)',
                  background: 'rgba(16, 18, 26, 0.65)'
                }}
              >
                <div>
                  {/* Category and barcode */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>{p.category}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                      <Barcode size={12} />
                      {p.barcode ? p.barcode.substring(0, 7) + '...' : 'No Barcode'}
                    </span>
                  </div>

                  {/* Product title */}
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem', height: '2.5rem', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {p.name}
                  </h3>
                  
                  <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '1.25rem', height: '2.4rem', overflow: 'hidden' }}>
                    {p.description || 'No description available for this product.'}
                  </p>

                  {/* Financial Stats */}
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: '1fr 1fr', 
                    gap: '0.75rem', 
                    padding: '0.75rem', 
                    background: '#131520', 
                    borderRadius: 'var(--radius-sm)',
                    marginBottom: '1rem'
                  }}>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Sell Price</div>
                      <span style={{ fontWeight: 700, color: 'var(--color-text-bright)' }}>₹{p.price.toFixed(2)}</span>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Cost Price</div>
                      <span style={{ fontWeight: 500 }}>₹{p.cost_price.toFixed(2)}</span>
                    </div>
                    <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.4rem', fontSize: '0.75rem' }}>
                      <span style={{ color: 'var(--color-text-muted)' }}>Margin:</span>
                      <span style={{ color: 'var(--success)', fontWeight: 600 }}>{margin.toFixed(0)}%</span>
                    </div>
                  </div>
                </div>

                {/* Stock status footer */}
                <div>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    marginBottom: '1rem',
                    fontSize: '0.85rem'
                  }}>
                    <span>Stock:</span>
                    <span style={{ 
                      fontWeight: 700, 
                      color: p.current_stock === 0 ? 'var(--danger)' : isLowStock ? 'var(--warning)' : 'var(--success)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem'
                    }}>
                      {isLowStock && <AlertTriangle size={14} color="var(--warning)" />}
                      {p.current_stock} {p.unit}
                    </span>
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                    <button 
                      onClick={() => openEditModal(p)}
                      className="btn btn-secondary btn-sm" 
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Edit size={14} />
                      <span>Edit</span>
                    </button>
                    <button 
                      onClick={() => deleteProduct(p.id)}
                      className="btn btn-secondary btn-sm" 
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.1)' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ADD / EDIT MODAL */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.2rem' }}>{editingProduct ? `Edit "${editingProduct.name}"` : 'Add New Product'}</h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.5rem', cursor: 'pointer' }}
              >
                &times;
              </button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ maxHeight: '420px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Product Name */}
                <div className="form-group">
                  <label className="form-label">Product Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Britannia Marie Gold 250g"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  {/* Barcode */}
                  <div className="form-group">
                    <label className="form-label">Barcode / UPC</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. 8901109001311"
                      value={barcode}
                      onChange={(e) => setBarcode(e.target.value)}
                    />
                  </div>

                  {/* Category */}
                  <div className="form-group">
                    <label className="form-label">Category *</label>
                    <select
                      className="form-select"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                    >
                      {categories.filter(c => c !== 'All').map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  {/* Cost Price */}
                  <div className="form-group">
                    <label className="form-label">Cost Price (INR) *</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-input"
                      value={costPrice}
                      onChange={(e) => setCostPrice(e.target.value)}
                      required
                    />
                  </div>

                  {/* Sell Price */}
                  <div className="form-group">
                    <label className="form-label">Retail Price (INR) *</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-input"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  {/* Min Stock Level */}
                  <div className="form-group">
                    <label className="form-label">Min Stock Level *</label>
                    <input
                      type="number"
                      className="form-input"
                      value={minStock}
                      onChange={(e) => setMinStock(e.target.value)}
                      required
                    />
                  </div>

                  {/* Unit */}
                  <div className="form-group">
                    <label className="form-label">Stock Unit *</label>
                    <select
                      className="form-select"
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                    >
                      <option value="units">units</option>
                      <option value="packets">packets</option>
                      <option value="packs">packs</option>
                      <option value="kg">kg</option>
                      <option value="bags">bags</option>
                      <option value="bottles">bottles</option>
                      <option value="tubes">tubes</option>
                    </select>
                  </div>
                </div>

                {/* Initial Stock (Only for new products) */}
                {!editingProduct && (
                  <div className="form-group">
                    <label className="form-label">Initial Stock *</label>
                    <input
                      type="number"
                      className="form-input"
                      value={initialStock}
                      onChange={(e) => setInitialStock(e.target.value)}
                      required
                    />
                  </div>
                )}

                {/* Description */}
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea
                    className="form-input"
                    style={{ minHeight: '60px', resize: 'vertical' }}
                    placeholder="Provide brief product details..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingProduct ? 'Save Changes' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
