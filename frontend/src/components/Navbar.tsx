import React, { useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Wifi, WifiOff } from 'lucide-react';

interface NavbarProps {
  activeTab: string;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab }) => {
  const { apiConnected, setApiConnected } = useApp();

  const getPageTitle = () => {
    switch (activeTab) {
      case 'dashboard': return 'Dashboard Overview';
      case 'sales': return 'Point of Sale (POS)';
      case 'products': return 'Product Database';
      case 'inventory': return 'Inventory & Stock Logs';
      case 'pos': return 'Purchase Orders (POs)';
      case 'forecast': return 'AI Demand Forecasting';
      case 'reports': return 'Business Analytics & Reports';
      default: return 'SmartKirana Management';
    }
  };

  // Attempt to ping Flask backend health check
  const checkBackendHealth = async () => {
    try {
      const res = await fetch('http://localhost:5000/health');
      if (res.ok) {
        setApiConnected(true);
      } else {
        setApiConnected(false);
      }
    } catch (err) {
      setApiConnected(false);
    }
  };

  useEffect(() => {
    checkBackendHealth();
    const interval = setInterval(checkBackendHealth, 15000); // Check every 15s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="navbar">
      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, fontFamily: 'var(--font-display)' }}>
        {getPageTitle()}
      </h2>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        {/* API connection indicator */}
        <div 
          onClick={checkBackendHealth}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem', 
            padding: '0.4rem 0.8rem', 
            background: apiConnected ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
            border: `1px solid ${apiConnected ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)'}`,
            borderRadius: '50px',
            fontSize: '0.75rem',
            cursor: 'pointer',
            color: apiConnected ? 'var(--success)' : 'var(--warning)',
            fontWeight: 600,
            transition: 'var(--transition-fast)'
          }}
          title={apiConnected ? "Connected to backend API" : "Backend offline, running in High-Fidelity Mock Mode"}
        >
          {apiConnected ? (
            <>
              <Wifi size={14} />
              <span>API Live</span>
            </>
          ) : (
            <>
              <WifiOff size={14} />
              <span>Offline (Mock Mode)</span>
            </>
          )}
        </div>
        
        {/* Quick Date Display */}
        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>
          {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
        </div>
      </div>
    </div>
  );
};
