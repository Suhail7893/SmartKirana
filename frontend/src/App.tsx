import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Products } from './pages/Products';
import { Inventory } from './pages/Inventory';
import { Sales } from './pages/Sales';
import { POs } from './pages/POs';
import { Forecast } from './pages/Forecast';
import { Reports } from './pages/Reports';
import './App.css';

const AppContent: React.FC = () => {
  const { currentUser } = useApp();
  const [activeTab, setActiveTab] = useState('dashboard');

  // Handle routing / conditional page rendering
  const renderActivePage = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard setActiveTab={setActiveTab} />;
      case 'sales':
        return <Sales />;
      case 'products':
        return <Products />;
      case 'inventory':
        return <Inventory />;
      case 'pos':
        return <POs />;
      case 'forecast':
        return <Forecast />;
      case 'reports':
        return <Reports />;
      default:
        return <Dashboard setActiveTab={setActiveTab} />;
    }
  };

  // If user is not authenticated, show login page only
  if (!currentUser) {
    return <Login />;
  }

  return (
    <div className="app-container">
      {/* Navigation sidebar */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      {/* Main workspace */}
      <div className="main-content">
        <Navbar activeTab={activeTab} />
        
        {/* Dynamic content page container */}
        {renderActivePage()}
      </div>
    </div>
  );
};

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
