import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import type { Product } from '../context/AppContext';
import { 
  Plus, 
  Minus, 
  RefreshCw, 
  History, 
  FileCheck, 
  Search,
  Sliders
} from 'lucide-react';

export const Inventory: React.FC = () => {
  const { products, inventoryLogs, adjustStock, currentUser } = useApp();
  
  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal state
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  // Adjustment Form fields
  const [adjustType, setAdjustType] = useState<'IN' | 'OUT' | 'ADJUSTMENT'>('IN');
  const [adjustQty, setAdjustQty] = useState('10');
  const [adjustReason, setAdjustReason] = useState('');

  // Handle Adjustment Modal open
  const openAdjustModal = (p: Product) => {
    setSelectedProduct(p);
    setAdjustType('IN');
    setAdjustQty('10');
    setAdjustReason('');
    setIsAdjustModalOpen(true);
  };

  // Submit Adjustment
  const handleAdjustSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    const qty = parseInt(adjustQty) || 0;
    if (qty <= 0) {
      alert('Quantity must be greater than zero.');
      return;
    }

    adjustStock(selectedProduct.id, qty, adjustType, adjustReason);
    setIsAdjustModalOpen(false);
  };

  // Filtered products list
  const filteredProducts = useMemo(() => {
    return products.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      p.barcode.includes(searchTerm)
    );
  }, [products, searchTerm]);

  return (
    <div className="page-container">
      {/* Search and view toggle */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        <div style={{ position: 'relative', flex: '1', maxWidth: '400px' }}>
          <Search size={18} color="var(--color-text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            className="form-input"
            placeholder="Search stock by product..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '2.5rem', width: '100%' }}
          />
        </div>
      </div>

      {/* Two section layout: Left is Stock Levels, Right is Audit Log */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '7fr 5fr', 
        gap: '1.5rem' 
      }}>
        {/* Section 1: Stock Levels */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '1.15rem', marginBottom: '1.25rem', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileCheck size={20} color="var(--primary)" />
            <span>Current Stock Levels</span>
          </h3>

          <div className="table-container" style={{ flex: 1 }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Stock Status</th>
                  <th>Quantity</th>
                  {currentUser?.role === 'admin' && <th style={{ textAlign: 'right' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((p) => {
                  const isOut = p.current_stock === 0;
                  const isLow = p.current_stock <= p.min_stock_level;
                  
                  return (
                    <tr key={p.id}>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
                          <span style={{ fontWeight: 600, color: 'var(--color-text-bright)' }}>{p.name}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{p.category}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${isOut ? 'badge-danger' : isLow ? 'badge-warning' : 'badge-success'}`}>
                          {isOut ? 'Out of Stock' : isLow ? 'Low Stock' : 'Normal'}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600, color: 'var(--color-text-bright)' }}>
                        {p.current_stock} {p.unit}
                      </td>
                      {currentUser?.role === 'admin' && (
                        <td style={{ textAlign: 'right' }}>
                          <button 
                            onClick={() => openAdjustModal(p)}
                            className="btn btn-secondary btn-sm"
                            style={{ display: 'inline-flex', gap: '0.25rem', padding: '0.35rem 0.65rem' }}
                          >
                            <Sliders size={12} />
                            <span>Adjust</span>
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 2: Audit Logs */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '1.15rem', marginBottom: '1.25rem', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <History size={20} color="var(--primary)" />
            <span>Inventory Transaction Logs</span>
          </h3>

          <div style={{ 
            maxHeight: '520px', 
            overflowY: 'auto', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '0.75rem',
            paddingRight: '0.25rem' 
          }}>
            {inventoryLogs.length === 0 ? (
              <div style={{ padding: '3rem', color: 'var(--color-text-muted)' }}>
                No stock transactions logged yet.
              </div>
            ) : (
              inventoryLogs.map((log) => {
                const isAddition = log.quantity_changed > 0;
                
                return (
                  <div key={log.id} style={{
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '0.85rem',
                    background: 'rgba(255, 255, 255, 0.01)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    textAlign: 'left'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <span style={{ fontWeight: 600, color: 'var(--color-text-bright)' }}>{log.product_name}</span>
                      <span className={`badge ${log.change_type === 'IN' ? 'badge-success' : log.change_type === 'OUT' ? 'badge-danger' : 'badge-info'}`}>
                        {log.change_type} {isAddition ? '+' : ''}{log.quantity_changed}
                      </span>
                    </div>
                    
                    <p style={{ fontSize: '0.8rem', marginTop: '0.4rem', color: 'var(--color-text)' }}>
                      <strong>Reason:</strong> {log.reason || 'None specified'}
                    </p>
                    
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                      {new Date(log.timestamp).toLocaleString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ADJUST STOCK MODAL */}
      {isAdjustModalOpen && selectedProduct && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.2rem' }}>Adjust Stock - {selectedProduct.name}</h3>
              <button 
                onClick={() => setIsAdjustModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.5rem', cursor: 'pointer' }}
              >
                &times;
              </button>
            </div>
            
            <form onSubmit={handleAdjustSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', background: '#131520', borderRadius: 'var(--radius-sm)' }}>
                  <span>Current Stock:</span>
                  <strong style={{ color: 'var(--color-text-bright)' }}>{selectedProduct.current_stock} {selectedProduct.unit}</strong>
                </div>

                {/* Adjustment type */}
                <div className="form-group">
                  <label className="form-label">Adjustment Action *</label>
                  <div style={{ display: 'flex', gap: '0.5rem', background: '#131520', padding: '0.25rem', borderRadius: 'var(--radius-md)' }}>
                    <button
                      type="button"
                      className={`btn btn-sm ${adjustType === 'IN' ? 'btn-success' : 'btn-secondary'}`}
                      style={{ flex: 1, border: 'none', background: adjustType === 'IN' ? 'var(--success)' : 'transparent', color: '#fff' }}
                      onClick={() => setAdjustType('IN')}
                    >
                      <Plus size={14} />
                      <span>Stock IN</span>
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm ${adjustType === 'OUT' ? 'btn-danger' : 'btn-secondary'}`}
                      style={{ flex: 1, border: 'none', background: adjustType === 'OUT' ? 'var(--danger)' : 'transparent', color: '#fff' }}
                      onClick={() => setAdjustType('OUT')}
                    >
                      <Minus size={14} />
                      <span>Stock OUT</span>
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm ${adjustType === 'ADJUSTMENT' ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ flex: 1, border: 'none', background: adjustType === 'ADJUSTMENT' ? 'var(--primary)' : 'transparent', color: '#fff' }}
                      onClick={() => setAdjustType('ADJUSTMENT')}
                    >
                      <RefreshCw size={14} />
                      <span>Set Absolute</span>
                    </button>
                  </div>
                </div>

                {/* Quantity */}
                <div className="form-group">
                  <label className="form-label">Quantity ({selectedProduct.unit}) *</label>
                  <input
                    type="number"
                    min="1"
                    className="form-input"
                    value={adjustQty}
                    onChange={(e) => setAdjustQty(e.target.value)}
                    required
                  />
                </div>

                {/* Reason */}
                <div className="form-group">
                  <label className="form-label">Adjustment Reason *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Supplier delivery, damaged product, shelf count audit"
                    value={adjustReason}
                    onChange={(e) => setAdjustReason(e.target.value)}
                    required
                  />
                </div>
              </div>
              
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setIsAdjustModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Confirm Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
