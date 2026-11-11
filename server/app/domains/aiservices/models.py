from typing import TYPE_CHECKING, List,Optional
import uuid
from datetime import datetime
from sqlmodel import JSON, Column, SQLModel,Field,Relationship
if TYPE_CHECKING :
    from app.domains.project.model import Projects



class Outputmodel(SQLModel,table=True):
    id:str = Field(default_factory=uuid.uuid4,primary_key=True)
    project_id : str = Field(foreign_key="projects.id")
    model_path :str 
    onnx_model_path : Optional[str] = Field(default=None)
    process_at : datetime = Field(default=datetime.now)
    run_id :str = Field(unique=True)
    # เก็บค่าสถิติของโมเดล
    latest_accuracy: float = Field(default=0.0)
    compute_efficiency_ms: float = Field(default=0.0)
    loss_variance: float = Field(default=0.0)

    accuracy_history: List[float] = Field(default=[], sa_column=Column(JSON))
    project : Optional["Projects"]  = Relationship(back_populates="output")
