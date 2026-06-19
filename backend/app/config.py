from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://inkyourshoes@localhost:5432/victorylap"
    secret_key: str = "change-me-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24  # 1 day

    # Comma-separated list of allowed CORS origins, e.g. "https://app.vercel.app,http://localhost:5173"
    allowed_origins: str = "http://localhost:5173"

    # Cloudinary (required in production for file uploads)
    cloudinary_cloud_name: str = ""
    cloudinary_api_key: str = ""
    cloudinary_api_secret: str = ""

    # Anthropic (for Victory Feed generation)
    anthropic_api_key: str = ""

    class Config:
        env_file = ".env"


settings = Settings()
