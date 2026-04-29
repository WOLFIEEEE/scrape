"""Auth endpoints — register, login, logout, /me."""
from __future__ import annotations

import aiosqlite
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status

from scrape.api.db import now_iso
from scrape.api.deps import get_current_user, get_db
from scrape.api.rate_limit import check as rate_check
from scrape.api.schemas import UserLogin, UserOut, UserRegister
from scrape.api.security import hash_password, issue_token, verify_password
from scrape.config import get_settings

router = APIRouter(prefix="/api/auth", tags=["auth"])


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
    cur = await db.execute(
        "INSERT INTO users (email, password_hash, name, is_admin, created_at) VALUES (?, ?, ?, ?, ?)",
        (body.email.lower(), hash_password(body.password), body.name, 1 if is_first else 0, now_iso()),
    )
    await db.commit()
    user_id = cur.lastrowid
    if user_id is None:
        raise HTTPException(status_code=500, detail="failed to create user")
    token = issue_token(user_id)
    _set_cookie(response, token)
    cur = await db.execute(
        "SELECT id, email, name, is_admin, created_at FROM users WHERE id = ?", (user_id,),
    )
    row = await cur.fetchone()
    if not row:
        raise HTTPException(status_code=500, detail="failed to load user")
    return UserOut(
        id=row["id"], email=row["email"], name=row["name"],
        is_admin=bool(row["is_admin"]), created_at=row["created_at"],
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
        "SELECT id, email, name, is_admin, password_hash, created_at FROM users WHERE email = ?",
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
    )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(response: Response) -> None:
    response.delete_cookie(_COOKIE_NAME, path="/")


@router.get("/me", response_model=UserOut)
async def me(user: UserOut = Depends(get_current_user)) -> UserOut:
    return user
