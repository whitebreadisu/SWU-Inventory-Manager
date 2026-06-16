from datetime import datetime

from sqlalchemy import Boolean, DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class CardSet(Base):
    __tablename__ = "sets"

    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(3), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    has_unique_variant_numbers: Mapped[bool] = mapped_column(Boolean, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )

    cards: Mapped[list["Card"]] = relationship("Card", back_populates="card_set")
