# FlipIQ Local Development Guide

Complete guide for running FlipIQ locally with full authentication and all features.

## ✅ What's Working

| Feature | Status | Notes |
|---------|--------|-------|
| Pricing Calculator | ✅ | All 5 modes working |
| eBay Category Dropdown | ✅ | 13 categories loaded |
| Auction Tracker | ✅ | Create, edit, delete auctions |
| All Items Page | ✅ | Search, filter, pagination |
| Dashboard | ✅ | Charts and KPIs |
| Export to Excel | ✅ | Auction, Inventory, Dashboard, Tax |
| Settings | ✅ | All settings pages |
| Login/Register | ✅ | With Dev Mode for testing |
| JWT Authentication | ✅ | 24h access tokens |

---

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- Node.js 20+
- Git

### 1. Clone and Setup

```bash
git clone https://github.com/zizouw-ai/flipiq.git
cd flipiq
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment (recommended)
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set environment variable
export JWT_SECRET_KEY="your-dev-secret-key"  # On Windows: set JWT_SECRET_KEY=your-dev-secret-key

# Start backend server
uvicorn app.main:app --reload --port 8000
```

**Backend will be available at:** http://localhost:8000

**Test:** http://localhost:8000/health should return `{"status": "ok"}`

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Create environment file
echo "VITE_API_URL=http://localhost:8000" > .env

# Start frontend dev server
npm run dev
```

**Frontend will be available at:** http://localhost:5173

---

## 🔑 Authentication

### Option 1: Dev Mode (Recommended for Testing)
1. Open http://localhost:5173
2. Click **"Dev Mode (Skip Login)"**
3. All features work immediately without registration

### Option 2: Register New Account
1. Open http://localhost:5173
2. Click "Create one" to register
3. Fill in name, email, password
4. Login with credentials

### Option 3: Login Existing Account
1. Open http://localhost:5173
2. Enter email and password
3. Click "Sign In"

---

## 🧪 Testing Features

### Pricing Calculator
1. Go to **Calculator** page
2. Select eBay category from dropdown
3. Enter hammer price (e.g., $50)
4. Click **Calculate**
5. View profit calculations

### Auction Tracker
1. Go to **Auction Tracker** page
2. Click **"New Auction"**
3. Enter auction name and date
4. Save
5. Click on auction to add items

### All Items
1. Go to **All Items** page
2. Use search box to find items
3. Apply filters (status, category, date)
4. Click item to view details

### Export
1. Go to **Auction Tracker**
2. Click **"Export"** button on any auction
3. Excel file downloads automatically

### Dashboard
1. Go to **Dashboard** page
2. View profit charts
3. Filter by channel or date

---

## 🗄️ Database

**Location:** `backend/flipiq.db` (SQLite)

**Reset Database:**
```bash
cd backend
rm -f flipiq.db
# Restart backend to create fresh database
```

---

## 🔧 Environment Variables

### Backend
```bash
# Required
export JWT_SECRET_KEY="your-secret-key-min-32-chars"

# Optional (for Stripe testing)
export STRIPE_SECRET_KEY="sk_test_..."
export STRIPE_WEBHOOK_SECRET="whsec_..."
```

### Frontend
```bash
# In frontend/.env
VITE_API_URL=http://localhost:8000
```

---

## 🐛 Troubleshooting

### Backend won't start
```bash
# Check if port 8000 is in use
lsof -i :8000

# Kill existing processes
pkill -f uvicorn

# Try again
uvicorn app.main:app --reload --port 8000
```

### Frontend can't connect to backend
1. Check backend is running: http://localhost:8000/health
2. Verify `.env` file exists in frontend folder
3. Check `VITE_API_URL=http://localhost:8000`
4. Restart frontend: `npm run dev`

### Database errors
```bash
cd backend
rm -f flipiq.db
# Restart backend
```

### npm install fails
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

---

## 📁 Project Structure

```
flipiq/
├── backend/
│   ├── app/
│   │   ├── auth/          # JWT authentication
│   │   ├── billing/       # Stripe integration
│   │   ├── middleware/    # Usage limits
│   │   ├── routers/       # API endpoints
│   │   ├── main.py        # FastAPI entry point
│   │   └── models.py      # Database models
│   ├── tests/             # pytest suite
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── pages/         # React pages
│   │   ├── components/    # React components
│   │   ├── store/         # Zustand stores
│   │   ├── api.js         # API client
│   │   └── App.jsx        # Main app
│   └── package.json
└── railway.toml           # Railway deployment config
```

---

## 🧪 Running Tests

```bash
cd backend
python3 -m pytest tests/ -v
```

Expected: 173+ tests passing

---

## 🚢 Deployment to Railway

See `RAILWAY_DEPLOY.md` for production deployment instructions.

---

## 📚 Documentation

- `FLIPIQ_BRIEF.md` - Full project context and requirements
- `CHANGELOG.md` - Version history
- `PHASE3_SUMMARY.md` - Phase 3 implementation details
- `RAILWAY_DEPLOY.md` - Deployment guide

---

## 🤝 Support

- **Owner:** Ramzi (London, Ontario, Canada)
- **GitHub:** https://github.com/zizouw-ai/flipiq
- **Railway:** https://railway.app/project/097b446d-467d-45af-aaf5-e4de36054bec

---

**Happy reselling! 🚀**
