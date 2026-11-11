from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    BackgroundTasks,
    Form,
    UploadFile,
    File,
    Query,
)
from app.core.database import SessionDep
from app.domains.project.model import Projects, Project_setting, ImageData
from app.domains.project.shemas import (
    ProjectIn,
    ProjectOut,
    ProjectListOut,
    SearchGuideOut,
    ProjectDeleteOut,
    ProjectDetailOut,
)
from app.core.utils import validate_json_data
from app.dependencies import get_current_user
from app.domains.project.service import (
    delete_project_files,
    process_background,
    get_img_smaples,
    log_project_action,
)
from pathlib import Path
import shutil
from sqlmodel import select, func, or_
from typing import List

from app.domains.aiservices.models import Outputmodel
from app.core.config import settings

router = APIRouter()


@router.post("/create", response_model=ProjectOut)
def create_project(
    background_task: BackgroundTasks,
    session: SessionDep,
    data: str = Form(...),
    zip_file: UploadFile | None = File(None),
    current_user=Depends(get_current_user),
):
    project_json = validate_json_data(ProjectIn, data)

    new_project = Projects(
        project_name=project_json.project_name,
        description=project_json.description,
        category=project_json.category,
        user_id=current_user,
        status="processing",
    )

    project_path = settings.UPLOAD_DIR / str(new_project.id)
    temp_zip_path = project_path / f"{new_project.id}.zip"

    try:

        session.add(new_project)
        session.flush()  # ดึง ID ของโปรเจคที่เพิ่งสร้าง

        new_setting = Project_setting(
            project_id=new_project.id,
            threshold=project_json.threshold,
            processing_mode=project_json.processing_mode,
            is_public=project_json.is_public,
            encryption_enabled=project_json.encryption_enabled,
        )

        new_img_data = ImageData(
            project_id=new_project.id,
            source_type=project_json.source_type,
            dirpath=str(project_path),
        )

        session.add(new_setting)
        session.add(new_img_data)

        #  save zip in disk
        project_path.mkdir(parents=True, exist_ok=True)
        if zip_file:
            with open(temp_zip_path, "wb") as buffer:
                shutil.copyfileobj(zip_file.file, buffer)

        # บันทึก Log การสร้างโปรเจกต์
        log_project_action(
            session=session,
            project_id=new_project.id,
            action="Project Created",
            detail={
                "project_name": new_project.project_name,
                "category": new_project.category,
            }
        )

        session.commit()
        session.refresh(new_project)

        response_data = {**new_project.model_dump()}

        validated_output = ProjectOut(**response_data)

        #  start background task
        if zip_file:
            background_task.add_task(process_background, new_project.id, temp_zip_path)
        return validated_output

    except Exception as e:
        session.rollback()
        if zip_file:
            zip_file.file.close()
        if project_path.exists():
            try:
                shutil.rmtree(
                    project_path, ignore_errors=True
                )  # ignore_errors ช่วยให้ลบได้แม้ไฟล์โดน lock
            except Exception as rmtree_e:
                print(f"Failed to delete folder: {rmtree_e}")
        raise HTTPException(status_code=500, detail="Failed to create project")


#  ดึงข้อมูลเเค่ของตัวเอง
@router.get("/me", response_model=ProjectListOut)
def get_my_projects(
    session: SessionDep,
    current_user=Depends(get_current_user),
    limit: int = Query(10, ge=1, le=20),
    offset: int = Query(0, ge=0),
):

    # ดึงข้อมูลโปรเจคของผู้ใช้ปัจจุบัน โดยใช้ limit และ offset สำหรับ pagination
    count_statement = select(func.count()).where(Projects.user_id == current_user)
    total = session.exec(count_statement).one()

    statement = select(Projects).where(Projects.user_id == current_user)
    statement = (
        statement.order_by(Projects.createdat.desc()).offset(offset).limit(limit)
    )
    projects = session.exec(statement).all()

    next_offset = offset + limit
    has_more = next_offset < total

    return {
        "data": projects,
        "total_count": total,
        "has_more": has_more,
        "next_offset": next_offset if has_more else None,
    }


#  ดึงข้อมูลทั้งหมดที่เป็น public
@router.get("/public", response_model=ProjectListOut)
def get_public_projects(
    session: SessionDep,
    limit: int = Query(10, ge=1, le=20),
    offset: int = Query(0, ge=0),
):

    public_project = (
        select(Projects).join(Project_setting).where(Project_setting.is_public == True)
    )

    # นับจำนวนโปรเจคสาธารณะทั้งหมดในระบบ
    total = session.exec(
        select(func.count()).select_from(public_project.subquery())
    ).one()

    statement = (
        public_project.order_by(Projects.createdat.desc()).offset(offset).limit(limit)
    )
    projects = session.exec(statement).all()

    next_offset = offset + limit
    has_more = next_offset < total

    return {
        "data": projects,
        "total_count": total,
        "has_more": has_more,
        "next_offset": next_offset if has_more else None,
    }


@router.get("/search", response_model=List[SearchGuideOut])
def global_search(
    session: SessionDep,
    q: str = Query(..., min_length=1),
    current_user=Depends(get_current_user),
):

    # ค้นหาโดยการใช้ Case-Insensitive
    search = f"%{q}%"

    statement = (
        select(Projects.id, Projects.project_name, Projects.user_id)
        .join(Project_setting)
        .where(
            Projects.project_name.ilike(search),
            or_(Project_setting.is_public == True, Projects.user_id == current_user),
        )
        .limit(10)  # จำกัดผลลัพธ์สูงสุด 10 รายการ
    )

    results = session.exec(statement).all()

    formatdata = []
    for id, name, user_id in results:
        project_type = "personal" if user_id == current_user else "public"
        formatdata.append(SearchGuideOut(id=id, project_name=name, type=project_type))

    return formatdata


@router.delete("/{project_id}", status_code=204)
def delete_project(
    project_id: str,
    delete_data: ProjectDeleteOut,
    session: SessionDep,
    current_user=Depends(get_current_user),
):
    project = session.get(Projects, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # ตรวจสอบเจ้าของโปรเจค

    if project.user_id != current_user:
        raise HTTPException(
            status_code=403, detail="Not authorized to delete this project"
        )

    if project.project_name != delete_data.confirm_project_name:
        raise HTTPException(
            status_code=400, detail="Project name confirmation does not match"
        )

    try:

        delete_project_files(project_id)

        session.delete(project)
        session.commit()

        return None

    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail="Failed to delete project")


@router.get("/{project_id}", response_model=ProjectDetailOut)
def get_project_detail(
    project_id: str, session: SessionDep, current_user=Depends(get_current_user)
):
    project = session.get(Projects, project_id)

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    settings_data = project.settings
    is_owner = project.user_id == current_user

    # Check if user is admin
    from app.domains.user.model import Users, Role
    user = session.get(Users, current_user)
    is_admin = user and user.role == Role.ADMIN

    # Access control: non-owner + non-admin + not public = 403
    if not is_owner and not is_admin:
        if not settings_data or not settings_data.is_public:
            raise HTTPException(status_code=403, detail="This project is private")

    all_outputs = session.exec(
        select(Outputmodel)
        .where(Outputmodel.project_id == project_id)
        .order_by(Outputmodel.process_at.desc())
        .limit(3)
    ).all()

    def format_output(out: Outputmodel):
        if not out: return None
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

    history_formatted = [format_output(o) for o in all_outputs]
    latest_formatted = history_formatted[0] if history_formatted else None

    samples = get_img_smaples(project_id)
    
    owner_user = session.get(Users, project.user_id)

    return {
        **project.model_dump(),
        "settings": settings_data,
        "analyze": latest_formatted,
        "history": history_formatted,
        "recent_samples": samples,
        "owner": {
            "username": owner_user.username if owner_user else "Unknown",
            "profile": owner_user.profile if owner_user else None
        },
        "is_owner": is_owner
    }

