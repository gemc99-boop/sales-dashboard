import express from 'express';
import { BigQuery } from '@google-cloud/bigquery';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;

const PROJECT = process.env.GOOGLE_CLOUD_PROJECT || 'instant-contact-479316-i4';
const DATASET = process.env.BIGQUERY_DATASET || 'zero_dataset';
const TABLE = process.env.BIGQUERY_TABLE || 'orders';
const FULL_TABLE = `\`${PROJECT}.${DATASET}.${TABLE}\``;

const bigquery = new BigQuery({ projectId: PROJECT });

// ── 5-minute in-memory cache ──────────────────────────────────────────────────
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

function cacheGet(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL) { cache.delete(key); return null; }
  return entry.data;
}
function cacheSet(key, data) { cache.set(key, { ts: Date.now(), data }); }

async function bq(sql) {
  const [rows] = await bigquery.query({ query: sql, useLegacySql: false });
  return rows;
}

// ── Date helpers ──────────────────────────────────────────────────────────────
function dateClause(from, to) {
  if (from && to) return `PO_Date BETWEEN '${from}' AND '${to}'`;
  if (from)       return `PO_Date >= '${from}'`;
  if (to)         return `PO_Date <= '${to}'`;
  return '1=1';
}

// ── Channel classification SQL expression ────────────────────────────────────
// Returns a CASE expression for channel grouping
const CHANNEL_CASE = `
  CASE
    WHEN LOWER(Marketplace) LIKE '%amazon%' THEN 'Amazon'
    WHEN Marketplace IN ('e_cell','e_cell-usa','ecell_accessorize') THEN 'eBay'
    WHEN Marketplace IN ('head_case_designs','head_case_designs-us','Big Commerce') THEN 'Own Sites'
    WHEN LOWER(Marketplace) LIKE '%rakuten%' THEN 'Rakuten'
    WHEN LOWER(Marketplace) LIKE '%walmart%' THEN 'Walmart'
    WHEN Marketplace = 'B2B Orders' THEN 'B2B'
    ELSE 'Other'
  END
`;

// ── Territory classification SQL expression ───────────────────────────────────
const TERRITORY_CASE = `
  CASE
    WHEN Buyer_Country IN ('United States Of America','United States','USA') THEN 'US'
    WHEN Buyer_Country IN ('United Kingdom') THEN 'UK'
    WHEN Buyer_Country IN ('Germany','Italy','France','Austria','Belgium','Switzerland','Spain','Sweden','Netherlands','Luxembourg','Finland','Ireland','Portugal','Denmark','Norway','Poland','Czech Republic') THEN 'Europe'
    WHEN Buyer_Country IN ('Japan','JP') THEN 'Japan'
    ELSE 'ROW'
  END
`;

// ── Currency → USD conversion SQL expression ─────────────────────────────────
// Approximate FX rates (updated periodically)
const USD_CONVERSION = `
  CASE Currency
    WHEN 'USD' THEN SAFE_CAST(Net_Sale AS FLOAT64)
    WHEN 'GBP' THEN SAFE_CAST(Net_Sale AS FLOAT64) * 1.27
    WHEN 'EUR' THEN SAFE_CAST(Net_Sale AS FLOAT64) * 1.08
    WHEN 'JPY' THEN SAFE_CAST(Net_Sale AS FLOAT64) * 0.0067
    WHEN 'AUD' THEN SAFE_CAST(Net_Sale AS FLOAT64) * 0.65
    WHEN 'SEK' THEN SAFE_CAST(Net_Sale AS FLOAT64) * 0.095
    WHEN 'CHF' THEN SAFE_CAST(Net_Sale AS FLOAT64) * 1.12
    WHEN 'CAD' THEN SAFE_CAST(Net_Sale AS FLOAT64) * 0.74
    WHEN 'PLN' THEN SAFE_CAST(Net_Sale AS FLOAT64) * 0.25
    ELSE SAFE_CAST(Net_Sale AS FLOAT64)
  END
`;

// ── Custom Label parsing helpers ──────────────────────────────────────────────
// Custom_Label format: PRODUCTTYPE-DEVICE-DESIGNPARENT-DESIGNCHILD (variable parts)
// We parse: product_type = first segment, device = second segment

app.use(cors());
app.use(express.static(path.join(__dirname, 'dist')));

// ── /api/overview ─────────────────────────────────────────────────────────────
app.get('/api/overview', async (req, res) => {
  try {
    const { from, to } = req.query;
    const key = `overview:${from}:${to}`;
    const cached = cacheGet(key);
    if (cached) return res.json(cached);

    const where = dateClause(from, to);

    const sql = `
      SELECT
        COUNT(*) AS total_orders,
        SUM(SAFE_CAST(Quantity AS INT64)) AS total_units,
        SUM(CASE WHEN Is_Refunded != 'true' THEN ${USD_CONVERSION} ELSE 0 END) AS total_usd,
        COUNT(DISTINCT Custom_Label) AS unique_skus,
        COUNT(DISTINCT SPLIT(Custom_Label, '-')[SAFE_OFFSET(1)]) AS unique_devices,
        COUNT(DISTINCT CONCAT(
          SPLIT(Custom_Label, '-')[SAFE_OFFSET(2)], '-',
          IFNULL(SPLIT(Custom_Label, '-')[SAFE_OFFSET(3)], '')
        )) AS unique_designs,
        MIN(PO_Date) AS date_from,
        MAX(PO_Date) AS date_to
      FROM ${FULL_TABLE}
      WHERE ${where} AND Is_Refunded != 'true'
    `;

    const rows = await bq(sql);
    const result = rows[0] || {};
    cacheSet(key, result);
    res.json(result);
  } catch (err) {
    console.error('/api/overview error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── /api/channels ─────────────────────────────────────────────────────────────
app.get('/api/channels', async (req, res) => {
  try {
    const { from, to } = req.query;
    const key = `channels:${from}:${to}`;
    const cached = cacheGet(key);
    if (cached) return res.json(cached);

    const where = dateClause(from, to);

    const sql = `
      SELECT
        ${CHANNEL_CASE} AS channel,
        COUNT(*) AS orders,
        SUM(SAFE_CAST(Quantity AS INT64)) AS units,
        SUM(${USD_CONVERSION}) AS revenue_usd
      FROM ${FULL_TABLE}
      WHERE ${where} AND Is_Refunded != 'true'
      GROUP BY channel
      ORDER BY revenue_usd DESC
    `;

    const rows = await bq(sql);
    const total = rows.reduce((s, r) => s + (Number(r.revenue_usd) || 0), 0);
    const result = rows.map(r => ({
      ...r,
      revenue_usd: Math.round(Number(r.revenue_usd) || 0),
      units: Number(r.units) || 0,
      orders: Number(r.orders) || 0,
      pct: total > 0 ? +((Number(r.revenue_usd) / total) * 100).toFixed(1) : 0,
    }));
    cacheSet(key, result);
    res.json(result);
  } catch (err) {
    console.error('/api/channels error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── /api/territories ──────────────────────────────────────────────────────────
app.get('/api/territories', async (req, res) => {
  try {
    const { from, to } = req.query;
    const key = `territories:${from}:${to}`;
    const cached = cacheGet(key);
    if (cached) return res.json(cached);

    const where = dateClause(from, to);

    const sql = `
      SELECT
        ${TERRITORY_CASE} AS territory,
        SUM(SAFE_CAST(Quantity AS INT64)) AS units,
        SUM(${USD_CONVERSION}) AS revenue_usd,
        COUNT(DISTINCT Custom_Label) AS unique_skus
      FROM ${FULL_TABLE}
      WHERE ${where} AND Is_Refunded != 'true'
      GROUP BY territory
      ORDER BY revenue_usd DESC
    `;

    const rows = await bq(sql);
    const total_units = rows.reduce((s, r) => s + (Number(r.units) || 0), 0);
    const result = rows.map(r => ({
      ...r,
      units: Number(r.units) || 0,
      revenue_usd: Math.round(Number(r.revenue_usd) || 0),
      unique_skus: Number(r.unique_skus) || 0,
      pct: total_units > 0 ? +((Number(r.units) / total_units) * 100).toFixed(1) : 0,
    }));
    cacheSet(key, result);
    res.json(result);
  } catch (err) {
    console.error('/api/territories error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── /api/products ─────────────────────────────────────────────────────────────
app.get('/api/products', async (req, res) => {
  try {
    const { from, to, groupBy = 'type' } = req.query;
    const key = `products:${from}:${to}:${groupBy}`;
    const cached = cacheGet(key);
    if (cached) return res.json(cached);

    const where = dateClause(from, to);

    let groupExpr, labelField;
    if (groupBy === 'device') {
      groupExpr = `SPLIT(Custom_Label, '-')[SAFE_OFFSET(1)]`;
      labelField = 'device';
    } else if (groupBy === 'design') {
      groupExpr = `CONCAT(IFNULL(SPLIT(Custom_Label, '-')[SAFE_OFFSET(2)],''), IFNULL(CONCAT('-', SPLIT(Custom_Label, '-')[SAFE_OFFSET(3)]),''))`;
      labelField = 'design';
    } else if (groupBy === 'designParent') {
      groupExpr = `SPLIT(Custom_Label, '-')[SAFE_OFFSET(2)]`;
      labelField = 'design_parent';
    } else if (groupBy === 'designParentNamed') {
      // Join with headcase.tblLineups for readable names, prefixed with Brand
      const dpSql = `
        SELECT
          dp_code AS label,
          ${TERRITORY_CASE} AS territory,
          SUM(SAFE_CAST(o.Quantity AS INT64)) AS units
        FROM ${FULL_TABLE} o
        LEFT JOIN \`${PROJECT}.headcase.tblLineups\` l
          ON SPLIT(o.Custom_Label, '-')[SAFE_OFFSET(2)] = l.LineupLabel
        CROSS JOIN UNNEST([SPLIT(o.Custom_Label, '-')[SAFE_OFFSET(2)]]) AS dp_code
        WHERE ${where} AND o.Is_Refunded != 'true' AND o.Custom_Label IS NOT NULL
        GROUP BY label, territory
        ORDER BY SUM(SAFE_CAST(o.Quantity AS INT64)) DESC
      `;
      const dpRows = await bq(dpSql);
      const dpMap = new Map();
      for (const r of dpRows) {
        if (!r.label) continue;
        if (!dpMap.has(r.label)) dpMap.set(r.label, { design_parent: r.label, US: 0, UK: 0, Europe: 0, Japan: 0, ROW: 0, total: 0 });
        const entry = dpMap.get(r.label);
        const u = Number(r.units) || 0;
        entry[r.territory] = (entry[r.territory] || 0) + u;
        entry.total += u;
      }
      const dpResult = [...dpMap.values()].sort((a, b) => b.total - a.total).slice(0, 50);
      cacheSet(key, dpResult);
      return res.json(dpResult);
    } else if (groupBy === 'brand') {
      groupExpr = `Brand`;
      labelField = 'brand';
    } else {
      // type
      groupExpr = `SPLIT(Custom_Label, '-')[SAFE_OFFSET(0)]`;
      labelField = 'product_type';
    }

    const territoryOrder = `'US','UK','Europe','Japan','ROW'`;

    const sql = `
      SELECT
        ${groupExpr} AS label,
        ${TERRITORY_CASE} AS territory,
        SUM(SAFE_CAST(Quantity AS INT64)) AS units
      FROM ${FULL_TABLE}
      WHERE ${where} AND Is_Refunded != 'true' AND Custom_Label IS NOT NULL
      GROUP BY label, territory
      ORDER BY SUM(SAFE_CAST(Quantity AS INT64)) DESC
    `;

    const rows = await bq(sql);

    // Pivot: { label, US, UK, Europe, Japan, ROW, total }
    const map = new Map();
    for (const r of rows) {
      if (!r.label) continue;
      if (!map.has(r.label)) map.set(r.label, { [labelField]: r.label, US: 0, UK: 0, Europe: 0, Japan: 0, ROW: 0, total: 0 });
      const entry = map.get(r.label);
      const u = Number(r.units) || 0;
      entry[r.territory] = (entry[r.territory] || 0) + u;
      entry.total += u;
    }

    const result = [...map.values()]
      .sort((a, b) => b.total - a.total)
      .slice(0, 50);

    cacheSet(key, result);
    res.json(result);
  } catch (err) {
    console.error('/api/products error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── /api/top-skus ─────────────────────────────────────────────────────────────
app.get('/api/top-skus', async (req, res) => {
  try {
    const { from, to, limit = 50, territory } = req.query;
    const key = `top-skus:${from}:${to}:${limit}:${territory}`;
    const cached = cacheGet(key);
    if (cached) return res.json(cached);

    const where = dateClause(from, to);
    const territoryFilter = territory
      ? `AND (${TERRITORY_CASE}) = '${territory}'`
      : '';

    const sql = `
      SELECT
        Custom_Label AS sku,
        SUM(SAFE_CAST(Quantity AS INT64)) AS units,
        SUM(${USD_CONVERSION}) AS revenue_usd,
        ${TERRITORY_CASE} AS territory
      FROM ${FULL_TABLE}
      WHERE ${where} AND Is_Refunded != 'true' AND Custom_Label IS NOT NULL ${territoryFilter}
      GROUP BY sku, territory
      ORDER BY units DESC
      LIMIT ${parseInt(limit, 10)}
    `;

    const rows = await bq(sql);
    const result = rows.map((r, i) => ({
      rank: i + 1,
      sku: r.sku,
      territory: r.territory,
      units: Number(r.units) || 0,
      revenue_usd: Math.round(Number(r.revenue_usd) || 0),
    }));

    cacheSet(key, result);
    res.json(result);
  } catch (err) {
    console.error('/api/top-skus error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── SPA fallback ──────────────────────────────────────────────────────────────
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Sales Dashboard V2 running on port ${PORT}`);
  console.log(`BigQuery: ${PROJECT}.${DATASET}.${TABLE}`);
});
