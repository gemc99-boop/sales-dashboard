# Sales Dashboard V2 — BigQuery Live Data

## Current State
- V1 is live on Vercel (CSV-fed, UK+US only)
- Stack: Vite + React + Recharts + Tailwind

## V2 Requirements

### Data Source
- BigQuery project: `instant-contact-479316-i4`
- Table: `zero_dataset.orders`
- 2.8M orders, 2020–present
- Schema: PO_Date (DATE), Marketplace (STRING), Buyer_Country (STRING), Net_Sale (STRING), GBP_Price (STRING), Currency (STRING), Custom_Label (STRING/SKU), Brand (STRING), Product (STRING), Quantity (STRING), Is_Refunded (STRING)
- Auth: Application Default Credentials (gcloud auth already configured on this machine)

### New Features

1. **Date Range Selector**
   - Default: Last 30 days
   - Presets: 7d, 30d, 90d, YTD, 1Y, All Time
   - Custom date picker (from/to)
   - All views filter by selected range

2. **Territory View (replace UK vs US)**
   - Group countries into regions:
     - US: "United States Of America", "United States", "USA"
     - UK: "United Kingdom"
     - Europe: Germany, Italy, France, Austria, Belgium, Switzerland, Spain, Sweden, Netherlands, Luxembourg, Finland, Ireland + others
     - Japan: "Japan", "JP"
     - ROW: everything else
   - Pie chart + cards per region (like current UK/US layout but with 5 regions)

3. **Sales Channel View (NEW TAB)**
   - Bar chart: orders + revenue by Marketplace
   - Group similar channels:
     - Amazon (all Amazon variants)
     - eBay (e_cell, e_cell-usa, ecell_accessorize)
     - Own Sites (head_case_designs, head_case_designs-us, Big Commerce)
     - Rakuten
     - Walmart
     - B2B Orders
     - Other (Fanatics, CDiscount, Etsy, TikTok, etc.)
   - Show % of total for each channel

4. **Keep Existing Tabs**
   - Overview, Product Types, Devices, Designs, Top SKUs, Opportunities
   - But feed from BigQuery instead of CSV

### Architecture
- Add an Express/Node API server (or Next.js API routes) that queries BigQuery
- Frontend calls API with date range params
- Cache queries for 5 minutes to avoid cost
- Use @google-cloud/bigquery npm package
- Keep Vite + React frontend (don't migrate to Next.js — too risky for existing code)

### API Endpoints Needed
```
GET /api/overview?from=2025-01-01&to=2026-03-03
GET /api/channels?from=...&to=...
GET /api/territories?from=...&to=...
GET /api/products?from=...&to=...&groupBy=type|device|design|brand
GET /api/top-skus?from=...&to=...&limit=50
```

### Environment Variables
```
GOOGLE_CLOUD_PROJECT=instant-contact-479316-i4
BIGQUERY_DATASET=zero_dataset
BIGQUERY_TABLE=orders
PORT=8080
```

### Deployment
- Harry will deploy to Cloud Run
- Must serve both API + static frontend from single container
- Dockerfile: Node server that serves API + built Vite assets
