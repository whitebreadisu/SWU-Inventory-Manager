from sqlalchemy.orm import Session

from app.models.card import Card
from app.repositories import cards as card_repo
from app.schemas.card_schema import CardResponse


def _to_response(card: Card) -> CardResponse:
    return CardResponse(
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
    )


def get_cards(
    db: Session,
    set_code: str | None = None,
    variant: str | None = None,
    type: str | None = None,
    rarity: str | None = None,
) -> list[CardResponse]:
    cards = card_repo.get_cards(
        db, set_code=set_code, variant=variant, type=type, rarity=rarity
    )
    return [_to_response(c) for c in cards]


def get_card_by_id(db: Session, card_id: int) -> CardResponse | None:
    card = card_repo.get_card_by_id(db, card_id)
    if card is None:
        return None
    return _to_response(card)
