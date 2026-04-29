"""Account management: change password, delete account, API keys, webhooks, usage."""
from __future__ import annotations

import hashlib
import json
import secrets
from datetime import UTC, datetime, timedelta
from typing import Literal

import aiosqlite
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, EmailStr, Field, HttpUrl

from scrape.api.api_keys import create_api_key
from scrape.api.db import now_iso
from scrape.api.deps import get_current_user, get_db
from scrape.api.rate_limit import check as rate_check
from scrape.api.schemas import UserOut
from scrape.api.security import hash_password, verify_password
from scrape.api.usage import concurrent_running, current_usage
from scrape.config import get_settings
from scrape.core.url_guard import UnsafeUrlError, validate_public_http_url

router = APIRouter(prefix="/api", tags=["account"])


# --- account ---------------------------------------------------------------

class ChangePassword(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8, max_length=128)


@router.post("/account/password", status_code=status.HTTP_204_NO_CONTENT)
async def change_password(
    body: ChangePassword,
    user: UserOut = Depends(get_current_user),
    db: aiosqlite.Connection = Depends(get_db),
) -> None:
    cur = await db.execute("SELECT password_hash FROM users WHERE id = ?", (user.id,))
    row = await cur.fetchone()
    if not row or not verify_password(body.current_password, row["password_hash"]):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="current password is wrong")
    await db.execute(
        "UPDATE users SET password_hash = ? WHERE id = ?",
        (hash_password(body.new_password), user.id),
    )
    await db.commit()


class UpdateProfile(BaseModel):
    name: str = Field(default="", max_length=80)


@router.patch("/account/profile", response_model=UserOut)
async def update_profile(
    body: UpdateProfile,
    user: UserOut = Depends(get_current_user),
    db: aiosqlite.Connection = Depends(get_db),
) -> UserOut:
    await db.execute("UPDATE users SET name = ? WHERE id = ?", (body.name, user.id))
    await db.commit()
    return UserOut(id=user.id, email=user.email, name=body.name, is_admin=user.is_admin, created_at=user.created_at)


@router.delete("/account", status_code=status.HTTP_204_NO_CONTENT)
async def delete_account(
    user: UserOut = Depends(get_current_user),
    db: aiosqlite.Connection = Depends(get_db),
) -> None:
    # Cascades wipe jobs, api_keys, webhooks (FK ON DELETE CASCADE).
    await db.execute("DELETE FROM users WHERE id = ?", (user.id,))
    await db.commit()


# --- password reset --------------------------------------------------------

class ForgotRequest(BaseModel):
    email: EmailStr


class ForgotResponse(BaseModel):
    sent: bool = True
    dev_token: str | None = None


_RESET_TTL_MIN = 30


def _hash_reset_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


@router.post("/auth/forgot", response_model=ForgotResponse)
async def forgot(
    body: ForgotRequest,
    request: Request,
    db: aiosqlite.Connection = Depends(get_db),
) -> ForgotResponse:
    rate_check(request, "forgot")
    cur = await db.execute(
        "SELECT id, name FROM users WHERE email = ?", (body.email.lower(),),
    )
    row = await cur.fetchone()
    if not row:
        # Don't leak whether the email exists. Return success silently.
        return ForgotResponse()
    token = secrets.token_urlsafe(32)
    token_hash = _hash_reset_token(token)
    expires = (datetime.now(UTC) + timedelta(minutes=_RESET_TTL_MIN)).isoformat()
    await db.execute(
        "DELETE FROM password_resets WHERE user_id = ? AND (used_at IS NOT NULL OR expires_at < ?)",
        (row["id"], now_iso()),
    )
    await db.execute(
        "INSERT INTO password_resets (token, user_id, expires_at) VALUES (?, ?, ?)",
        (token_hash, row["id"], expires),
    )
    await db.commit()

    # Send the reset email in the background — registration / forgot must
    # return quickly so the UI feels responsive even if Resend is slow.
    settings = get_settings()
    reset_url = f"{settings.public_url.rstrip('/')}/reset/{token}"
    name = (row["name"] if row["name"] is not None else "") or ""

    async def _send() -> None:
        import contextlib

        from scrape.api import email as email_mod
        from scrape.api import email_templates
        with contextlib.suppress(Exception):  # safety net; sender already swallows
            await email_mod.send(email_templates.password_reset_email(
                recipient=body.email.lower(), recipient_name=name,
                reset_url=reset_url, expires_in_minutes=_RESET_TTL_MIN,
            ))

    # Use the auth_routes background-task helper so the task isn't GC'd
    # before its HTTP call completes (PEP 663 / RUF006).
    from scrape.api.auth_routes import _spawn
    _spawn(_send())

    # Dev-mode helper: when the configured sender is the console one
    # (i.e. local dev with no Resend key), surface the token in the
    # response so the dashboard can build a clickable link without
    # reading server logs. Prod always returns None.
    from scrape.api import email as email_mod
    sender_name = getattr(email_mod._sender, "name", "") if email_mod._sender else ""
    dev_token = (
        token if settings.env != "prod" and sender_name in ("console", "")
        else None
    )
    return ForgotResponse(dev_token=dev_token)


class ResetRequest(BaseModel):
    token: str
    new_password: str = Field(min_length=8, max_length=128)


@router.post("/auth/reset", status_code=status.HTTP_204_NO_CONTENT)
async def reset(
    body: ResetRequest,
    request: Request,
    db: aiosqlite.Connection = Depends(get_db),
) -> None:
    rate_check(request, "reset")
    token_hash = _hash_reset_token(body.token)
    cur = await db.execute(
        "SELECT token, user_id, expires_at, used_at FROM password_resets WHERE token IN (?, ?)",
        (token_hash, body.token),
    )
    row = await cur.fetchone()
    if not row:
        raise HTTPException(status_code=400, detail="invalid or expired token")
    if row["used_at"] is not None:
        raise HTTPException(status_code=400, detail="token already used")
    if datetime.fromisoformat(row["expires_at"]) < datetime.now(UTC):
        raise HTTPException(status_code=400, detail="token expired")
    await db.execute(
        "UPDATE users SET password_hash = ? WHERE id = ?",
        (hash_password(body.new_password), row["user_id"]),
    )
    await db.execute("UPDATE password_resets SET used_at = ? WHERE token = ?", (now_iso(), row["token"]))
    await db.commit()


# --- API keys --------------------------------------------------------------

class ApiKeyCreate(BaseModel):
    name: str = Field(min_length=1, max_length=80)


class ApiKeyOut(BaseModel):
    id: int
    name: str
    prefix: str
    last_used_at: datetime | None
    created_at: datetime
    revoked: bool = False


class ApiKeyCreateResponse(ApiKeyOut):
    secret: str  # shown once


@router.get("/keys", response_model=list[ApiKeyOut])
async def list_keys(
    user: UserOut = Depends(get_current_user),
    db: aiosqlite.Connection = Depends(get_db),
) -> list[ApiKeyOut]:
    cur = await db.execute(
        """SELECT id, name, prefix, last_used_at, created_at, revoked_at
           FROM api_keys WHERE user_id = ? ORDER BY datetime(created_at) DESC""",
        (user.id,),
    )
    rows = await cur.fetchall()
    return [
        ApiKeyOut(
            id=r["id"], name=r["name"], prefix=r["prefix"],
            last_used_at=r["last_used_at"], created_at=r["created_at"],
            revoked=bool(r["revoked_at"]),
        )
        for r in rows
    ]


@router.post("/keys", response_model=ApiKeyCreateResponse, status_code=status.HTTP_201_CREATED)
async def create_key(
    body: ApiKeyCreate,
    user: UserOut = Depends(get_current_user),
    db: aiosqlite.Connection = Depends(get_db),
) -> ApiKeyCreateResponse:
    key_id, prefix, secret = await create_api_key(db, user.id, body.name, now_iso())
    cur = await db.execute("SELECT created_at FROM api_keys WHERE id = ?", (key_id,))
    row = await cur.fetchone()
    if not row:
        raise HTTPException(status_code=500, detail="failed to create API key")
    return ApiKeyCreateResponse(
        id=key_id, name=body.name, prefix=prefix, last_used_at=None,
        created_at=row["created_at"], revoked=False, secret=secret,
    )


@router.delete("/keys/{key_id}", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_key(
    key_id: int,
    user: UserOut = Depends(get_current_user),
    db: aiosqlite.Connection = Depends(get_db),
) -> None:
    cur = await db.execute(
        "UPDATE api_keys SET revoked_at = ? WHERE id = ? AND user_id = ?",
        (now_iso(), key_id, user.id),
    )
    if cur.rowcount == 0:
        raise HTTPException(status_code=404, detail="key not found")
    await db.commit()


# --- webhooks --------------------------------------------------------------

WebhookEvent = Literal["job.completed", "job.failed", "job.cancelled"]


def _default_webhook_events() -> list[WebhookEvent]:
    return ["job.completed"]


class WebhookCreate(BaseModel):
    url: HttpUrl
    events: list[WebhookEvent] = Field(default_factory=_default_webhook_events)


class WebhookOut(BaseModel):
    id: int
    url: str
    events: list[WebhookEvent]
    active: bool
    secret: str
    last_status: int | None
    last_attempt_at: datetime | None
    created_at: datetime


@router.get("/webhooks", response_model=list[WebhookOut])
async def list_webhooks(
    user: UserOut = Depends(get_current_user),
    db: aiosqlite.Connection = Depends(get_db),
) -> list[WebhookOut]:
    cur = await db.execute(
        """SELECT id, url, events_json, active, secret, last_status, last_attempt_at, created_at
           FROM webhooks WHERE user_id = ? ORDER BY datetime(created_at) DESC""",
        (user.id,),
    )
    rows = await cur.fetchall()
    out: list[WebhookOut] = []
    for r in rows:
        events = [
            e for e in json.loads(r["events_json"])
            if e in ("job.completed", "job.failed", "job.cancelled")
        ]
        out.append(WebhookOut(
            id=r["id"], url=r["url"], events=events,
            active=bool(r["active"]), secret=r["secret"],
            last_status=r["last_status"], last_attempt_at=r["last_attempt_at"],
            created_at=r["created_at"],
        ))
    return out


@router.post("/webhooks", response_model=WebhookOut, status_code=status.HTTP_201_CREATED)
async def create_webhook(
    body: WebhookCreate,
    user: UserOut = Depends(get_current_user),
    db: aiosqlite.Connection = Depends(get_db),
) -> WebhookOut:
    try:
        await validate_public_http_url(
            str(body.url),
            allow_private=get_settings().crawler.allow_private_networks,
        )
    except UnsafeUrlError as e:
        raise HTTPException(status_code=400, detail=f"unsafe webhook URL: {e}") from e

    secret = "whsec_" + secrets.token_urlsafe(24)
    cur = await db.execute(
        """INSERT INTO webhooks (user_id, url, secret, events_json, created_at)
           VALUES (?, ?, ?, ?, ?)""",
        (user.id, str(body.url), secret, json.dumps(body.events), now_iso()),
    )
    await db.commit()
    wid = int(cur.lastrowid or 0)
    cur = await db.execute("SELECT created_at FROM webhooks WHERE id = ?", (wid,))
    row = await cur.fetchone()
    if not row:
        raise HTTPException(status_code=500, detail="failed to create webhook")
    return WebhookOut(
        id=wid, url=str(body.url), events=body.events, active=True, secret=secret,
        last_status=None, last_attempt_at=None, created_at=row["created_at"],
    )


@router.delete("/webhooks/{webhook_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_webhook(
    webhook_id: int,
    user: UserOut = Depends(get_current_user),
    db: aiosqlite.Connection = Depends(get_db),
) -> None:
    cur = await db.execute(
        "DELETE FROM webhooks WHERE id = ? AND user_id = ?", (webhook_id, user.id),
    )
    if cur.rowcount == 0:
        raise HTTPException(status_code=404, detail="webhook not found")
    await db.commit()


# --- usage -----------------------------------------------------------------

class UsageOut(BaseModel):
    plan: str
    quota: int
    used: int
    remaining: int
    period: str
    percent: float
    over_quota: bool
    concurrent_running: int


@router.get("/usage", response_model=UsageOut)
async def usage(
    user: UserOut = Depends(get_current_user),
    db: aiosqlite.Connection = Depends(get_db),
) -> UsageOut:
    snap = await current_usage(db, user.id)
    running = await concurrent_running(db, user.id)
    return UsageOut(
        plan=snap.plan, quota=snap.quota, used=snap.used, remaining=snap.remaining,
        period=snap.period, percent=snap.percent, over_quota=snap.over_quota,
        concurrent_running=running,
    )
