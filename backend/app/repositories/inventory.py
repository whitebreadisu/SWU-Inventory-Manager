from sqlalchemy import func
from sqlalchemy.orm import Session, selectinload
from app.models.card import Card
from app.models.inventory import Inventory


def get_cards_with_inventory(db: Session) -> list[Card]:
    return (
        db.query(Card)
        .options(
            selectinload(Card.card_set),
            selectinload(Card.aspects),
            selectinload(Card.keywords),
            selectinload(Card.traits),
            selectinload(Card.detail),
            selectinload(Card.inventory),
        )
        .order_by(Card.base_card_number, Card.card_number)
        .all()
    )


def get_card_with_inventory(db: Session, card_id: int) -> Card | None:
    return (
        db.query(Card)
        .options(
            selectinload(Card.card_set),
            selectinload(Card.aspects),
            selectinload(Card.keywords),
            selectinload(Card.traits),
            selectinload(Card.detail),
            selectinload(Card.inventory),
        )
        .filter(Card.id == card_id)
        .first()
    )


def get_base_card_total(db: Session, set_id: int, base_card_number: str) -> int:
    result = (
        db.query(func.sum(func.coalesce(Inventory.quantity, 0)))
        .select_from(Card)
        .outerjoin(Inventory, Card.id == Inventory.card_id)
        .filter(Card.set_id == set_id, Card.base_card_number == base_card_number)
        .scalar()
    )
    return int(result) if result is not None else 0


def upsert_increment(db: Session, card_id: int) -> Inventory:
    inv = db.query(Inventory).filter(Inventory.card_id == card_id).first()
    if inv is None:
        inv = Inventory(card_id=card_id, quantity=1)
        db.add(inv)
    else:
        inv.quantity += 1
    db.commit()
    db.refresh(inv)
    return inv


def upsert_decrement(db: Session, card_id: int) -> Inventory:
    inv = db.query(Inventory).filter(Inventory.card_id == card_id).first()
    if inv is None:
        inv = Inventory(card_id=card_id, quantity=0)
        db.add(inv)
    else:
        inv.quantity = max(0, inv.quantity - 1)
    db.commit()
    db.refresh(inv)
    return inv
