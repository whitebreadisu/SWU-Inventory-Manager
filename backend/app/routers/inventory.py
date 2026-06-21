from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.inventory_schema import (
    CardWithInventoryResponse,
    DecrementResponse,
    IncrementResponse,
)
from app.services import inventory as inventory_service

router = APIRouter(prefix="/api/inventory", tags=["inventory"])


@router.get("", response_model=list[CardWithInventoryResponse])
def list_inventory(db: Session = Depends(get_db)):
    return inventory_service.get_all_inventory(db)


@router.post("/{variant_id}/increment", response_model=IncrementResponse)
def increment_card(variant_id: int, db: Session = Depends(get_db)):
    result = inventory_service.increment_card(db, variant_id)
    if result is None:
        raise HTTPException(status_code=404, detail=f"Card {variant_id} not found")
    return result


@router.post("/{variant_id}/decrement", response_model=DecrementResponse)
def decrement_card(variant_id: int, db: Session = Depends(get_db)):
    result = inventory_service.decrement_card(db, variant_id)
    if result is None:
        raise HTTPException(status_code=404, detail=f"Card {variant_id} not found")
    return result
