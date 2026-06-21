from sqlalchemy import func, text
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session, selectinload

from app.models.base_card import BaseCard
from app.models.card_variant import CardVariant
from app.models.inventory import Inventory


def _current_tenant_id(db: Session) -> int:
    return db.execute(
        text("SELECT current_setting('app.current_tenant_id')::integer")
    ).scalar()


def get_variants_with_inventory(db: Session) -> list[CardVariant]:
    return (
        db.query(CardVariant)
        .join(BaseCard, CardVariant.base_card_id == BaseCard.id)
        .options(
            selectinload(CardVariant.base_card).selectinload(BaseCard.set),
            selectinload(CardVariant.base_card).selectinload(BaseCard.aspects),
            selectinload(CardVariant.base_card).selectinload(BaseCard.keywords),
            selectinload(CardVariant.base_card).selectinload(BaseCard.traits),
            selectinload(CardVariant.inventory),
        )
        .order_by(BaseCard.base_card_number, CardVariant.card_number)
        .all()
    )


def get_variant_with_inventory(db: Session, variant_id: int) -> CardVariant | None:
    return (
        db.query(CardVariant)
        .options(
            selectinload(CardVariant.base_card).selectinload(BaseCard.set),
            selectinload(CardVariant.base_card).selectinload(BaseCard.aspects),
            selectinload(CardVariant.base_card).selectinload(BaseCard.keywords),
            selectinload(CardVariant.base_card).selectinload(BaseCard.traits),
            selectinload(CardVariant.inventory),
        )
        .filter(CardVariant.id == variant_id)
        .first()
    )


def get_base_card_total(db: Session, base_card_id: int) -> int:
    """Sum of inventory.quantity across every variant of one base card.
    Shared-pool cap for non-singleton types — ported 1:1 from the old
    set_id+base_card_number key; BL-24 will later replace this with
    independent per-variant caps, but that's its own backlog item, not
    part of this schema port."""
    result = (
        db.query(func.sum(func.coalesce(Inventory.quantity, 0)))
        .select_from(CardVariant)
        .outerjoin(Inventory, CardVariant.id == Inventory.variant_id)
        .filter(CardVariant.base_card_id == base_card_id)
        .scalar()
    )
    return int(result) if result is not None else 0


def upsert_increment(db: Session, variant_id: int) -> Inventory:
    """Atomically insert-or-increment the (tenant_id, variant_id) row in a
    single statement, relying on uq_inventory_tenant_id_variant_id so
    concurrent increments for the same variant can't lose an update."""
    tenant_id = _current_tenant_id(db)
    table = Inventory.__table__
    stmt = (
        pg_insert(table)
        .values(tenant_id=tenant_id, variant_id=variant_id, quantity=1)
        .on_conflict_do_update(
            index_elements=["tenant_id", "variant_id"],
            set_={"quantity": table.c.quantity + 1, "updated_at": func.now()},
        )
        .returning(table)
    )
    row = db.execute(stmt).one()
    db.commit()
    return Inventory(**row._mapping)


def upsert_decrement(db: Session, variant_id: int) -> Inventory:
    """Atomically insert-or-decrement (clamped at 0) the (tenant_id,
    variant_id) row in a single statement, mirroring upsert_increment."""
    tenant_id = _current_tenant_id(db)
    table = Inventory.__table__
    stmt = (
        pg_insert(table)
        .values(tenant_id=tenant_id, variant_id=variant_id, quantity=0)
        .on_conflict_do_update(
            index_elements=["tenant_id", "variant_id"],
            set_={
                "quantity": func.greatest(table.c.quantity - 1, 0),
                "updated_at": func.now(),
            },
        )
        .returning(table)
    )
    row = db.execute(stmt).one()
    db.commit()
    return Inventory(**row._mapping)
