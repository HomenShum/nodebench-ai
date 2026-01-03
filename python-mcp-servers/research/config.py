"""
Research MCP Server Configuration
"""
import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings"""
    
    # Server configuration
    research_port: int = int(os.getenv("RESEARCH_PORT", "8002"))
    research_host: str = os.getenv("RESEARCH_HOST", "0.0.0.0")
    
    # Convex configuration
    convex_url: str = os.getenv("CONVEX_URL", "")
    convex_deploy_key: str = os.getenv("CONVEX_DEPLOY_KEY", "")
    
    # Security
    mcp_secret: str = os.getenv("MCP_SECRET", "nodebench_dev_secret")
    
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
    
    class Config:
        env_file = "../.env"
        case_sensitive = False


# Global settings instance
settings = Settings()


def get_settings() -> Settings:
    """Get application settings"""
    return settings
