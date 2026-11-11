from fastapi import APIRouter
from .routers import core, setting, dataset, getmodel, logs, admin

router = APIRouter()


router.include_router(core.router)
router.include_router(setting.router)
router.include_router(dataset.router)
router.include_router(getmodel.router)
router.include_router(logs.router)
router.include_router(admin.router)