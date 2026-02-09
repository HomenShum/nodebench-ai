"""
Flicker Detection MCP Server Configuration
"""
import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings"""

    # Server configuration
    flicker_port: int = int(os.getenv("PORT", os.getenv("FLICKER_PORT", "8006")))
    flicker_host: str = os.getenv("FLICKER_HOST", "0.0.0.0")

    # External tools
    adb_path: str = os.getenv("ADB_PATH", "adb")
    ffmpeg_path: str = os.getenv("FFMPEG_PATH", "ffmpeg")
    ffprobe_path: str = os.getenv("FFPROBE_PATH", "ffprobe")

    # Analysis defaults
    default_duration_s: int = 10
    max_duration_s: int = 180
    default_fps: int = 15
    default_record_size: str = "720x1280"
    default_bitrate: str = "8000000"

    # Output
    output_base_dir: str = os.getenv("FLICKER_OUTPUT_DIR", "/tmp/flicker_detection")

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
