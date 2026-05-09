from sqlalchemy import Integer, String, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base


class CardTrait(Base):
    __tablename__ = "card_traits"

    card_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("cards.id"), primary_key=True
    )
    trait: Mapped[str] = mapped_column(String(50), primary_key=True)

    card: Mapped["Card"] = relationship("Card", back_populates="traits")
