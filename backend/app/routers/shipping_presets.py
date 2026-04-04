"""Shipping Presets CRUD API — Feature 1.3."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import ShippingPreset
from app.auth.jwt import require_auth
from app.models import User

router = APIRouter(prefix="/api/shipping-presets", tags=["shipping_presets"])


@router.get("/")
def list_presets(db: Session = Depends(get_db), current_user: User = Depends(require_auth)):
    return db.query(ShippingPreset).filter(
        (ShippingPreset.user_id == current_user.id) | (ShippingPreset.user_id.is_(None))
    ).order_by(ShippingPreset.is_default.desc()).all()


@router.post("/")
def create_preset(data: dict, db: Session = Depends(get_db), current_user: User = Depends(require_auth)):
    data["user_id"] = current_user.id
    preset = ShippingPreset(**data)
    db.add(preset)
    db.commit()
    db.refresh(preset)
    return preset


@router.put("/{preset_id}")
def update_preset(preset_id: int, data: dict, db: Session = Depends(get_db), current_user: User = Depends(require_auth)):
    preset = db.query(ShippingPreset).filter(
        ShippingPreset.id == preset_id,
        ShippingPreset.user_id == current_user.id
    ).first()
    if not preset:
        raise HTTPException(status_code=404, detail="Preset not found")
    for k, v in data.items():
        if hasattr(preset, k) and k not in ("id", "created_at"):
            setattr(preset, k, v)
    db.commit()
    db.refresh(preset)
    return preset


@router.delete("/{preset_id}")
def delete_preset(preset_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_auth)):
    preset = db.query(ShippingPreset).filter(
        ShippingPreset.id == preset_id,
        ShippingPreset.user_id == current_user.id
    ).first()
    if not preset:
        raise HTTPException(status_code=404, detail="Preset not found")
    db.delete(preset)
    db.commit()
    return {"ok": True}
