from sqlalchemy.orm import Session

from app.models.card_variant import CardVariant
from app.repositories import inventory as inventory_repo
from app.schemas.inventory_schema import (
    CardWithInventoryResponse,
    DecrementResponse,
    IncrementResponse,
)

PLAYSET_SIZE = 3
SINGLETON_TYPES = frozenset({"Leader", "Base"})


def _to_response(variant: CardVariant) -> CardWithInventoryResponse:
    base_card = variant.base_card
    qty = variant.inventory.quantity if variant.inventory else 0
    return CardWithInventoryResponse(
        id=variant.id,
        base_card_id=base_card.id,
        set_id=base_card.set_id,
        set_code=base_card.set.code,
        base_card_number=base_card.base_card_number,
        card_number=variant.card_number,
        name=base_card.name,
        subtitle=base_card.subtitle,
        rarity=base_card.rarity,
        type=base_card.type,
        variant_type=variant.variant_type,
        source_set_code=variant.source_set_code,
        swuapi_id=variant.swuapi_id,
        front_image_url=variant.front_image_url,
        back_image_url=variant.back_image_url,
        stamp_group=variant.stamp_group,
        aspects=[a.aspect for a in base_card.aspects],
        keywords=[k.keyword for k in base_card.keywords],
        traits=[t.trait for t in base_card.traits],
        cost=base_card.cost,
        power=base_card.power,
        hp=base_card.hp,
        arena=base_card.arena,
        quantity=qty,
    )


def get_all_inventory(db: Session) -> list[CardWithInventoryResponse]:
    variants = inventory_repo.get_variants_with_inventory(db)
    return [_to_response(v) for v in variants]


def increment_card(db: Session, variant_id: int) -> IncrementResponse | None:
    variant = inventory_repo.get_variant_with_inventory(db, variant_id)
    if variant is None:
        return None

    current_qty = variant.inventory.quantity if variant.inventory else 0

    if variant.base_card.type in SINGLETON_TYPES:
        # Leader/Base: each variant is capped at 1 copy independently
        if current_qty >= 1:
            return IncrementResponse(
                variant_id=variant_id,
                quantity=current_qty,
                blocked=True,
                reason="trade_sell",
            )
        inv = inventory_repo.upsert_increment(db, variant_id)
        return IncrementResponse(
            variant_id=variant_id,
            quantity=inv.quantity,
            playset_complete=True,
        )

    current_total = inventory_repo.get_base_card_total(db, variant.base_card_id)

    if current_total >= PLAYSET_SIZE:
        return IncrementResponse(
            variant_id=variant_id,
            quantity=current_qty,
            blocked=True,
            reason="trade_sell",
        )

    inv = inventory_repo.upsert_increment(db, variant_id)
    new_total = current_total + 1
    return IncrementResponse(
        variant_id=variant_id,
        quantity=inv.quantity,
        playset_complete=(new_total == PLAYSET_SIZE),
    )


def decrement_card(db: Session, variant_id: int) -> DecrementResponse | None:
    variant = inventory_repo.get_variant_with_inventory(db, variant_id)
    if variant is None:
        return None

    inv = inventory_repo.upsert_decrement(db, variant_id)
    return DecrementResponse(variant_id=variant_id, quantity=inv.quantity)
