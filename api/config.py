"""App configuration, loaded from environment / .env."""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Postgres connection, e.g. postgresql+psycopg://golf:pass@localhost/golf
    database_url: str = "postgresql+psycopg://golf:golf@localhost/golf"
    # Secret used to sign JWTs — MUST be overridden in production.
    jwt_secret: str = "dev-insecure-change-me"
    jwt_algorithm: str = "HS256"
    jwt_expire_days: int = 30
    # Public base URL, used to build invite registration links.
    public_base_url: str = "http://localhost:5173"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
