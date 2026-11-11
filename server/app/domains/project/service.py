from typing import List
import zipfile
import os
from pathlib import Path
from fastapi import HTTPException
from .model import Projects
from sqlmodel import Session
from app.core.database import engine
from app.core.config import settings
import shutil
from .model import Projectlogs


# กำหนดนามสกุลที่อนุญาต
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}

MAX_FILE_SIZE = 10 * 1024 * 1024
MAX_TOTAL_SIZE = 1000 * 1024 * 1024
MAX_FILES_COUNT = 100000


def handle_project_image(project_id: str, zip_path: Path):

    # สร้าง path สำหรับเก็บไฟล์ของโปรเจค
    project_path = settings.UPLOAD_DIR / project_id
    project_path.mkdir(parents=True, exist_ok=True)

    extracted_count = 0
    total_extracted_size = 0

    with zipfile.ZipFile(zip_path, "r") as zip_ref:

        # ตรวจสอบจำนวนไฟล์ใน zip
        for file_info in zip_ref.infolist():

            if file_info.is_dir():
                continue

            #  ตรวจสอบนามสกุลไฟล์

            ext = Path(file_info.filename).suffix.lower()
            if ext not in ALLOWED_EXTENSIONS:
                continue

            #  สร้าง path ปลายทาง
            try:
                extract_target_path = (project_path / file_info.filename).resolve()
            except RuntimeError:
                continue
            # ตรวจสอบ zip splip

            if not str(extract_target_path).startswith(str(project_path)):
                continue
            safe_filename = os.path.basename(file_info.filename)
            if not safe_filename:
                continue

            #  แตกไฟล์ลงfolder
            extract_target_path.parent.mkdir(parents=True, exist_ok=True)

            #  zip bomb attack

            extracted_count += 1
            if extracted_count > MAX_FILES_COUNT:
                raise HTTPException(
                    status_code=400, detail="Too many files in the zip archive"
                )

            if file_info.file_size > MAX_FILE_SIZE:
                continue

            total_extracted_size += file_info.file_size
            if total_extracted_size > MAX_TOTAL_SIZE:
                raise HTTPException(
                    status_code=400,
                    detail="Total size of extracted files exceeds the maximum allowed limit",
                )

            with open(extract_target_path, "wb") as out_file:
                out_file.write(zip_ref.read(file_info.filename))

        return str(project_path)


def delete_project_files(project_id: str):
    project_path = settings.UPLOAD_DIR / project_id
    if project_path.exists():
        try:
            shutil.rmtree(project_path, ignore_errors=True)
        except Exception as e:
            print(f"Failed to delete project files: {e}")


def process_background(project_id: str, zip_path: Path):

    with Session(engine) as session:
        try:
            handle_project_image(project_id, zip_path)

            project = session.get(Projects, project_id)

            if project:
                project.status = "ready"
                # บันทึก Log ว่าแตกไฟล์เสร็จสมบูรณ์
                log_project_action(
                    session=session,
                    project_id=project_id,
                    action="Dataset Processing Completed",
                    detail= "ready"
                )
                session.add(project)
                session.commit()
        except Exception as e:

            project = session.get(Projects, project_id)

            if project:
                project.status = "error"
                # บันทึก Log กรณีเกิดข้อผิดพลาด
                log_project_action(
                    session=session,
                    project_id=project_id,
                    action="Dataset Processing Failed",
                    detail={"status": "error", "error_message": str(e)}
                )
                session.add(project)
                session.commit()

        finally:

            if zip_path.exists():
                os.remove(zip_path)


def get_img_smaples(project_id: str, limit: int = 5) -> List[str]:

    project_dir = settings.UPLOAD_DIR / project_id

    if not project_dir.exists() or not project_dir.is_dir():
        return []

    samples = []

    for filepath in project_dir.rglob("*"):

        #  ตรวจสอบว่าเป็นไฟล์และมีนามสกุลที่อนุญาต
        if filepath.is_file() and filepath.suffix.lower() in ALLOWED_EXTENSIONS:

            relative_path = filepath.relative_to(settings.UPLOAD_DIR.parent)
            samples.append(f"/uploads/{relative_path.as_posix()}")

            if len(samples) == limit:
                break

    return samples


def log_project_action(session: Session, project_id: str, action: str, detail: dict = None):
    """
    บันทึกเหตุการณ์ (Log) ที่เกิดขึ้นกับโปรเจกต์ (เรียกใช้จากฝั่ง Backend)
    """
    if detail is None:
        detail = {}
        
    new_log = Projectlogs(
        project_id=project_id,
        action=action,
        detail=detail,
    )
    session.add(new_log)
    # ไม่ต้อง commit ในฟังก์ชันนี้ ปล่อยให้ router หลักเป็นคน commit พร้อมกับ transaction อื่นๆ
    # เพื่อให้เกิดเป็น Atomic Transaction (ถ้าพังก็ rollback ทั้งหมด)
    return new_log

