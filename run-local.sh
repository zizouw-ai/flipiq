#!/bin/bash
# FlipIQ Local Development Runner
# Starts both backend and frontend without Docker

set -e

echo "=== FlipIQ Local Development ==="
echo "Starting backend and frontend..."
echo ""

# Check if Python and Node are installed
if ! command -v python3 &> /dev/null; then
    echo "Error: Python 3 is not installed"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "Error: npm is not installed"
    exit 1
fi

# Create data directory if needed
mkdir -p data

# Function to cleanup processes on exit
cleanup() {
    echo ""
    echo "Shutting down services..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
    exit 0
}
trap cleanup SIGINT SIGTERM

# Start Backend
echo "📦 Starting FastAPI backend on http://localhost:8000"
cd backend
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
fi
source venv/bin/activate
pip install -q -r requirements.txt
python -c "from app.database import init_db; init_db()" 2>/dev/null || true
python -m uvicorn app.main:app --reload --port 8000 &
BACKEND_PID=$!
cd ..

sleep 2

# Start Frontend
echo "⚛️  Starting React frontend on http://localhost:5173"
cd frontend
if [ ! -d "node_modules" ]; then
    echo "Installing npm dependencies..."
    npm install
fi
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "✅ Both services started!"
echo ""
echo "Backend: http://localhost:8000"
echo "Frontend: http://localhost:5173"
echo "API Docs: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop both services"
echo ""

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID
