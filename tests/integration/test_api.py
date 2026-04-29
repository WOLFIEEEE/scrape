"""End-to-end API tests using FastAPI TestClient + the real SQLite store.

Verifies the full auth + jobs + keys + webhooks + usage surface against an
ephemeral DB. Does NOT spin up the orchestrator — job creation is tested
but jobs are killed (cancelled) before they actually crawl.
"""
from __future__ import annotations

import sqlite3
from pathlib import Path

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client(tmp_path: Path, monkeypatch):
    monkeypatch.setenv("STORAGE_SQLITE_PATH", str(tmp_path / "test.db"))
    monkeypatch.setenv("STORAGE_RAW_HTML_DIR", str(tmp_path / "raw"))
    monkeypatch.setenv("SCRAPE_JWT_SECRET", "test-secret-32-chars-min-aaaaaaaaaa")
    # Reset cached settings + rate-limit buckets so each test starts clean
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


@pytest.fixture
def authed_client(client):
    r = client.post("/api/auth/register", json={"email": "alice@example.com", "password": "password123", "name": "A"})
    assert r.status_code == 201, r.text
    return client


def test_health(client):
    r = client.get("/api/health")
    assert r.status_code == 200 and r.json()["status"] == "ok"


def test_prod_requires_strong_jwt_secret(tmp_path: Path, monkeypatch):
    monkeypatch.setenv("STORAGE_SQLITE_PATH", str(tmp_path / "test.db"))
    monkeypatch.setenv("STORAGE_RAW_HTML_DIR", str(tmp_path / "raw"))
    monkeypatch.setenv("SCRAPE_ENV", "dev")
    monkeypatch.setenv("SCRAPE_JWT_SECRET", "test-secret-32-chars-min-aaaaaaaaaa")
    from scrape import config as cfg_mod

    cfg_mod._settings = None
    from scrape.api import main as main_mod

    monkeypatch.setenv("SCRAPE_ENV", "prod")
    monkeypatch.setenv("SCRAPE_JWT_SECRET", "too-short")
    cfg_mod._settings = None
    with pytest.raises(RuntimeError, match="at least 32 characters"):
        main_mod.create_app()
    cfg_mod._settings = None


def test_register_login_me_logout(client):
    r = client.post("/api/auth/register", json={"email": "x@example.com", "password": "secret123"})
    assert r.status_code == 201
    body = r.json()
    assert body["email"] == "x@example.com"
    assert body["is_admin"] is True  # first user

    r = client.get("/api/auth/me")
    assert r.status_code == 200

    r = client.post("/api/auth/logout")
    assert r.status_code == 204

    r = client.get("/api/auth/me")
    assert r.status_code == 401

    r = client.post("/api/auth/login", json={"email": "x@example.com", "password": "secret123"})
    assert r.status_code == 200
    r = client.post("/api/auth/login", json={"email": "x@example.com", "password": "WRONG"})
    assert r.status_code == 401


def test_register_duplicate_email_409(client):
    client.post("/api/auth/register", json={"email": "y@example.com", "password": "secret123"})
    r = client.post("/api/auth/register", json={"email": "y@example.com", "password": "secret123"})
    assert r.status_code == 409


def test_change_password_flow(authed_client):
    r = authed_client.post(
        "/api/account/password",
        json={"current_password": "wrong", "new_password": "newpass123"},
    )
    assert r.status_code == 400
    r = authed_client.post(
        "/api/account/password",
        json={"current_password": "password123", "new_password": "newpass123"},
    )
    assert r.status_code == 204
    # Old password no longer works after re-login attempt
    authed_client.post("/api/auth/logout")
    r = authed_client.post("/api/auth/login", json={"email": "alice@example.com", "password": "password123"})
    assert r.status_code == 401
    r = authed_client.post("/api/auth/login", json={"email": "alice@example.com", "password": "newpass123"})
    assert r.status_code == 200


def test_forgot_then_reset(client):
    client.post("/api/auth/register", json={"email": "z@example.com", "password": "abcdefgh"})
    r = client.post("/api/auth/forgot", json={"email": "z@example.com"})
    assert r.status_code == 200
    body = r.json()
    assert body["sent"] is True
    token = body["dev_token"]
    assert token
    from scrape.config import get_settings

    with sqlite3.connect(get_settings().storage.sqlite_path) as db:
        stored_token = db.execute("SELECT token FROM password_resets").fetchone()[0]
    assert stored_token != token
    assert len(stored_token) == 64

    r = client.post("/api/auth/reset", json={"token": token, "new_password": "fresh1234"})
    assert r.status_code == 204

    # Token can't be reused (use a long-enough password so validation passes
    # and we exercise the business "already used" check)
    r = client.post("/api/auth/reset", json={"token": token, "new_password": "secondpass"})
    assert r.status_code == 400

    r = client.post("/api/auth/login", json={"email": "z@example.com", "password": "fresh1234"})
    assert r.status_code == 200


def test_forgot_unknown_email_returns_200_no_leak(client):
    r = client.post("/api/auth/forgot", json={"email": "nobody@example.com"})
    assert r.status_code == 200
    assert r.json()["sent"] is True
    assert r.json().get("dev_token") is None


def test_api_key_create_use_revoke(authed_client):
    r = authed_client.post("/api/keys", json={"name": "test"})
    assert r.status_code == 201
    body = r.json()
    secret = body["secret"]
    key_id = body["id"]
    assert secret.startswith("sk_live_")

    # Use the bearer token (no cookie) — clear cookies first
    authed_client.cookies.clear()
    r = authed_client.get("/api/auth/me", headers={"Authorization": f"Bearer {secret}"})
    assert r.status_code == 200
    assert r.json()["email"] == "alice@example.com"

    # Re-login for cookie auth on revoke endpoint
    authed_client.post("/api/auth/login", json={"email": "alice@example.com", "password": "password123"})
    r = authed_client.delete(f"/api/keys/{key_id}")
    assert r.status_code == 204
    authed_client.cookies.clear()
    r = authed_client.get("/api/auth/me", headers={"Authorization": f"Bearer {secret}"})
    assert r.status_code == 401


def test_api_keys_isolated_per_user(client):
    # User A
    client.post("/api/auth/register", json={"email": "a@example.com", "password": "passpass"})
    r = client.post("/api/keys", json={"name": "a-key"})
    a_secret = r.json()["secret"]
    client.post("/api/auth/logout")
    # User B
    client.post("/api/auth/register", json={"email": "b@example.com", "password": "passpass"})
    r = client.get("/api/keys", headers={"Authorization": f"Bearer {a_secret}"})
    # B's bearer would not work, but A's should still resolve to A
    client.cookies.clear()
    r = client.get("/api/auth/me", headers={"Authorization": f"Bearer {a_secret}"})
    assert r.json()["email"] == "a@example.com"


def test_usage_endpoint(authed_client):
    r = authed_client.get("/api/usage")
    assert r.status_code == 200
    body = r.json()
    assert body["plan"] == "free"
    assert body["quota"] == 10_000
    assert body["used"] == 0
    assert body["concurrent_running"] == 0


def test_webhook_crud(authed_client):
    r = authed_client.post("/api/webhooks", json={"url": "https://example.com/hook", "events": ["job.completed"]})
    assert r.status_code == 201
    wid = r.json()["id"]
    assert r.json()["secret"].startswith("whsec_")

    r = authed_client.get("/api/webhooks")
    assert r.status_code == 200
    assert len(r.json()) == 1

    r = authed_client.delete(f"/api/webhooks/{wid}")
    assert r.status_code == 204

    r = authed_client.get("/api/webhooks")
    assert r.json() == []


def test_webhook_private_url_rejected(authed_client):
    r = authed_client.post(
        "/api/webhooks",
        json={"url": "http://127.0.0.1:8000/hook", "events": ["job.completed"]},
    )
    assert r.status_code == 400


def test_jobs_listing_isolated(client):
    client.post("/api/auth/register", json={"email": "u1@example.com", "password": "passpass"})
    r = client.post("/api/jobs", json={
        "name": "j1", "urls": ["https://example.com/"],
        "max_tier": 0, "use_browser": False, "use_llm": False,
    })
    assert r.status_code == 201
    job_id = r.json()["id"]
    client.post(f"/api/jobs/{job_id}/cancel")  # don't actually crawl

    r = client.get("/api/jobs")
    assert len(r.json()) == 1

    client.post("/api/auth/logout")
    client.post("/api/auth/register", json={"email": "u2@example.com", "password": "passpass"})
    r = client.get("/api/jobs")
    assert r.json() == []  # u2 doesn't see u1's job

    r = client.get(f"/api/jobs/{job_id}")
    assert r.status_code == 404


def test_job_private_url_rejected(authed_client):
    r = authed_client.post("/api/jobs", json={
        "name": "unsafe", "urls": ["http://127.0.0.1:8000/private"],
        "max_tier": 0, "use_browser": False, "use_llm": False,
    })
    assert r.status_code == 400


def test_quota_blocks_huge_job(authed_client, monkeypatch):
    # Force quota to a tiny number
    from scrape.api import usage as u
    monkeypatch.setitem(u.PLANS, "free", {"monthly_fetches": 5, "concurrent_jobs": 99})
    r = authed_client.post("/api/jobs", json={
        "name": "too big", "urls": [f"https://example.com/{i}" for i in range(20)],
        "max_tier": 0, "use_browser": False, "use_llm": False,
    })
    assert r.status_code == 402


def test_auth_rate_limit_kicks_in(client):
    # The bucket is per-IP; test client uses 'testclient' as host
    for _ in range(10):
        client.post("/api/auth/login", json={"email": "x@x.com", "password": "wrong"})
    r = client.post("/api/auth/login", json={"email": "x@x.com", "password": "wrong"})
    assert r.status_code == 429


def test_unauth_endpoints_401(client):
    for path in ["/api/auth/me", "/api/jobs", "/api/keys", "/api/webhooks", "/api/usage"]:
        r = client.get(path)
        assert r.status_code == 401, path
