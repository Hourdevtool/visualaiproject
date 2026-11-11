from fastapi import APIRouter
from .routers import train


router = APIRouter()

router.include_router(train.router)