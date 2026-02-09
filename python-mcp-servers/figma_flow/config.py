"""
Figma Flow Analysis MCP Server Configuration
"""
import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings"""

    # Server configuration
    figma_flow_port: int = int(os.getenv("PORT", os.getenv("FIGMA_FLOW_PORT", "8007")))
    figma_flow_host: str = os.getenv("FIGMA_FLOW_HOST", "0.0.0.0")

    # Figma API
    figma_access_token: str = os.getenv("FIGMA_ACCESS_TOKEN", "")

    # Output
    output_base_dir: str = os.getenv("FIGMA_OUTPUT_DIR", "/tmp/figma_flow")

    # Environment
    log_level: str = os.getenv("LOG_LEVEL", "INFO")
    environment: str = os.getenv("ENVIRONMENT", "development")

    # CORS
    allowed_origins: str = os.getenv(
        "ALLOWED_ORIGINS",
        "http://localhost:3000,http://localhost:5173",
    )

    class Config:
        env_file = "../.env"
        case_sensitive = False


settings = Settings()


def get_settings() -> Settings:
    """Get application settings"""
    return settings
