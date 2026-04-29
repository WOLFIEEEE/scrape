"""Pydantic request/response models for the API."""
from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, EmailStr, Field, HttpUrl

# --- Auth ------------------------------------------------------------------

class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    name: str = Field(default="", max_length=80)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    email: EmailStr
    name: str
    is_admin: bool
    created_at: datetime


# --- Jobs ------------------------------------------------------------------

JobStatus = Literal["pending", "running", "completed", "failed", "cancelled"]


class JobCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    urls: list[HttpUrl] = Field(min_length=1, max_length=10_000)
    max_tier: int = Field(default=1, ge=0, le=3)
    use_browser: bool = True
    use_llm: bool = False
    schema_name: str | None = Field(default=None, max_length=80)
    extraction_schema: dict[str, Any] | None = None
    # When the operator already knows what CAPTCHA the target ships, override
    # the auto-detector. Useful for hCaptcha rendered in shadow DOM and for
    # SPAs where the widget loads after our content snapshot.
    captcha_hint: Literal["turnstile", "recaptcha_v3", "hcaptcha"] | None = None


class JobOut(BaseModel):
    id: str
    name: str
    status: JobStatus
    max_tier: int
    use_browser: bool
    use_llm: bool
    total: int
    completed: int
    succeeded: int
    error: str | None
    created_at: datetime
    started_at: datetime | None
    finished_at: datetime | None
    captcha_hint: Literal["turnstile", "recaptcha_v3", "hcaptcha"] | None = None


class JobListItem(BaseModel):
    id: str
    name: str
    status: JobStatus
    total: int
    completed: int
    succeeded: int
    created_at: datetime


class FetchOut(BaseModel):
    id: int
    url: str
    final_url: str
    status: int
    tier_used: int
    block_reason: str
    elapsed_ms: int
    body_size: int
    fetched_at: datetime
    proxy_bytes: int = 0
    solver_cost_usd: float = 0.0


class ExtractedOut(BaseModel):
    id: int
    url: str
    schema_name: str
    data: dict[str, Any]
    confidence: float
    extracted_at: datetime


class JobProgress(BaseModel):
    job_id: str
    status: JobStatus
    total: int
    completed: int
    succeeded: int
