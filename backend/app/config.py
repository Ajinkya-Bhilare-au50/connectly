from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=BASE_DIR / ".env", extra="ignore")

    env: str = "development"  # development | test | production
    port: int = 3001
    mongo_uri: str = "mongodb://localhost:27017/twitter-clone-db"
    jwt_secret: str
    jwt_expires: int = 3600  # seconds
    cors_origins: str = "*"  # comma separated list, or *
    # Optional regex for extra allowed origins, e.g. Vercel preview URLs: https://connectly-.*\.vercel\.app
    cors_origin_regex: str = ""
    frontend_url: str = "http://localhost:3000"  # used in password-reset links

    @property
    def is_dev_or_test(self) -> bool:
        return self.env in ("development", "test")

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
