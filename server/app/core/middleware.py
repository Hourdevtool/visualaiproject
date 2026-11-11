import json
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from app.core.database import get_session
from app.domains.system.model import SystemLogs
from app.domains.auth.service import verify_token

class SystemLogMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Process the request
        response = await call_next(request)
        
        # We don't want to log every single GET request to avoid DB bloat,
        # but let's log mutating methods (POST, PUT, PATCH, DELETE)
        if request.method in ["POST", "PUT", "PATCH", "DELETE"]:
            # Try to get user_id from token
            user_id = None
            auth_header = request.headers.get("Authorization")
            if auth_header and auth_header.startswith("Bearer "):
                token = auth_header.split(" ")[1]
                uid, error = verify_token(token)
                if not error:
                    user_id = uid
            else:
                # check cookies
                token = request.cookies.get("re")
                if token:
                    uid, error = verify_token(token)
                    if not error:
                        user_id = uid

            client_host = request.client.host if request.client else None
            
            # Save log asynchronously or via a new DB session
            try:
                # Need a new session context here
                session_gen = get_session()
                session = next(session_gen)
                
                log_entry = SystemLogs(
                    user_id=user_id,
                    action=f"{request.method} {request.url.path}",
                    details={
                        "query_params": dict(request.query_params),
                        "status_code": response.status_code
                    },
                    ip_address=client_host
                )
                session.add(log_entry)
                session.commit()
            except Exception as e:
                print(f"Failed to log system action: {e}")
            finally:
                session_gen.close()
                
        return response
