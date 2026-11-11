import uuid
from datetime import datetime
from sqlmodel import Field, SQLModel, JSON, Column

class SystemLogs(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    user_id: str | None = Field(default=None) # can be null if system action or unauthenticated
    action: str
    details: dict = Field(default_factory=dict, sa_column=Column(JSON))
    ip_address: str | None = Field(default=None)
    createdat: datetime = Field(default_factory=datetime.now)

class SystemSettings(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    log_retention_days: int = Field(default=90)
    updatedat: datetime = Field(default_factory=datetime.now)
