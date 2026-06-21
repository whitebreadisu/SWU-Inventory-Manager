from pydantic import BaseModel


class CardResponse(BaseModel):
    id: int
    base_card_id: int
    set_id: int
    set_code: str
    base_card_number: str
    card_number: str
    name: str
    subtitle: str | None
    rarity: str
    type: str
    variant_type: str
    source_set_code: str
    swuapi_id: str
    front_image_url: str | None
    back_image_url: str | None
    stamp_group: str | None
    aspects: list[str]
    keywords: list[str]
    traits: list[str]
    cost: int | None
    power: int | None
    hp: int | None
    arena: str | None
    # Curated classification (SWU_Catalog_Redesign_Spec.md §10.2-10.5),
    # derived on read from variant_type + source_set_code via
    # app.ingestion.swuapi_classify.classify_variant -- the same function
    # ingestion uses, so there is one source of truth. Not stored columns.
    finish: str | None
    channel: str
    stamped: bool
