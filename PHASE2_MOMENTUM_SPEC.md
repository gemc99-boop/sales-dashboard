# Phase 2: Momentum Identifier

## Concept
Compare short-term velocity (7-14 day lookback) vs long-term baseline (60-90 day lookback) to surface items accelerating or decelerating. AI reasoning layer explains WHY.

## Core Metric: Momentum Score
```
daily_rate_short = units_last_14d / 14
daily_rate_long  = units_last_90d / 90
momentum_score   = ((daily_rate_short - daily_rate_long) / daily_rate_long) * 100

> +50% = 🔥 Surging
> +20% = 📈 Accelerating  
> -20% to +20% = ➡️ Steady
> -50% = 📉 Declining
> -50%+ = ❄️ Cooling
```

## Views (same hierarchy as main dashboard)
1. **By Brand (License)** — Which IPs are surging/cooling?
2. **By Product Type** — Snap cases vs wallets vs desk mats momentum
3. **By Device** — iPhone 16 Pro Max vs Galaxy S24 momentum
4. **By Design Parent** — Which lineups are breaking out?
5. **By Territory** — Regional momentum shifts
6. **By Channel** — Amazon vs eBay vs Own Sites velocity changes

## UI
- New "Momentum" tab in dashboard
- Configurable lookback windows (short: 7/14/21d, long: 30/60/90d)
- Table view: Item | Short Rate | Long Rate | Delta% | Trend Icon | Spark Line
- Sort by: Biggest gainers / Biggest losers / Volume
- Top 10 Gainers + Top 10 Losers summary cards
- Sparkline chart (last 90 days, daily) for each row

## AI Reasoning Layer
- After computing momentum scores, send top 10 gainers + top 10 losers to Gemini Flash
- Prompt: "Given these sales trends, explain likely causes and recommend actions"
- Context includes: brand, product type, season, recent launches
- Display AI analysis as a card below the table
- Cache AI reasoning for 24 hours (expensive, don't re-run every page load)

## BigQuery Queries
```sql
-- Short window (last 14 days)
SELECT [groupBy], SUM(CAST(Quantity AS INT64)) as units_short
FROM orders
WHERE PO_Date >= DATE_SUB(CURRENT_DATE(), INTERVAL 14 DAY)
GROUP BY 1

-- Long window (last 90 days)  
SELECT [groupBy], SUM(CAST(Quantity AS INT64)) as units_long
FROM orders
WHERE PO_Date >= DATE_SUB(CURRENT_DATE(), INTERVAL 90 DAY)
GROUP BY 1

-- JOIN and compute momentum
```

## API Endpoint
```
GET /api/momentum?groupBy=brand&shortDays=14&longDays=90&limit=50
GET /api/momentum/ai?groupBy=brand  (cached 24h)
```

## Dependencies
- BigQuery (existing)
- Gemini Flash API for AI reasoning (key in TOOLS.md)
- Recharts sparklines for mini charts

## Priority
Phase 2 — after V2 is live on Cloud Run and validated
