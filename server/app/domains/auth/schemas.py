from pydantic import BaseModel,EmailStr
class AuthBase(BaseModel):

        email : EmailStr
        username: str
        profile :str |None = None
        provider: str
        provider_id : str

class AuthIn(AuthBase):
        pass

class AuthOut(BaseModel):
      access_token: str
      refresh_token: str | None = None
      token_type: str = "bearer"

class UserOut(BaseModel):

        email: EmailStr
        username: str
        profile:str
        permission: bool
        role : str
        model_config = {"from_attributes": True}