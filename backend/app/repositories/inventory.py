from sqlalchemy import func, text
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session, selectinload
from app.models.card import Card
from app.models.inventory import Inventory


def _current_tenant_id(db: Session) -> int:
    return db.execute(text("SELECT current_setting('app.current_tenant_id')::integer")).scalar()


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
    """Atomically insert-or-increment the (tenant_id, card_id) row in a
    single statement, relying on uq_inventory_tenant_id_card_id so
    concurrent increments for the same card can't lose an update."""
    tenant_id = _current_tenant_id(db)
    table = Inventory.__table__
    stmt = (
        pg_insert(table)
        .values(tenant_id=tenant_id, card_id=card_id, quantity=1)
        .on_conflict_do_update(
            index_elements=["tenant_id", "card_id"],
            set_={"quantity": table.c.quantity + 1, "updated_at": func.now()},
        )
        .returning(table)
    )
    row = db.execute(stmt).one()
    db.commit()
    return Inventory(**row._mapping)


def upsert_decrement(db: Session, card_id: int) -> Inventory:
    """Atomically insert-or-decrement (clamped at 0) the (tenant_id, card_id)
    row in a single statement, mirroring upsert_increment."""
    tenant_id = _current_tenant_id(db)
    table = Inventory.__table__
    stmt = (
        pg_insert(table)
        .values(tenant_id=tenant_id, card_id=card_id, quantity=0)
        .on_conflict_do_update(
            index_elements=["tenant_id", "card_id"],
            set_={"quantity": func.greatest(table.c.quantity - 1, 0), "updated_at": func.now()},
        )
        .returning(table)
    )
    row = db.execute(stmt).one()
    db.commit()
    return Inventory(**row._mapping)
