from pydantic import BaseModel, field_validator
from typing import List, Optional, Any
import json
from datetime import datetime

class ProjectBase (BaseModel):
    project_name: str
    category : str
    description : Optional[str] = None

    threshold : float
    processing_mode : str 

    source_type :str
    
    is_public :bool
    encryption_enabled	: bool



class ProjectIn(ProjectBase):
    pass


class ProjectOut(BaseModel):
    id:str
    user_id :str
    project_name: str
    category : str
    description : Optional[str] = None
    model_config = {"from_attributes": True}

# class สำหรับกำหนดการส่งข้อมูลเป็น list กลับไปยัง frontend

class ProjectListOut(BaseModel):
    data : list[ProjectOut]
    total_count : int  #จำนวนทั้งหมดของโปรเจคที่มีในระบบ (ไม่จำกัดจำนวนที่ส่งกลับในแต่ละหน้า)
    has_more : bool #บอกว่า ยังมีโปรเจคที่เหลืออีกหรือไม่ (สำหรับการทำ pagination)
    next_offset : Optional[int] = None # รอบหน้าต้องส่ง offset มาเท่าไหร่



class SearchGuideOut(BaseModel):
    id: str
    project_name: str
    type : str
    model_config = {"from_attributes": True}


class ProjectDeleteOut(BaseModel):
    confirm_project_name : str


class AnalyzeProjectOut(BaseModel):
    id: str
    run_id: str
    latest_accuracy: float
    compute_efficiency_ms: float
    loss_variance: float
    accuracy_history: List[float] = []
    
    # Visual Results
    results_url: Optional[str] = None
    f1_curve_url: Optional[str] = None
    pr_curve_url: Optional[str] = None
    precision_curve_url: Optional[str] = None
    recall_curve_url: Optional[str] = None
    confusion_matrix_url: Optional[str] = None
    csv_url: Optional[str] = None
    onnx_url: Optional[str] = None
    model_pt_url: Optional[str] = None

    @field_validator("accuracy_history", mode="before")
    @classmethod
    def parse_accuracy_history(cls, v):
        if isinstance(v, str):
            try:
                return json.loads(v)
            except:
                return []
        return v


class SettingBase(BaseModel):
    threshold :float
    processing_mode:str
    is_public : bool
    encryption_enabled : bool
class DashboardSettingsOut(SettingBase):
    pass

class  SettingOut(SettingBase):
    share_allow : bool
    download_allow : bool
class ProjectOwnerOut(BaseModel):
    username: str
    profile: Optional[str] = None

class ProjectDetailOut(BaseModel):
    id:str
    user_id: str
    project_name : str
    category :str
    description: Optional[str] = None
    status: str
    is_training: bool = False

    settings: SettingOut
    analyze : Optional[AnalyzeProjectOut] = None
    history : List[AnalyzeProjectOut] = []
    recent_samples : List[str] = []
    owner: ProjectOwnerOut
    is_owner: bool = False

    model_config = {"from_attributes": True}

class LogOut(BaseModel):
    id: str
    action: str
    detail: Any
    project_id: str
    createdat: datetime

    model_config = {"from_attributes": True}
