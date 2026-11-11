from fastapi import APIRouter,Depends,BackgroundTasks,HTTPException
from fastapi.responses import FileResponse
from app.dependencies import get_current_user
from app.core.database import SessionDep
from ..schemas import TrainRequest,TrainResponse
from ..models import Outputmodel
from pathlib import Path
from sqlmodel import select
from ..service import process_ai_pipeline
from app.domains.project.model import Project_setting,Projects
router = APIRouter(dependencies=[Depends(get_current_user)])

@router.get("/{model_id}/download")
def download_trained_model(model_id:str,session:SessionDep,current_user= Depends(get_current_user)):

    model = session.get(Outputmodel,model_id)
    if not model :
        raise HTTPException(status_code=404,detail="model not found")
    
    target_file = Path(model.model_path)
    
    if not target_file.exists():
        raise HTTPException(status_code=404,detail="model is delete")
    
    project = session.get(Projects, model.project_id)
    statement=  select(Project_setting).where(Project_setting.project_id == model.project_id)
    settings = session.exec(statement).first()

    if not settings or not project:
        raise  HTTPException(status_code=404, detail="settings not found")
    
    if not settings.download_allow:
        is_owner = current_user  == project.user_id
        if not is_owner:
          
            return {
                "status": "warning",
                "can_download": False,
                "message": "Sorry you do not have permission to download"
            }
    # กำหนดชื่อไฟล์ที่ผูใช้งานจะได้รับ
    download_filename= f"model_{model.process_at}{target_file.suffix}"

    return FileResponse(
        path=target_file,
        filename=download_filename,
        media_type="application/octet-stream"
    )

@router.post("/{project_id}/train",response_model=TrainResponse)
async def train(
    project_id : str,
    request: TrainRequest,
    background_tasks: BackgroundTasks,
    session: SessionDep
):
    

    project = session.get(Projects,project_id)

    if not project:
        raise HTTPException(status_code=404 , detail="project not found")
    
    if project.is_training:
        raise HTTPException(status_code=400, detail="model is training please wait")

    background_tasks.add_task(
        process_ai_pipeline,
        project_id=project_id,
        base_model_type=request.base_model
    )

    return TrainResponse(
            status="processing",
            is_training=True,
            message=f"กำลังเตรียมข้อมูลและเทรนโมเดล (โหมด {request.base_model})",
            project_id=project_id
        )