"""Feature 1.7 — Multi-Currency Toggle with cached exchange rate."""
import time
import urllib.request
import json

_cache = {"rate": None, "timestamp": 0}
CACHE_TTL = 3600  # 1 hour


def get_cad_to_usd_rate() -> dict:
    """Fetch CAD→USD exchange rate from open.er-api.com, cached for 1 hour."""
    now = time.time()
    if _cache["rate"] and (now - _cache["timestamp"]) < CACHE_TTL:
        age_min = int((now - _cache["timestamp"]) / 60)
        return {"rate": _cache["rate"], "age_minutes": age_min, "cached": True}

    try:
        url = "https://open.er-api.com/v6/latest/CAD"
        req = urllib.request.Request(url, headers={"User-Agent": "FlipIQ/1.0"})
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode())
        rate = data["rates"]["USD"]
        _cache["rate"] = rate
        _cache["timestamp"] = now
        return {"rate": rate, "age_minutes": 0, "cached": False}
    except Exception:
        # Return last cached rate or fallback
        return {"rate": _cache["rate"] or 0.73, "age_minutes": -1, "cached": True, "error": "Failed to fetch rate"}


# FastAPI sub-router
from fastapi import APIRouter

router = APIRouter(prefix="/api/currency", tags=["currency"])


@router.get("/rate")
def get_rate():
    """Return current CAD→USD exchange rate."""
    info = get_cad_to_usd_rate()
    return {
        "cad_to_usd": info["rate"],
        "usd_to_cad": round(1 / info["rate"], 6) if info["rate"] else None,
        "age_minutes": info["age_minutes"],
        "cached": info["cached"],
    }
