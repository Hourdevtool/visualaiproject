from app.domains.auth.service import verify_token
from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from app.core.database import SessionDep, get_session
from app.domains.user.model import Users, Role
from sqlmodel import Session

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
         user_id, error = verify_token(token)
         if error:
                 raise HTTPException(status_code=401, detail=error)
         return user_id
    except Exception:
          raise HTTPException(status_code=401, detail="Could not validate credentials")

def get_admin_user(
    user_id: str = Depends(get_current_user),
    session: Session = Depends(get_session)   # ใช้ Session + Depends(get_session) โดยตรง ไม่ใช้ SessionDep เพื่อหลีกเลี่ยง double-Depends
):
    user = session.get(Users, user_id)
    if not user or user.role != Role.ADMIN:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return user