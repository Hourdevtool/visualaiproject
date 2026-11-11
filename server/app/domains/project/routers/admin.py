from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import select

from app.core.database import SessionDep
from app.dependencies import get_admin_user
from app.domains.user.model import Users
from app.domains.project.model import Projects, Project_setting

router = APIRouter()

@router.delete("/admin/{project_id}")
def admin_delete_project(
    project_id: str,
    session: SessionDep,
    admin: Users = Depends(get_admin_user)
):
    """Admin: Delete any project regardless of owner."""
    project = session.get(Projects, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    session.delete(project)
    session.commit()
    return {"status": "success", "message": "Project deleted by admin"}

@router.patch("/admin/{project_id}/private")
def admin_set_project_private(
    project_id: str,
    session: SessionDep,
    admin: Users = Depends(get_admin_user)
):
    """Admin: Set any project to private regardless of owner."""
    stmt = select(Project_setting).where(Project_setting.project_id == project_id)
    setting = session.exec(stmt).first()
    
    if not setting:
        raise HTTPException(status_code=404, detail="Project setting not found")
        
    setting.is_public = False
    session.add(setting)
    session.commit()
    return {"status": "success", "message": "Project set to private by admin"}
