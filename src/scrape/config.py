"""Centralized configuration. All env vars loaded from .env or process env."""
from __future__ import annotations

from pathlib import Path
from typing import Literal

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = ROOT / "data"


class ProxyConfig(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="PROXY_", env_file=".env", extra="ignore")

    provider: Literal["none", "decodo", "iproyal", "brightdata", "custom"] = "none"
    endpoint: str = ""  # e.g. brd.superproxy.io:22225
    username: str = ""
    password: str = ""
    country: str = ""  # ISO 2-letter, optional
    sticky_session_minutes: int = 10


class CaptchaConfig(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="CAPSOLVER_", env_file=".env", extra="ignore")

    api_key: str = ""
    timeout_s: int = 120


class LLMConfig(BaseSettings):
    """Schema-extraction LLM config — supports Anthropic Claude or self-hosted Ollama.

    Backend selection:
      LLM_BACKEND=anthropic   → use Claude (requires ANTHROPIC_API_KEY)
      LLM_BACKEND=ollama      → use a local Ollama server
      LLM_BACKEND=auto        → Anthropic if key set, else Ollama
      LLM_BACKEND=none (default) → LLM extraction disabled
    """
    model_config = SettingsConfigDict(env_prefix="LLM_", env_file=".env", extra="ignore")

    backend: Literal["none", "anthropic", "ollama", "auto"] = "none"

    # --- Anthropic ---
    api_key: str = Field(default="", validation_alias="ANTHROPIC_API_KEY")
    model_fast: str = Field(default="claude-haiku-4-5-20251001", validation_alias="ANTHROPIC_MODEL_FAST")
    model_smart: str = Field(default="claude-sonnet-4-6", validation_alias="ANTHROPIC_MODEL_SMART")

    # --- Ollama (self-hosted) ---
    ollama_url: str = "http://localhost:11434"
    ollama_model: str = "qwen2.5:7b"


class UnblockConfig(BaseSettings):
    """Tier-3 unblock provider — FlareSolverr (self-hosted) or future managed adapters."""
    model_config = SettingsConfigDict(env_prefix="UNBLOCK_", env_file=".env", extra="ignore")

    provider: Literal["none", "flaresolverr"] = "none"
    endpoint: str = "http://localhost:8191"
    timeout_s: int = 60


class StorageConfig(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="STORAGE_", env_file=".env", extra="ignore")

    sqlite_path: Path = DATA_DIR / "scrape.db"
    raw_html_dir: Path = DATA_DIR / "raw"


class RedisConfig(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="REDIS_", env_file=".env", extra="ignore")

    url: str = "redis://localhost:6379/0"
    queue_key: str = "scrape:queue"


class CrawlerConfig(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="CRAWL_", env_file=".env", extra="ignore")

    max_concurrency: int = 16
    per_host_concurrency: int = 2
    per_host_min_delay_ms: int = 500
    request_timeout_s: int = 30
    max_retries: int = 3
    user_warmup: bool = False  # warm cookies on neutral site before target
    respect_robots: bool = True


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    env: Literal["dev", "prod"] = Field(
        default="dev",
        validation_alias=AliasChoices("SCRAPE_ENV", "ENV"),
    )
    log_level: str = "INFO"
    metrics_port: int = Field(default=9090, ge=1, le=65535)
    jwt_secret: str = Field(default="", validation_alias="SCRAPE_JWT_SECRET")
    cookie_secure: bool = Field(default=False, validation_alias="SCRAPE_COOKIE_SECURE")
    cors_origins: str = Field(
        default="http://localhost:3000,http://127.0.0.1:3000",
        validation_alias="SCRAPE_CORS_ORIGINS",
    )
    trust_proxy_headers: bool = Field(default=False, validation_alias="SCRAPE_TRUST_PROXY_HEADERS")
    smtp_url: str = Field(default="", validation_alias="SCRAPE_SMTP_URL")

    proxy: ProxyConfig = Field(default_factory=ProxyConfig)
    captcha: CaptchaConfig = Field(default_factory=CaptchaConfig)
    llm: LLMConfig = Field(default_factory=LLMConfig)
    unblock: UnblockConfig = Field(default_factory=UnblockConfig)
    storage: StorageConfig = Field(default_factory=StorageConfig)
    redis: RedisConfig = Field(default_factory=RedisConfig)
    crawler: CrawlerConfig = Field(default_factory=CrawlerConfig)


_settings: Settings | None = None


def get_settings() -> Settings:
    global _settings
    if _settings is None:
        _settings = Settings()
        _settings.storage.sqlite_path.parent.mkdir(parents=True, exist_ok=True)
        _settings.storage.raw_html_dir.mkdir(parents=True, exist_ok=True)
    return _settings
