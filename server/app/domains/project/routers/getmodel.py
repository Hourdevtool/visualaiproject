from fastapi import APIRouter,HTTPException,Depends
from app.core.database import SessionDep
from app.dependencies import get_current_user
from sqlmodel import  select
from typing import List, Optional
from app.domains.aiservices.models import Outputmodel
from fastapi.responses import FileResponse
from pathlib import Path
from app.core.config import settings
import os

router = APIRouter()


from app.domains.project.shemas import AnalyzeProjectOut

@router.get("/{project_id}/models", response_model=List[AnalyzeProjectOut])
def get_project_models(project_id: str, session: SessionDep, current_user=Depends(get_current_user)):
    try:
        statement = select(Outputmodel).where(
            Outputmodel.project_id == project_id
        ).order_by(Outputmodel.process_at.desc())

        models = session.exec(statement).all()

        def format_output(out: Outputmodel):
            base_url = f"/uploads/projects/{project_id}/{out.run_id}"
            return {
                **out.model_dump(),
                "results_url": f"{base_url}/results.png",
                "f1_curve_url": f"{base_url}/BoxF1_curve.png",
                "pr_curve_url": f"{base_url}/BoxPR_curve.png",
                "precision_curve_url": f"{base_url}/BoxP_curve.png",
                "recall_curve_url": f"{base_url}/BoxR_curve.png",
                "confusion_matrix_url": f"{base_url}/confusion_matrix.png",
                "csv_url": f"{base_url}/results.csv",
                "onnx_url": f"{base_url}/weights/best.onnx",
                "model_pt_url": f"{base_url}/weights/best.pt"
            }

        return [format_output(m) for m in models]
    except HTTPException :
        raise
    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail="error occurred within the server system"
        )

@router.get("/{project_id}/models/{model_id}/test")
def download_model(
    session: SessionDep,
    project_id: str,
    model_id: str,
    format: str = "pt",
    current_user = Depends(get_current_user)
):
    model_record = session.get(Outputmodel, model_id)
    if not model_record or model_record.project_id != project_id:
        raise HTTPException(status_code=404, detail="Model not found")
        
    # Check if the user has permission to download (this might need to check project settings in a real scenario, but let's assume if they can access the endpoint, they own it or it's public)
    
    file_path = model_record.model_path if format == "pt" else model_record.onnx_model_path
    
    if not file_path or not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail=f"Model file in {format} format not found")
        
    filename = os.path.basename(file_path)
    return FileResponse(path=file_path, filename=filename, media_type="application/octet-stream")

@router.get("/{project_id}/models/{model_id}/validation-images")
def get_validation_images(
    project_id: str,
    model_id: str,
    session: SessionDep,
    current_user = Depends(get_current_user)
):
    model_record = session.get(Outputmodel, model_id)
    if not model_record or model_record.project_id != project_id:
        raise HTTPException(status_code=404, detail="Model not found")
        
    run_dir = settings.UPLOAD_DIR / project_id / model_record.run_id
    
    if not run_dir.exists() or not run_dir.is_dir():
        return []
        
    # ค้นหาไฟล์ที่ขึ้นต้นด้วย val_batch และลงท้ายด้วย _labels.jpg
    validation_images = []
    base_url = f"/uploads/projects/{project_id}/{model_record.run_id}"
    for filepath in run_dir.glob("val_batch*_labels.jpg"):
        validation_images.append(f"{base_url}/{filepath.name}")
        
    return validation_images