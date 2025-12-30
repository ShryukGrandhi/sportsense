"""Configuration management for Pulse AI"""

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""

    # Redis Configuration
    redis_host: str = "localhost"
    redis_port: int = 6379
    redis_db: int = 0

    # Sports Data API
    sports_api_key: str = ""
    sports_api_provider: str = "balldontlie"

    # TTS Configuration
    elevenlabs_api_key: str = ""
    elevenlabs_voice_id: str = ""

    # NLG Model
    nlg_model_name: str = "t5-small"
    nlg_device: str = "cpu"

    # Performance Targets (milliseconds)
    acr_latency_target: int = 200
    data_latency_target: int = 50
    nlg_latency_target: int = 400
    tts_latency_target: int = 100

    # Demo Mode
    demo_mode: bool = True
    demo_data_path: str = "./data/demo_pbp.json"

    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()
