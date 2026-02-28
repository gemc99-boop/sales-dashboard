import React, { useState, useRef } from 'react';

const DataUpload = ({ onDataLoaded, onClose }) => {
    const [dragActive, setDragActive] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [dateRange, setDateRange] = useState('');
    const fileInputRef = useRef(null);

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const parseCSVLine = (line) => {
        const values = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (ch === '"') {
                inQuotes = !inQuotes;
            } else if (ch === ',' && !inQuotes) {
                values.push(current.trim());
                current = '';
            } else {
                current += ch;
            }
        }
        values.push(current.trim());
        return values;
    };

    const processCSV = (text, fileName) => {
        try {
            const lines = text.split('\n').filter(line => line.trim());
            if (lines.length < 2) {
                throw new Error('CSV must have header row and at least one data row');
            }

            const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().replace(/"/g, ''));

            // Detect Amazon Business Report format
            const isAmazonBizReport =
                headers.some(h => h.includes('(child) asin')) &&
                headers.some(h => h.includes('sessions - total'));

            if (isAmazonBizReport) {
                const findIdx = (patterns) =>
                    headers.findIndex(h => patterns.some(p => h.includes(p)));

                const parentAsinIdx = findIdx(['(parent) asin']);
                const childAsinIdx = findIdx(['(child) asin']);
                const sessionsIdx = findIdx(['sessions - total']);
                const unitSessionPctIdx = findIdx(['unit session percentage']);
                const buyBoxPctIdx = findIdx(['featured offer (buy box) percentage', 'buy box percentage']);
                const unitsOrderedIdx = findIdx(['units ordered']);
                const orderedSalesIdx = findIdx(['ordered product sales']);

                const parsePct = (s) => parseFloat(s.replace('%', '').trim()) || 0;
                const parseSales = (s) => parseFloat(s.replace(/[$,]/g, '').trim()) || 0;

                const opportunities = lines.slice(1).map(line => {
                    const values = parseCSVLine(line);
                    const getVal = (idx) => (idx >= 0 ? values[idx] || '' : '');
                    return {
                        parentAsin: getVal(parentAsinIdx),
                        childAsin: getVal(childAsinIdx),
                        sessions: parseInt(getVal(sessionsIdx)) || 0,
                        unitSessionPct: parsePct(getVal(unitSessionPctIdx)),
                        buyBoxPct: parsePct(getVal(buyBoxPctIdx)),
                        unitsOrdered: parseInt(getVal(unitsOrderedIdx)) || 0,
                        orderedSales: parseSales(getVal(orderedSalesIdx)),
                    };
                }).filter(row => row.childAsin);

                // Merge with existing stored data
                const existing = JSON.parse(localStorage.getItem('dashboardData') || '{}');
                const storedData = {
                    ...existing,
                    opportunities,
                    uploadedAt: new Date().toISOString(),
                };

                localStorage.setItem('dashboardData', JSON.stringify(storedData));
                setSuccess(`Successfully loaded ${opportunities.length} Amazon Business Report rows`);
                setError(null);

                if (onDataLoaded) {
                    onDataLoaded(storedData);
                }
            } else {
                const data = lines.slice(1).map(line => {
                    const values = parseCSVLine(line);
                    const row = {};
                    headers.forEach((h, i) => {
                        row[h] = values[i] || '';
                    });
                    return row;
                });

                // Aggregate data by territory, product type, device, design
                const aggregated = aggregateData(data, headers);

                // Store in localStorage
                const storedData = {
                    dateRange: dateRange || extractDateFromFileName(fileName),
                    uploadedAt: new Date().toISOString(),
                    ...aggregated
                };

                localStorage.setItem('dashboardData', JSON.stringify(storedData));
                setSuccess(`Successfully loaded ${data.length} rows`);
                setError(null);

                if (onDataLoaded) {
                    onDataLoaded(storedData);
                }
            }
        } catch (err) {
            setError(`Error parsing CSV: ${err.message}`);
            setSuccess(null);
        }
    };

    const extractDateFromFileName = (fileName) => {
        // Try to extract date from filename like "Sales_Jan2026.csv"
        const match = fileName.match(/([A-Za-z]+\d{4})/);
        return match ? match[1] : 'Custom Period';
    };

    const aggregateData = (rows, headers) => {
        // Detect column names (flexible matching)
        const findCol = (patterns) => headers.find(h => patterns.some(p => h.includes(p)));

        const countryCol = findCol(['country', 'territory', 'marketplace']);
        const unitsCol = findCol(['units', 'quantity', 'qty']);
        const salesCol = findCol(['sales', 'revenue', 'amount']);
        const productTypeCol = findCol(['product_type', 'producttype', 'type']);
        const deviceCol = findCol(['device', 'model']);
        const designParentCol = findCol(['design_parent', 'designparent', 'parent']);
        const designChildCol = findCol(['design_child', 'designchild', 'child', 'sku']);

        let ukUnits = 0, usUnits = 0, ukSales = 0, usSales = 0;
        const productTypes = {};
        const devices = {};
        const designParents = {};
        const designChildren = {};
        const skus = new Set();

        rows.forEach(row => {
            const country = (row[countryCol] || '').toUpperCase();
            const isUK = country.includes('UK') || country.includes('GB') || country.includes('UNITED KINGDOM');
            const isUS = country.includes('US') || country.includes('UNITED STATES') || country.includes('AMERICA');

            const units = parseInt(row[unitsCol]) || 1;
            const sales = parseFloat(row[salesCol]) || 0;

            if (isUK) {
                ukUnits += units;
                ukSales += sales;
            } else if (isUS) {
                usUnits += units;
                usSales += sales;
            }

            // Product types
            if (productTypeCol && row[productTypeCol]) {
                const pt = row[productTypeCol];
                if (!productTypes[pt]) productTypes[pt] = { UK: 0, US: 0 };
                if (isUK) productTypes[pt].UK += units;
                if (isUS) productTypes[pt].US += units;
            }

            // Devices
            if (deviceCol && row[deviceCol]) {
                const d = row[deviceCol];
                if (!devices[d]) devices[d] = { UK: 0, US: 0 };
                if (isUK) devices[d].UK += units;
                if (isUS) devices[d].US += units;
            }

            // Design parents
            if (designParentCol && row[designParentCol]) {
                const dp = row[designParentCol];
                if (!designParents[dp]) designParents[dp] = { UK: 0, US: 0 };
                if (isUK) designParents[dp].UK += units;
                if (isUS) designParents[dp].US += units;
            }

            // Design children
            if (designChildCol && row[designChildCol]) {
                const dc = row[designChildCol];
                if (!designChildren[dc]) designChildren[dc] = { UK: 0, US: 0 };
                if (isUK) designChildren[dc].UK += units;
                if (isUS) designChildren[dc].US += units;
                skus.add(dc);
            }
        });

        // Convert to array format sorted by total
        const toArray = (obj, keyName) =>
            Object.entries(obj)
                .map(([key, val]) => ({ [keyName]: key, UK: val.UK, US: val.US, total: val.UK + val.US }))
                .sort((a, b) => b.total - a.total)
                .slice(0, 15);

        return {
            summary: {
                total_units: ukUnits + usUnits,
                uk_units: ukUnits,
                us_units: usUnits,
                uk_sales: Math.round(ukSales),
                us_sales: Math.round(usSales),
                unique_skus: skus.size,
                unique_devices: Object.keys(devices).length,
                unique_designs: Object.keys(designParents).length
            },
            territory: [
                { country: 'UK', currency: 'GBP', units: ukUnits, sales: Math.round(ukSales), unique_skus: Math.round(skus.size * 0.4) },
                { country: 'US', currency: 'USD', units: usUnits, sales: Math.round(usSales), unique_skus: Math.round(skus.size * 0.6) }
            ],
            product_types_comparison: toArray(productTypes, 'product_type'),
            devices_comparison: toArray(devices, 'device'),
            design_parents_comparison: toArray(designParents, 'design_parent'),
            design_children_comparison: toArray(designChildren, 'design_child')
        };
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    const handleFile = (file) => {
        if (!file.name.endsWith('.csv')) {
            setError('Please upload a CSV file');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            processCSV(e.target.result, file.name);
        };
        reader.onerror = () => {
            setError('Error reading file');
        };
        reader.readAsText(file);
    };

    const handleInputChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
        }
    };

    const clearStoredData = () => {
        localStorage.removeItem('dashboardData');
        setSuccess('Stored data cleared. Using default data.');
        if (onDataLoaded) {
            onDataLoaded(null);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-800">📤 Upload Sales Data</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
                </div>

                {/* Date Range Input */}
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date Range Label</label>
                    <input
                        type="text"
                        value={dateRange}
                        onChange={(e) => setDateRange(e.target.value)}
                        placeholder="e.g., February 2026"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>

                {/* Drop Zone */}
                <div
                    className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                        }`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv"
                        onChange={handleInputChange}
                        className="hidden"
                    />
                    <div className="text-4xl mb-3">📁</div>
                    <p className="text-gray-600 mb-2">Drag & drop a CSV file here</p>
                    <p className="text-gray-400 text-sm">or click to browse</p>
                </div>

                {/* Status Messages */}
                {error && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                        ❌ {error}
                    </div>
                )}
                {success && (
                    <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                        ✅ {success}
                    </div>
                )}

                {/* Expected Format */}
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs font-medium text-gray-600 mb-1">Expected CSV columns:</p>
                    <p className="text-xs text-gray-500">
                        country/territory, units, sales, product_type, device, design_parent, design_child
                    </p>
                </div>

                {/* Actions */}
                <div className="mt-6 flex gap-3">
                    <button
                        onClick={clearStoredData}
                        className="flex-1 px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                    >
                        Reset to Default
                    </button>
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DataUpload;
