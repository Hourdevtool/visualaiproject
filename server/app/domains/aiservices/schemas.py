from pydantic import BaseModel,Field
from typing import Literal

class TrainRequest(BaseModel):
    base_model : Literal["standard","advanced"] = Field(
        default="standard",
        description="เลือกโมเดลพื้นฐานที่ใช้ในการฝึก (standard หรือ advanced)"
    )

class TrainResponse(BaseModel):
    status: str = Field(..., description="สถานะ เช่น processing, success, failed")
    is_training: bool = Field(..., description="Flag สำหรับล็อคปุ่มหน้า UI")
    message: str = Field(..., description="ข้อความแจ้งเตือน")
    project_id: str = Field(..., description="รหัสโปรเจกต์")