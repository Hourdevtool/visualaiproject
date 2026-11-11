import uuid
from enum import Enum
from datetime import datetime
from sqlmodel import Field ,SQLModel,Relationship
from typing import TYPE_CHECKING, List


if TYPE_CHECKING:
    from app.domains.project.model import Projects


class Role (str, Enum):
    USER = "user"
    ADMIN = "admin"

  
class Users (SQLModel, table = True):

    id:str = Field(default_factory=uuid.uuid4, primary_key=True)
    email : str  = Field(unique=True)
    username : str = Field(unique=True)
    profile : str | None = Field(default=None)
    permission : bool = Field(default=True)
    role : Role = Field(default=Role.USER)
    provider: str
    provider_id : str
    createat : datetime = Field(default_factory=datetime.now)
    updateat : datetime | None = Field(default=None)

    project : List["Projects"] = Relationship(back_populates="owner", sa_relationship_kwargs={"cascade": "all, delete-orphan"})

