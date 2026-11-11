from datetime import datetime
from operator import index
import uuid
from sqlmodel import JSON, Field ,SQLModel,Relationship,Column
from app.domains.user.model import Users
from app.domains.aiservices.models import Outputmodel
from typing import  List,Optional,Any

class Projects (SQLModel,table=True):
    id: str =  Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    project_name : str = Field(index=True)
    description :str | None = Field(default=None)
    user_id : str = Field(foreign_key="users.id")
    createdat :datetime = Field(default_factory=datetime.now)
    category : str | None = Field(default=None)
    status: str = Field(default="processing")
    is_training: bool = Field(default=False)
    # Relationship ตาราง
    owner : Optional["Users"]  = Relationship(back_populates="project")
    # กำหนดให้ส่งมาเป็น obj 1 ก้อน
    img_data : Optional["ImageData"]  = Relationship(back_populates="project",sa_relationship_kwargs={"uselist": False, "cascade": "all, delete-orphan"})  
    settings : Optional["Project_setting"]  = Relationship(back_populates="project",sa_relationship_kwargs={"uselist": False, "cascade": "all, delete-orphan"})

    logs : List["Projectlogs"] = Relationship(back_populates="project",sa_relationship_kwargs={"cascade": "all, delete-orphan"})
    output : List["Outputmodel"] = Relationship(back_populates="project",sa_relationship_kwargs={"cascade": "all, delete-orphan"})

    
class ImageData (SQLModel,table=True):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    source_type: str = Field(default="local")
    dirpath: str = Field(default="pending")
    project_id :str = Field(foreign_key="projects.id",unique=True) 
    uploadedat :datetime = Field(default_factory=datetime.now)
    project : Optional["Projects"]  = Relationship(back_populates="img_data")


class Project_setting (SQLModel, table= True):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    project_id :str = Field(foreign_key="projects.id",unique=True)
    # ai parameter setting
    threshold : float = Field(default=0.8)
    processing_mode : str = Field(default="Batch") # Batch หรือ Realtime

    # ture:public / false :private
    is_public :bool  = Field (default=True)
    # ture:allow / false :not allow
    encryption_enabled : bool = Field(default=False)
    share_allow :bool = Field(default=True)
    download_allow : bool = Field(default=True)
    project : Optional["Projects"] = Relationship(back_populates="settings")


class Projectlogs (SQLModel,table=True):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    action : str 
    detail : Any = Field(default_factory=dict,sa_column=Column(JSON))
    project_id :str = Field(foreign_key="projects.id")
    createdat : datetime = Field(default_factory=datetime.now)

    project :  Optional["Projects"] =  Relationship(back_populates="logs")

