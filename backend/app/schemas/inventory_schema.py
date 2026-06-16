from pydantic import BaseModel

from app.schemas.card_schema import CardResponse


class CardWithInventoryResponse(CardResponse):
    quantity: int


class IncrementResponse(BaseModel):
    card_id: int
    quantity: int
    playset_complete: bool = False
    blocked: bool = False
    reason: str | None = None


class DecrementResponse(BaseModel):
    card_id: int
    quantity: int
