"""
Configuration management for OpenBB MCP Server
"""
import os
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


class Settings(BaseSettings):
    """Application settings"""
    
    # Server configuration
    openbb_api_key: str = os.getenv("OPENBB_API_KEY", "")
    # Railway uses PORT env var; fall back to OPENBB_PORT for local dev
    openbb_port: int = int(os.getenv("PORT", os.getenv("OPENBB_PORT", "8001")))
    openbb_host: str = os.getenv("OPENBB_HOST", "0.0.0.0")
    
    # Environment
    log_level: str = os.getenv("LOG_LEVEL", "INFO")
    environment: str = os.getenv("ENVIRONMENT", "development")
    
    # CORS
    # Use string here (instead of List[str]) to avoid pydantic-settings attempting
    # JSON parsing for env vars like `ALLOWED_ORIGINS=*` or comma-separated lists.
    allowed_origins: str = os.getenv(
        "ALLOWED_ORIGINS",
        "http://localhost:3000,http://localhost:5173",
    )
    
    # API Configuration
    mcp_api_key: str = os.getenv("MCP_API_KEY", "")
    
    class Config:
        env_file = "../.env"
        case_sensitive = False


# Global settings instance
settings = Settings()


def get_settings() -> Settings:
    """Get application settings"""
    return settings
