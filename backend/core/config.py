import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PORT: int = 8000
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./data/saas.db")
    
    # Admin Credentials
    ADMIN_USERNAME: str = os.getenv("ADMIN_USERNAME", "admin")
    ADMIN_PASSWORD: str = os.getenv("ADMIN_PASSWORD", "admin123")
    ADMIN_SECRET_KEY: str = os.getenv("ADMIN_SECRET_KEY", "secret_admin_key_998822")
    
    # Messenger Bot Tokens
    TELEGRAM_BOT_TOKEN: str = os.getenv("TELEGRAM_BOT_TOKEN", "")
    BALE_BOT_TOKEN: str = os.getenv("BALE_BOT_TOKEN", "")
    ADMIN_TELEGRAM_CHAT_ID: str = os.getenv("ADMIN_TELEGRAM_CHAT_ID", "")
    
    # PayPing Gateway
    PAYPING_TOKEN: str = os.getenv("PAYPING_TOKEN", "")
    PAYPING_RETURN_URL: str = os.getenv("PAYPING_RETURN_URL", "http://localhost:8000/api/payment/callback")
    
    TEST_MODE: bool = os.getenv("TEST_MODE", "false").lower() in ("true", "1", "yes")

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
