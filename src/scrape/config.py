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
    """Schema-extraction LLM config — OpenRouter (default), Anthropic, or Ollama.

    Backend selection:
      LLM_BACKEND=openrouter (default) → OpenRouter (requires OPENROUTER_API_KEY)
      LLM_BACKEND=anthropic   → use Claude direct (requires ANTHROPIC_API_KEY)
      LLM_BACKEND=ollama      → use a local Ollama server
      LLM_BACKEND=auto        → OpenRouter if key set, else Anthropic, else Ollama
      LLM_BACKEND=none        → LLM extraction disabled
    """
    model_config = SettingsConfigDict(env_prefix="LLM_", env_file=".env", extra="ignore")

    backend: Literal["none", "openrouter", "anthropic", "ollama", "auto"] = "openrouter"

    # --- OpenRouter (default) ---
    openrouter_api_key: str = Field(default="", validation_alias="OPENROUTER_API_KEY")
    openrouter_model: str = Field(
        default="anthropic/claude-haiku-4.5",
        validation_alias="OPENROUTER_MODEL",
    )
    openrouter_base_url: str = Field(
        default="https://openrouter.ai/api/v1",
        validation_alias="OPENROUTER_BASE_URL",
    )
    # Optional attribution headers — OpenRouter shows these on its dashboard.
    openrouter_referer: str = Field(default="", validation_alias="OPENROUTER_REFERER")
    openrouter_app_title: str = Field(default="Scrape", validation_alias="OPENROUTER_APP_TITLE")

    # --- Anthropic (direct) ---
    api_key: str = Field(default="", validation_alias="ANTHROPIC_API_KEY")
    model_fast: str = Field(default="claude-haiku-4-5-20251001", validation_alias="ANTHROPIC_MODEL_FAST")
    model_smart: str = Field(default="claude-sonnet-4-6", validation_alias="ANTHROPIC_MODEL_SMART")

    # --- Ollama (self-hosted) ---
    ollama_url: str = "http://localhost:11434"
    ollama_model: str = "qwen2.5:7b"


class EmailConfig(BaseSettings):
    """Transactional email — Resend (production) or console (dev / self-host).

    Setting EMAIL_PROVIDER=resend without RESEND_API_KEY falls back to the
    console sender with a warning rather than crashing — keeps localhost dev
    safe when someone copies a prod compose file.
    """
    model_config = SettingsConfigDict(env_prefix="EMAIL_", env_file=".env", extra="ignore")

    provider: Literal["auto", "resend", "console", "none"] = "auto"
    # Address strings: include a display name (e.g. "Scrape <noreply@scrape.dev>")
    from_address: str = Field(default="Scrape <noreply@example.com>", validation_alias="EMAIL_FROM")
    support_address: str = Field(default="support@scrape.dev", validation_alias="EMAIL_SUPPORT")
    brand_name: str = Field(default="Scrape", validation_alias="EMAIL_BRAND")

    # Resend (only used when provider is auto+key-present, or explicitly resend)
    resend_api_key: str = Field(default="", validation_alias="RESEND_API_KEY")


class UnblockConfig(BaseSettings):
    """Tier-3 unblock provider — FlareSolverr (self-hosted) or commercial adapters
    (Bright Data Web Unlocker, Scrapfly)."""
    model_config = SettingsConfigDict(env_prefix="UNBLOCK_", env_file=".env", extra="ignore")

    provider: Literal["none", "flaresolverr", "brightdata", "scrapfly"] = "none"
    endpoint: str = "http://localhost:8191"
    timeout_s: int = 60
    # Commercial provider credentials. Read from env so they live in .env, not
    # in the docker-compose YAML or images.
    brightdata_api_key: str = Field(default="", validation_alias="BRIGHTDATA_API_KEY")
    brightdata_zone: str = Field(default="web_unlocker1", validation_alias="BRIGHTDATA_ZONE")
    scrapfly_api_key: str = Field(default="", validation_alias="SCRAPFLY_API_KEY")


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
    allow_private_networks: bool = False


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    env: Literal["dev", "prod"] = Field(
        default="dev",
        validation_alias=AliasChoices("SCRAPE_ENV", "ENV"),
    )
    log_level: str = "INFO"
    metrics_port: int = Field(
        default=9090,
        ge=0,
        le=65535,
        validation_alias=AliasChoices("SCRAPE_METRICS_PORT", "METRICS_PORT"),
    )
    jwt_secret: str = Field(default="", validation_alias="SCRAPE_JWT_SECRET")
    cookie_secure: bool = Field(default=False, validation_alias="SCRAPE_COOKIE_SECURE")
    cors_origins: str = Field(
        default="http://localhost:3000,http://127.0.0.1:3000",
        validation_alias="SCRAPE_CORS_ORIGINS",
    )
    trust_proxy_headers: bool = Field(default=False, validation_alias="SCRAPE_TRUST_PROXY_HEADERS")
    smtp_url: str = Field(default="", validation_alias="SCRAPE_SMTP_URL")

    # Public origin used to build email verification + reset URLs.
    public_url: str = Field(
        default="http://localhost:3000",
        validation_alias=AliasChoices("SCRAPE_PUBLIC_URL", "PUBLIC_URL"),
    )
    proxy: ProxyConfig = Field(default_factory=ProxyConfig)
    captcha: CaptchaConfig = Field(default_factory=CaptchaConfig)
    llm: LLMConfig = Field(default_factory=LLMConfig)
    unblock: UnblockConfig = Field(default_factory=UnblockConfig)
    email: EmailConfig = Field(default_factory=EmailConfig)
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
