from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.services import inventory as inventory_service
from app.schemas.inventory_schema import (
    CardWithInventoryResponse,
    DecrementResponse,
    IncrementResponse,
)

router = APIRouter(prefix="/api/inventory", tags=["inventory"])


@router.get("", response_model=list[CardWithInventoryResponse])
def list_inventory(db: Session = Depends(get_db)):
    return inventory_service.get_all_inventory(db)


@router.post("/{card_id}/increment", response_model=IncrementResponse)
def increment_card(card_id: int, db: Session = Depends(get_db)):
    result = inventory_service.increment_card(db, card_id)
    if result is None:
        raise HTTPException(status_code=404, detail=f"Card {card_id} not found")
    return result


@router.post("/{card_id}/decrement", response_model=DecrementResponse)
def decrement_card(card_id: int, db: Session = Depends(get_db)):
    result = inventory_service.decrement_card(db, card_id)
    if result is None:
        raise HTTPException(status_code=404, detail=f"Card {card_id} not found")
    return result
