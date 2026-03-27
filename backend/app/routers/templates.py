"""Item Templates CRUD API — Feature 1.4."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import ItemTemplate

router = APIRouter(prefix="/api/templates", tags=["templates"])


@router.get("/")
def list_templates(db: Session = Depends(get_db)):
    return db.query(ItemTemplate).order_by(ItemTemplate.name).all()


@router.post("/")
def create_template(data: dict, db: Session = Depends(get_db)):
    tmpl = ItemTemplate(**data)
    db.add(tmpl)
    db.commit()
    db.refresh(tmpl)
    return tmpl


@router.put("/{template_id}")
def update_template(template_id: int, data: dict, db: Session = Depends(get_db)):
    tmpl = db.query(ItemTemplate).filter(ItemTemplate.id == template_id).first()
    if not tmpl:
        raise HTTPException(status_code=404, detail="Template not found")
    for k, v in data.items():
        if hasattr(tmpl, k) and k not in ("id", "created_at"):
            setattr(tmpl, k, v)
    db.commit()
    db.refresh(tmpl)
    return tmpl


@router.delete("/{template_id}")
def delete_template(template_id: int, db: Session = Depends(get_db)):
    tmpl = db.query(ItemTemplate).filter(ItemTemplate.id == template_id).first()
    if not tmpl:
        raise HTTPException(status_code=404, detail="Template not found")
    db.delete(tmpl)
    db.commit()
    return {"ok": True}
