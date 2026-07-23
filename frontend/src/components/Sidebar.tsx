import React from 'react';
import { useApp } from '../context/AppContext';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  ClipboardList, 
  FileText, 
  TrendingUp, 
  BarChart3, 
  LogOut
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const { currentUser, logout } = useApp();

  const menuItems = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
    { id: 'sales', name: 'Sales (POS)', icon: ShoppingCart },
    { id: 'products', name: 'Products', icon: Package },
    { id: 'inventory', name: 'Inventory', icon: ClipboardList },
    { id: 'pos', name: 'Purchase Orders', icon: FileText },
    { id: 'forecast', name: 'Forecast (AI)', icon: TrendingUp },
    { id: 'reports', name: 'Reports', icon: BarChart3 },
  ];

  if (!currentUser) return null;

  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        <ShoppingCart size={24} color="#6366f1" />
        <span className="sidebar-logo-text">SmartKirana</span>
      </div>
      
      <ul className="sidebar-menu">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <li 
              key={item.id} 
              className={`sidebar-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              <Icon size={20} />
              <span>{item.name}</span>
            </li>
          );
        })}
      </ul>

      <div className="sidebar-footer">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem' }}>
          <div style={{
            background: 'var(--primary-glow)',
            color: 'var(--primary)',
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold',
            border: '1px solid var(--border-color)'
          }}>
            {currentUser.username.substring(0, 2).toUpperCase()}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left', overflow: 'hidden' }}>
            <span style={{ fontWeight: 600, color: 'var(--color-text-bright)', fontSize: '0.9rem', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
              {currentUser.username}
            </span>
            <span style={{ fontSize: '0.75rem', textTransform: 'capitalize', color: 'var(--color-text-muted)' }}>
              {currentUser.role}
            </span>
          </div>
        </div>
        
        <button 
          className="btn btn-secondary btn-sm" 
          onClick={logout}
          style={{ width: '100%', justifyContent: 'flex-start', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444' }}
        >
          <LogOut size={16} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};
