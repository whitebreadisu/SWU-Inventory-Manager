from sqlalchemy.orm import Session

from app.models.card_variant import CardVariant
from app.repositories import cards as card_repo
from app.schemas.card_schema import CardResponse


def _to_response(variant: CardVariant) -> CardResponse:
    base_card = variant.base_card
    return CardResponse(
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
    )


def get_cards(
    db: Session,
    set_code: str | None = None,
    variant_type: str | None = None,
    type: str | None = None,
    rarity: str | None = None,
) -> list[CardResponse]:
    variants = card_repo.get_variants(
        db, set_code=set_code, variant_type=variant_type, type=type, rarity=rarity
    )
    return [_to_response(v) for v in variants]


def get_card_by_id(db: Session, variant_id: int) -> CardResponse | None:
    variant = card_repo.get_variant_by_id(db, variant_id)
    if variant is None:
        return None
    return _to_response(variant)
