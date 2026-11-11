
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import func, text
from sqlmodel import select, col

from app.domains.admin.schemas import UpdateUserPermissionBody, PromoteUserBody, UpdateLogRetentionBody, DeleteProjectBody, SuspendProjectBody

from app.domains.admin.service import _require_action_password,_send_project_email
from app.core.database import SessionDep
from app.dependencies import get_admin_user
from app.domains.project.model import Project_setting, Projects
from app.domains.system.model import SystemLogs, SystemSettings
from app.domains.user.model import Role, Users
router = APIRouter()

# ---------------------------------------------------------------------------
# Shared helpers
# ---------------------------------------------------------------------------

class VerifyPasswordBody(BaseModel):
    password: str

@router.post("/verify-password")
def verify_admin_password(
    body: VerifyPasswordBody,
    _admin: Users = Depends(get_admin_user),
):
    """Verify if the action password is correct."""
    _require_action_password(body.password)
    return {"status": "success"}





# ---------------------------------------------------------------------------
# 1. Dashboard
# ---------------------------------------------------------------------------

@router.get("/dashboard/stats")
def get_dashboard_stats(
    session: SessionDep,
    _admin: Users = Depends(get_admin_user),
):
    """Return aggregate numbers shown on the admin dashboard."""
    total_users    = session.exec(select(func.count(Users.id))).one()
    total_projects = session.exec(select(func.count(Projects.id))).one()
    banned_users   = session.exec(
        select(func.count(Users.id)).where(Users.permission == False)  # noqa: E712
    ).one()

    return {
        "total_users":    total_users,
        "total_projects": total_projects,
        "banned_users":   banned_users,
    }


@router.get("/dashboard/registrations")
def get_daily_registrations(
    session: SessionDep,
    days: int = Query(default=7, ge=1, le=90),
    _admin: Users = Depends(get_admin_user),
):
    """Return per-day user registration counts for the last `days` days."""
    cutoff = datetime.now() - timedelta(days=days)
    rows   = session.exec(
        select(Users.createat).where(Users.createat >= cutoff)
    ).all()

    buckets: dict[str, int] = {}
    for created_at in rows:
        day = created_at.strftime("%Y-%m-%d")
        buckets[day] = buckets.get(day, 0) + 1

    result = []
    for i in range(days - 1, -1, -1):
        day = (datetime.now() - timedelta(days=i)).strftime("%Y-%m-%d")
        result.append({"date": day, "count": buckets.get(day, 0)})

    return result


# ---------------------------------------------------------------------------
# 2. User management
# ---------------------------------------------------------------------------

@router.get("/users")
def list_users(
    session: SessionDep,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    search: Optional[str] = Query(default=None),
    _admin: Users = Depends(get_admin_user),
):
    """Return a paginated list of all users with optional search."""
    stmt = select(Users)

    if search:
        stmt = stmt.where(
            col(Users.username).contains(search) | col(Users.email).contains(search)
        )

    # Simple count — avoids subquery compatibility issues with SQLModel
    total = session.exec(select(func.count(Users.id)).where(
        col(Users.username).contains(search) | col(Users.email).contains(search)
        if search else text("1=1")
    )).one()

    users = session.exec(stmt.offset((page - 1) * page_size).limit(page_size)).all()

    return {
        "total":     total,
        "page":      page,
        "page_size": page_size,
        "users": [
            {
                "id":         u.id,
                "username":   u.username,
                "email":      u.email,
                "role":       u.role,
                "permission": u.permission,
                "provider":   u.provider,
                "profile":    u.profile,
                "createat":   u.createat.isoformat(),
            }
            for u in users
        ],
    }


@router.patch("/users/{user_id}/permission")
def set_user_permission(
    user_id: str,
    body: UpdateUserPermissionBody,
    session: SessionDep,
    _admin: Users = Depends(get_admin_user),
):
    """Ban or unban a user. Requires action password."""
    _require_action_password(body.action_password)

    user = session.get(Users, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.role == Role.ADMIN:
        raise HTTPException(status_code=400, detail="Cannot change permission of an admin account")

    user.permission = body.permission
    session.add(user)
    session.commit()
    return {"status": "success", "user_id": user_id, "permission": body.permission}


@router.patch("/users/{user_id}/promote")
def promote_user_to_admin(
    user_id: str,
    body: PromoteUserBody,
    session: SessionDep,
    _admin: Users = Depends(get_admin_user),
):
    """Promote a user to admin role. Requires action password."""
    _require_action_password(body.action_password)

    user = session.get(Users, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.role == Role.ADMIN:
        raise HTTPException(status_code=400, detail="User is already an admin")

    user.role = Role.ADMIN
    session.add(user)
    session.commit()
    return {"status": "success", "user_id": user_id, "role": "admin"}


# ---------------------------------------------------------------------------
# 3. Project management
# ---------------------------------------------------------------------------

@router.get("/projects")
def list_all_projects(
    session: SessionDep,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    search: Optional[str] = Query(default=None),
    _admin: Users = Depends(get_admin_user),
):
    """Return paginated list of all projects with owner info."""
    stmt = select(Projects, Users).join(Users, Projects.user_id == Users.id)

    if search:
        stmt = stmt.where(col(Projects.project_name).contains(search))

    total = session.exec(
        select(func.count(Projects.id)).where(
            col(Projects.project_name).contains(search) if search else text("1=1")
        )
    ).one()

    rows = session.exec(stmt.offset((page - 1) * page_size).limit(page_size)).all()

    return {
        "total":     total,
        "page":      page,
        "page_size": page_size,
        "projects": [
            {
                "id":           p.id,
                "project_name": p.project_name,
                "description":  p.description,
                "category":     p.category,
                "status":       p.status,
                "createdat":    p.createdat.isoformat(),
                "owner": {
                    "id":       u.id,
                    "username": u.username,
                    "email":    u.email,
                    "profile":  u.profile,
                },
            }
            for p, u in rows
        ],
    }


@router.patch("/projects/{project_id}/visibility")
def toggle_project_visibility(
    project_id: str,
    body: SuspendProjectBody,
    session: SessionDep,
    _admin: Users = Depends(get_admin_user),
):
    """Toggle a project's public/private status. No action password needed."""
    setting = session.exec(
        select(Project_setting).where(Project_setting.project_id == project_id)
    ).first()

    if not setting:
        raise HTTPException(status_code=404, detail="Project setting not found")

    setting.is_public = body.is_public
    session.add(setting)
    session.commit()
    return {"status": "success", "project_id": project_id, "is_public": body.is_public}


@router.delete("/projects/{project_id}")
def admin_delete_project(
    project_id: str,
    body: DeleteProjectBody,
    session: SessionDep,
    _admin: Users = Depends(get_admin_user),
):
    """
    Delete any project (admin only). Requires action password.
    Sends a notification email to the project owner explaining the reason.
    """
    _require_action_password(body.action_password)

    project = session.get(Projects, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Fetch owner details before deleting (cascade will remove project)
    owner = session.get(Users, project.user_id)
    project_name = project.project_name

    session.delete(project)
    session.commit()

    # Send email after successful deletion
    if owner:
        _send_project_email(
            owner_email=owner.email,
            owner_name=owner.username,
            project_name=project_name,
            reason=body.reason,
        )

    return {"status": "success", "message": f"Project '{project_name}' deleted and owner notified."}


# ---------------------------------------------------------------------------
# 4. System logs — read-only
# ---------------------------------------------------------------------------

@router.get("/logs")
def get_system_logs(
    session: SessionDep,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
    action_filter: Optional[str] = Query(default=None),
    _admin: Users = Depends(get_admin_user),
):
    """Return paginated system logs, optionally filtered by action string."""
    # Build base filter condition
    filter_cond = (
        col(SystemLogs.action).contains(action_filter)
        if action_filter else text("1=1")
    )

    total = session.exec(
        select(func.count(SystemLogs.id)).where(filter_cond)
    ).one()

    logs = session.exec(
        select(SystemLogs)
        .where(filter_cond)
        .order_by(SystemLogs.createdat.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()

    return {
        "total":     total,
        "page":      page,
        "page_size": page_size,
        "logs": [
            {
                "id":         log.id,
                "user_id":    log.user_id,
                "action":     log.action,
                "details":    log.details,
                "ip_address": log.ip_address,
                "createdat":  log.createdat.isoformat(),
            }
            for log in logs
        ],
    }


# ---------------------------------------------------------------------------
# 5. Log retention configuration
# ---------------------------------------------------------------------------

@router.get("/logs/retention")
def get_log_retention(
    session: SessionDep,
    _admin: Users = Depends(get_admin_user),
):
    """Return current log retention setting."""
    setting = session.exec(select(SystemSettings)).first()
    if not setting:
        setting = SystemSettings()
        session.add(setting)
        session.commit()
        session.refresh(setting)
    return {"log_retention_days": setting.log_retention_days}


@router.patch("/logs/retention")
def update_log_retention(
    body: UpdateLogRetentionBody,
    session: SessionDep,
    _admin: Users = Depends(get_admin_user),
):
    """Update log retention days (minimum 1)."""
    if body.days < 1:
        raise HTTPException(status_code=400, detail="Retention must be at least 1 day")

    setting = session.exec(select(SystemSettings)).first()
    if not setting:
        setting = SystemSettings(log_retention_days=body.days)
    else:
        setting.log_retention_days = body.days
        setting.updatedat           = datetime.now()

    session.add(setting)
    session.commit()
    return {"status": "success", "log_retention_days": body.days}
