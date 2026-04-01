"""Product Profiles CRUD API — redesigned from Item Templates."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import ItemTemplate
from app.middleware.limits import check_template_permission, raise_http_error_from_limit_error
from app.routers.limits import get_current_user

router = APIRouter(prefix="/api/templates", tags=["profiles"])


@router.get("/")
def list_profiles(db: Session = Depends(get_db)):
    return db.query(ItemTemplate).order_by(ItemTemplate.name).all()


@router.post("/")
def create_profile(data: dict, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    # Check template permission before creating
    try:
        
        check_template_permission(current_user.plan)
    except Exception as e:
        if hasattr(e, "error_code"):
            raise_http_error_from_limit_error(e)
        else:
            raise
    
    # item_name is required
    item_name = (data.get("item_name") or "").strip()
    if not item_name:
        raise HTTPException(status_code=422, detail="item_name is required")
    # Use item_name as the legacy 'name' field if not provided
    if "name" not in data or not data["name"]:
        data["name"] = item_name
    # Validate profile_type
    if data.get("profile_type") not in (None, "auction", "fixed"):
        raise HTTPException(status_code=422, detail="profile_type must be 'auction' or 'fixed'")
    # Clear fixed_buy_price for auction profiles
    if data.get("profile_type", "auction") == "auction":
        data.pop("fixed_buy_price", None)
    tmpl = ItemTemplate(**data)
    db.add(tmpl)
    db.commit()
    db.refresh(tmpl)
    return tmpl


@router.put("/{profile_id}")
def update_profile(profile_id: int, data: dict, db: Session = Depends(get_db)):
    tmpl = db.query(ItemTemplate).filter(ItemTemplate.id == profile_id).first()
    if not tmpl:
        raise HTTPException(status_code=404, detail="Profile not found")
    for k, v in data.items():
        if hasattr(tmpl, k) and k not in ("id", "created_at"):
            setattr(tmpl, k, v)
    # Sync legacy name with item_name
    if "item_name" in data and data["item_name"]:
        tmpl.name = data["item_name"]
    db.commit()
    db.refresh(tmpl)
    return tmpl


@router.get("/{profile_id}")
def get_profile(profile_id: int, db: Session = Depends(get_db)):
    tmpl = db.query(ItemTemplate).filter(ItemTemplate.id == profile_id).first()
    if not tmpl:
        raise HTTPException(status_code=404, detail="Profile not found")
    return tmpl


@router.delete("/{profile_id}")
def delete_profile(profile_id: int, db: Session = Depends(get_db)):
    tmpl = db.query(ItemTemplate).filter(ItemTemplate.id == profile_id).first()
    if not tmpl:
        raise HTTPException(status_code=404, detail="Profile not found")
    db.delete(tmpl)
    db.commit()
    return {"ok": True}
