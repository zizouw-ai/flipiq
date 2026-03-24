"""FastAPI main application entry point for FlipIQ."""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import init_db
from app.routers import calculator, auctions, dashboard, settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="FlipIQ",
    description="eBay Reseller Profit & Pricing Calculator API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(calculator.router)
app.include_router(auctions.router)
app.include_router(dashboard.router)
app.include_router(settings.router)


@app.get("/")
def root():
    return {"app": "FlipIQ", "version": "1.0.0", "status": "running"}
