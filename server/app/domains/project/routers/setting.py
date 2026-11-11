from fastapi import APIRouter,HTTPException,Depends
from app.core.database import SessionDep
from app.dependencies import get_current_user
from app.domains.project.model import Projects
from app.domains.project.shemas import SettingOut
from app.domains.project.service import log_project_action


router = APIRouter(
    dependencies=[Depends(get_current_user)]
)


@router.get("/{project_id}/settings",response_model=SettingOut)
def get_project_settings(
    project_id: str,
    session:SessionDep
):
    project = session.get(Projects,project_id)

    if not project:
        raise HTTPException(status_code=404,detail="Project not found")
    
    return project.settings

@router.put("/{project_id}/settings", status_code = 204)
def update_project_settings(
    project_id:str,
    settings_data : SettingOut,
    session:SessionDep,
    current_user = Depends(get_current_user)
):
    project = session.get(Projects,project_id)

    if not project:
        raise HTTPException(status_code=404,detail="Project not found")
    
    if project.user_id !=current_user:
        raise HTTPException(status_code=403,detail="Not authorized to update this project")
    try:
        project.settings.threshold = settings_data.threshold
        project.settings.processing_mode = settings_data.processing_mode
        project.settings.is_public = settings_data.is_public
        project.settings.encryption_enabled = settings_data.encryption_enabled
        project.settings.share_allow = settings_data.share_allow
        project.settings.download_allow = settings_data.download_allow

        # บันทึก Log การเปลี่ยนการตั้งค่า
        log_project_action(
            session=session,
            project_id=project_id,
            action="Settings Updated",
            detail=settings_data.model_dump()
        )

        session.add(project)
        session.commit()

        return None
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500,detail="Failed to update project settings")
