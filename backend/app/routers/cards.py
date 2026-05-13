from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.services import cards as card_service
from app.schemas.card_schema import CardResponse

router = APIRouter(prefix="/api/cards", tags=["cards"])


# NOTE: /lookup must be registered before /{card_id} when added in S3,
# otherwise FastAPI will try to parse "lookup" as an integer and 404.
@router.get("", response_model=list[CardResponse])
def list_cards(
    set_code: Optional[str] = Query(None),
    variant: Optional[str] = Query(None),
    type: Optional[str] = Query(None),
    rarity: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    return card_service.get_cards(db, set_code=set_code, variant=variant, type=type, rarity=rarity)


@router.get("/{card_id}", response_model=CardResponse)
def get_card(card_id: int, db: Session = Depends(get_db)):
    result = card_service.get_card_by_id(db, card_id)
    if result is None:
        raise HTTPException(status_code=404, detail=f"Card {card_id} not found")
    return result
