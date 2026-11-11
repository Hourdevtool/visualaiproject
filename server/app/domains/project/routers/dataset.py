from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, Query
from typing import List

from pathlib import Path
import os
from app.core.database import SessionDep
from app.dependencies import get_current_user
from app.core.config import settings
from ..model import Projects
from ..service import log_project_action
import shutil

router = APIRouter()

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}


@router.get("/{project_id}/dataset/folders", response_model=List[str])
def get_dataset_folders(
    project_id: str,
    session: SessionDep,
    current_user=Depends(get_current_user),
):
    # Verify project and owner
    project = session.get(Projects, project_id)
    if not project or project.user_id != current_user:
        raise HTTPException(status_code=404, detail="Project not found")

    project_dir = settings.UPLOAD_DIR / project_id
    if not project_dir.exists():
        return []

    # List only directories (categories), excluding system folders
    folders = [
        d.name for d in project_dir.iterdir() 
        if d.is_dir() and d.name != "yolo_dataset" and not d.name.lower().startswith("run_")
    ]
    return folders


@router.get("/{project_id}/dataset/images")
def get_dataset_images(
    project_id: str,
    session: SessionDep,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user=Depends(get_current_user),
):
    project = session.get(Projects, project_id)
    if not project or project.user_id != current_user:
        raise HTTPException(status_code=404, detail="Project not found")

    project_dir = settings.UPLOAD_DIR / project_id
    if not project_dir.exists():
        return {"images": {}, "total": 0}

    all_images = {}
    total_count = 0
    
    # We'll collect all images first to handle pagination across all folders or per folder?
    # User said "ดึงภาพทั้งหมด...ทำ pagination"
    # Let's collect all images and then paginate the whole list, but keep category info.
    
    flat_list = []
    for category_dir in project_dir.iterdir():
        if category_dir.is_dir():
            for f in category_dir.iterdir():
                if f.is_file() and f.suffix.lower() in ALLOWED_EXTENSIONS:
                    flat_list.append({
                        "name": f.name,
                        "category": category_dir.name,
                        "url": f"/uploads/projects/{project_id}/{category_dir.name}/{f.name}"
                    })
    
    flat_list.sort(key=lambda x: x['name']) # Consistent sorting
    total_count = len(flat_list)
    
    start = (page - 1) * limit
    end = start + limit
    paginated_list = flat_list[start:end]
    
    # Regroup for the frontend if needed, or just return flat list
    return {
        "images": paginated_list,
        "total": total_count,
        "page": page,
        "limit": limit,
        "has_more": end < total_count
    }


@router.post("/{project_id}/dataset/{category}")
def append_dataset_img(
    project_id: str,
    category: str,
    session: SessionDep,
    files: List[UploadFile] = File(...),
    current_user=Depends(get_current_user),
):

    # ตรวจสอบว่าเป็นเจ้าของโปรเจคเเละมีโปรเจคหรือไม่
    project = session.get(Projects, project_id)
    if not project or project.user_id != current_user:
        raise HTTPException(status_code=404, detail="Project not found")

    target_dir = settings.UPLOAD_DIR / project_id / category
    target_dir.mkdir(parents=True, exist_ok=True)

    add_files = []
    skippend_count = 0
    errors = []
    # บันทึกไฟล์ที่อัพโหลด
    for file in files:

        ext = Path(file.filename).suffix.lower()

        if ext not in ALLOWED_EXTENSIONS:
            errors.append(
                f"File {file.filename} has unsupported extension and was skipped."
            )
            continue

        safe_file = os.path.basename(file.filename)
        file_path = target_dir / safe_file
        # ถ้าไฟล์มีอยู่เเล้วข้ามไปเลยไม่ต้องบันทึกซ้ำ
        if file_path.exists():
            skippend_count += 1
            continue

        try:
            with open(file_path, "wb") as f:
                shutil.copyfileobj(file.file, f)

            add_files.append(f"/uploads/projects/{project_id}/{category}/{safe_file}")

        except Exception as e:
            errors.append(f"Error saving file {file.filename}: {str(e)}")
        finally:
            file.file.close()

    summary_data = {
        "total_uploaded": len(files),
        "added": len(add_files),
        "skipped": skippend_count,
        "errors": len(errors),
    }

    # Log action if any files were added
    if len(add_files) > 0:
        log_project_action(
            session=session,
            project_id=project_id,
            action="Dataset Appended",
            detail=summary_data
        )
        session.commit()

    return {
        "message": "Files uploaded successfully",
        "summary": summary_data,
        "new_images": add_files,
        "error_details": errors,
    }


@router.delete("/{project_id}/dataset/{category}/{filename}")
def delete_dataset_img(
    project_id: str,
    category: str,
    filename: str,
    session: SessionDep,
    current_user=Depends(get_current_user),
):
    project = session.get(Projects, project_id)
    if not project or project.user_id != current_user:
        raise HTTPException(status_code=404, detail="Project not found")

    file_path = settings.UPLOAD_DIR / project_id / category / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")

    try:
        os.remove(file_path)
        log_project_action(
            session=session,
            project_id=project_id,
            action="Dataset Item Deleted",
            detail={"category": category, "filename": filename}
        )
        session.commit()
        return {"message": "File deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
