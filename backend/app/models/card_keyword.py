from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class CardKeyword(Base):
    __tablename__ = "card_keywords"

    card_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("cards.id"), primary_key=True
    )
    keyword: Mapped[str] = mapped_column(String(50), primary_key=True)

    card: Mapped["Card"] = relationship("Card", back_populates="keywords")
