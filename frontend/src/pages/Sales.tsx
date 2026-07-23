import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import type { Product } from '../context/AppContext';
import { 
  Search, 
  ShoppingCart, 
  Trash2, 
  Plus, 
  Minus, 
  Receipt,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

interface CartItem {
  product: Product;
  quantity: number;
}

export const Sales: React.FC = () => {
  const { products, recordSale } = useApp();
  
  // States
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [completedSaleDetails, setCompletedSaleDetails] = useState<{
    id: string;
    items: CartItem[];
    subtotal: number;
    gst: number;
    total: number;
    timestamp: string;
  } | null>(null);

  // Filter products for catalog
  const filteredProducts = useMemo(() => {
    return products.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      p.barcode.includes(searchTerm)
    );
  }, [products, searchTerm]);

  // Add item to cart
  const addToCart = (product: Product) => {
    if (product.current_stock <= 0) return; // Can't add out of stock

    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      
      // Check stock limit
      const currentQty = existing ? existing.quantity : 0;
      if (currentQty >= product.current_stock) {
        alert(`Cannot add more. Only ${product.current_stock} in stock.`);
        return prev;
      }

      if (existing) {
        return prev.map(item => 
          item.product.id === product.id 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        return [...prev, { product, quantity: 1 }];
      }
    });
  };

  // Update quantity in cart
  const updateQty = (productId: number, delta: number) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.product.id === productId) {
          const newQty = item.quantity + delta;
          
          // Validate stock
          if (newQty > item.product.current_stock) {
            alert(`Insufficient stock. Maximum available: ${item.product.current_stock}`);
            return item;
          }
          
          if (newQty <= 0) return null; // mark for filter
          return { ...item, quantity: newQty };
        }
        return item;
      }).filter(Boolean) as CartItem[];
    });
  };

  // Remove from cart
  const removeFromCart = (productId: number) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  // Calculations
  const cartTotals = useMemo(() => {
    const subtotal = cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);
    const gst = subtotal * 0.18; // Combined CGST + SGST (18%)
    const total = subtotal + gst;
    return { subtotal, gst, total };
  }, [cart]);

  // Checkout
  const handleCheckout = () => {
    if (cart.length === 0) return;

    // Call global recordSale action to update state
    const salePayload = cart.map(item => ({
      product_id: item.product.id,
      quantity: item.quantity
    }));

    recordSale(salePayload);

    // Save details to show receipt
    setCompletedSaleDetails({
      id: `TXN-${Math.floor(100000 + Math.random() * 900000)}`,
      items: [...cart],
      subtotal: cartTotals.subtotal,
      gst: cartTotals.gst,
      total: cartTotals.total,
      timestamp: new Date().toLocaleString('en-IN')
    });

    // Clear cart and show receipt
    setCart([]);
    setShowReceiptModal(true);
  };

  return (
    <div className="page-container">
      <div className="pos-layout">
        {/* Left Side: Product Catalog Grid */}
        <div className="pos-catalog">
          {/* Search bar */}
          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={18} color="var(--color-text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              className="form-input"
              placeholder="Search products by barcode scanner or typing name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '2.5rem', width: '100%' }}
            />
          </div>

          {/* Grid */}
          <div className="pos-grid">
            {filteredProducts.map((p) => {
              const isOut = p.current_stock <= 0;
              const isLow = p.current_stock <= p.min_stock_level;

              return (
                <div 
                  key={p.id}
                  className="pos-product-card"
                  onClick={() => addToCart(p)}
                  style={{
                    opacity: isOut ? 0.5 : 1,
                    cursor: isOut ? 'not-allowed' : 'pointer',
                    borderLeft: isOut ? '3px solid var(--danger)' : isLow ? '3px solid var(--warning)' : '1px solid var(--border-color)',
                  }}
                >
                  <div style={{ textAlign: 'left' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                      {p.category}
                    </span>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 600, margin: '0.2rem 0 0.5rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', height: '2.4rem' }}>
                      {p.name}
                    </h4>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0.5rem 0' }}>
                      <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text-bright)' }}>
                        ₹{p.price.toFixed(2)}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                      <span>Stock:</span>
                      <span style={{ 
                        fontWeight: 600, 
                        color: isOut ? 'var(--danger)' : isLow ? 'var(--warning)' : 'var(--success)' 
                      }}>
                        {isOut ? 'OUT' : `${p.current_stock} ${p.unit}`}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: Shopping Cart Summary */}
        <div className="pos-cart">
          <div className="pos-cart-header">
            <h3 style={{ fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShoppingCart size={18} color="var(--primary)" />
              <span>Checkout Cart ({cart.reduce((acc, item) => acc + item.quantity, 0)})</span>
            </h3>
            {cart.length > 0 && (
              <button 
                onClick={() => setCart([])}
                className="btn btn-secondary btn-sm" 
                style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.1)' }}
              >
                Clear
              </button>
            )}
          </div>

          <div className="pos-cart-items">
            {cart.length === 0 ? (
              <div style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-text-muted)',
                gap: '0.5rem'
              }}>
                <ShoppingCart size={32} />
                <span>Cart is empty.</span>
                <span style={{ fontSize: '0.75rem' }}>Click products from catalog to add items.</span>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.product.id} className="pos-cart-item">
                  <div style={{ textAlign: 'left', flex: 1, marginRight: '0.5rem', overflow: 'hidden' }}>
                    <span style={{ 
                      fontWeight: 600, 
                      color: 'var(--color-text-bright)', 
                      fontSize: '0.85rem',
                      display: 'block',
                      textOverflow: 'ellipsis',
                      overflow: 'hidden',
                      whiteSpace: 'nowrap'
                    }}>
                      {item.product.name}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                      ₹{item.product.price.toFixed(2)} x {item.quantity}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {/* Controls */}
                    <div style={{ display: 'flex', alignItems: 'center', background: '#131520', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                      <button 
                        onClick={() => updateQty(item.product.id, -1)}
                        style={{ border: 'none', background: 'none', padding: '0.25rem 0.5rem', cursor: 'pointer', color: '#fff' }}
                      >
                        <Minus size={10} />
                      </button>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, minWidth: '20px', textAlign: 'center' }}>
                        {item.quantity}
                      </span>
                      <button 
                        onClick={() => updateQty(item.product.id, 1)}
                        style={{ border: 'none', background: 'none', padding: '0.25rem 0.5rem', cursor: 'pointer', color: '#fff' }}
                      >
                        <Plus size={10} />
                      </button>
                    </div>

                    {/* Total & Delete */}
                    <span style={{ fontWeight: 600, color: 'var(--color-text-bright)', minWidth: '60px', textAlign: 'right', fontSize: '0.85rem' }}>
                      ₹{(item.product.price * item.quantity).toFixed(2)}
                    </span>
                    
                    <button 
                      onClick={() => removeFromCart(item.product.id)}
                      style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}
                    >
                      <Trash2 size={14} color="#ef4444" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Totals Summary */}
          <div className="pos-cart-summary">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span>Subtotal:</span>
                <span style={{ color: 'var(--color-text-bright)' }}>₹{cartTotals.subtotal.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span>GST (18%):</span>
                <span style={{ color: 'var(--color-text-bright)' }}>₹{cartTotals.gst.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', marginTop: '0.25rem' }}>
                <span style={{ fontWeight: 600, fontSize: '1rem' }}>Total Amount:</span>
                <span style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--primary)' }}>₹{cartTotals.total.toFixed(2)}</span>
              </div>
            </div>

            <button 
              onClick={handleCheckout}
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: 'linear-gradient(135deg, var(--primary) 0%, #4338ca 100%)' }}
              disabled={cart.length === 0}
            >
              <Receipt size={18} />
              <span>Complete Sale & Print</span>
            </button>
          </div>
        </div>
      </div>

      {/* RECEIPT MODAL */}
      {showReceiptModal && completedSaleDetails && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.10rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle2 size={18} color="var(--success)" />
                <span>Receipt Printed Successfully</span>
              </h3>
              <button 
                onClick={() => setShowReceiptModal(false)}
                style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.5rem', cursor: 'pointer' }}
              >
                &times;
              </button>
            </div>
            
            <div className="modal-body" style={{ background: '#fff', color: '#000', padding: '2rem', fontFamily: 'monospace', fontSize: '0.85rem', textAlign: 'left', borderRadius: '4px', border: '1px solid #ddd' }}>
              <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
                <h2 style={{ color: '#000', margin: '0 0 0.2rem 0', fontSize: '1.25rem', fontFamily: 'monospace' }}>SMARTKIRANA</h2>
                <span>INVOICE / CASH BILL</span>
                <div style={{ borderBottom: '1px dashed #000', margin: '0.5rem 0' }}></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                  <span>Invoice: {completedSaleDetails.id}</span>
                  <span>{completedSaleDetails.timestamp.split(',')[0]}</span>
                </div>
              </div>

              {/* Items List */}
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px dashed #000' }}>
                    <th style={{ textAlign: 'left', paddingBottom: '0.25rem' }}>Item Description</th>
                    <th style={{ textAlign: 'right', paddingBottom: '0.25rem' }}>Qty</th>
                    <th style={{ textAlign: 'right', paddingBottom: '0.25rem' }}>Rate</th>
                    <th style={{ textAlign: 'right', paddingBottom: '0.25rem' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {completedSaleDetails.items.map((item) => (
                    <tr key={item.product.id}>
                      <td style={{ paddingTop: '0.25rem', paddingBottom: '0.25rem', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.product.name}</td>
                      <td style={{ textAlign: 'right' }}>{item.quantity}</td>
                      <td style={{ textAlign: 'right' }}>{item.product.price.toFixed(0)}</td>
                      <td style={{ textAlign: 'right' }}>{(item.product.price * item.quantity).toFixed(0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ borderBottom: '1px dashed #000', margin: '0.75rem 0' }}></div>

              {/* Invoice Summary */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.8rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Gross Subtotal:</span>
                  <span>₹{completedSaleDetails.subtotal.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>CGST + SGST (18%):</span>
                  <span>₹{completedSaleDetails.gst.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '0.9rem', borderTop: '1px dashed #000', paddingTop: '0.25rem', marginTop: '0.25rem' }}>
                  <span>NET TOTAL PAYABLE:</span>
                  <span>₹{completedSaleDetails.total.toFixed(2)}</span>
                </div>
              </div>

              <div style={{ borderBottom: '1px dashed #000', margin: '1rem 0' }}></div>
              <div style={{ textAlign: 'center', fontSize: '0.75rem' }}>
                <span>THANK YOU FOR SHOPPING WITH US!</span>
              </div>
            </div>
            
            <div className="modal-footer">
              <button 
                type="button" 
                className="btn btn-primary" 
                style={{ width: '100%' }}
                onClick={() => setShowReceiptModal(false)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
