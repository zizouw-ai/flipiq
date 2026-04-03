#!/bin/sh

# Execute the main application command
exec uvicorn app.main:app --host 0.0.0.0 --port $PORT
