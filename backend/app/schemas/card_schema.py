from pydantic import BaseModel


class CardResponse(BaseModel):
    id: int
    set_id: int
    set_code: str
    base_card_number: str
    card_number: str
    name: str
    rarity: str
    type: str
    is_foil: bool
    is_hyperspace: bool
    is_prestige: bool
    is_showcase: bool
    is_organized_play: bool
    aspects: list[str]
    keywords: list[str]
    traits: list[str]
    cost: int | None
    power: int | None
    hp: int | None
    arena: str | None
