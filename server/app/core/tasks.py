from datetime import datetime, timedelta
from sqlmodel import select
from app.core.database import get_session
from app.domains.system.model import SystemLogs, SystemSettings

def cleanup_old_system_logs():
    """Background task to clean up old system logs based on retention days."""
    try:
        session_gen = get_session()
        session = next(session_gen)
        
        # Get retention setting
        setting = session.exec(select(SystemSettings)).first()
        days_to_keep = setting.log_retention_days if setting else 90
        
        # Calculate cutoff date
        cutoff_date = datetime.now() - timedelta(days=days_to_keep)
        
        # We need to delete logs older than cutoff_date
        # Since SQLModel doesn't support bulk delete elegantly in all DBs without raw SQL,
        # we can fetch and delete, or use a SQLAlchemy delete statement.
        from sqlalchemy import delete
        stmt = delete(SystemLogs).where(SystemLogs.createdat < cutoff_date)
        session.exec(stmt)
        session.commit()
    except Exception as e:
        print(f"Error cleaning up logs: {e}")
    finally:
        session_gen.close()
