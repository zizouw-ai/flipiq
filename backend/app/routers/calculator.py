"""Calculator API endpoints — all 5 pricing modes."""
import json
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Calculation
from app.schemas import (
    EncoreCostRequest, EbayFeesRequest,
    Mode1Request, Mode2Request, Mode3Request, Mode4Request, Mode5Request,
)
from app.calculators import (
    calculate_encore_cost, calculate_ebay_fees, EBAY_CATEGORIES,
    mode1_forward_pricing, mode2_reverse_lookup, mode3_lot_splitter,
    mode4_max_ad_spend, mode5_price_sensitivity,
)

router = APIRouter(prefix="/api/calculator", tags=["calculator"])


@router.get("/categories")
def get_categories():
    return EBAY_CATEGORIES


@router.post("/encore-cost")
def calc_encore_cost(req: EncoreCostRequest):
    return calculate_encore_cost(req.hammer_price, req.payment_method)


@router.post("/ebay-fees")
def calc_ebay_fees(req: EbayFeesRequest):
    return calculate_ebay_fees(
        req.sell_price, req.buyer_shipping_charge, req.fvf_pct,
        req.category, req.has_store, req.top_rated, req.below_standard,
        req.promoted_pct, req.insertion_fee,
    )


def _save_calculation(db: Session, mode: str, input_data: dict, output_data: dict):
    calc = Calculation(
        mode=mode,
        input_json=json.dumps(input_data),
        output_json=json.dumps(output_data),
    )
    db.add(calc)
    db.commit()


@router.post("/mode1")
def calc_mode1(req: Mode1Request, db: Session = Depends(get_db)):
    result = mode1_forward_pricing(**req.model_dump())
    _save_calculation(db, "forward", req.model_dump(), result)
    return result


@router.post("/mode2")
def calc_mode2(req: Mode2Request, db: Session = Depends(get_db)):
    result = mode2_reverse_lookup(**req.model_dump())
    _save_calculation(db, "reverse", req.model_dump(), result)
    return result


@router.post("/mode3")
def calc_mode3(req: Mode3Request, db: Session = Depends(get_db)):
    result = mode3_lot_splitter(**req.model_dump())
    _save_calculation(db, "lot_splitter", req.model_dump(), result)
    return result


@router.post("/mode4")
def calc_mode4(req: Mode4Request, db: Session = Depends(get_db)):
    result = mode4_max_ad_spend(**req.model_dump())
    _save_calculation(db, "max_ad_spend", req.model_dump(), result)
    return result


@router.post("/mode5")
def calc_mode5(req: Mode5Request, db: Session = Depends(get_db)):
    result = mode5_price_sensitivity(**req.model_dump())
    _save_calculation(db, "price_sensitivity", req.model_dump(), result)
    return result
