from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import select
from datetime import datetime

from app.core.database import SessionDep
from app.dependencies import get_admin_user
from app.domains.user.model import Users
from app.domains.system.model import SystemSettings

router = APIRouter()

@router.get("/settings")
def get_system_settings(
    session: SessionDep,
    admin: Users = Depends(get_admin_user)
):
    """Admin: Get system settings like log retention days."""
    setting = session.exec(select(SystemSettings)).first()
    if not setting:
        setting = SystemSettings()
        session.add(setting)
        session.commit()
        session.refresh(setting)
    return setting

@router.patch("/settings/log-retention")
def update_log_retention(
    days: int,
    session: SessionDep,
    admin: Users = Depends(get_admin_user)
):
    """Admin: Update log retention days (minimum 1)."""
    if days < 1:
        raise HTTPException(status_code=400, detail="Log retention must be at least 1 day")
        
    setting = session.exec(select(SystemSettings)).first()
    if not setting:
        setting = SystemSettings(log_retention_days=days)
        session.add(setting)
    else:
        setting.log_retention_days = days
        setting.updatedat = datetime.now()
        session.add(setting)
        
    session.commit()
    return {"status": "success", "message": f"Log retention updated to {days} days"}
