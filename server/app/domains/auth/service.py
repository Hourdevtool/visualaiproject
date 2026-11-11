from datetime import  datetime ,timedelta, timezone
import jwt
from app.core.config import settings
SECRET_KEY  = settings.SECRET_KEY 
ALGORITHM  =  "HS256"

#  ACCESS TOKEN สำหรับเข้าสู่ระบบ
def create_access_token(data: dict, expires_delta : int = 30):
    to_encode = data.copy()
    """
        กำหนดวันหมดอายุ
    """
    exp = datetime.now() + timedelta(minutes=expires_delta)
    to_encode.update({"exp":exp})
    return jwt.encode(to_encode,SECRET_KEY,algorithm=ALGORITHM)


#  ACCESS TOKEN สำหรับดึงข้อมูลกรณี accesstoken หมดอายุ
def create_refresh_token(data:dict, expires_delta : int = 30):
      to_encode = data.copy()
      exp = datetime.now() + timedelta(days=expires_delta)
      to_encode.update({"exp":exp})
      return jwt.encode(to_encode,SECRET_KEY,algorithm=ALGORITHM)



def verify_token(token:str):
        # ถอดรหัส jwt token ดึง id ของผูใช้งานออกมา
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id :str = payload.get('sub')
        if not user_id:
            return None,"Invalid"
        return user_id,None
    except jwt.PyJWTError :
        return None,"Invalid"
    
