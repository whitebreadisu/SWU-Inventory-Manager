from pydantic import BaseModel, ConfigDict


class SetResponse(BaseModel):
    id: int
    code: str
    name: str
    has_unique_variant_numbers: bool

    model_config = ConfigDict(from_attributes=True)
