"""Settings API — user preferences stored in SQLite."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import UserSetting
from app.schemas import SettingUpdate, SettingResponse

router = APIRouter(prefix="/api/settings", tags=["settings"])

DEFAULT_SETTINGS = {
    "default_fvf_pct": "13.25",
    "default_target_profit_pct": "30",
    "default_payment_method": "etransfer",
    "default_buyer_shipping": "free",
    "store_tier": "none",
    "top_rated_seller": "false",
    "below_standard": "false",
    "currency": "CAD",
    "default_promoted_pct": "0",
    "province": "ON",
    "monthly_profit_goal_cad": "0",
    "default_target_margin_pct": "30",
}


@router.get("/", response_model=list[SettingResponse])
def get_all_settings(db: Session = Depends(get_db)):
    settings = db.query(UserSetting).all()
    # Ensure defaults exist
    existing_keys = {s.key for s in settings}
    for k, v in DEFAULT_SETTINGS.items():
        if k not in existing_keys:
            s = UserSetting(key=k, value=v)
            db.add(s)
            settings.append(s)
    db.commit()
    return db.query(UserSetting).all()


@router.get("/{key}")
def get_setting(key: str, db: Session = Depends(get_db)):
    setting = db.query(UserSetting).filter(UserSetting.key == key).first()
    if setting:
        return {"key": setting.key, "value": setting.value}
    # Return default if exists
    if key in DEFAULT_SETTINGS:
        return {"key": key, "value": DEFAULT_SETTINGS[key]}
    return {"key": key, "value": None}


@router.put("/")
def update_setting(req: SettingUpdate, db: Session = Depends(get_db)):
    setting = db.query(UserSetting).filter(UserSetting.key == req.key).first()
    if setting:
        setting.value = req.value
    else:
        setting = UserSetting(key=req.key, value=req.value)
        db.add(setting)
    db.commit()
    return {"key": req.key, "value": req.value}


@router.put("/bulk")
def update_settings_bulk(settings: list[SettingUpdate], db: Session = Depends(get_db)):
    results = []
    for req in settings:
        setting = db.query(UserSetting).filter(UserSetting.key == req.key).first()
        if setting:
            setting.value = req.value
        else:
            setting = UserSetting(key=req.key, value=req.value)
            db.add(setting)
        results.append({"key": req.key, "value": req.value})
    db.commit()
    return results
