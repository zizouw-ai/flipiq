#!/bin/bash
# FlipIQ — Start both backend and frontend servers

echo "🚀 Starting FlipIQ..."
echo ""

# Start backend
echo "📦 Starting FastAPI backend on port 8000..."
cd "$(dirname "$0")/backend" || exit
pip3 install -r requirements.txt -q 2>/dev/null
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

# Start frontend
echo "⚡ Starting React frontend on port 5173..."
cd "$(dirname "$0")/frontend" || exit
npm install --silent 2>/dev/null
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ FlipIQ is running!"
echo "   Frontend: http://localhost:5173"
echo "   Backend:  http://localhost:8000"
echo "   API Docs: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop both servers."

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo ''; echo '👋 FlipIQ stopped.'; exit 0" SIGINT SIGTERM

wait
