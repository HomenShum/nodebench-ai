"""
Core Agent MCP Server Configuration
"""
import os
from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    """Server settings"""
    environment: str = "development"
    log_level: str = "INFO"
    
    # Server configuration
    core_agent_host: str = "0.0.0.0"
    core_agent_port: int = 8005 # Using 8005 to avoid conflict with others
    
    # Convex Configuration
    convex_url: str = ""
    
    # CORS
    allowed_origins: list = ["*"]
    
    class Config:
        env_file = ".env"
        extra = "ignore"

@lru_cache()
def get_settings():
    return Settings()
