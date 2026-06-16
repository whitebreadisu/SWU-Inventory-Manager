from sqlalchemy.orm import Session

from app.models.card import Card
from app.repositories import inventory as inventory_repo
from app.schemas.inventory_schema import (
    CardWithInventoryResponse,
    DecrementResponse,
    IncrementResponse,
)

PLAYSET_SIZE = 3
SINGLETON_TYPES = frozenset({"Leader", "Base"})


def _to_response(card: Card) -> CardWithInventoryResponse:
    qty = card.inventory.quantity if card.inventory else 0
    return CardWithInventoryResponse(
        id=card.id,
        set_id=card.set_id,
        set_code=card.card_set.code,
        base_card_number=card.base_card_number,
        card_number=card.card_number,
        name=card.name,
        rarity=card.rarity,
        type=card.type,
        is_foil=card.is_foil,
        is_hyperspace=card.is_hyperspace,
        is_prestige=card.is_prestige,
        is_showcase=card.is_showcase,
        is_organized_play=card.is_organized_play,
        aspects=[a.aspect for a in card.aspects],
        keywords=[k.keyword for k in card.keywords],
        traits=[t.trait for t in card.traits],
        cost=card.detail.cost if card.detail else None,
        power=card.detail.power if card.detail else None,
        hp=card.detail.hp if card.detail else None,
        arena=card.detail.arena if card.detail else None,
        quantity=qty,
    )


def get_all_inventory(db: Session) -> list[CardWithInventoryResponse]:
    cards = inventory_repo.get_cards_with_inventory(db)
    return [_to_response(c) for c in cards]


def increment_card(db: Session, card_id: int) -> IncrementResponse | None:
    card = inventory_repo.get_card_with_inventory(db, card_id)
    if card is None:
        return None

    current_qty = card.inventory.quantity if card.inventory else 0

    if card.type in SINGLETON_TYPES:
        # Leader/Base: each variant is capped at 1 copy independently
        if current_qty >= 1:
            return IncrementResponse(
                card_id=card_id,
                quantity=current_qty,
                blocked=True,
                reason="trade_sell",
            )
        inv = inventory_repo.upsert_increment(db, card_id)
        return IncrementResponse(
            card_id=card_id,
            quantity=inv.quantity,
            playset_complete=True,
        )

    current_total = inventory_repo.get_base_card_total(
        db, card.set_id, card.base_card_number
    )

    if current_total >= PLAYSET_SIZE:
        return IncrementResponse(
            card_id=card_id,
            quantity=current_qty,
            blocked=True,
            reason="trade_sell",
        )

    inv = inventory_repo.upsert_increment(db, card_id)
    new_total = current_total + 1
    return IncrementResponse(
        card_id=card_id,
        quantity=inv.quantity,
        playset_complete=(new_total == PLAYSET_SIZE),
    )


def decrement_card(db: Session, card_id: int) -> DecrementResponse | None:
    card = inventory_repo.get_card_with_inventory(db, card_id)
    if card is None:
        return None

    inv = inventory_repo.upsert_decrement(db, card_id)
    return DecrementResponse(card_id=card_id, quantity=inv.quantity)
