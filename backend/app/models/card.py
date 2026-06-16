from datetime import datetime

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class Card(Base):
    __tablename__ = "cards"
    __table_args__ = (
        UniqueConstraint(
            "set_id",
            "card_number",
            "is_foil",
            "is_organized_play",
            name="uq_cards_set_card_number_foil_op",
        ),
        CheckConstraint(
            "NOT is_showcase OR type = 'Leader'",
            name="ck_cards_showcase_leader_only",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    set_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("sets.id"), nullable=False, index=True
    )
    base_card_number: Mapped[str] = mapped_column(
        String(10), nullable=False, index=True
    )
    card_number: Mapped[str] = mapped_column(String(10), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    rarity: Mapped[str] = mapped_column(String(1), nullable=False)
    type: Mapped[str] = mapped_column(String(20), nullable=False)
    is_foil: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false"
    )
    is_hyperspace: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false"
    )
    is_prestige: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false"
    )
    is_showcase: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false"
    )
    is_organized_play: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )

    card_set: Mapped["CardSet"] = relationship("CardSet", back_populates="cards")
    inventory: Mapped["Inventory"] = relationship(
        "Inventory", back_populates="card", uselist=False
    )
    aspects: Mapped[list["CardAspect"]] = relationship(
        "CardAspect", back_populates="card"
    )
    keywords: Mapped[list["CardKeyword"]] = relationship(
        "CardKeyword", back_populates="card"
    )
    traits: Mapped[list["CardTrait"]] = relationship("CardTrait", back_populates="card")
    detail: Mapped["CardDetail"] = relationship(
        "CardDetail", back_populates="card", uselist=False
    )
