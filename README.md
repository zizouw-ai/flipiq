# FlipIQ 💰

**eBay Reseller Profit & Pricing Calculator** — Built for Canadian sellers who buy from Encore Auctions (London, ON) and resell on eBay Canada.

![FlipIQ Screenshot](./screenshots/calculator.png)

---

## ✨ Features

### 🧮 5-Mode Pricing Calculator
- **Forward Pricing** — Enter your hammer price → get exact sell price for target profit
- **Reverse Lookup** — Enter sold price → see actual profit, ROI, and verdict
- **Lot Splitter** — Split lot buys into per-unit costs and pricing
- **Max Ad Spend** — Calculate maximum promoted listing % within your budget
- **Price Sensitivity** — Live slider showing profit/ROI across price range

### 🔨 Auction Tracker
- Log every Encore Auction session with items
- Track item status: Unlisted → Listed → Sold
- Auto-calculated buy costs using Encore's exact fee structure
- Full CRUD operations

### 📊 Profitability Dashboard
- 8 KPI cards (invested, revenue, profit, ROI, fees, sell-through rate...)
- 6 interactive charts (Recharts): monthly trends, ROI by category, fee breakdown, cumulative profit, and more
- Filter by date range, category, and auction name

### ⚙️ Persistent Settings
- Default FVF % per eBay category
- Payment method, store tier, Top Rated/Below Standard toggles
- All settings saved to SQLite and loaded on app start

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | FastAPI (Python) |
| Frontend | React + Vite |
| Styling | Tailwind CSS v4 |
| Charts | Recharts |
| Database | SQLite (SQLAlchemy ORM) |
| Tests | pytest |

---

## 🚀 Quick Start

### Prerequisites
- Python 3.9+
- Node.js 20+
- npm

### Setup

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/flipiq.git
cd flipiq

# Install backend dependencies
cd backend
pip3 install -r requirements.txt
cd ..

# Install frontend dependencies
cd frontend
npm install
cd ..

# Start both servers
chmod +x run.sh
./run.sh
```

Or start them separately:

```bash
# Terminal 1 — Backend
cd backend
uvicorn app.main:app --reload --port 8000

# Terminal 2 — Frontend
cd frontend
npm run dev
```

Then open **http://localhost:5173**

### Run Tests

```bash
cd backend
python3 -m pytest tests/ -v
```

---

## 📁 Project Structure

```
flipiq/
├── backend/
│   ├── app/
│   │   ├── main.py            # FastAPI entry point
│   │   ├── database.py        # SQLite + SQLAlchemy setup
│   │   ├── models.py          # DB models (4 tables)
│   │   ├── schemas.py         # Pydantic request/response models
│   │   ├── calculators.py     # Core calculation engine
│   │   └── routers/
│   │       ├── calculator.py  # 5 pricing mode endpoints
│   │       ├── auctions.py    # CRUD for auctions & items
│   │       ├── dashboard.py   # KPIs & chart data
│   │       └── settings.py    # User preferences
│   ├── tests/
│   │   └── test_flipiq.py     # 58 pytest tests
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Calculator.jsx
│   │   │   ├── AuctionTracker.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   └── Settings.jsx
│   │   ├── api.js
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── run.sh
├── .env.example
├── .gitignore
└── README.md
```

---

## 💡 Encore Auction Fee Structure

| Fee | Formula |
|-----|---------|
| Buyer's Premium | Hammer × 16% |
| Handling Fee | $1.50 per item |
| HST (Ontario) | Subtotal × 13% |
| Credit Card Surcharge | Total × 2% (if applicable) |

## 💡 eBay Canada Fee Structure

| Fee | Formula |
|-----|---------|
| Final Value Fee | (Sell Price + Shipping) × FVF% |
| Managed Payments | (Sell Price + Shipping) × 2.9% + $0.30 |
| Promoted Listing | Sell Price × Promoted% |
| Insertion Fee | $0.35 (if applicable) |

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

Built with ❤️ for the Canadian eBay reseller community.
