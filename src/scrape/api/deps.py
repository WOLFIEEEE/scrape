"""FastAPI dependencies: current user from cookie/bearer, DB connection."""
from __future__ import annotations

from collections.abc import AsyncGenerator

import aiosqlite
from fastapi import Cookie, Depends, Header, HTTPException, status

from scrape.api.db import connect
from scrape.api.schemas import UserOut
from scrape.api.security import decode_token


async def get_db() -> AsyncGenerator[aiosqlite.Connection, None]:
    async with connect() as db:
        yield db


def _extract_token(
    cookie_token: str | None,
    auth_header: str | None,
) -> str | None:
    if cookie_token:
        return cookie_token
    if auth_header and auth_header.lower().startswith("bearer "):
        return auth_header.split(" ", 1)[1].strip()
    return None


async def get_current_user(
    db: aiosqlite.Connection = Depends(get_db),
    auth_token: str | None = Cookie(default=None),
    authorization: str | None = Header(default=None),
) -> UserOut:
    token = _extract_token(auth_token, authorization)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="not authenticated")
    user_id: int | None = None
    # API key path: 'sk_live_*' bearer token
    if token.startswith("sk_live_"):
        from scrape.api.api_keys import verify_api_key
        user_id = await verify_api_key(db, token)
    else:
        payload = decode_token(token)
        if payload:
            try:
                user_id = int(payload.get("sub", "0"))
            except (TypeError, ValueError):
                user_id = None
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid token")
    cur = await db.execute(
        "SELECT id, email, name, is_admin, created_at, email_verified FROM users WHERE id = ?",
        (user_id,),
    )
    row = await cur.fetchone()
    if not row:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="user not found")
    return UserOut(
        id=row["id"],
        email=row["email"],
        name=row["name"],
        is_admin=bool(row["is_admin"]),
        created_at=row["created_at"],
        email_verified=bool(row["email_verified"]),
    )


async def get_current_admin(user: UserOut = Depends(get_current_user)) -> UserOut:
    if not user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="admin only")
    return user
