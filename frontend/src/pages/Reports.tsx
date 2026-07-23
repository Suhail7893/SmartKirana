import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Download, 
  BarChart3, 
  TrendingUp, 
  FileSpreadsheet, 
  FileText, 
  TableProperties,
  ArrowRight
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  Legend 
} from 'recharts';

export const Reports: React.FC = () => {
  const { sales, products } = useApp();
  const [downloading, setDownloading] = useState<string | null>(null);

  // --- CHART 1: Category-wise Revenue Analysis ---
  const categoryData = useMemo(() => {
    const categories: { [key: string]: { revenue: number; cost: number; profit: number } } = {};
    
    sales.forEach(sale => {
      const prod = products.find(p => p.id === sale.product_id);
      const category = prod ? prod.category : 'Grocery';
      const costPrice = prod ? prod.cost_price : sale.sale_price * 0.8;
      const profit = (sale.sale_price - costPrice) * sale.quantity;

      if (!categories[category]) {
        categories[category] = { revenue: 0, cost: 0, profit: 0 };
      }
      categories[category].revenue += sale.total_amount;
      categories[category].profit += profit;
    });

    return Object.keys(categories).map(cat => ({
      category: cat,
      Revenue: Math.round(categories[cat].revenue),
      Profit: Math.round(categories[cat].profit)
    }));
  }, [sales, products]);

  // --- CHART 2: Profit Margin by Product ---
  const productProfitData = useMemo(() => {
    return products.map(p => {
      const margin = p.price > 0 ? ((p.price - p.cost_price) / p.price) * 100 : 0;
      return {
        name: p.name.substring(0, 12) + '...',
        Margin: Math.round(margin)
      };
    }).slice(0, 7); // Show top 7
  }, [products]);

  // --- ACTIONS: ACTUAL CSV EXPORT ---
  const handleExportCSV = () => {
    setDownloading('csv');
    setTimeout(() => {
      // Build CSV String
      const headers = ['Sale ID', 'Sale Date', 'Product Name', 'Quantity', 'Sale Price (INR)', 'Total Amount (INR)'];
      const rows = sales.map(s => [
        s.id,
        new Date(s.sale_date).toLocaleString('en-IN'),
        `"${s.product_name}"`,
        s.quantity,
        s.sale_price,
        s.total_amount
      ]);

      const csvContent = "data:text/csv;charset=utf-8," 
        + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
      
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `smartkirana_sales_report_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setDownloading(null);
    }, 1000);
  };

  // MOCK PDF & EXCEL EXPORTS
  const handleMockExport = (type: 'pdf' | 'excel') => {
    setDownloading(type);
    setTimeout(() => {
      alert(`Report exported successfully! SmartKirana report has been simulated and downloaded as ${type.toUpperCase()}.`);
      setDownloading(null);
    }, 1500);
  };

  return (
    <div className="page-container">
      {/* Export Report Grid */}
      <div className="metrics-grid" style={{ marginBottom: '2rem' }}>
        {/* CSV Export Card */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)' }}>
            <TableProperties size={20} />
            <h4 style={{ margin: 0, fontSize: '1rem' }}>Export Sales CSV</h4>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
            Downloads raw tabular transactional logs for integration with spreadsheet software.
          </p>
          <button 
            onClick={handleExportCSV} 
            className="btn btn-secondary btn-sm"
            style={{ marginTop: 'auto', display: 'flex', gap: '0.4rem', width: '100%', justifyContent: 'center' }}
            disabled={downloading !== null}
          >
            <Download size={14} />
            <span>{downloading === 'csv' ? 'Compiling...' : 'Download CSV'}</span>
          </button>
        </div>

        {/* Excel Export Card */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success)' }}>
            <FileSpreadsheet size={20} />
            <h4 style={{ margin: 0, fontSize: '1rem' }}>Excel Ledger</h4>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
            Downloads stylized spreadsheets containing auto-calculated tax balances and inventory statuses.
          </p>
          <button 
            onClick={() => handleMockExport('excel')} 
            className="btn btn-secondary btn-sm"
            style={{ marginTop: 'auto', display: 'flex', gap: '0.4rem', width: '100%', justifyContent: 'center', borderColor: 'rgba(16, 185, 129, 0.2)' }}
            disabled={downloading !== null}
          >
            <Download size={14} />
            <span>{downloading === 'excel' ? 'Processing...' : 'Download Excel'}</span>
          </button>
        </div>

        {/* PDF Export Card */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--danger)' }}>
            <FileText size={20} />
            <h4 style={{ margin: 0, fontSize: '1rem' }}>Executive PDF Report</h4>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
            Generates high-quality print-ready PDF invoices and charts summary for business audits.
          </p>
          <button 
            onClick={() => handleMockExport('pdf')} 
            className="btn btn-secondary btn-sm"
            style={{ marginTop: 'auto', display: 'flex', gap: '0.4rem', width: '100%', justifyContent: 'center', borderColor: 'rgba(239, 68, 68, 0.2)' }}
            disabled={downloading !== null}
          >
            <Download size={14} />
            <span>{downloading === 'pdf' ? 'Rendering...' : 'Download PDF'}</span>
          </button>
        </div>
      </div>

      {/* Analytics Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Category Revenue Chart */}
        <div className="card" style={{ minHeight: '340px', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1.5rem', textAlign: 'left' }}>Revenue & Profits by Category</h3>
          <div style={{ flex: 1, width: '100%', height: '240px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                <XAxis dataKey="category" stroke="var(--color-text-muted)" fontSize={11} tickLine={false} />
                <YAxis stroke="var(--color-text-muted)" fontSize={11} tickLine={false} />
                <Tooltip 
                  contentStyle={{ 
                    background: 'var(--bg-surface)', 
                    borderColor: 'var(--border-color)', 
                    color: 'var(--color-text-bright)', 
                    borderRadius: 'var(--radius-md)' 
                  }} 
                />
                <Legend verticalAlign="top" height={36} iconType="circle" fontSize={12} />
                <Bar dataKey="Revenue" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Profit" fill="var(--success)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Product Profit Margin Chart */}
        <div className="card" style={{ minHeight: '340px', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1.5rem', textAlign: 'left' }}>Product Markup Margin Percentage (%)</h3>
          <div style={{ flex: 1, width: '100%', height: '240px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={productProfitData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--color-text-muted)" fontSize={9} tickLine={false} />
                <YAxis stroke="var(--color-text-muted)" fontSize={11} tickLine={false} suffix="%" />
                <Tooltip 
                  contentStyle={{ 
                    background: 'var(--bg-surface)', 
                    borderColor: 'var(--border-color)', 
                    color: 'var(--color-text-bright)', 
                    borderRadius: 'var(--radius-md)' 
                  }} 
                />
                <Bar dataKey="Margin" name="Markup Margin %" fill="var(--info)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
