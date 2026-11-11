"""
Rate limit presets สำหรับใช้กับ @limiter.limit() decorator

วิธีใช้ใน router:
    from app.core.rate_limit import limiter
    from app.core.rate_limit_config import UPLOAD_LIMIT
    from fastapi import Request

    @router.post("/upload")
    @limiter.limit(UPLOAD_LIMIT)
    async def upload(request: Request, ...):
        ...

หมายเหตุ: endpoint ที่ใช้ rate limit ต้องรับ request: Request เป็น parameter ด้วย
"""

AUTH_LIMIT      = "10/minute"   # login, register
UPLOAD_LIMIT    = "20/minute"   # file upload (profile image ฯลฯ)
GENERAL_LIMIT   = "60/minute"   # API ทั่วไป
SEARCH_LIMIT    = "30/minute"   # search / autocomplete
SENSITIVE_LIMIT = "5/minute"    # ลบบัญชี, เปลี่ยน permission
