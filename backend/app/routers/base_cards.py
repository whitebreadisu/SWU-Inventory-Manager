from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.base_card_detail_schema import BaseCardDetailResponse
from app.services import cards as card_service

router = APIRouter(prefix="/api/base-cards", tags=["base-cards"])


@router.get("/{base_card_id}", response_model=BaseCardDetailResponse)
def get_base_card(base_card_id: int, db: Session = Depends(get_db)):
    """Serves both the read-only card-detail popup and the editable
    card-inventory popup (SWU_Catalog_Redesign_Spec.md §5.3): one base card
    plus its full variant long tail, each variant carrying the curated
    finish/channel/stamped classification and the caller's tenant-scoped
    quantity (0 if none)."""
    result = card_service.get_base_card_detail(db, base_card_id)
    if result is None:
        raise HTTPException(
            status_code=404, detail=f"Base card {base_card_id} not found"
        )
    return result
