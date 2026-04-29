"""Auth endpoints — register, login, logout, /me, verify."""
from __future__ import annotations

import asyncio
import hashlib
import secrets
from datetime import UTC, datetime, timedelta

import aiosqlite
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel, EmailStr

from scrape.api import email as email_mod
from scrape.api import email_templates
from scrape.api.db import now_iso
from scrape.api.deps import get_current_user, get_db
from scrape.api.rate_limit import check as rate_check
from scrape.api.schemas import UserLogin, UserOut, UserRegister
from scrape.api.security import hash_password, issue_token, verify_password
from scrape.config import get_settings
from scrape.logging import get_logger

log = get_logger(__name__)

router = APIRouter(prefix="/api/auth", tags=["auth"])

# Module-level set keeping references to fire-and-forget email tasks alive
# until they finish. Without this asyncio may GC the task before the HTTP
# call completes — a known footgun in 3.11+ (see PEP 663 / RUF006).
_bg_tasks: set[asyncio.Task[None]] = set()


def _spawn(coro: object) -> None:
    """Schedule a fire-and-forget task that won't be GC'd mid-flight."""
    t = asyncio.create_task(coro)  # type: ignore[arg-type]
    _bg_tasks.add(t)
    t.add_done_callback(_bg_tasks.discard)


# Verification token lives for a week. Long enough that users on a vacation
# can still finish onboarding when they get back; short enough that an
# expired token is genuinely informative if it gets used.
_VERIFY_TTL_HOURS = 168


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


async def _create_verification(db: aiosqlite.Connection, user_id: int, email: str) -> str:
    """Mint a fresh single-use verification token. Returns the user-facing
    raw token (we store only its sha256). Invalidates any prior unused
    tokens for this user so /resend-verification has clean semantics."""
    raw = secrets.token_urlsafe(32)
    h = _hash_token(raw)
    expires = (datetime.now(UTC) + timedelta(hours=_VERIFY_TTL_HOURS)).isoformat()
    # Invalidate prior tokens — any prior /resend supersedes itself.
    await db.execute(
        "DELETE FROM email_verifications WHERE user_id = ? AND used_at IS NULL",
        (user_id,),
    )
    await db.execute(
        """INSERT INTO email_verifications (token, user_id, expires_at, sent_to, created_at)
           VALUES (?, ?, ?, ?, ?)""",
        (h, user_id, expires, email, now_iso()),
    )
    await db.commit()
    return raw


async def _send_verification_email(*, name: str, email: str, raw_token: str) -> None:
    """Build and dispatch the verification email. Errors are logged, not
    raised — registration must not fail just because email is flaky."""
    settings = get_settings()
    verify_url = f"{settings.public_url.rstrip('/')}/verify/{raw_token}"
    msg = email_templates.verification_email(
        recipient=email, recipient_name=name,
        verify_url=verify_url, expires_in_hours=_VERIFY_TTL_HOURS,
    )
    try:
        await email_mod.send(msg)
    except Exception as e:  # belt-and-braces; sender already swallows
        log.warning("auth.verification_email_send_failed", to=email, error=str(e))


_COOKIE_NAME = "auth_token"
_COOKIE_MAX_AGE = 7 * 24 * 3600  # one week


def _set_cookie(resp: Response, token: str) -> None:
    """HttpOnly cookie. SameSite=Lax works for same-site SPA + API.
    Set SCRAPE_COOKIE_SECURE=1 in prod (HTTPS) for the Secure flag.
    """
    settings = get_settings()
    secure = settings.cookie_secure or settings.env == "prod"
    resp.set_cookie(
        _COOKIE_NAME, token,
        max_age=_COOKIE_MAX_AGE,
        httponly=True,
        secure=secure,
        samesite="lax",
        path="/",
    )


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def register(
    body: UserRegister,
    request: Request,
    response: Response,
    db: aiosqlite.Connection = Depends(get_db),
) -> UserOut:
    rate_check(request, "register")
    cur = await db.execute("SELECT 1 FROM users WHERE email = ?", (body.email.lower(),))
    if await cur.fetchone():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="email already registered")
    # First registered user becomes admin — convenient for self-hosted single-user setups.
    cur = await db.execute("SELECT COUNT(*) as c FROM users")
    count_row = await cur.fetchone()
    is_first = count_row is not None and count_row["c"] == 0
    # First user is auto-verified — they're the admin of a self-hosted box
    # and shouldn't have to wait on email to use their own deployment.
    auto_verify = 1 if is_first else 0
    verified_at = now_iso() if is_first else None
    cur = await db.execute(
        """INSERT INTO users (email, password_hash, name, is_admin, email_verified, verified_at, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (
            body.email.lower(), hash_password(body.password), body.name,
            1 if is_first else 0, auto_verify, verified_at, now_iso(),
        ),
    )
    await db.commit()
    user_id = cur.lastrowid
    if user_id is None:
        raise HTTPException(status_code=500, detail="failed to create user")

    # Mint + dispatch verification email for non-admin signups. Done in the
    # background so registration latency stays sub-second even when Resend
    # is slow.
    if not is_first:
        raw = await _create_verification(db, user_id, body.email.lower())
        _spawn(_send_verification_email(name=body.name, email=body.email.lower(), raw_token=raw))

    token = issue_token(user_id)
    _set_cookie(response, token)
    cur = await db.execute(
        "SELECT id, email, name, is_admin, created_at, email_verified FROM users WHERE id = ?",
        (user_id,),
    )
    row = await cur.fetchone()
    if not row:
        raise HTTPException(status_code=500, detail="failed to load user")
    return UserOut(
        id=row["id"], email=row["email"], name=row["name"],
        is_admin=bool(row["is_admin"]), created_at=row["created_at"],
        email_verified=bool(row["email_verified"]),
    )


@router.post("/login", response_model=UserOut)
async def login(
    body: UserLogin,
    request: Request,
    response: Response,
    db: aiosqlite.Connection = Depends(get_db),
) -> UserOut:
    rate_check(request, "login")
    cur = await db.execute(
        """SELECT id, email, name, is_admin, password_hash, created_at, email_verified
           FROM users WHERE email = ?""",
        (body.email.lower(),),
    )
    row = await cur.fetchone()
    if not row or not verify_password(body.password, row["password_hash"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid credentials")
    token = issue_token(row["id"])
    _set_cookie(response, token)
    return UserOut(
        id=row["id"], email=row["email"], name=row["name"],
        is_admin=bool(row["is_admin"]), created_at=row["created_at"],
        email_verified=bool(row["email_verified"]),
    )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(response: Response) -> None:
    response.delete_cookie(_COOKIE_NAME, path="/")


@router.get("/me", response_model=UserOut)
async def me(user: UserOut = Depends(get_current_user)) -> UserOut:
    return user


# --- email verification ---------------------------------------------------

class VerifyRequest(BaseModel):
    token: str


class VerifyResponse(BaseModel):
    verified: bool
    email: EmailStr | None = None


@router.post("/verify", response_model=VerifyResponse)
async def verify_email(
    body: VerifyRequest,
    request: Request,
    db: aiosqlite.Connection = Depends(get_db),
) -> VerifyResponse:
    """Consume a verification token and mark the user verified.

    Idempotent in the sense that it never returns an error if the user is
    already verified — but it does return 400 on a token that was used or
    is expired, so the UI can show the right copy.
    """
    rate_check(request, "verify")
    h = _hash_token(body.token)
    cur = await db.execute(
        """SELECT v.token, v.user_id, v.expires_at, v.used_at, u.email, u.email_verified
           FROM email_verifications v
           JOIN users u ON u.id = v.user_id
           WHERE v.token = ?""",
        (h,),
    )
    row = await cur.fetchone()
    if not row:
        raise HTTPException(status_code=400, detail="invalid token")
    if row["used_at"] is not None:
        # Already-consumed token — but if the user IS now verified, treat
        # the link as a successful no-op rather than scaring them with an
        # error. Common when someone clicks the link twice.
        if row["email_verified"]:
            return VerifyResponse(verified=True, email=row["email"])
        raise HTTPException(status_code=400, detail="token already used")
    if datetime.fromisoformat(row["expires_at"]) < datetime.now(UTC):
        raise HTTPException(status_code=400, detail="token expired")

    now = now_iso()
    await db.execute(
        "UPDATE email_verifications SET used_at = ? WHERE token = ?",
        (now, row["token"]),
    )
    await db.execute(
        "UPDATE users SET email_verified = 1, verified_at = COALESCE(verified_at, ?) WHERE id = ?",
        (now, row["user_id"]),
    )
    await db.commit()
    log.info("auth.email_verified", user_id=row["user_id"], email=row["email"])

    # Welcome email — fire-and-forget, doesn't block the response.
    settings = get_settings()
    cur = await db.execute("SELECT name FROM users WHERE id = ?", (row["user_id"],))
    name_row = await cur.fetchone()
    name = (name_row["name"] if name_row else "") or ""
    docs_url = f"{settings.public_url.rstrip('/')}/docs"

    async def _send_welcome() -> None:
        try:
            await email_mod.send(email_templates.welcome_email(
                recipient=row["email"], recipient_name=name,
                app_url=settings.public_url, docs_url=docs_url,
            ))
        except Exception as e:
            log.warning("auth.welcome_email_failed", error=str(e))

    _spawn(_send_welcome())
    return VerifyResponse(verified=True, email=row["email"])


class ResendVerifyRequest(BaseModel):
    email: EmailStr


@router.post("/resend-verification", status_code=status.HTTP_202_ACCEPTED)
async def resend_verification(
    body: ResendVerifyRequest,
    request: Request,
    db: aiosqlite.Connection = Depends(get_db),
) -> dict[str, bool]:
    """Re-issue a verification email. Always returns 202 regardless of
    whether the email matches a real account — protects against signup
    email enumeration."""
    rate_check(request, "resend_verify")
    cur = await db.execute(
        "SELECT id, name, email_verified FROM users WHERE email = ?",
        (body.email.lower(),),
    )
    row = await cur.fetchone()
    if row and not row["email_verified"]:
        raw = await _create_verification(db, row["id"], body.email.lower())
        _spawn(_send_verification_email(
            name=row["name"] or "", email=body.email.lower(), raw_token=raw,
        ))
    return {"sent": True}
