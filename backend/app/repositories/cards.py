from sqlalchemy.orm import Session, selectinload

from app.models.base_card import BaseCard
from app.models.card_variant import CardVariant
from app.models.set_model import CardSet


def get_variants(
    db: Session,
    set_code: str | None = None,
    variant_type: str | None = None,
    type: str | None = None,
    rarity: str | None = None,
) -> list[CardVariant]:
    """Returns card_variants flattened with their base card's shared data
    eager-loaded. set_code filters on the base card's own (base) set —
    the base/long-tail provenance toggle (redesign spec §5.1/§5.2) is a
    later UI step, not part of this CRUD-level port."""
    q = (
        db.query(CardVariant)
        .join(BaseCard, CardVariant.base_card_id == BaseCard.id)
        .options(
            selectinload(CardVariant.base_card).selectinload(BaseCard.set),
            selectinload(CardVariant.base_card).selectinload(BaseCard.aspects),
            selectinload(CardVariant.base_card).selectinload(BaseCard.keywords),
            selectinload(CardVariant.base_card).selectinload(BaseCard.traits),
        )
    )
    if set_code:
        q = q.join(CardSet, BaseCard.set_id == CardSet.id).filter(
            CardSet.code == set_code
        )
    if type:
        q = q.filter(BaseCard.type == type)
    if rarity:
        q = q.filter(BaseCard.rarity == rarity)
    if variant_type:
        q = q.filter(CardVariant.variant_type == variant_type)
    return q.order_by(BaseCard.base_card_number, CardVariant.card_number).all()


def get_variant_by_id(db: Session, variant_id: int) -> CardVariant | None:
    return (
        db.query(CardVariant)
        .options(
            selectinload(CardVariant.base_card).selectinload(BaseCard.set),
            selectinload(CardVariant.base_card).selectinload(BaseCard.aspects),
            selectinload(CardVariant.base_card).selectinload(BaseCard.keywords),
            selectinload(CardVariant.base_card).selectinload(BaseCard.traits),
        )
        .filter(CardVariant.id == variant_id)
        .first()
    )
