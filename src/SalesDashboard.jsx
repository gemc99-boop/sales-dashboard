import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = { UK: '#06b6d4', US: '#2563eb', chart: ['#3b82f6', '#06b6d4', '#f59e0b', '#f97316', '#8b5cf6', '#ec4899', '#0ea5e9', '#a855f7'] };

// Fallback data for local development
const fallbackData = {
  summary: { total_units: 15194, uk_units: 5553, us_units: 9641, uk_sales: 112409, us_sales: 212030, unique_skus: 10761, unique_devices: 285, unique_designs: 1337 },
  territory: [
    { country: "UK", currency: "GBP", units: 5553, sales: 112409, unique_skus: 4290 },
    { country: "US", currency: "USD", units: 9641, sales: 212030, unique_skus: 6875 }
  ],
  product_types_comparison: [
    { product_type: "HTPCR", UK: 2050, US: 4372, total: 6422 },
    { product_type: "HLBWH", UK: 1301, US: 1000, total: 2301 },
    { product_type: "HC", UK: 704, US: 1028, total: 1732 },
    { product_type: "H8939", UK: 546, US: 732, total: 1278 },
    { product_type: "HDMWH", UK: 426, US: 796, total: 1222 },
    { product_type: "HB401", UK: 163, US: 494, total: 657 },
    { product_type: "FHTPCR", UK: 20, US: 413, total: 433 },
    { product_type: "HB6CR", UK: 114, US: 259, total: 373 },
    { product_type: "HB7BK", UK: 35, US: 150, total: 185 },
    { product_type: "FHC", UK: 9, US: 107, total: 116 }
  ],
  devices_comparison: [
    { device: "IPH16", UK: 240, US: 416, total: 656 },
    { device: "IPH14", UK: 292, US: 342, total: 634 },
    { device: "IPH15", UK: 238, US: 372, total: 610 },
    { device: "IPH17PMAX", UK: 78, US: 528, total: 606 },
    { device: "IPH13", UK: 265, US: 294, total: 559 },
    { device: "IPH17", UK: 123, US: 381, total: 504 },
    { device: "600X300X3", UK: 138, US: 364, total: 502 },
    { device: "IPH12", UK: 233, US: 221, total: 454 },
    { device: "IPHSE4", UK: 108, US: 304, total: 412 },
    { device: "900X400X4", UK: 73, US: 314, total: 387 },
    { device: "IPH16PMAX", UK: 64, US: 321, total: 385 },
    { device: "IPH11", UK: 202, US: 176, total: 378 },
    { device: "IPH17PRO", UK: 64, US: 305, total: 369 },
    { device: "S938U", UK: 128, US: 219, total: 347 },
    { device: "250X300X3", UK: 215, US: 121, total: 336 }
  ],
  design_parents_comparison: [
    { design_parent: "NARUICO", UK: 17, US: 361, total: 378 },
    { design_parent: "PNUTSNF", UK: 84, US: 258, total: 342 },
    { design_parent: "LFCKIT25", UK: 283, US: 23, total: 306 },
    { design_parent: "PNUTBOA", UK: 39, US: 247, total: 286 },
    { design_parent: "PNUTHAL", UK: 47, US: 233, total: 280 },
    { design_parent: "DRGBSUSC", UK: 23, US: 243, total: 266 },
    { design_parent: "HPOTGRA", UK: 31, US: 228, total: 259 },
    { design_parent: "PNUTCHA", UK: 37, US: 221, total: 258 },
    { design_parent: "HPOTDH37", UK: 76, US: 169, total: 245 },
    { design_parent: "AFCKIT25", UK: 156, US: 63, total: 219 },
    { design_parent: "NARUCHA", UK: 7, US: 196, total: 203 },
    { design_parent: "HATSGRA", UK: 23, US: 170, total: 193 },
    { design_parent: "HPOTPRI2", UK: 36, US: 140, total: 176 },
    { design_parent: "PNUTGRA", UK: 22, US: 140, total: 162 },
    { design_parent: "FCBCKT8", UK: 4, US: 151, total: 155 }
  ],
  design_children_comparison: [
    { design_child: "PNUTBOA-XOX", UK: 19, US: 200, total: 219 },
    { design_child: "NARUICO-AKA", UK: 9, US: 174, total: 183 },
    { design_child: "DRGBSUSC-GOK", UK: 10, US: 157, total: 167 },
    { design_child: "LFCKIT25-HOM", UK: 141, US: 10, total: 151 },
    { design_child: "FCBCKT8-AWY", UK: 3, US: 135, total: 138 },
    { design_child: "HPOTDH37-HOP", UK: 31, US: 103, total: 134 },
    { design_child: "PNUTCHA-SNO", UK: 17, US: 117, total: 134 },
    { design_child: "PNUTSNF-CLA", UK: 30, US: 88, total: 118 },
    { design_child: "NCFCCKT-HOM", UK: 114, US: 1, total: 115 },
    { design_child: "PNUTSNF-FUN", UK: 14, US: 95, total: 109 },
    { design_child: "FCBKIT25-HOM", UK: 13, US: 88, total: 101 },
    { design_child: "GMORGRA-ICO", UK: 15, US: 82, total: 97 },
    { design_child: "LFCKIT25-LHOM", UK: 93, US: 1, total: 94 },
    { design_child: "HPOTGRA-MAR", UK: 9, US: 84, total: 93 },
    { design_child: "AFCKIT25-HOM", UK: 58, US: 34, total: 92 }
  ],
  top_skus_uk: [
    { rank: 1, sku: "HC-IPH14-LFCKIT25-HOM", units: 141, sales: 2820 },
    { rank: 2, sku: "HLBWH-IPH13-NCFCCKT-HOM", units: 114, sales: 2508 },
    { rank: 3, sku: "HC-IPH15-LFCKIT25-LHOM", units: 93, sales: 1860 },
    { rank: 4, sku: "HTPCR-IPH16-PNUTSNF-CLA", units: 84, sales: 1848 },
    { rank: 5, sku: "HTPCR-IPH14-HPOTDH37-HOP", units: 76, sales: 1672 },
    { rank: 6, sku: "HC-IPH12-AFCKIT25-HOM", units: 58, sales: 1160 },
    { rank: 7, sku: "HLBWH-IPH11-PNUTHAL", units: 47, sales: 1034 },
    { rank: 8, sku: "HTPCR-IPH16-PNUTBOA-XOX", units: 39, sales: 858 },
    { rank: 9, sku: "HTPCR-S938U-HPOTPRI2", units: 36, sales: 792 },
    { rank: 10, sku: "HTPCR-IPH15-HPOTGRA-MAR", units: 31, sales: 682 }
  ],
  top_skus_us: [
    { rank: 1, sku: "HTPCR-IPH17PMAX-NARUICO-AKA", units: 361, sales: 7942 },
    { rank: 2, sku: "HTPCR-IPH16-PNUTSNF-CLA", units: 258, sales: 5676 },
    { rank: 3, sku: "HTPCR-IPH17-PNUTBOA-XOX", units: 247, sales: 5434 },
    { rank: 4, sku: "HTPCR-IPH17PRO-DRGBSUSC-GOK", units: 243, sales: 5346 },
    { rank: 5, sku: "HTPCR-IPH16PMAX-PNUTHAL", units: 233, sales: 5126 },
    { rank: 6, sku: "HTPCR-IPHSE4-HPOTGRA-MAR", units: 228, sales: 5016 },
    { rank: 7, sku: "HTPCR-IPH15-PNUTCHA-SNO", units: 221, sales: 4862 },
    { rank: 8, sku: "HTPCR-IPH17-NARUCHA", units: 196, sales: 4312 },
    { rank: 9, sku: "HC-IPH14-HATSGRA", units: 170, sales: 3740 },
    { rank: 10, sku: "HTPCR-IPH16-FCBCKT8-AWY", units: 151, sales: 3322 }
  ]
};

const formatNumber = (num) => num?.toLocaleString() || '0';
const formatCurrency = (value, currency) => `${currency === 'GBP' ? '£' : '$'}${value.toLocaleString()}`;

const StatCard = ({ title, value, subtitle, color }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
    <p className="text-gray-500 text-sm font-medium mb-1">{title}</p>
    <p className="text-3xl font-bold" style={{ color }}>{value}</p>
    {subtitle && <p className="text-gray-400 text-xs mt-1">{subtitle}</p>}
  </div>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
        <p className="font-semibold text-gray-800 mb-2">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} style={{ color: entry.fill || entry.color }} className="text-sm">
            {entry.name}: {formatNumber(entry.value)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
    <div className="text-center">
      <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
      <p className="text-gray-600">Loading dashboard data...</p>
    </div>
  </div>
);

// CSV Export utility
const exportToCSV = (data, filename, headers) => {
  const csvRows = [headers.join(',')];
  data.forEach(row => {
    const values = headers.map(h => {
      const key = h.toLowerCase().replace(/ /g, '_');
      const val = row[key] ?? row[h] ?? row[Object.keys(row).find(k => k.toLowerCase() === h.toLowerCase())] ?? '';
      return typeof val === 'string' && val.includes(',') ? `"${val}"` : val;
    });
    csvRows.push(values.join(','));
  });
  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

export default function SalesDashboard({ customData, dateRange = 'January 2026' }) {
  const [data, setData] = useState(customData || fallbackData);
  const [activeTab, setActiveTab] = useState('overview');
  const [displayLimit, setDisplayLimit] = useState(10);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    // Use customData if provided, otherwise use fallback
    setData(customData || fallbackData);
  }, [customData]);

  if (!data) return null;

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'products', label: 'Product Types' },
    { id: 'devices', label: 'Devices' },
    { id: 'designs', label: 'Designs' },
    { id: 'skus', label: 'Top SKUs' },
    { id: 'opportunities', label: 'Opportunities' }
  ];

  const pieData = [
    { name: 'UK', value: data.summary.uk_units, color: COLORS.UK },
    { name: 'US', value: data.summary.us_units, color: COLORS.US }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">UK & US Sales Dashboard</h1>
            <p className="text-gray-500 mt-1">{dateRange} Performance Comparison</p>
          </div>
          <div className="flex gap-2 items-center">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Settings"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
              </svg>
            </button>
            <div className="bg-cyan-100 text-cyan-800 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
              <span className="w-2 h-2 bg-cyan-500 rounded-full"></span> UK
            </div>
            <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span> US
            </div>
          </div>
        </div>

        {/* Settings Modal */}
        {showSettings && (
          <div className="mb-6 bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold text-gray-800">Display Settings</h3>
              <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-gray-600">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            <div className="flex items-center gap-4">
              <label className="text-sm text-gray-600">Items per table:</label>
              <select
                value={displayLimit}
                onChange={(e) => setDisplayLimit(Number(e.target.value))}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={20}>20</option>
                <option value={25}>25</option>
              </select>
              <p className="text-xs text-gray-400">Applies to all tables and charts</p>
            </div>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
          <StatCard title="Total Units" value={formatNumber(data.summary.total_units)} subtitle="Combined" color="#1f2937" />
          <StatCard title="UK Units" value={formatNumber(data.summary.uk_units)} subtitle="£112,409 sales" color="#7c3aed" />
          <StatCard title="US Units" value={formatNumber(data.summary.us_units)} subtitle="$212,030 sales" color="#2563eb" />
          <StatCard title="Active SKUs" value={formatNumber(data.summary.unique_skus)} subtitle="Products" color="#9333ea" />
          <StatCard title="Devices" value={formatNumber(data.summary.unique_devices)} subtitle="Supported" color="#ea580c" />
          <StatCard title="Designs" value={formatNumber(data.summary.unique_designs)} subtitle="Unique" color="#db2777" />
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-2 mb-6 bg-white p-1 rounded-xl shadow-sm w-fit">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Territory Pie */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Units by Territory</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {pieData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={(value) => formatNumber(value)} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Territory Cards */}
            <div className="space-y-4">
              {data.territory.map(t => (
                <div key={t.country} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
                        style={{ backgroundColor: COLORS[t.country] }}>
                        {t.country}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800 text-lg">{t.country === 'UK' ? 'United Kingdom' : 'United States'}</p>
                        <p className="text-sm text-gray-400">{t.currency}</p>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-2xl font-bold" style={{ color: COLORS[t.country] }}>{formatNumber(t.units)}</p>
                      <p className="text-xs text-gray-500">Units Sold</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-2xl font-bold" style={{ color: COLORS[t.country] }}>{formatCurrency(t.sales, t.currency)}</p>
                      <p className="text-xs text-gray-500">Sales</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-2xl font-bold" style={{ color: COLORS[t.country] }}>{formatNumber(t.unique_skus)}</p>
                      <p className="text-xs text-gray-500">Active SKUs</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Top Product Types Comparison */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 lg:col-span-2">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Product Types: UK vs US Comparison</h3>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={data.product_types_comparison}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="product_type" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={formatNumber} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="UK" fill={COLORS.UK} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="US" fill={COLORS.US} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Products Tab */}
        {activeTab === 'products' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Product Types: UK vs US Units Sold</h3>
            <ResponsiveContainer width="100%" height={500}>
              <BarChart data={data.product_types_comparison} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tickFormatter={formatNumber} />
                <YAxis dataKey="product_type" type="category" width={80} tick={{ fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="UK" fill={COLORS.UK} radius={[0, 4, 4, 0]} stackId="a" />
                <Bar dataKey="US" fill={COLORS.US} radius={[0, 4, 4, 0]} stackId="a" />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div className="bg-cyan-50 rounded-lg p-3">
                <p className="font-semibold text-cyan-800">UK Top: HTPCR (2,050), HLBWH (1,301), HC (704)</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-3">
                <p className="font-semibold text-blue-800">US Top: HTPCR (4,372), HC (1,028), HLBWH (1,000)</p>
              </div>
            </div>
          </div>
        )}

        {/* Devices Tab */}
        {activeTab === 'devices' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Top 15 Devices: UK vs US Units Sold</h3>
            <ResponsiveContainer width="100%" height={550}>
              <BarChart data={data.devices_comparison} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tickFormatter={formatNumber} />
                <YAxis dataKey="device" type="category" width={100} tick={{ fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="UK" fill={COLORS.UK} radius={[0, 4, 4, 0]} stackId="a" />
                <Bar dataKey="US" fill={COLORS.US} radius={[0, 4, 4, 0]} stackId="a" />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div className="bg-cyan-50 rounded-lg p-3">
                <p className="font-semibold text-cyan-800">UK Strongest: IPH14 (292), IPH13 (265), IPH16 (240), IPH15 (238)</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-3">
                <p className="font-semibold text-blue-800">US Strongest: IPH17PMAX (528), IPH16 (416), IPH17 (381), IPH15 (372)</p>
              </div>
            </div>
          </div>
        )}

        {/* Designs Tab */}
        {activeTab === 'designs' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Design Parents: UK vs US</h3>
              <ResponsiveContainer width="100%" height={500}>
                <BarChart data={data.design_parents_comparison} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" tickFormatter={formatNumber} />
                  <YAxis dataKey="design_parent" type="category" width={90} tick={{ fontSize: 10 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="UK" fill={COLORS.UK} radius={[0, 4, 4, 0]} stackId="a" />
                  <Bar dataKey="US" fill={COLORS.US} radius={[0, 4, 4, 0]} stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Design Children: UK vs US</h3>
              <ResponsiveContainer width="100%" height={500}>
                <BarChart data={data.design_children_comparison} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" tickFormatter={formatNumber} />
                  <YAxis dataKey="design_child" type="category" width={110} tick={{ fontSize: 9 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="UK" fill={COLORS.UK} radius={[0, 4, 4, 0]} stackId="a" />
                  <Bar dataKey="US" fill={COLORS.US} radius={[0, 4, 4, 0]} stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="lg:col-span-2 grid grid-cols-2 gap-4">
              <div className="bg-cyan-50 rounded-lg p-4">
                <h4 className="font-semibold text-cyan-800 mb-2">🇬🇧 UK Top Designs</h4>
                <ul className="text-sm text-cyan-700 space-y-1">
                  <li>• LFCKIT25 (283) - Liverpool FC Kit</li>
                  <li>• AFCKIT25 (156) - Arsenal FC Kit</li>
                  <li>• NCFCCKT-HOM (114) - Newcastle FC</li>
                  <li>• LFCKIT25-LHOM (93) - Liverpool Leather</li>
                </ul>
              </div>
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="font-semibold text-blue-800 mb-2">🇺🇸 US Top Designs</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• NARUICO (361) - Naruto Icons</li>
                  <li>• PNUTSNF (258) - Peanuts Snoopy</li>
                  <li>• PNUTBOA (247) - Peanuts Boardwalk</li>
                  <li>• DRGBSUSC (243) - Dragon Ball</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Top SKUs Tab */}
        {activeTab === 'skus' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* UK Top SKUs Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🇬🇧</span>
                  <h3 className="text-lg font-semibold text-gray-800">UK Top SKUs</h3>
                </div>
                <button
                  onClick={() => exportToCSV(data.top_skus_uk || fallbackData.top_skus_uk, 'uk_top_skus', ['rank', 'sku', 'units', 'sales'])}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-cyan-600 hover:bg-cyan-50 rounded-lg transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  CSV
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-2 font-semibold text-gray-600">#</th>
                      <th className="text-left py-3 px-2 font-semibold text-gray-600">SKU</th>
                      <th className="text-right py-3 px-2 font-semibold text-cyan-600">Units</th>
                      <th className="text-right py-3 px-2 font-semibold text-cyan-600">Sales</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.top_skus_uk || fallbackData.top_skus_uk).slice(0, displayLimit).map((item) => (
                      <tr key={item.sku} className="border-b border-gray-100 hover:bg-cyan-50">
                        <td className="py-2 px-2">
                          <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${item.rank <= 3 ? 'bg-cyan-100 text-cyan-800' : 'bg-gray-100 text-gray-600'}`}>
                            {item.rank}
                          </span>
                        </td>
                        <td className="py-2 px-2 font-mono text-xs">{item.sku}</td>
                        <td className="py-2 px-2 text-right font-semibold text-cyan-600">{formatNumber(item.units)}</td>
                        <td className="py-2 px-2 text-right font-semibold text-cyan-700">£{formatNumber(item.sales)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-500">Showing top {Math.min(displayLimit, (data.top_skus_uk || fallbackData.top_skus_uk).length)} SKUs by units sold</p>
              </div>
            </div>

            {/* US Top SKUs Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🇺🇸</span>
                  <h3 className="text-lg font-semibold text-gray-800">US Top SKUs</h3>
                </div>
                <button
                  onClick={() => exportToCSV(data.top_skus_us || fallbackData.top_skus_us, 'us_top_skus', ['rank', 'sku', 'units', 'sales'])}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  CSV
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-2 font-semibold text-gray-600">#</th>
                      <th className="text-left py-3 px-2 font-semibold text-gray-600">SKU</th>
                      <th className="text-right py-3 px-2 font-semibold text-blue-600">Units</th>
                      <th className="text-right py-3 px-2 font-semibold text-blue-600">Sales</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.top_skus_us || fallbackData.top_skus_us).slice(0, displayLimit).map((item) => (
                      <tr key={item.sku} className="border-b border-gray-100 hover:bg-blue-50">
                        <td className="py-2 px-2">
                          <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${item.rank <= 3 ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'}`}>
                            {item.rank}
                          </span>
                        </td>
                        <td className="py-2 px-2 font-mono text-xs">{item.sku}</td>
                        <td className="py-2 px-2 text-right font-semibold text-blue-600">{formatNumber(item.units)}</td>
                        <td className="py-2 px-2 text-right font-semibold text-blue-700">${formatNumber(item.sales)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-500">Showing top {Math.min(displayLimit, (data.top_skus_us || fallbackData.top_skus_us).length)} SKUs by units sold</p>
              </div>
            </div>
          </div>
        )}

        {/* Opportunities Tab */}
        {activeTab === 'opportunities' && (
          <div className="space-y-6">
            {!data.opportunities ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
                <p className="text-4xl mb-4">📊</p>
                <p className="text-gray-500 text-lg">Upload an Amazon Business Report CSV to see opportunities.</p>
                <p className="text-gray-400 text-sm mt-2">Use the upload button above and select your Business Report export.</p>
              </div>
            ) : (
              <>
                {/* Section A: High Traffic, Low Conversion */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-1">High Traffic, Low Conversion</h3>
                  <p className="text-sm text-gray-500 mb-4">Sessions &ge; 500 &amp; Conversion Rate &lt; 3.0% — sorted by sessions descending</p>
                  {(() => {
                    const rows = data.opportunities
                      .filter(o => o.sessions >= 500 && o.unitSessionPct < 3.0)
                      .sort((a, b) => b.sessions - a.sessions)
                      .slice(0, 50);
                    return rows.length === 0 ? (
                      <p className="text-gray-400 text-sm">No items match this filter.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-gray-200">
                              <th className="text-left py-3 px-2 font-semibold text-gray-600">Child ASIN</th>
                              <th className="text-right py-3 px-2 font-semibold text-gray-600">Sessions</th>
                              <th className="text-right py-3 px-2 font-semibold text-gray-600">Conv. Rate</th>
                              <th className="text-right py-3 px-2 font-semibold text-gray-600">Units Ordered</th>
                              <th className="text-right py-3 px-2 font-semibold text-gray-600">Sales</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rows.map((item) => (
                              <tr key={item.childAsin} className="border-b border-gray-100 hover:bg-gray-50">
                                <td className="py-2 px-2">
                                  <a
                                    href={`https://www.amazon.com/dp/${item.childAsin}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline font-mono text-xs"
                                  >
                                    {item.childAsin}
                                  </a>
                                </td>
                                <td className="py-2 px-2 text-right">{formatNumber(item.sessions)}</td>
                                <td className="py-2 px-2 text-right font-semibold text-amber-600">{item.unitSessionPct.toFixed(2)}%</td>
                                <td className="py-2 px-2 text-right">{formatNumber(item.unitsOrdered)}</td>
                                <td className="py-2 px-2 text-right">${item.orderedSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  })()}
                </div>

                {/* Section B: Buy Box at Risk */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-1">Buy Box at Risk</h3>
                  <p className="text-sm text-gray-500 mb-4">Units Ordered &gt; 0 &amp; Buy Box % &lt; 80% — sorted by Buy Box % ascending</p>
                  {(() => {
                    const rows = data.opportunities
                      .filter(o => o.unitsOrdered > 0 && o.buyBoxPct < 80.0)
                      .sort((a, b) => a.buyBoxPct - b.buyBoxPct)
                      .slice(0, 50);
                    return rows.length === 0 ? (
                      <p className="text-gray-400 text-sm">No items match this filter.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-gray-200">
                              <th className="text-left py-3 px-2 font-semibold text-gray-600">Child ASIN</th>
                              <th className="text-right py-3 px-2 font-semibold text-gray-600">Buy Box %</th>
                              <th className="text-right py-3 px-2 font-semibold text-gray-600">Sessions</th>
                              <th className="text-right py-3 px-2 font-semibold text-gray-600">Units Ordered</th>
                              <th className="text-right py-3 px-2 font-semibold text-gray-600">Sales</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rows.map((item) => (
                              <tr key={item.childAsin} className="border-b border-gray-100 hover:bg-gray-50">
                                <td className="py-2 px-2">
                                  <a
                                    href={`https://www.amazon.com/dp/${item.childAsin}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline font-mono text-xs"
                                  >
                                    {item.childAsin}
                                  </a>
                                </td>
                                <td className="py-2 px-2 text-right font-semibold text-red-600">{item.buyBoxPct.toFixed(2)}%</td>
                                <td className="py-2 px-2 text-right">{formatNumber(item.sessions)}</td>
                                <td className="py-2 px-2 text-right">{formatNumber(item.unitsOrdered)}</td>
                                <td className="py-2 px-2 text-right">${item.orderedSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  })()}
                </div>
              </>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-gray-400 text-sm">
          Data Source: Amazon Business Reports • January 2026 • {formatNumber(data.summary.total_units)} total units across UK & US
        </div>
      </div>
    </div>
  );
}
