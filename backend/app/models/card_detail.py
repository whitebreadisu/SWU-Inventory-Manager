from sqlalchemy import Boolean, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class CardDetail(Base):
    __tablename__ = "card_details"

    card_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("cards.id"), primary_key=True
    )
    sub_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    cost: Mapped[int | None] = mapped_column(Integer, nullable=True)
    power: Mapped[int | None] = mapped_column(Integer, nullable=True)
    hp: Mapped[int | None] = mapped_column(Integer, nullable=True)
    # Valid values: Ground, Space
    arena: Mapped[str | None] = mapped_column(String(10), nullable=True)
    is_unique: Mapped[bool | None] = mapped_column(Boolean, nullable=True)

    card: Mapped["Card"] = relationship("Card", back_populates="detail")
