"""Shared data models passed between tiers and pipelines."""
from __future__ import annotations

from datetime import UTC, datetime
from enum import IntEnum, StrEnum
from typing import Any, Literal

from pydantic import BaseModel, Field, HttpUrl


class Tier(IntEnum):
    HTTP = 0       # curl_cffi
    BROWSER = 1    # Camoufox / Playwright
    CAPTCHA = 2    # Browser + CAPTCHA solver
    UNBLOCK = 3    # Managed third-party fallback


class BlockReason(StrEnum):
    NONE = "none"
    STATUS_4XX = "status_4xx"
    STATUS_5XX = "status_5xx"
    CHALLENGE_PAGE = "challenge_page"
    CAPTCHA_REQUIRED = "captcha_required"
    EMPTY_BODY = "empty_body"
    TIMEOUT = "timeout"
    NETWORK = "network"
    RATE_LIMITED = "rate_limited"
    FORBIDDEN_HOST = "forbidden_host"


CaptchaKindLiteral = Literal["turnstile", "recaptcha_v3", "hcaptcha"]


class FetchRequest(BaseModel):
    url: HttpUrl
    method: str = "GET"
    headers: dict[str, str] = Field(default_factory=dict)
    body: bytes | None = None
    cookies: dict[str, str] = Field(default_factory=dict)
    tier: Tier = Tier.HTTP
    max_tier: Tier = Tier.UNBLOCK
    # When set, Tier 2 skips its (fragile) HTML-pattern auto-detect and asks
    # the solver for this specific kind. Useful for jobs where the operator
    # already knows the target ships hCaptcha and our regex would miss it.
    captcha_hint: CaptchaKindLiteral | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class FetchResult(BaseModel):
    url: str
    final_url: str
    status: int
    headers: dict[str, str] = Field(default_factory=dict)
    body: bytes
    elapsed_ms: int
    tier_used: Tier
    proxy_used: str | None = None
    fingerprint_id: str | None = None
    fetched_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    block_reason: BlockReason = BlockReason.NONE
    # Cost telemetry — written by the tier that incurred each cost.
    # proxy_bytes counts request+response bytes that flowed through the rented
    # proxy. Browser/unblock tiers that don't go through our proxy leave it 0.
    proxy_bytes: int = 0
    # solver_cost_usd is the per-fetch CAPTCHA spend (filled in by Tier 2).
    # Kept as USD to match how solver providers price their tasks.
    solver_cost_usd: float = 0.0

    @property
    def text(self) -> str:
        # Best-effort decode; charset detection happens in extractors when needed
        try:
            return self.body.decode("utf-8")
        except UnicodeDecodeError:
            return self.body.decode("utf-8", errors="replace")

    @property
    def ok(self) -> bool:
        return 200 <= self.status < 400 and self.block_reason == BlockReason.NONE


class ExtractedRecord(BaseModel):
    url: str
    extracted_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    schema_name: str
    data: dict[str, Any]
    confidence: float = 1.0
