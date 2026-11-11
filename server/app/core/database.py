from sqlmodel import create_engine,Session
from fastapi import Depends
from typing import Annotated
from app.core.config import settings

engine = create_engine(settings.DATABASE_URL)

"""
   call Session
"""
def get_session():
    with Session(engine) as session:
        yield session

"""
    Create Session
"""
SessionDep = Annotated[Session,Depends(get_session)]
