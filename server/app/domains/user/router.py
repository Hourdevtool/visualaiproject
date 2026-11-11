import uuid
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Request
from sqlmodel import select, col
from typing import List

from app.core.database import SessionDep
from app.dependencies import get_current_user, get_admin_user
from app.domains.user.model import Users, Role
from app.core.rate_limit import limiter
from app.core.rate_limit_config import SEARCH_LIMIT, SENSITIVE_LIMIT, UPLOAD_LIMIT

router = APIRouter()

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB
PROFILE_DIR = Path("uploads/profiles")


# --- params ที่ไม่มี default value (session: SessionDep) ต้องอยู่ก่อน params ที่มี default ---

@router.get("/search")
@limiter.limit(SEARCH_LIMIT)
def search_users(
    request: Request,
    session: SessionDep,
    admin: Users = Depends(get_admin_user),
    query: str = Query(..., min_length=1),
):
    """Admin only: Search users by username (suggestions) where role is USER."""
    stmt = select(Users.id, Users.username, Users.email).where(
        Users.role == Role.USER,
        col(Users.username).contains(query)
    ).limit(10)

    results = session.exec(stmt).all()
    return [{"id": r[0], "username": r[1], "email": r[2]} for r in results]


@router.patch("/{user_id}/permission")
@limiter.limit(SENSITIVE_LIMIT)
def update_user_permission(
    request: Request,
    user_id: str,
    permission: bool,
    session: SessionDep,
    admin: Users = Depends(get_admin_user),
):
    """Admin only: Manage user access rights (permission=false blocks user)."""
    user = session.get(Users, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.role == Role.ADMIN:
        raise HTTPException(status_code=400, detail="Cannot change permission of an admin")

    user.permission = permission
    session.add(user)
    session.commit()
    return {"status": "success", "message": f"User permission updated to {permission}"}


@router.post("/me/profile-image")
@limiter.limit(UPLOAD_LIMIT)
async def upload_profile_image(
    request: Request,
    session: SessionDep,
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user),
):
    """User: Upload a new profile image. Saves file to server, stores path in DB."""

    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail="ประเภทไฟล์ไม่ถูกต้อง อนุญาตเฉพาะ: jpg, jpeg, png, webp"
        )

    content = await file.read()
    if len(content) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(status_code=400, detail="ขนาดไฟล์เกิน 5 MB")

    original_ext = Path(file.filename).suffix.lower() if file.filename else ".jpg"
    if original_ext not in ALLOWED_EXTENSIONS:
        original_ext = ".jpg"

    PROFILE_DIR.mkdir(parents=True, exist_ok=True)

    unique_filename = f"{uuid.uuid4()}{original_ext}"
    save_path = PROFILE_DIR / unique_filename

    user = session.get(Users, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # ลบไฟล์เก่าถ้ามี
    if user.profile:
        old_file = Path(user.profile.lstrip("/"))
        if old_file.exists():
            try:
                old_file.unlink()
            except Exception:
                pass

    # บันทึกไฟล์ใหม่
    with open(save_path, "wb") as f:
        f.write(content)

    profile_url = f"/uploads/profiles/{unique_filename}"
    user.profile = profile_url
    session.add(user)
    session.commit()

    return {"status": "success", "profile_url": profile_url}


@router.delete("/me/profile-image")
@limiter.limit(SENSITIVE_LIMIT)
def delete_profile_image(
    request: Request,
    session: SessionDep,
    user_id: str = Depends(get_current_user),
):
    """User: Remove profile image from server and DB."""
    user = session.get(Users, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not user.profile:
        raise HTTPException(status_code=404, detail="ไม่มีรูปโปรไฟล์ที่จะลบ")

    old_file = Path(user.profile.lstrip("/"))
    if old_file.exists():
        try:
            old_file.unlink()
        except Exception:
            pass

    user.profile = None
    session.add(user)
    session.commit()
    return {"status": "success", "message": "ลบรูปโปรไฟล์เรียบร้อย"}


@router.delete("/me")
@limiter.limit(SENSITIVE_LIMIT)
def delete_my_account(
    request: Request,
    session: SessionDep,
    user_id: str = Depends(get_current_user),
):
    """User: Delete account and cascade all related data permanently."""
    user = session.get(Users, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.profile:
        profile_file = Path(user.profile.lstrip("/"))
        if profile_file.exists():
            try:
                profile_file.unlink()
            except Exception:
                pass

    session.delete(user)
    session.commit()
    return {"status": "success", "message": "ลบบัญชีและข้อมูลทั้งหมดเรียบร้อย ไม่มีการเก็บข้อมูลย้อนหลัง"}
