import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';

// ── API base (set VITE_API_BASE on Vercel to point to Cloud Run backend) ──────
const API_BASE = import.meta.env.VITE_API_BASE || '';

// ── Colours ───────────────────────────────────────────────────────────────────
const TERRITORY_COLORS = {
  US: '#2563eb', UK: '#06b6d4', Europe: '#10b981', Japan: '#f59e0b', ROW: '#8b5cf6'
};
const CHANNEL_COLORS = {
  Amazon: '#f97316', eBay: '#ef4444', 'Own Sites': '#10b981',
  Rakuten: '#8b5cf6', Walmart: '#2563eb', B2B: '#6b7280', Other: '#94a3b8'
};
const CHART_COLORS = ['#3b82f6','#06b6d4','#f59e0b','#f97316','#8b5cf6','#ec4899','#0ea5e9','#a855f7','#10b981','#ef4444'];

// ── Date range helpers ────────────────────────────────────────────────────────
function pad(n) { return String(n).padStart(2, '0'); }
function fmt(d) { return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }

function getPresetRange(preset) {
  const now = new Date();
  const today = fmt(now);
  switch (preset) {
    case '7d': {
      const d = new Date(now); d.setDate(d.getDate() - 6);
      return { from: fmt(d), to: today };
    }
    case '30d': {
      const d = new Date(now); d.setDate(d.getDate() - 29);
      return { from: fmt(d), to: today };
    }
    case '90d': {
      const d = new Date(now); d.setDate(d.getDate() - 89);
      return { from: fmt(d), to: today };
    }
    case 'YTD': {
      return { from: `${now.getFullYear()}-01-01`, to: today };
    }
    case '1Y': {
      const d = new Date(now); d.setFullYear(d.getFullYear() - 1);
      return { from: fmt(d), to: today };
    }
    case 'All':
      return { from: '', to: '' };
    default:
      return { from: '', to: '' };
  }
}

// ── Formatters ────────────────────────────────────────────────────────────────
const fmtNum = (n) => (Number(n) || 0).toLocaleString();
const fmtUSD = (n) => `$${(Number(n) || 0).toLocaleString()}`;

// ── Components ────────────────────────────────────────────────────────────────
const StatCard = ({ title, value, subtitle, color }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
    <p className="text-gray-500 text-sm font-medium mb-1">{title}</p>
    <p className="text-3xl font-bold" style={{ color }}>{value}</p>
    {subtitle && <p className="text-gray-400 text-xs mt-1">{subtitle}</p>}
  </div>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
      <p className="font-semibold text-gray-800 mb-2">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} style={{ color: entry.fill || entry.color }} className="text-sm">
          {entry.name}: {fmtNum(entry.value)}
        </p>
      ))}
    </div>
  );
};

const LoadingOverlay = () => (
  <div className="flex items-center justify-center h-64">
    <div className="text-center">
      <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
      <p className="text-gray-500 text-sm">Loading live data…</p>
    </div>
  </div>
);

const ErrorBanner = ({ msg }) => (
  <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">
    ⚠️ {msg}
  </div>
);

// ── CSV export ────────────────────────────────────────────────────────────────
function exportCSV(rows, filename, cols) {
  const lines = [cols.join(',')];
  rows.forEach(r => {
    lines.push(cols.map(c => {
      const v = r[c] ?? '';
      return String(v).includes(',') ? `"${v}"` : v;
    }).join(','));
  });
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${filename}.csv`;
  a.click();
}

// ── DateRangeSelector ─────────────────────────────────────────────────────────
function DateRangeSelector({ preset, onPresetChange, from, to, onFromChange, onToChange }) {
  const presets = ['7d','30d','90d','YTD','1Y','All'];
  return (
    <div className="flex flex-wrap items-center gap-2">
      {presets.map(p => (
        <button
          key={p}
          onClick={() => onPresetChange(p)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
            preset === p ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          {p}
        </button>
      ))}
      <span className="text-gray-400 text-sm mx-1">or</span>
      <input
        type="date"
        value={from}
        onChange={e => onFromChange(e.target.value)}
        className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      />
      <span className="text-gray-400">→</span>
      <input
        type="date"
        value={to}
        onChange={e => onToChange(e.target.value)}
        className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      />
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function SalesDashboard() {
  // Date range state
  const [preset, setPreset] = useState('30d');
  const initial = getPresetRange('30d');
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [activePreset, setActivePreset] = useState('30d');

  // Tab
  const [activeTab, setActiveTab] = useState('overview');
  const [displayLimit, setDisplayLimit] = useState(15);

  // Data states
  const [overview, setOverview] = useState(null);
  const [channels, setChannels] = useState(null);
  const [territories, setTerritories] = useState(null);
  const [products, setProducts] = useState(null);
  const [topSkus, setTopSkus] = useState(null);
  const [productGroupBy, setProductGroupBy] = useState('type');

  const [loading, setLoading] = useState({});
  const [errors, setErrors] = useState({});

  // ── Fetch helpers ─────────────────────────────────────────────────────────
  const qs = from && to ? `?from=${from}&to=${to}` : from ? `?from=${from}` : to ? `?to=${to}` : '';

  async function fetchJson(url, key, setter) {
    setLoading(l => ({ ...l, [key]: true }));
    setErrors(e => ({ ...e, [key]: null }));
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      if (data.error) throw new Error(data.error);
      setter(data);
    } catch (err) {
      setErrors(e => ({ ...e, [key]: err.message }));
    } finally {
      setLoading(l => ({ ...l, [key]: false }));
    }
  }

  // ── Load data on date change ──────────────────────────────────────────────
  useEffect(() => {
    fetchJson(`${API_BASE}/api/overview${qs}`, 'overview', setOverview);
    fetchJson(`${API_BASE}/api/territories${qs}`, 'territories', setTerritories);
  }, [from, to]);

  useEffect(() => {
    if (activeTab === 'channels') fetchJson(`${API_BASE}/api/channels${qs}`, 'channels', setChannels);
  }, [activeTab, from, to]);

  useEffect(() => {
    if (activeTab === 'products' || activeTab === 'devices' || activeTab === 'brands' || activeTab === 'designParents' || activeTab === 'designs') {
      const gbMap = { devices: 'device', designs: 'design', brands: 'brand', designParents: 'designParentNamed', products: 'type' };
      const gb = gbMap[activeTab] || 'type';
      setProductGroupBy(gb);
      fetchJson(`${API_BASE}/api/products${qs}&groupBy=${gb}`, 'products', setProducts);
    }
  }, [activeTab, from, to]);

  useEffect(() => {
    if (activeTab === 'skus') fetchJson(`${API_BASE}/api/top-skus${qs}&limit=50`, 'skus', setTopSkus);
  }, [activeTab, from, to]);

  // ── Preset handler ────────────────────────────────────────────────────────
  function handlePreset(p) {
    setActivePreset(p);
    const range = getPresetRange(p);
    setFrom(range.from);
    setTo(range.to);
  }

  function handleFromChange(v) { setActivePreset(''); setFrom(v); }
  function handleToChange(v) { setActivePreset(''); setTo(v); }

  // ── Overview summary ──────────────────────────────────────────────────────
  const ov = overview || {};
  const totalUnits = Number(ov.total_units) || 0;
  const totalUSD = Math.round(Number(ov.total_usd) || 0);
  const uniqueSkus = Number(ov.unique_skus) || 0;
  const uniqueDevices = Number(ov.unique_devices) || 0;
  const uniqueDesigns = Number(ov.unique_designs) || 0;

  const dateLabel = from && to ? `${from} → ${to}` : from ? `From ${from}` : to ? `To ${to}` : 'All Time';

  // ── Territory pie ─────────────────────────────────────────────────────────
  const pieData = (territories || []).map(t => ({
    name: t.territory,
    value: t.units,
    color: TERRITORY_COLORS[t.territory] || '#94a3b8',
  }));

  // ── Tabs ──────────────────────────────────────────────────────────────────
  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'channels', label: 'Sales Channels' },
    { id: 'products', label: 'Product Types' },
    { id: 'devices', label: 'Devices' },
    { id: 'brands', label: 'Brands' },
    { id: 'designParents', label: 'Design Groups' },
    { id: 'designs', label: 'Designs' },
    { id: 'skus', label: 'Top SKUs' },
    { id: 'opportunities', label: 'Opportunities' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">

        {/* ── Header ── */}
        <div className="mb-6">
          <div className="flex items-start justify-between flex-wrap gap-4 mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Sales Dashboard V2</h1>
              <p className="text-gray-500 mt-1 text-sm">Live BigQuery data · {dateLabel}</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {Object.entries(TERRITORY_COLORS).map(([t, c]) => (
                <span key={t} className="px-2 py-1 rounded-full text-xs font-medium border"
                  style={{ backgroundColor: c + '20', color: c, borderColor: c + '50' }}>
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* Date range selector */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <DateRangeSelector
              preset={activePreset}
              onPresetChange={handlePreset}
              from={from}
              to={to}
              onFromChange={handleFromChange}
              onToChange={handleToChange}
            />
          </div>
        </div>

        {/* ── Summary Cards ── */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
          <StatCard title="Total Units" value={loading.overview ? '…' : fmtNum(totalUnits)} color="#1f2937" />
          <StatCard title="Total Revenue" value={loading.overview ? '…' : fmtUSD(totalUSD)} subtitle="USD" color="#2563eb" />
          <StatCard title="Active SKUs" value={loading.overview ? '…' : fmtNum(uniqueSkus)} color="#9333ea" />
          <StatCard title="Devices" value={loading.overview ? '…' : fmtNum(uniqueDevices)} color="#ea580c" />
          <StatCard title="Designs" value={loading.overview ? '…' : fmtNum(uniqueDesigns)} color="#db2777" />
        </div>

        {errors.overview && <ErrorBanner msg={errors.overview} />}

        {/* ── Tabs ── */}
        <div className="flex gap-1 mb-6 bg-white p-1 rounded-xl shadow-sm overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all ${
                activeTab === tab.id ? 'bg-blue-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ────────────────────────────────────────────────────────────────── */}
        {/* OVERVIEW TAB */}
        {/* ────────────────────────────────────────────────────────────────── */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Territory Pie */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Units by Territory</h3>
              {loading.territories ? <LoadingOverlay /> : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={(v) => fmtNum(v)} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Territory Cards */}
            <div className="space-y-3">
              {loading.territories
                ? <LoadingOverlay />
                : (territories || []).map(t => (
                <div key={t.territory} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
                      style={{ backgroundColor: TERRITORY_COLORS[t.territory] || '#94a3b8' }}>
                      {t.territory}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">{t.territory}</p>
                      <p className="text-xs text-gray-400">{t.pct}% of units</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-gray-50 rounded-lg p-2">
                      <p className="text-lg font-bold" style={{ color: TERRITORY_COLORS[t.territory] }}>{fmtNum(t.units)}</p>
                      <p className="text-xs text-gray-400">Units</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2">
                      <p className="text-lg font-bold" style={{ color: TERRITORY_COLORS[t.territory] }}>{fmtUSD(t.revenue_usd)}</p>
                      <p className="text-xs text-gray-400">Revenue</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2">
                      <p className="text-lg font-bold" style={{ color: TERRITORY_COLORS[t.territory] }}>{fmtNum(t.unique_skus)}</p>
                      <p className="text-xs text-gray-400">SKUs</p>
                    </div>
                  </div>
                </div>
              ))}
              {errors.territories && <ErrorBanner msg={errors.territories} />}
            </div>
          </div>
        )}

        {/* ────────────────────────────────────────────────────────────────── */}
        {/* SALES CHANNELS TAB */}
        {/* ────────────────────────────────────────────────────────────────── */}
        {activeTab === 'channels' && (
          <div className="space-y-6">
            {loading.channels ? <LoadingOverlay /> : errors.channels ? <ErrorBanner msg={errors.channels} /> : (
              <>
                {/* Bar chart */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-800">Revenue by Channel (USD)</h3>
                    <button onClick={() => exportCSV(channels || [], 'channels', ['channel','orders','units','revenue_usd','pct'])}
                      className="text-sm text-blue-600 hover:underline">↓ CSV</button>
                  </div>
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={channels || []} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="channel" />
                      <YAxis tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                      <Tooltip formatter={(v, name) => [fmtUSD(v), name]} />
                      <Bar dataKey="revenue_usd" name="Revenue (USD)" radius={[4,4,0,0]}>
                        {(channels || []).map((entry, i) => (
                          <Cell key={i} fill={CHANNEL_COLORS[entry.channel] || '#94a3b8'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Units bar chart */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Units by Channel</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={channels || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="channel" />
                      <YAxis tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                      <Tooltip formatter={(v) => fmtNum(v)} />
                      <Bar dataKey="units" name="Units" radius={[4,4,0,0]}>
                        {(channels || []).map((entry, i) => (
                          <Cell key={i} fill={CHANNEL_COLORS[entry.channel] || '#94a3b8'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Table */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Channel Breakdown</h3>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-2 font-semibold text-gray-600">Channel</th>
                        <th className="text-right py-3 px-2 font-semibold text-gray-600">Orders</th>
                        <th className="text-right py-3 px-2 font-semibold text-gray-600">Units</th>
                        <th className="text-right py-3 px-2 font-semibold text-gray-600">Revenue (USD)</th>
                        <th className="text-right py-3 px-2 font-semibold text-gray-600">% of Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(channels || []).map(ch => (
                        <tr key={ch.channel} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-2 px-2">
                            <span className="inline-flex items-center gap-2">
                              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: CHANNEL_COLORS[ch.channel] || '#94a3b8' }}></span>
                              <span className="font-medium">{ch.channel}</span>
                            </span>
                          </td>
                          <td className="py-2 px-2 text-right">{fmtNum(ch.orders)}</td>
                          <td className="py-2 px-2 text-right">{fmtNum(ch.units)}</td>
                          <td className="py-2 px-2 text-right font-semibold">{fmtUSD(ch.revenue_usd)}</td>
                          <td className="py-2 px-2 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-full rounded-full" style={{ width: `${ch.pct}%`, backgroundColor: CHANNEL_COLORS[ch.channel] || '#94a3b8' }}></div>
                              </div>
                              <span className="text-gray-600 w-10 text-right">{ch.pct}%</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {/* ────────────────────────────────────────────────────────────────── */}
        {/* PRODUCT TYPES TAB */}
        {/* ────────────────────────────────────────────────────────────────── */}
        {activeTab === 'products' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Product Types by Territory</h3>
            {loading.products ? <LoadingOverlay /> : errors.products ? <ErrorBanner msg={errors.products} /> : (
              <ResponsiveContainer width="100%" height={Math.max(400, (products || []).slice(0, displayLimit).length * 28)}>
                <BarChart data={(products || []).slice(0, displayLimit)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" tickFormatter={fmtNum} />
                  <YAxis dataKey="product_type" type="category" width={90} tick={{ fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  {Object.keys(TERRITORY_COLORS).map(t => (
                    <Bar key={t} dataKey={t} fill={TERRITORY_COLORS[t]} stackId="a" radius={[0,4,4,0]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        )}

        {/* ────────────────────────────────────────────────────────────────── */}
        {/* DEVICES TAB */}
        {/* ────────────────────────────────────────────────────────────────── */}
        {activeTab === 'devices' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Top Devices by Territory</h3>
            {loading.products ? <LoadingOverlay /> : errors.products ? <ErrorBanner msg={errors.products} /> : (
              <ResponsiveContainer width="100%" height={Math.max(400, (products || []).slice(0, displayLimit).length * 28)}>
                <BarChart data={(products || []).slice(0, displayLimit)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" tickFormatter={fmtNum} />
                  <YAxis dataKey="device" type="category" width={110} tick={{ fontSize: 10 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  {Object.keys(TERRITORY_COLORS).map(t => (
                    <Bar key={t} dataKey={t} fill={TERRITORY_COLORS[t]} stackId="a" radius={[0,4,4,0]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        )}

        {/* ────────────────────────────────────────────────────────────────── */}
        {/* BRANDS (LICENSE) TAB */}
        {/* ────────────────────────────────────────────────────────────────── */}
        {activeTab === 'brands' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Sales by Brand (License) — by Territory</h3>
            {loading.products ? <LoadingOverlay /> : errors.products ? <ErrorBanner msg={errors.products} /> : (
              <ResponsiveContainer width="100%" height={Math.max(400, (products || []).slice(0, displayLimit).length * 28)}>
                <BarChart data={(products || []).slice(0, displayLimit)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" tickFormatter={fmtNum} />
                  <YAxis dataKey="brand" type="category" width={180} tick={{ fontSize: 10 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  {Object.keys(TERRITORY_COLORS).map(t => (
                    <Bar key={t} dataKey={t} fill={TERRITORY_COLORS[t]} stackId="a" radius={[0,4,4,0]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        )}

        {/* ────────────────────────────────────────────────────────────────── */}
        {/* DESIGN PARENT GROUPS TAB */}
        {/* ────────────────────────────────────────────────────────────────── */}
        {activeTab === 'designParents' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Sales by Design Group (Parent) — by Territory</h3>
            {loading.products ? <LoadingOverlay /> : errors.products ? <ErrorBanner msg={errors.products} /> : (
              <ResponsiveContainer width="100%" height={Math.max(400, (products || []).slice(0, displayLimit).length * 28)}>
                <BarChart data={(products || []).slice(0, displayLimit)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" tickFormatter={fmtNum} />
                  <YAxis dataKey="design_parent" type="category" width={150} tick={{ fontSize: 10 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  {Object.keys(TERRITORY_COLORS).map(t => (
                    <Bar key={t} dataKey={t} fill={TERRITORY_COLORS[t]} stackId="a" radius={[0,4,4,0]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        )}

        {/* ────────────────────────────────────────────────────────────────── */}
        {/* DESIGNS TAB */}
        {/* ────────────────────────────────────────────────────────────────── */}
        {activeTab === 'designs' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Top Designs (Parent-Child) — by Territory</h3>
            {loading.products ? <LoadingOverlay /> : errors.products ? <ErrorBanner msg={errors.products} /> : (
              <ResponsiveContainer width="100%" height={Math.max(400, (products || []).slice(0, displayLimit).length * 28)}>
                <BarChart data={(products || []).slice(0, displayLimit)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" tickFormatter={fmtNum} />
                  <YAxis dataKey="design" type="category" width={130} tick={{ fontSize: 9 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  {Object.keys(TERRITORY_COLORS).map(t => (
                    <Bar key={t} dataKey={t} fill={TERRITORY_COLORS[t]} stackId="a" radius={[0,4,4,0]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        )}

        {/* ────────────────────────────────────────────────────────────────── */}
        {/* TOP SKUs TAB */}
        {/* ────────────────────────────────────────────────────────────────── */}
        {activeTab === 'skus' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Top SKUs (all territories)</h3>
              <button onClick={() => exportCSV(topSkus || [], 'top_skus', ['rank','sku','territory','units','revenue_usd'])}
                className="text-sm text-blue-600 hover:underline">↓ CSV</button>
            </div>
            {loading.skus ? <LoadingOverlay /> : errors.skus ? <ErrorBanner msg={errors.skus} /> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-2 font-semibold text-gray-600">#</th>
                      <th className="text-left py-3 px-2 font-semibold text-gray-600">SKU</th>
                      <th className="text-left py-3 px-2 font-semibold text-gray-600">Territory</th>
                      <th className="text-right py-3 px-2 font-semibold text-gray-600">Units</th>
                      <th className="text-right py-3 px-2 font-semibold text-gray-600">Revenue (USD)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(topSkus || []).slice(0, displayLimit).map(item => (
                      <tr key={`${item.sku}-${item.territory}`} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-2 px-2">
                          <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                            item.rank <= 3 ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'
                          }`}>{item.rank}</span>
                        </td>
                        <td className="py-2 px-2 font-mono text-xs">{item.sku}</td>
                        <td className="py-2 px-2">
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium"
                            style={{ backgroundColor: (TERRITORY_COLORS[item.territory] || '#94a3b8') + '20', color: TERRITORY_COLORS[item.territory] || '#94a3b8' }}>
                            {item.territory}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-right font-semibold text-blue-600">{fmtNum(item.units)}</td>
                        <td className="py-2 px-2 text-right font-semibold text-gray-700">{fmtUSD(item.revenue_usd)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="text-xs text-gray-400 mt-3">Showing top {Math.min(displayLimit, (topSkus || []).length)} SKUs by units</p>
              </div>
            )}
            <div className="mt-4 flex items-center gap-2">
              <label className="text-sm text-gray-500">Show:</label>
              {[15, 25, 50].map(n => (
                <button key={n} onClick={() => setDisplayLimit(n)}
                  className={`px-2 py-1 rounded text-xs font-medium ${displayLimit === n ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-100'}`}>
                  {n}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ────────────────────────────────────────────────────────────────── */}
        {/* OPPORTUNITIES TAB */}
        {/* ────────────────────────────────────────────────────────────────── */}
        {activeTab === 'opportunities' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <p className="text-4xl mb-4">📊</p>
            <p className="text-gray-500 text-lg">Upload an Amazon Business Report CSV to see opportunities.</p>
            <p className="text-gray-400 text-sm mt-2">Use the upload button and select your Business Report export.</p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-gray-400 text-sm">
          Sales Dashboard V2 · Live BigQuery Data · {dateLabel}
        </div>
      </div>
    </div>
  );
}
