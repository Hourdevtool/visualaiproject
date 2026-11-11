import os
from fastapi import FastAPI, BackgroundTasks
from contextlib import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.domains.auth.router import router as auth_router
from app.domains.project.router import router as project_router
from app.domains.aiservices.router import router as aiservices_router
from app.domains.user.router import router as user_router
from app.domains.system.router import router as system_router
from app.domains.admin.router import router as admin_router
from app.core.middleware import SystemLogMiddleware
from app.core.rate_limit import limiter
from app.core import base_model
from app.core.tasks import cleanup_old_system_logs

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Clean up old logs
    cleanup_old_system_logs()
    yield
    # Shutdown
    pass

app = FastAPI(lifespan=lifespan)

# Rate limiting setup
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

"""
    CORS config
"""
cors_origins_env = os.getenv("CORS_ORIGINS", "")
allowed_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://0.0.0.0:3000",
    "https://service.npc.ac.th",
]
if cors_origins_env:
    allowed_origins.extend([origin.strip() for origin in cors_origins_env.split(",") if origin.strip()])

app.add_middleware(SystemLogMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

"""
    register api router
"""
import os

# Create uploads directory if not exists
uploads_dir = "uploads"
if not os.path.isdir(uploads_dir):
    os.makedirs(uploads_dir, exist_ok=True)

app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")
app.include_router(auth_router, prefix="/api/auth", tags=["Authentication"])
app.include_router(project_router, prefix="/api/projects", tags=["Projects"])
app.include_router(aiservices_router, prefix="/api/aiservices", tags=["AI Services"])
app.include_router(user_router, prefix="/api/users", tags=["Users"])
app.include_router(system_router, prefix="/api/system", tags=["System"])
app.include_router(admin_router, prefix="/api/admin", tags=["Admin"])


@app.get("/", tags=["Root"])
async def root():
    return {"message": "Server is running"}
