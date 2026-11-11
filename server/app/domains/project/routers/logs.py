from fastapi import APIRouter, Depends, HTTPException, Query
from app.core.database import SessionDep
from app.dependencies import get_current_user
from app.domains.project.model import Projects, Projectlogs
from app.domains.project.shemas import LogOut
from app.domains.project.service import log_project_action
from sqlmodel import select
from typing import List

router = APIRouter()

@router.get("/{project_id}/logs", response_model=List[LogOut])
def get_project_logs(
    project_id: str,
    session: SessionDep,
    current_user=Depends(get_current_user),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    # Verify project exists and user has access
    project = session.get(Projects, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    if project.user_id != current_user:
        raise HTTPException(status_code=403, detail="Not authorized to view these logs")

    statement = (
        select(Projectlogs)
        .where(Projectlogs.project_id == project_id)
        .order_by(Projectlogs.createdat.desc())
        .offset(offset)
        .limit(limit)
    )
    logs = session.exec(statement).all()
    return logs
