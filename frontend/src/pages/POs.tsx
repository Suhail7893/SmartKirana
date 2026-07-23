import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import type { PurchaseOrder } from '../context/AppContext';

import { 
  Plus, 
  FileText, 
  Send, 
  CheckSquare, 
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  FileCheck
} from 'lucide-react';

export const POs: React.FC = () => {
  const { products, purchaseOrders, createPurchaseOrder, updatePOStatus, currentUser } = useApp();
  
  // States
  const [selectedPO, setSelectedPO] = useState<number | null>(null);
  const [isCreatePOOpen, setIsCreatePOOpen] = useState(false);
  const [supplier, setSupplier] = useState('Hindustan Unilever Ltd');
  const [poItems, setPoItems] = useState<{ product_id: number; quantity: number }[]>([]);

  // Suggested low stock items that need restock
  const lowStockSuggestions = useMemo(() => {
    return products.filter(p => p.current_stock <= p.min_stock_level);
  }, [products]);

  // Expand / collapse PO details
  const togglePODetails = (id: number) => {
    setSelectedPO(prev => prev === id ? null : id);
  };

  // Pre-fill PO form with low stock suggestions
  const openNewPOModal = () => {
    // Select supplier and populate items
    setSupplier('Hindustan Unilever Ltd');
    const initialItems = lowStockSuggestions.map(p => ({
      product_id: p.id,
      // Suggest ordering double the min stock level to bring stock back to safe levels
      quantity: p.min_stock_level * 2
    }));
    setPoItems(initialItems);
    setIsCreatePOOpen(true);
  };

  // Add line item to draft PO
  const addPoItemLine = () => {
    const availableProds = products.filter(p => !poItems.some(item => item.product_id === p.id));
    if (availableProds.length === 0) return;
    setPoItems(prev => [...prev, { product_id: availableProds[0].id, quantity: 10 }]);
  };

  // Update line item details
  const updatePoItemLine = (index: number, field: 'product_id' | 'quantity', value: number) => {
    setPoItems(prev => prev.map((item, idx) => {
      if (idx === index) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  // Remove line item
  const removePoItemLine = (index: number) => {
    setPoItems(prev => prev.filter((_, idx) => idx !== index));
  };

  // Submit PO
  const handlePOSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (poItems.length === 0) {
      alert('Please add at least one product.');
      return;
    }
    
    // Remove invalid entries
    const validItems = poItems.filter(item => item.quantity > 0);
    createPurchaseOrder(supplier, validItems);
    setIsCreatePOOpen(false);
  };

  return (
    <div className="page-container">
      {/* Header controls */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2rem'
      }}>
        {/* Suggestion alert banner if there are low stock items */}
        <div style={{ textAlign: 'left' }}>
          {lowStockSuggestions.length > 0 ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.75rem 1.25rem',
              background: 'var(--warning-glow)',
              border: '1px solid rgba(245, 158, 11, 0.2)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--warning)',
              fontSize: '0.85rem'
            }}>
              <AlertTriangle size={16} />
              <span>
                Found <strong>{lowStockSuggestions.length} products</strong> below minimum stock level. 
                Generate a Purchase Order now.
              </span>
            </div>
          ) : (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.75rem 1.25rem',
              background: 'var(--success-glow)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--success)',
              fontSize: '0.85rem'
            }}>
              <FileCheck size={16} />
              <span>All inventory is fully stocked. No purchase orders urgently suggested.</span>
            </div>
          )}
        </div>

        {/* Create PO Trigger */}
        {currentUser?.role === 'admin' && (
          <button className="btn btn-primary" onClick={openNewPOModal}>
            <Plus size={18} />
            <span>Generate PO</span>
          </button>
        )}
      </div>

      {/* PO History List */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
        <h3 style={{ fontSize: '1.15rem', marginBottom: '1.25rem', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FileText size={20} color="var(--primary)" />
          <span>Purchase Order Records</span>
        </h3>

        {purchaseOrders.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            No purchase orders created yet.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {purchaseOrders.map((po) => {
              const isExpanded = selectedPO === po.id;
              const statusColors = {
                DRAFT: 'badge-info',
                ORDERED: 'badge-warning',
                RECEIVED: 'badge-success'
              };

              return (
                <div 
                  key={po.id} 
                  style={{
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(255, 255, 255, 0.01)',
                    overflow: 'hidden',
                    transition: 'var(--transition-fast)'
                  }}
                >
                  {/* Summary Bar */}
                  <div 
                    onClick={() => togglePODetails(po.id)}
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '1.25rem',
                      cursor: 'pointer',
                      background: isExpanded ? 'rgba(255, 255, 255, 0.02)' : 'transparent'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', textAlign: 'left' }}>
                      <div>
                        <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>PO Number</span>
                        <h4 style={{ margin: 0, fontSize: '1rem', color: 'var(--color-text-bright)' }}>PO #{po.id}</h4>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Supplier</span>
                        <p style={{ margin: 0, fontWeight: 500 }}>{po.supplier}</p>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Total Amount</span>
                        <p style={{ margin: 0, fontWeight: 600, color: 'var(--color-text-bright)' }}>₹{po.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                      <span className={`badge ${statusColors[po.status]}`}>{po.status}</span>
                      
                      {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div style={{ 
                      padding: '1.25rem', 
                      borderTop: '1px solid var(--border-color)',
                      background: 'rgba(0, 0, 0, 0.15)',
                      textAlign: 'left'
                    }}>
                      <h5 style={{ marginBottom: '0.75rem', fontSize: '0.85rem', color: 'var(--color-text-bright)' }}>Order Line Items</h5>
                      <div className="table-container" style={{ marginBottom: '1.25rem' }}>
                        <table className="custom-table" style={{ background: 'transparent' }}>
                          <thead>
                            <tr style={{ background: 'rgba(0,0,0,0.2)' }}>
                              <th>Product</th>
                              <th>Ordered Quantity</th>
                              <th>Unit Cost Price</th>
                              <th>Subtotal</th>
                            </tr>
                          </thead>
                          <tbody>
                            {po.items.map((item, idx) => (
                              <tr key={idx}>
                                <td style={{ color: 'var(--color-text-bright)', fontWeight: 500 }}>{item.product_name}</td>
                                <td>{item.quantity}</td>
                                <td>₹{item.cost_price.toFixed(2)}</td>
                                <td style={{ color: 'var(--color-text-bright)', fontWeight: 600 }}>₹{(item.cost_price * item.quantity).toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* PO Date metadata */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                        <div>
                          <span>Created on: {new Date(po.created_at).toLocaleString('en-IN')}</span>
                          {po.received_at && (
                            <span style={{ marginLeft: '1.5rem', color: 'var(--success)' }}>
                              Received: {new Date(po.received_at).toLocaleString('en-IN')}
                            </span>
                          )}
                        </div>

                        {/* PO Action Buttons */}
                        {currentUser?.role === 'admin' && (
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            {po.status === 'DRAFT' && (
                              <button 
                                onClick={(e) => { e.stopPropagation(); updatePOStatus(po.id, 'ORDERED'); }}
                                className="btn btn-primary btn-sm"
                                style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                              >
                                <Send size={12} />
                                <span>Dispatch Order</span>
                              </button>
                            )}
                            {po.status === 'ORDERED' && (
                              <button 
                                onClick={(e) => { e.stopPropagation(); updatePOStatus(po.id, 'RECEIVED'); }}
                                className="btn btn-success btn-sm"
                                style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                              >
                                <CheckSquare size={12} />
                                <span>Receive Stock</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* CREATE PO MODAL */}
      {isCreatePOOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.2rem' }}>Generate Purchase Order</h3>
              <button 
                onClick={() => setIsCreatePOOpen(false)}
                style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.5rem', cursor: 'pointer' }}
              >
                &times;
              </button>
            </div>
            
            <form onSubmit={handlePOSubmit}>
              <div className="modal-body" style={{ maxHeight: '420px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* Supplier selection */}
                <div className="form-group">
                  <label className="form-label">Select Vendor Supplier *</label>
                  <select
                    className="form-select"
                    value={supplier}
                    onChange={(e) => setSupplier(e.target.value)}
                    style={{ width: '100%' }}
                  >
                    <option value="Hindustan Unilever Ltd">Hindustan Unilever Ltd (Surf Excel, Dettol)</option>
                    <option value="Amul Dairy North Distribution">Amul Dairy (Butter, Milk products)</option>
                    <option value="Parle Products Pvt Ltd">Parle Biscuit Co.</option>
                    <option value="ITC Limited Wholesale">ITC Distributors (Aashirvaad Atta, Sunfeast)</option>
                    <option value="Adani Wilmar Ltd">Adani Wilmar Distributors (Fortune Oil)</option>
                  </select>
                </div>

                {/* PO Items Table */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label className="form-label">Order Items Checklist</label>
                    <button 
                      type="button" 
                      onClick={addPoItemLine} 
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                    >
                      + Add Item
                    </button>
                  </div>

                  {poItems.length === 0 ? (
                    <div style={{ padding: '1.5rem', background: '#131520', borderRadius: 'var(--radius-sm)', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                      No items in this PO. Click Add Item to start.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {poItems.map((item, idx) => (
                        <div key={idx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          {/* Product select */}
                          <select
                            className="form-select"
                            value={item.product_id}
                            onChange={(e) => updatePoItemLine(idx, 'product_id', parseInt(e.target.value))}
                            style={{ flex: 2, padding: '0.5rem' }}
                          >
                            {products.map(p => (
                              <option key={p.id} value={p.id}>{p.name} (Cost: ₹{p.cost_price})</option>
                            ))}
                          </select>

                          {/* Order quantity */}
                          <input
                            type="number"
                            min="1"
                            placeholder="Qty"
                            className="form-input"
                            value={item.quantity}
                            onChange={(e) => updatePoItemLine(idx, 'quantity', parseInt(e.target.value) || 0)}
                            style={{ flex: 1, padding: '0.5rem' }}
                          />

                          {/* Remove button */}
                          <button 
                            type="button"
                            onClick={() => removePoItemLine(idx)}
                            className="btn btn-secondary btn-sm"
                            style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.1)', padding: '0.5rem' }}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setIsCreatePOOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={poItems.length === 0}>
                  Draft Purchase Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
