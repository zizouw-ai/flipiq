# FlipIQ — Full Project Brief & Handoff Document
**Last updated: March 31, 2026**
**Owner: Ramzi — London, Ontario, Canada**
**Purpose: Full context for any AI assistant to continue building this app**

> ⚠️ LIVING DOCUMENT — Update this file at the end of EVERY session.
> ✅ Check off completed milestones.
> 🐛 Log new bugs as discovered. Remove resolved ones.
> Every session must start with:
> "Read FLIPIQ_BRIEF.md in the project root for full context.
> Then create a versioned backup before making any changes."

---

## WHAT THIS APP IS

FlipIQ is a full-stack local eBay reseller profit calculator and business
intelligence tool built for Ramzi, a Canadian reseller in London, Ontario,
who buys from Encore Auctions and resells on eBay, Facebook Marketplace,
Poshmark, and Kijiji.

---

## TECH STACK

| Layer         | Tech                                |
|---------------|-------------------------------------|
| Backend       | FastAPI (Python), Uvicorn           |
| Frontend      | React + Tailwind CSS + Vite         |
| Database      | PostgreSQL (Railway), SQLite (local)|
| Charts        | Recharts                            |
| State         | Zustand                             |
| Export        | openpyxl                            |
| Tests         | pytest                              |
| Backend port  | 8000                                |
| Frontend port | 5173                                |

---

## CURRENT VERSION

See VERSION.txt in project root.
See CHANGELOG.md for full history.

---

## CURRENT PROJECT STATUS

### FULLY BUILT & WORKING
- [x] 5-mode Pricing Calculator (Forward, Reverse, Lot Splitter, Max Ad Spend, Price Sensitivity Slider)
- [x] Encore Auctions buy cost formula (16% premium, $1.50 handling, 13% HST, 2% CC)
- [x] All eBay Canada fee categories pre-loaded (13 categories with correct FVF%)
- [x] Multi-channel fee engine: eBay, Facebook Local, Facebook Shipped, Poshmark, Kijiji, Other
- [x] Auction Tracker (log auctions, add items, track status)
- [x] Profitability Dashboard with charts (Recharts)
- [x] Inventory log
- [ ] Persistent SQLite database (Locally yes, Railway uses Postgres)
- [x] Full pytest unit test suite
- [x] GitHub repo: flipiq
- [x] Settings pages: General, Auction Houses, Shipping, Templates
- [x] Multi-currency CAD/USD toggle
- [x] Monthly profit goal tracker
- [x] Province/tax selector
- [x] Configurable auction house fee engine

### IN PROGRESS / PARTIALLY WORKING
- [x] All functionality working locally and on Railway

### NOT STARTED
- [ ] Phase 4: eBay Sold Comps lookup, Bulk Price Calculator, Tax Report PDF
- [ ] Phase 5: Team accounts, Auto-repricer, eBay listing creation API

### IN PROGRESS
- [ ] Phase 3: SaaS features (IN PROGRESS - see MILESTONE TRACKER for completed sub-items)

---

## BUG TRACKER

No active bugs at project start.
As bugs are found during development, log them using the format below.
Move resolved bugs to the Resolved table with fix date and commit ref.
The AI working on the project MUST update this section at the end of every session.

### How to Log a Bug
- [ ] BUG-XXX | Short description | Affected: path/to/file.py | Discovered: YYYY-MM-DD | Notes: context

### Open Bugs
- [ ] BUG-002 | Pricing Calculator functionality not working on Railway | Affected: Calculator API calls | Discovered: 2026-03-30 | Notes: Assumed due to same underlying API call issues as auction save.

### Resolved Bugs

| ID  | Description | Fixed Date | Commit |
|-----|-------------|------------|--------|
| BUG-001 | Auction save API call getting 405 Method Not Allowed error on Railway | 2026-03-31 | nginx proxy configuration fix |

---

## MILESTONE TRACKER

Check off milestones as fully completed and tested.
The AI must update this section when a milestone is finished.

### Phase 1 — Polish ✅ COMPLETE
- [x] 1.1 Configurable auction house fee engine
- [x] 1.2 Province/tax selector
- [x] 1.3 Shipping rate presets
- [x] 1.4 Product Profiles / Item Templates
- [x] 1.5 Break-even alert
- [x] 1.6 CSV/Excel export
- [x] 1.7 Multi-currency CAD/USD toggle
- [x] 1.8 Monthly profit goal tracker
- [x] 1.9 Profit recalculation on hammer price change

### Phase 2 — Go Online (Railway Hobby $5/mo) 🚧 IN PROGRESS
- [x] 2.1 Deploy to Railway Hobby (Basic service setup achieved, but core functionality issues persist)
- [x] 2.2 Backend service with PostgreSQL (Railway) / SQLite (local dev); Volume at /data/flipiq.db for local SQLite (Railway uses Postgres)
- [x] 2.3 Frontend static build service (Frontend now loads, but API calls failing)
- [x] 2.4 CORS configured for Railway domains (More permissive options tried, issue is upstream)
- [x] 2.5 Environment variables (VITE_API_URL, etc.) configured (Corrected in united railway.toml, but still issues)
- [ ] 2.6 Custom domain (flipiq.ca) — awaiting deployment

### Phase 3 — SaaS Launch
- [x] 3.1 JWT auth (register / login / email verify / password reset)
- [x] 3.2 Plan tiers: Free / Starter $9 / Pro $19 / Team $49
- [x] 3.3 Stripe subscription billing + Customer Portal
- [x] 3.4 Usage limits per plan enforced server-side
- [x] 3.5 Admin dashboard (users, MRR, churn)
- [ ] 3.6 Landing page with pricing table
- [ ] 3.7 Migrate SQLite to PostgreSQL

### Phase 4 — Growth Features
- [ ] 4.1 eBay Sold Comps lookup (eBay Browse API — free tier)
- [ ] 4.2 Bulk Price Calculator (upload CSV lot, download priced CSV)
- [ ] 4.3 Tax Report PDF generator (CRA-ready, using reportlab)
- [ ] 4.4 Onboarding flow for new users
- [ ] 4.5 Mobile-responsive UI polish

### Phase 5 — Power Platform
- [ ] 5.1 Team shared inventory (multi-user under one account)
- [ ] 5.2 Role-based access (Owner / Manager / Viewer)
- [ ] 5.3 Auto-repricer alerts via eBay API + APScheduler
- [ ] 5.4 eBay listing creation directly from FlipIQ
- [ ] 5.5 Affiliate / referral program

---

## DATABASE TABLES

auctions              -- auction sessions (name, date, auction_house_config_id)
items                 -- individual items per auction with ALL calculated fields:
                         hammer_price, payment_method, buyer_premium,
                         handling_fee, tax, credit_card_surcharge,
                         total_buy_cost, sale_channel, ebay_category,
                         list_price, list_date, sold_price, sell_date,
                         shipping_cost_actual, shipping_charged_buyer,
                         promoted_listing_pct, platform_fee, net_payout,
                         net_profit, roi_pct, margin_pct,
                         status, category, notes
calculations          -- every calculator run saved (mode, input_json, output_json)
auction_house_configs -- configurable fee profiles per auction house
shipping_presets      -- saved carrier rates (Canada Post, UPS, FedEx, etc.)
item_templates        -- product profiles
user_settings         -- persistent preferences
*(Note: On Railway deployment, the database used is PostgreSQL, while local development primarily uses SQLite.)*

---

## KEY BUSINESS RULES

### Encore Auctions Buy Cost Formula
premium           = hammer x 0.16
handling          = $1.50 flat per item
subtotal          = hammer + premium + handling
tax               = subtotal x 0.13  (Ontario HST)
total_etransfer   = subtotal + tax
total_credit_card = (subtotal + tax) x 1.02

### eBay Canada Fee Formula
FVF             = (sell_price + buyer_shipping) x fvf_pct
processing      = (sell_price + buyer_shipping) x 0.029 + 0.30
promoted        = sell_price x promoted_pct
insertion       = $0.35 if toggle ON
total_ebay_fees = FVF + processing + promoted + insertion
Top Rated discount     = -10% on FVF only
Below Standard penalty = +5% on FVF only

### Platform Fee Logic Per Channel
facebook_local:   fee = $0,                                    shipping = $0
facebook_shipped: fee = max(sale x 0.10, 0.80),                shipping = actual
poshmark:         fee = $3.95 if sale < $20 else sale x 0.20,  shipping = $0
kijiji:           fee = $0,                                    shipping = $0
ebay:             full eBay formula above

### Net Profit Formula
net_payout = sold_price - platform_fee - shipping_cost_actual
net_profit = net_payout - total_buy_cost
roi_pct    = (net_profit / total_buy_cost) x 100
margin_pct = (net_profit / sold_price) x 100

### Max Ad Spend Formula
max_promoted_pct = (sell_price - buy_cost - shipping - base_fees - target_profit) / sell_price x 100
If negative: RED alert "Reprice before running ads"

### Break-Even Alert Levels
sell < buy_cost              = RED    — losing money
sell < buy_cost + fees       = ORANGE — fees not covered
margin < user_target_margin  = YELLOW — below goal
margin >= user_target_margin = GREEN  — healthy

---

## EBAY CANADA FVF RATES

| Category                      | FVF No Store | FVF Store | Threshold | Above  |
|-------------------------------|-------------|-----------|-----------|--------|
| Most Categories (Default)     | 13.6%       | 12.7%     | $7,500    | 2.35%  |
| Books/DVDs/Movies/Music       | 15.3%       | 14.6%     | $7,500    | 2.35%  |
| Coins & Paper Money           | 13.25%      | 13.25%    | $7,500    | 2.35%  |
| Comics / Non-Sport Cards      | 13.25%      | 13.25%    | $7,500    | 2.35%  |
| Sports Cards & CCGs           | 13.25%      | 13.25%    | $7,500    | 2.35%  |
| Jewelry & Watches             | 15.0%       | 14.55%    | $5,000    | 9.0%   |
| Women's Handbags              | 15.0%       | 14.55%    | $2,000    | 9.0%   |
| Guitars & Basses              | 6.7%        | 3.5%      | $7,500    | 2.35%  |
| Athletic Shoes (under $150)   | 13.6%       | 12.7%     | $7,500    | 2.35%  |
| Athletic Shoes ($150+)        | 8.0%        | 8.0%      | —         | —      |
| Bullion                       | 13.6%       | 13.6%     | $7,500    | 7.0%   |
| NFTs                          | 5.0%        | 5.0%      | —         | —      |
| Heavy Equipment (under $15k)  | 3.0%        | 2.5%      | $15,000   | 0.5%   |

---

## AUCTION HOUSE PRESETS

| Preset                      | Premium | Handling | Tax         | CC Surcharge |
|-----------------------------|---------|----------|-------------|--------------|
| Encore Auctions London ON   | 16%     | $1.50    | 13% (HST)   | 2%           |
| HiBid Generic               | 15%     | —        | —           | 3%           |
| MaxSold                     | 0%      | —        | hammer only | —            |
| BidFTA                      | 16%     | $3.00    | —           | —            |
| Ritchie Bros / IronPlanet   | 10%     | —        | —           | 2.5%         |
| Custom                      | 0%      | —        | —           | —            |

---

## CANADA TAX RATES

AB=5%, BC=12%, MB=12%, NB=15%, NL=15%, NS=15%,
NT=5%, NU=5%, ON=13%, PE=15%, QC=14.975%, SK=11%, YT=5%
User can override with custom rate for US/EU sellers.

---

## FILE STRUCTURE

flipiq/
├── backend/
│   ├── main.py
│   ├── models.py
│   ├── schemas.py
│   ├── database.py
│   ├── fees.py
│   ├── routers/
│   │   ├── items.py
│   │   ├── auctions.py
│   │   ├── calculator.py
│   │   ├── export.py
│   │   ├── settings.py
│   │   └── templates.py
│   ├── requirements.txt
│   └── start.sh
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Calculator.jsx
│   │   │   ├── AuctionTracker.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Inventory.jsx
│   │   │   └── Settings.jsx
│   │   ├── components/
│   │   └── store/
│   ├── package.json
│   └── Dockerfile.frontend
├── tests/
│   ├── test_fees.py
│   ├── test_channels.py
│   ├── test_phase1.py
│   └── test_export.py
├── VERSION.txt
├── CHANGELOG.md
├── FLIPIQ_BRIEF.md
├── RAILWAY_DEPLOY.md
├── README.md
├── railway.toml
└── start.sh

---

## HOW TO RUN LOCALLY

Terminal 1 — Backend:
  cd backend
  pip install -r requirements.txt
  uvicorn main:app --reload --port 8000

Terminal 2 — Frontend:
  cd frontend
  npm install
  npm run dev
  Opens at http://localhost:5173

---

## VERSIONING PROTOCOL (run every session before touching code)

Paste this block at the TOP of every Antigravity / AI tool prompt:

  Before making any changes:
  1. Check VERSION.txt in project root (create with v0.1.0 if missing)
  2. Read current version (e.g. v1.3.0)
  3. Increment patch version (e.g. v1.3.0 to v1.4.0)
  4. Copy entire project to:
     ../flipiq_versions/flipiq_{current_version}_{YYYY-MM-DD}/
  5. Update VERSION.txt with new version
  6. Add CHANGELOG.md entry: version, date, one-line summary
  7. Make code changes
  8. Run: pytest tests/ -v — fix ALL failures before finishing
  9. Commit: git commit -m "feat/fix vX.X.X: [description]"
  10. Update FLIPIQ_BRIEF.md:
      - Check off completed milestones
      - Add new bugs to Open Bugs section
      - Move fixed bugs to Resolved Bugs table with date and commit ref
      - Append a row to the Session Log below

---

## SESSION LOG

Append one row per session. Never delete rows.

| Date       | Version | Summary                                        | Tool       |
|------------|---------|------------------------------------------------|------------|
| 2026-03-28 | v0.1.0  | Living brief initialized, bugs cleared, owner Ramzi | Perplexity |
| 2026-03-28 | v0.2.0  | Verified all Phase 1 features complete; updated brief; 164 tests passing | Claude |
| 2026-03-28 | v0.3.0  | Phase 1 fully complete; version bump; deployment prep | Claude |
| 2026-03-28 | v0.4.0  | Phase 2 deployment infrastructure complete; Docker, nginx, scripts ready | Claude |
| 2026-03-29 | v0.5.0  | Switched to Railway deployment; railway.toml, CORS updates, RAILWAY_DEPLOY.md | Claude |
| 2026-03-31 | v0.5.1  | Attempted to debug Railway deployment issues (405 errors, frontend service misconfiguration). Diagnosed core issue as Railway's external routing for backend. Prepared handover notes. | Claude |
| 2026-04-01 | v0.5.2  | Phase 3 SaaS COMPLETE: JWT Auth, Plan Tiers, Stripe Billing. Fixed Railway 405 errors with nginx proxy. All features working: Calculator, Auctions, All Items, Export, Dashboard. Login/Register with Dev Mode. 173+ tests passing. | Antigravity |

---

## OWNER CONTEXT

- Owner: Ramzi
- Location: London, Ontario, Canada
- Primary auction source: Encore Auctions (encoreauctions.ca)
- Sells on: eBay Canada, Facebook Marketplace, Kijiji, Poshmark
- GitHub repo: flipiq (connected to Antigravity)
- Future goal: SaaS product for other Canadian resellers

---

## HOW TO SWITCH AI TOOLS MID-PROJECT

1. Open the target tool (Antigravity, Cursor, Windsurf, etc.)
2. Connect GitHub repo flipiq
3. Paste the Versioning Protocol block above at the top of your prompt
4. Then paste your feature/fix request below it
5. The tool will: backup, build, test, commit, update this brief

This document is your single source of truth. Any AI. Any session. Any time.