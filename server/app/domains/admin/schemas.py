
from pydantic import BaseModel
class ActionPasswordBody(BaseModel):
    action_password: str


class UpdateUserPermissionBody(BaseModel):
    action_password: str
    permission: bool  # True = active, False = banned


class PromoteUserBody(BaseModel):
    action_password: str


class UpdateLogRetentionBody(BaseModel):
    days: int


class UpdateUserPermissionBody(BaseModel):
    action_password: str
    permission: bool


class PromoteUserBody(BaseModel):
    action_password: str


class UpdateLogRetentionBody(BaseModel):
    days: int


class DeleteProjectBody(BaseModel):
    action_password: str
    reason: str  # shown in the email to the project owner


class SuspendProjectBody(BaseModel):
    is_public: bool  # True = restore public, False = make private/suspend

