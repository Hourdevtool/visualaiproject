from pydantic import BaseModel,ValidationError
from fastapi import HTTPException
from typing import Type, TypeVar


# สร้าง TypeVar สำหรับโมเดล Pydantic
T = TypeVar('T',bound=BaseModel)

def validate_json_data(model_class: Type[T], data: str)->T:

    try:
        return model_class.model_validate_json(data)
    except ValidationError as e:
        raise HTTPException(status_code=422, detail=e.errors())
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON data")