"""
Application Settings and Environment Configuration.
"""
from typing import List, Union
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "LocalLens API"
    VERSION: str = "0.1.0"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "development"

    # PostgreSQL + PostGIS Database
    POSTGRES_USER: str = "locallens_user"
    POSTGRES_PASSWORD: str = "locallens_password"
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_DB: str = "locallens_db"
    DATABASE_URL: str = "postgresql://locallens_user:locallens_password@localhost:5432/locallens_db"

    # Redis
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_URL: str = "redis://localhost:6379/0"

    # Security
    JWT_SECRET: str = "development_secret_key_change_in_production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24

    # External APIs
    MAP_API_KEY: str = ""
    WEATHER_API_KEY: str = "9fb8d155eeb443116f6d35e81215a121"
    OPENWEATHER_API_KEY: str = "9fb8d155eeb443116f6d35e81215a121"
    LLM_API_KEY: str = ""
    GROQ_API_KEY: str = ""

    # Gemini Recommendation Engine Configuration
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-1.5-flash"

    # Supabase Configuration
    SUPABASE_URL: str = "https://mvokdnefwukzouuttsvz.supabase.co"
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    SUPABASE_ANON_KEY: str = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12b2tkbmVmd3Vrem91dXR0c3Z6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAzNTA1NzksImV4cCI6MjEwNTkyNjU3OX0.KsNjS6EP6hyw2-JZlKgvV3AdqpZudVGCI7guH0YE9w4"
    SUPABASE_JWT_SECRET: str = ""
    SUPABASE_JWT_ISSUER: str = "https://mvokdnefwukzouuttsvz.supabase.co/auth/v1"
    SUPABASE_JWT_JWKS_URL: str = "https://mvokdnefwukzouuttsvz.supabase.co/auth/v1/.well-known/jwks.json"
    GEOCODING_API_KEY: str = ""

    # Nugen AI Integration (Post-generation enhancement & validation layer)
    NUGEN_ENABLED: bool = False
    NUGEN_API_KEY: str = ""
    NUGEN_MODEL: str = "nugen-flash-instruct"
    NUGEN_API_URL: str = ""

    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:3001"]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="allow",
    )


settings = Settings()
