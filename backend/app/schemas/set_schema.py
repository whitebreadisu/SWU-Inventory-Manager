from pydantic import BaseModel, ConfigDict


class SetResponse(BaseModel):
    id: int
    code: str
    name: str
    is_base_set: bool

    model_config = ConfigDict(from_attributes=True)
