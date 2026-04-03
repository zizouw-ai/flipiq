# Railway Procfile - defines process types
# This file is used if not deploying via Docker

web: uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
