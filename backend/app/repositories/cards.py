from sqlalchemy.orm import Session, selectinload

from app.models.card import Card
from app.models.set_model import CardSet


def get_cards(
    db: Session,
    set_code: str | None = None,
    variant: str | None = None,
    type: str | None = None,
    rarity: str | None = None,
) -> list[Card]:
    q = db.query(Card).options(
        selectinload(Card.card_set),
        selectinload(Card.aspects),
        selectinload(Card.keywords),
        selectinload(Card.traits),
        selectinload(Card.detail),
    )
    if set_code:
        q = q.join(CardSet, Card.set_id == CardSet.id).filter(CardSet.code == set_code)
    if type:
        q = q.filter(Card.type == type)
    if rarity:
        q = q.filter(Card.rarity == rarity)
    if variant:
        q = _apply_variant_filter(q, variant)
    return q.order_by(Card.base_card_number, Card.card_number).all()


def get_card_by_id(db: Session, card_id: int) -> Card | None:
    return (
        db.query(Card)
        .options(
            selectinload(Card.card_set),
            selectinload(Card.aspects),
            selectinload(Card.keywords),
            selectinload(Card.traits),
            selectinload(Card.detail),
        )
        .filter(Card.id == card_id)
        .first()
    )


def _apply_variant_filter(q, variant: str):
    match variant.lower():
        case "foil":
            return q.filter(Card.is_foil == True)
        case "hyperspace":
            return q.filter(Card.is_hyperspace == True)
        case "prestige":
            return q.filter(Card.is_prestige == True)
        case "showcase":
            return q.filter(Card.is_showcase == True)
        case "organized_play":
            return q.filter(Card.is_organized_play == True)
        case "standard":
            return q.filter(
                Card.is_foil == False,
                Card.is_hyperspace == False,
                Card.is_prestige == False,
                Card.is_showcase == False,
                Card.is_organized_play == False,
            )
        case _:
            return q
