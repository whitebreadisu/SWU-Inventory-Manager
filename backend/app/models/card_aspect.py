from sqlalchemy import Integer, String, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base


class CardAspect(Base):
    __tablename__ = "card_aspects"

    card_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("cards.id"), primary_key=True
    )
    # Valid values: Heroism, Villainy, Cunning, Aggression, Command, Vigilance
    aspect: Mapped[str] = mapped_column(String(20), primary_key=True)

    card: Mapped["Card"] = relationship("Card", back_populates="aspects")
