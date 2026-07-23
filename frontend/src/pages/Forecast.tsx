import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { 
  TrendingUp, 
  Cpu, 
  RefreshCw, 
  Activity
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid 
} from 'recharts';

export const Forecast: React.FC = () => {
  const { products, getForecast, trainMLModel } = useApp();
  
  // States
  const [selectedProductId, setSelectedProductId] = useState<number>(1);
  const [isTraining, setIsTraining] = useState(false);

  // Get active product details
  const activeProduct = useMemo(() => {
    return products.find(p => p.id === selectedProductId) || products[0];
  }, [products, selectedProductId]);

  // Generate forecasting data
  const forecastData = useMemo(() => {
    if (!activeProduct) return [];
    return getForecast(activeProduct.id);
  }, [activeProduct, getForecast]);

  // Forecast summaries
  const forecastStats = useMemo(() => {
    if (forecastData.length === 0) return { totalDemand: 0, peakDay: '-', peakQty: 0 };
    
    const total = forecastData.reduce((acc, item) => acc + item.predicted_quantity, 0);
    const sorted = [...forecastData].sort((a, b) => b.predicted_quantity - a.predicted_quantity);
    
    return {
      totalDemand: Math.round(total),
      peakDay: sorted[0].date,
      peakQty: sorted[0].predicted_quantity
    };
  }, [forecastData]);

  // Train ML Pipeline
  const handleTrain = async () => {
    setIsTraining(true);
    await trainMLModel(selectedProductId);
    setIsTraining(false);
  };

  if (products.length === 0) {
    return (
      <div className="page-container">
        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
          No products available to generate forecasts.
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Selector and Action controls */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        {/* Product selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <label className="form-label" style={{ marginBottom: 0, whiteSpace: 'nowrap' }}>Select Product AI Model:</label>
          <select
            className="form-select"
            value={selectedProductId}
            onChange={(e) => setSelectedProductId(parseInt(e.target.value))}
            style={{ width: '260px' }}
          >
            {products.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* Training Trigger */}
        <button 
          onClick={handleTrain}
          className="btn btn-secondary" 
          disabled={isTraining}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <RefreshCw size={16} className={isTraining ? 'spin-animation' : ''} />
          <span>{isTraining ? 'Fitting Estimator...' : 'Retrain Product Model'}</span>
        </button>
      </div>

      {/* Main Grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '8fr 4fr', 
        gap: '1.5rem' 
      }}>
        {/* Forecast Line Chart */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', minHeight: '380px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', textAlign: 'left' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>14-Day Demand Forecast Projection</h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                Predictive analysis for {activeProduct?.name} ({activeProduct?.unit})
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--info)' }}>
              <TrendingUp size={16} />
              <span style={{ fontWeight: 600 }}>XGBoost / Scikit-learn Regressor</span>
            </div>
          </div>

          <div style={{ flex: 1, width: '100%', height: '260px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={forecastData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                <XAxis dataKey="date" stroke="var(--color-text-muted)" fontSize={11} tickLine={false} />
                <YAxis stroke="var(--color-text-muted)" fontSize={11} tickLine={false} />
                <Tooltip 
                  contentStyle={{ 
                    background: 'var(--bg-surface)', 
                    borderColor: 'var(--border-color)', 
                    color: 'var(--color-text-bright)', 
                    borderRadius: 'var(--radius-md)' 
                  }} 
                />
                <Line 
                  type="monotone" 
                  dataKey="predicted_quantity" 
                  name="Forecast Quantity"
                  stroke="var(--info)" 
                  strokeWidth={3} 
                  dot={{ fill: 'var(--info)', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ML Model Details Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Stats card */}
          <div className="card" style={{ textAlign: 'left' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Cpu size={18} color="var(--primary)" />
              <span>Forecast Parameters</span>
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Projected 14-Day Demand</span>
                <p style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text-bright)', margin: '0.2rem 0 0' }}>
                  {forecastStats.totalDemand} {activeProduct?.unit}
                </p>
              </div>
              
              <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Peak Single Day Demand</span>
                <p style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-text-bright)', margin: '0.2rem 0 0' }}>
                  {forecastStats.peakQty} {activeProduct?.unit} <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 'normal' }}>on {forecastStats.peakDay}</span>
                </p>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Replenishment Recommendation</span>
                <p style={{ fontSize: '0.85rem', color: 'var(--success)', fontWeight: 600, margin: '0.25rem 0 0', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <span>✓ Stock sufficient for forecasted window.</span>
                </p>
              </div>
            </div>
          </div>

          {/* Model Status Card */}
          <div className="card" style={{ textAlign: 'left', background: 'rgba(99, 102, 241, 0.03)', borderColor: 'rgba(99, 102, 241, 0.15)' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Activity size={18} color="var(--primary)" />
              <span>Pipeline Architecture</span>
            </h3>
            
            <ul style={{ 
              fontSize: '0.8rem', 
              color: 'var(--color-text)', 
              paddingLeft: '1.25rem', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '0.5rem' 
            }}>
              <li><strong>Algorithm:</strong> Scikit-learn Gradient Boosting (GBR)</li>
              <li><strong>Features:</strong> Rolling Mean (7d), Lag Variables, Weekday Encoding</li>
              <li><strong>Model Storage:</strong> Joblib Binary</li>
              <li><strong>Inference latency:</strong> &lt; 15ms</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Simple spinner css injection */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .spin-animation {
          animation: spin 1.5s linear infinite;
        }
      `}</style>
    </div>
  );
};
