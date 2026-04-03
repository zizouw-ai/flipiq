#!/bin/sh

# Create data directory if it doesn't exist (for Railway Volume)
mkdir -p /data

# Execute the main application command
exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
