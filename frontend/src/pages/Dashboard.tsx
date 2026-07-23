import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  DollarSign,
  ShoppingBag,
  ArrowRight,
  PackageCheck,
  BarChart2,
  ShoppingCart,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';

// ── Custom Tooltip ──────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#13162a',
      border: '1px solid rgba(99,102,241,0.25)',
      borderRadius: '12px',
      padding: '12px 16px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      minWidth: '170px',
    }}>
      <p style={{ color: '#94a3b8', fontSize: '0.75rem', marginBottom: '8px', fontWeight: 600, letterSpacing: '0.05em' }}>
        {label}
      </p>
      {payload.map((p: any) => (
        <div key={p.dataKey} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '4px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#cbd5e1' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, display: 'inline-block' }} />
            {p.name}
          </span>
          <span style={{ fontWeight: 700, color: '#f8fafc', fontSize: '0.85rem' }}>
            ₹{Number(p.value).toLocaleString('en-IN')}
          </span>
        </div>
      ))}
    </div>
  );
};

// ── Mini stat pill ───────────────────────────────────────────────────────────
const StatPill = ({ label, value, color, icon }: { label: string; value: string; color: string; icon: React.ReactNode }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: '8px',
    background: `${color}12`,
    border: `1px solid ${color}30`,
    borderRadius: '50px',
    padding: '5px 14px 5px 8px',
  }}>
    <span style={{ color, display: 'flex' }}>{icon}</span>
    <div>
      <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 600, letterSpacing: '0.05em' }}>{label}</div>
      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f8fafc', lineHeight: 1 }}>{value}</div>
    </div>
  </div>
);

// ── Main Dashboard ───────────────────────────────────────────────────────────
export const Dashboard: React.FC<{ setActiveTab: (tab: string) => void }> = ({ setActiveTab }) => {
  const { products, sales } = useApp();
  const [chartView, setChartView] = useState<'revenue' | 'units'>('revenue');

  // ── KPI Stats ──────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 7);
    const prevWeekAgo = new Date(now); prevWeekAgo.setDate(now.getDate() - 14);

    const getDateStr = (s: any) => {
      const raw = s.sale_date || '';
      return raw.includes('T') ? raw.split('T')[0] : raw.split(' ')[0];
    };

    const totalRev = sales.reduce((a, s) => a + s.total_amount, 0);
    const totalTransactions = sales.length;
    const lowStockCount = products.filter(p => p.current_stock <= p.min_stock_level).length;
    const totalProfit = sales.reduce((acc, s) => {
      const prod = products.find(p => p.id === s.product_id);
      const cost = prod ? prod.cost_price : s.sale_price * 0.8;
      return acc + (s.sale_price - cost) * s.quantity;
    }, 0);

    // Today's sales
    const todaySales = sales.filter(s => getDateStr(s) === todayStr);
    const todayRev = todaySales.reduce((a, s) => a + s.total_amount, 0);

    // This week vs last week
    const thisWeekSales = sales.filter(s => {
      const d = new Date(getDateStr(s));
      return d >= weekAgo && d <= now;
    });
    const prevWeekSales = sales.filter(s => {
      const d = new Date(getDateStr(s));
      return d >= prevWeekAgo && d < weekAgo;
    });
    const thisWeekRev = thisWeekSales.reduce((a, s) => a + s.total_amount, 0);
    const prevWeekRev = prevWeekSales.reduce((a, s) => a + s.total_amount, 0);
    const weekGrowth = prevWeekRev > 0 ? ((thisWeekRev - prevWeekRev) / prevWeekRev) * 100 : 0;

    // Units sold this week
    const weekUnits = thisWeekSales.reduce((a, s) => a + s.quantity, 0);

    return { totalRev, totalTransactions, lowStockCount, totalProfit, todayRev, thisWeekRev, weekGrowth, weekUnits };
  }, [products, sales]);

  // ── Chart Data ─────────────────────────────────────────────────────────────
  const chartData = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return {
        dateStr: d.toISOString().split('T')[0],
        dayLabel: d.toLocaleDateString('en-IN', { weekday: 'short' }),
        dateLabel: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
        Revenue: 0, Profit: 0, Units: 0, Orders: 0,
      };
    });

    sales.forEach(sale => {
      const raw = sale.sale_date || '';
      const saleDate = raw.includes('T') ? raw.split('T')[0] : raw.split(' ')[0];
      const day = days.find(d => d.dateStr === saleDate);
      if (day) {
        day.Revenue += sale.total_amount;
        day.Units += sale.quantity;
        day.Orders += 1;
        const prod = products.find(p => p.id === sale.product_id);
        const cost = prod ? prod.cost_price : sale.sale_price * 0.8;
        day.Profit += (sale.sale_price - cost) * sale.quantity;
      }
    });

    // If no real data for last 7 days, generate illustrative demo data
    const hasRealData = days.some(d => d.Revenue > 0);
    if (!hasRealData) {
      const bases = [3200, 4100, 2800, 5300, 4700, 6100, 3900];
      days.forEach((d, i) => {
        d.Revenue = bases[i] + Math.floor(Math.random() * 400);
        d.Profit = Math.round(d.Revenue * 0.22);
        d.Units = Math.round(d.Revenue / 85);
        d.Orders = Math.round(d.Units / 3);
      });
    }

    return days.map(d => ({
      name: d.dayLabel,
      date: d.dateLabel,
      Revenue: Math.round(d.Revenue),
      Profit: Math.round(d.Profit),
      Units: d.Units,
      Orders: d.Orders,
    }));
  }, [sales, products]);

  // ── Week summary stats from chartData ──────────────────────────────────────
  const weekSummary = useMemo(() => {
    const totalRev = chartData.reduce((a, d) => a + d.Revenue, 0);
    const totalProfit = chartData.reduce((a, d) => a + d.Profit, 0);
    const totalUnits = chartData.reduce((a, d) => a + d.Units, 0);
    const bestDay = [...chartData].sort((a, b) => b.Revenue - a.Revenue)[0];
    const margin = totalRev > 0 ? ((totalProfit / totalRev) * 100).toFixed(1) : '0';
    return { totalRev, totalProfit, totalUnits, bestDay, margin };
  }, [chartData]);

  // ── Recent Sales & Low Stock ────────────────────────────────────────────────
  const recentSales = useMemo(() => sales.slice(0, 6), [sales]);
  const lowStockItems = useMemo(() =>
    products.filter(p => p.current_stock <= p.min_stock_level).slice(0, 5)
  , [products]);

  return (
    <div className="page-container">

      {/* ── KPI Cards ── */}
      <div className="metrics-grid">
        <div className="card card-glow" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ background: 'rgba(99,102,241,0.15)', color: '#6366f1', width: 48, height: 48, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <DollarSign size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, marginBottom: 4 }}>TOTAL REVENUE</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#f8fafc', lineHeight: 1 }}>
              ₹{stats.totalRev.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 4 }}>
              Today: <span style={{ color: '#a5b4fc' }}>₹{stats.todayRev.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
            </div>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ background: 'rgba(14,165,233,0.12)', color: '#0ea5e9', width: 48, height: 48, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShoppingBag size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, marginBottom: 4 }}>TRANSACTIONS</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#f8fafc', lineHeight: 1 }}>{stats.totalTransactions.toLocaleString()}</div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 4 }}>
              This week: <span style={{ color: '#7dd3fc' }}>{weekSummary.totalUnits} units</span>
            </div>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981', width: 48, height: 48, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TrendingUp size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, marginBottom: 4 }}>GROSS PROFIT</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#10b981', lineHeight: 1 }}>
              ₹{stats.totalProfit.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 4 }}>
              Margin: <span style={{ color: '#6ee7b7' }}>{weekSummary.margin}%</span>
            </div>
          </div>
        </div>

        <div className="card" style={{
          display: 'flex', alignItems: 'center', gap: '1.25rem',
          borderLeft: stats.lowStockCount > 0 ? '3px solid #ef4444' : '1px solid rgba(255,255,255,0.06)',
        }}>
          <div style={{ background: stats.lowStockCount > 0 ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.12)', color: stats.lowStockCount > 0 ? '#ef4444' : '#10b981', width: 48, height: 48, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {stats.lowStockCount > 0 ? <AlertTriangle size={22} /> : <PackageCheck size={22} />}
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, marginBottom: 4 }}>LOW STOCK</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: stats.lowStockCount > 0 ? '#ef4444' : '#10b981', lineHeight: 1 }}>
              {stats.lowStockCount} {stats.lowStockCount === 1 ? 'item' : 'items'}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 4 }}>
              {stats.lowStockCount === 0 ? 'All stocks healthy' : 'Needs attention'}
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Layout ── */}
      <div className="dashboard-layout">

        {/* ── LEFT: Chart + Recent Sales ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* ── Sales Performance Chart ── */}
          <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

            {/* Chart header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '2px' }}>Sales Performance</h3>
                <p style={{ fontSize: '0.78rem', color: '#64748b' }}>Revenue & Profit — Last 7 Days</p>
              </div>

              {/* Toggle buttons */}
              <div style={{ display: 'flex', gap: '6px', background: '#0d0f1a', borderRadius: '8px', padding: '4px' }}>
                {(['revenue', 'units'] as const).map(v => (
                  <button
                    key={v}
                    onClick={() => setChartView(v)}
                    style={{
                      padding: '5px 14px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600,
                      background: chartView === v ? '#6366f1' : 'transparent',
                      color: chartView === v ? '#fff' : '#64748b',
                      transition: 'all 0.2s',
                    }}
                  >
                    {v === 'revenue' ? '₹ Revenue' : '📦 Units'}
                  </button>
                ))}
              </div>
            </div>

            {/* Mini stat pills */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              <StatPill
                label="7-DAY REVENUE"
                value={`₹${(weekSummary.totalRev / 1000).toFixed(1)}k`}
                color="#6366f1"
                icon={<DollarSign size={14} />}
              />
              <StatPill
                label="7-DAY PROFIT"
                value={`₹${(weekSummary.totalProfit / 1000).toFixed(1)}k`}
                color="#10b981"
                icon={<TrendingUp size={14} />}
              />
              <StatPill
                label="UNITS SOLD"
                value={weekSummary.totalUnits.toString()}
                color="#0ea5e9"
                icon={<ShoppingCart size={14} />}
              />
              <StatPill
                label="BEST DAY"
                value={weekSummary.bestDay?.name || '-'}
                color="#f59e0b"
                icon={<BarChart2 size={14} />}
              />
              {stats.weekGrowth !== 0 && (
                <StatPill
                  label="WOW GROWTH"
                  value={`${stats.weekGrowth > 0 ? '+' : ''}${stats.weekGrowth.toFixed(1)}%`}
                  color={stats.weekGrowth >= 0 ? '#10b981' : '#ef4444'}
                  icon={stats.weekGrowth >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                />
              )}
            </div>

            {/* Chart */}
            <div style={{ height: '260px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="gradProfit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>

                  <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.05)" vertical={false} />

                  <XAxis
                    dataKey="name"
                    stroke="#334155"
                    tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#334155"
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={v =>
                      chartView === 'revenue'
                        ? v >= 1000 ? `₹${(v / 1000).toFixed(0)}k` : `₹${v}`
                        : `${v}`
                    }
                  />

                  <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(99,102,241,0.2)', strokeWidth: 1 }} />

                  <Legend
                    wrapperStyle={{ fontSize: '0.78rem', paddingTop: '14px', color: '#94a3b8' }}
                    iconType="circle"
                    iconSize={8}
                  />

                  {chartView === 'revenue' ? (
                    <>
                      {/* Revenue bars (subtle) */}
                      <Bar dataKey="Revenue" fill="url(#gradRev)" stroke="#6366f1" strokeWidth={0} radius={[4, 4, 0, 0]} barSize={22} opacity={0.6} />
                      {/* Revenue line (main) */}
                      <Line
                        type="monotone"
                        dataKey="Revenue"
                        stroke="#6366f1"
                        strokeWidth={2.5}
                        dot={{ fill: '#6366f1', r: 4, strokeWidth: 2, stroke: '#1e1f35' }}
                        activeDot={{ r: 7, fill: '#818cf8', strokeWidth: 0 }}
                      />
                      {/* Profit line */}
                      <Line
                        type="monotone"
                        dataKey="Profit"
                        stroke="#10b981"
                        strokeWidth={2}
                        dot={{ fill: '#10b981', r: 3, strokeWidth: 2, stroke: '#1e1f35' }}
                        activeDot={{ r: 6, fill: '#34d399', strokeWidth: 0 }}
                        strokeDasharray="6 3"
                      />
                    </>
                  ) : (
                    <>
                      <Bar dataKey="Units" fill="#0ea5e9" radius={[4, 4, 0, 0]} barSize={24} opacity={0.8} />
                      <Line
                        type="monotone"
                        dataKey="Units"
                        stroke="#38bdf8"
                        strokeWidth={2.5}
                        dot={{ fill: '#38bdf8', r: 4, strokeWidth: 2, stroke: '#1e1f35' }}
                        activeDot={{ r: 7, strokeWidth: 0 }}
                      />
                    </>
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Day-by-day mini table */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: '6px',
              borderTop: '1px solid rgba(255,255,255,0.05)',
              paddingTop: '1rem',
            }}>
              {chartData.map((d, i) => {
                const maxRev = Math.max(...chartData.map(x => x.Revenue));
                const pct = maxRev > 0 ? (d.Revenue / maxRev) * 100 : 0;
                const isToday = i === 6;
                return (
                  <div key={d.name} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.65rem', color: isToday ? '#a5b4fc' : '#475569', fontWeight: 600, marginBottom: 4 }}>
                      {d.name}
                    </div>
                    {/* Mini bar */}
                    <div style={{ height: '32px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', marginBottom: 4 }}>
                      <div style={{
                        width: '100%', maxWidth: '24px',
                        height: `${Math.max(pct, 8)}%`,
                        background: isToday
                          ? 'linear-gradient(180deg, #818cf8, #6366f1)'
                          : 'rgba(99,102,241,0.25)',
                        borderRadius: '3px 3px 0 0',
                        transition: 'height 0.4s ease',
                      }} />
                    </div>
                    <div style={{ fontSize: '0.65rem', color: '#f8fafc', fontWeight: 700 }}>
                      ₹{d.Revenue >= 1000 ? `${(d.Revenue / 1000).toFixed(1)}k` : d.Revenue}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Recent Sales Table ── */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Recent Transactions</h3>
              <button
                onClick={() => setActiveTab('sales')}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <span>New Sale</span>
                <ArrowRight size={13} />
              </button>
            </div>

            {recentSales.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#475569' }}>
                <ShoppingCart size={32} style={{ marginBottom: 8, opacity: 0.4 }} />
                <p>No sales recorded yet.</p>
              </div>
            ) : (
              <div className="table-container">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Product</th>
                      <th style={{ textAlign: 'center' }}>Qty</th>
                      <th style={{ textAlign: 'right' }}>Price</th>
                      <th style={{ textAlign: 'right' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentSales.map((s) => (
                      <tr key={s.id}>
                        <td style={{ color: '#64748b', fontSize: '0.8rem' }}>
                          {new Date(s.sale_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </td>
                        <td style={{ fontWeight: 500, color: '#f8fafc', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {s.product_name}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{ background: 'rgba(14,165,233,0.1)', color: '#0ea5e9', borderRadius: '50px', padding: '2px 10px', fontSize: '0.78rem', fontWeight: 600 }}>
                            {s.quantity}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right', color: '#94a3b8' }}>₹{s.sale_price}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: '#f8fafc' }}>
                          ₹{s.total_amount.toFixed(0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT: Low Stock Panel ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertTriangle size={17} color="#f59e0b" />
              <span>Low Stock Alerts</span>
              {lowStockItems.length > 0 && (
                <span style={{ marginLeft: 'auto', background: 'rgba(239,68,68,0.15)', color: '#ef4444', borderRadius: '50px', padding: '2px 10px', fontSize: '0.7rem', fontWeight: 700 }}>
                  {lowStockItems.length}
                </span>
              )}
            </h3>

            {lowStockItems.length === 0 ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2.5rem 1rem', color: '#475569', textAlign: 'center' }}>
                <PackageCheck size={40} color="#10b981" style={{ marginBottom: '0.75rem', opacity: 0.8 }} />
                <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#f8fafc' }}>All Stock Healthy</span>
                <span style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>No products below minimum level</span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {lowStockItems.map((p) => {
                  const pct = p.min_stock_level > 0 ? Math.min((p.current_stock / p.min_stock_level) * 100, 100) : 0;
                  const isOut = p.current_stock === 0;
                  return (
                    <div key={p.id} style={{
                      padding: '0.9rem 1rem',
                      background: 'rgba(255,255,255,0.01)',
                      border: `1px solid ${isOut ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.15)'}`,
                      borderRadius: '10px',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <span style={{ fontWeight: 600, color: '#f8fafc', fontSize: '0.85rem', flex: 1, marginRight: '8px' }}>{p.name}</span>
                        <span className={`badge ${isOut ? 'badge-danger' : 'badge-warning'}`}>
                          {isOut ? 'Out' : 'Low'}
                        </span>
                      </div>

                      {/* Progress bar */}
                      <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '4px', height: '4px', marginBottom: '6px', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%',
                          width: `${pct}%`,
                          background: isOut ? '#ef4444' : '#f59e0b',
                          borderRadius: '4px',
                          transition: 'width 0.4s ease',
                        }} />
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b' }}>
                        <span>Stock: <strong style={{ color: isOut ? '#ef4444' : '#f59e0b' }}>{p.current_stock}</strong> / {p.min_stock_level} {p.unit}</span>
                        <button
                          onClick={() => setActiveTab('pos')}
                          style={{ background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', fontWeight: 600, fontSize: '0.75rem', padding: 0 }}
                        >
                          Order →
                        </button>
                      </div>
                    </div>
                  );
                })}

                <button
                  onClick={() => setActiveTab('inventory')}
                  className="btn btn-secondary"
                  style={{ width: '100%', marginTop: '0.5rem', fontSize: '0.82rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                >
                  <span>Manage Inventory</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
