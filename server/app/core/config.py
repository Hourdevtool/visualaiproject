from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    ADMIN_ACTION_PASSWORD: str = "change-me-in-env"
    # Gmail SMTP — ใช้ smtplib built-in ฟรีไม่จำกัด
    GMAIL_USER: str = ""
    GMAIL_APP_PASSWORD: str = ""
    UPLOAD_DIR: Path = Path("uploads/projects").resolve()

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()
