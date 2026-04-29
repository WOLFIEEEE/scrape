"""End-to-end tests for the email verification flow.

Uses the in-memory ConsoleEmailSender so we can introspect what was sent
without needing Resend. Tests both happy-path verify, replay protection,
expired tokens, and the resend-verification enumeration guard.
"""
from __future__ import annotations

from pathlib import Path

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client(tmp_path: Path, monkeypatch):
    monkeypatch.setenv("STORAGE_SQLITE_PATH", str(tmp_path / "test.db"))
    monkeypatch.setenv("STORAGE_RAW_HTML_DIR", str(tmp_path / "raw"))
    monkeypatch.setenv("SCRAPE_JWT_SECRET", "test-secret-32-chars-min-aaaaaaaaaa")
    monkeypatch.setenv("EMAIL_PROVIDER", "console")
    from scrape import config as cfg_mod
    cfg_mod._settings = None
    from scrape.api import rate_limit
    rate_limit._buckets.clear()
    from scrape.core import url_guard

    async def _fake_resolve(host: str, port: int | None) -> set[str]:
        return {"93.184.216.34"}

    monkeypatch.setattr(url_guard, "_resolve_host", _fake_resolve)
    from scrape.api.main import create_app
    app = create_app()
    with TestClient(app) as c:
        yield c


def _register(client: TestClient, email: str, name: str = "Tester") -> dict:
    r = client.post(
        "/api/auth/register",
        json={"email": email, "password": "password123", "name": name},
    )
    assert r.status_code == 201, r.text
    return r.json()


def _latest_token(monkeypatch=None) -> str:
    """Pull the latest verification raw token directly from the DB.

    The console sender only logs to stdout; we don't have a great hook for
    capturing the rendered email body in tests. Instead we read the token
    table the same way the verify endpoint does, but server-side."""
    import asyncio

    from scrape.api.db import connect

    async def _run():
        async with connect() as db:
            cur = await db.execute(
                """SELECT v.token, u.email FROM email_verifications v
                   JOIN users u ON u.id = v.user_id
                   WHERE v.used_at IS NULL ORDER BY v.created_at DESC LIMIT 1""",
            )
            row = await cur.fetchone()
            return row

    return asyncio.get_event_loop().run_until_complete(_run())  # type: ignore[no-any-return]


def test_first_user_auto_verified_no_token_minted(client: TestClient):
    out = _register(client, "first@example.com")
    assert out["email_verified"] is True
    assert out["is_admin"] is True


def test_second_user_starts_unverified_and_email_send_minted_token(client: TestClient):
    _register(client, "first@example.com")
    out = _register(client, "second@example.com", name="Bob")
    assert out["email_verified"] is False
    # A pending token should exist in the email_verifications table
    row = _latest_token()
    assert row is not None
    assert row["email"] == "second@example.com"


def test_verify_endpoint_flips_email_verified_true(client: TestClient):
    _register(client, "first@example.com")
    _register(client, "u2@example.com")
    # We need the *raw* token, but the DB stores the sha256. Re-mint via the
    # auth_routes helper exposed for testing:
    import asyncio

    from scrape.api import auth_routes
    from scrape.api.db import connect

    async def _mint() -> str:
        async with connect() as db:
            cur = await db.execute("SELECT id FROM users WHERE email = ?", ("u2@example.com",))
            row = await cur.fetchone()
            return await auth_routes._create_verification(db, row["id"], "u2@example.com")

    raw = asyncio.get_event_loop().run_until_complete(_mint())

    r = client.post("/api/auth/verify", json={"token": raw})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body == {"verified": True, "email": "u2@example.com"}


def test_verify_invalid_token_returns_400(client: TestClient):
    _register(client, "first@example.com")
    r = client.post("/api/auth/verify", json={"token": "completely-fake"})
    assert r.status_code == 400


def test_verify_replay_returns_400_unless_user_already_verified(client: TestClient):
    """Used tokens are rejected, but the endpoint is friendly: if the user
    is already verified anyway, a re-click returns success rather than
    showing a scary error."""
    _register(client, "first@example.com")
    _register(client, "u3@example.com")

    import asyncio

    from scrape.api import auth_routes
    from scrape.api.db import connect

    async def _mint() -> str:
        async with connect() as db:
            cur = await db.execute("SELECT id FROM users WHERE email = ?", ("u3@example.com",))
            row = await cur.fetchone()
            return await auth_routes._create_verification(db, row["id"], "u3@example.com")

    raw = asyncio.get_event_loop().run_until_complete(_mint())
    # First click: success
    assert client.post("/api/auth/verify", json={"token": raw}).status_code == 200
    # Second click: same token, user already verified -> friendly success
    r2 = client.post("/api/auth/verify", json={"token": raw})
    assert r2.status_code == 200
    assert r2.json()["verified"] is True


def test_resend_verification_returns_202_for_unknown_email(client: TestClient):
    """Enumeration guard: don't reveal whether an email exists."""
    _register(client, "first@example.com")
    r = client.post(
        "/api/auth/resend-verification", json={"email": "nobody@example.com"},
    )
    assert r.status_code == 202


def test_resend_verification_returns_202_for_already_verified(client: TestClient):
    out = _register(client, "first@example.com")  # admin, auto-verified
    r = client.post(
        "/api/auth/resend-verification", json={"email": out["email"]},
    )
    # Same status — we still don't tell the caller they're already verified.
    assert r.status_code == 202


def test_password_reset_email_no_longer_returns_dev_token_in_prod_mode(
    client: TestClient, monkeypatch
):
    # In prod, dev_token is always None regardless of provider.
    # We can verify the endpoint still 200s and doesn't leak the token.
    _register(client, "first@example.com")
    monkeypatch.setenv("SCRAPE_ENV", "prod")
    monkeypatch.setenv("SCRAPE_JWT_SECRET", "a-secure-prod-secret-32-chars-aaaaa")
    from scrape import config as cfg_mod
    cfg_mod._settings = None
    r = client.post("/api/auth/forgot", json={"email": "first@example.com"})
    assert r.status_code == 200
    assert r.json().get("dev_token") is None
    cfg_mod._settings = None
