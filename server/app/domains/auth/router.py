from fastapi import  APIRouter, Response,Cookie,HTTPException,Depends
from app.core.database import SessionDep
from sqlmodel import select
from .schemas import AuthIn,AuthOut,UserOut
from .service import create_access_token , create_refresh_token  ,verify_token
from app.domains.user.model import Users
from app.dependencies import get_current_user
router = APIRouter()


@router.post("/login", response_model=AuthOut)
def auth_callback(data:AuthIn,session: SessionDep,response: Response):
    """
        ตรวจสอบว่าuserเคยเข้าสู่ระบบมาเเล้วหรือยัง
    """
    # 1. ตรวจสอบจาก email ก่อน เพราะ email มักจะถูกตั้งค่าให้ Unique ใน DB
    check_email = select(Users).where(Users.email == data.email)
    user_by_email = session.exec(check_email).first()

    if user_by_email:
        # ถ้ามี email นี้อยู่แล้ว แต่ provider_id ไม่ตรงกัน แสดงว่าเคยสมัครด้วย provider อื่น
        if user_by_email.provider_id != data.provider_id:
            raise HTTPException(
                status_code=400, 
                detail=f"Email this already registered"
            )
        user = user_by_email
    else:
        # ถ้ายังไม่มีทั้ง email และ provider_id ให้สร้างใหม่
        user = Users(**data.model_dump())
        session.add(user)
        session.commit()
        session.refresh(user)
    """
        สร้าง jwttoken
    """
    access_token = create_access_token(data= {"sub":str(user.id)})
    refresh = create_refresh_token(data={"sub":str(user.id)})

    #  set httponlycookie
    response.set_cookie(
        key="re",
        value= refresh,
        httponly= True,
        secure=True,
        samesite="lax",
        max_age= 30 * 24* 60 *60 #30 วันหมดอายุ
    )
    return {"access_token":access_token, "refresh_token": refresh, "token_type": "bearer"}

@router.post("/refresh",response_model=AuthOut)
def refresh(response:Response,re: str | None = Cookie(None)):
    if not re:
        raise HTTPException(status_code=401, detail="token missing")
    
    user_id,error = verify_token(re)

    if error:
        raise HTTPException(status_code=401,detail=error)
    
    new_access_token = create_access_token(data={"sub":user_id})
    new_refresh_token = create_refresh_token(data={"sub":str(user_id)})

    #  set httponlycookie
    response.set_cookie(
            key="re",
            value= new_refresh_token,
            httponly= True,
            secure=True,
            samesite="lax",
            max_age= 30 * 24* 60 *60 #30 วันหมดอายุ
        )
    return {"access_token":new_access_token, "refresh_token": new_refresh_token, "token_type": "bearer"}

@router.post("/me",response_model=UserOut)
def get_me( session: SessionDep,user_id : str = Depends(get_current_user)):
        user = session.get(Users,user_id)

        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return user

@router.post("/logout")
async def logout(response:Response):
     
     response.delete_cookie(
        key="re",
        path="/",          # ให้มีผลทั้งโดเมน
        httponly=True,     
        secure=True,      
        samesite="lax"
     )
     return {"status": "success", "message": "Log out successfully"}
