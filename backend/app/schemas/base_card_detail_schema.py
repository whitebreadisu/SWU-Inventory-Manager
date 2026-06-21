from pydantic import BaseModel


class CardVariantDetailResponse(BaseModel):
    """One printing of a base card, for the card detail / card-inventory
    popups (SWU_Catalog_Redesign_Spec.md §5.3). finish/channel/stamped are
    the same curated classification CardResponse exposes -- derived from
    variant_type + source_set_code via app.ingestion.swuapi_classify, not
    stored columns."""

    variant_id: int
    variant_type: str
    finish: str | None
    channel: str
    stamped: bool
    source_set_code: str
    source_set_name: str
    card_number: str
    front_image_url: str | None
    back_image_url: str | None
    stamp_group: str | None
    quantity: int


class BaseCardDetailResponse(BaseModel):
    id: int
    set_code: str
    set_name: str
    base_card_number: str
    name: str
    subtitle: str | None
    type: str
    type2: str | None
    double_sided: bool
    rarity: str
    cost: int | None
    power: int | None
    hp: int | None
    arena: str | None
    is_unique: bool | None
    front_text: str | None
    back_text: str | None
    epic_action: str | None
    artist: str | None
    is_token: bool
    aspects: list[str]
    keywords: list[str]
    traits: list[str]
    variants: list[CardVariantDetailResponse]
