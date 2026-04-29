"""SQLite schema + connection management for the API.

Reuses the same DB file as the CLI scraper. Adds tables for users + jobs +
maps existing fetches/extracted rows to a job via job_id (added column).

We use aiosqlite directly instead of an ORM — schema is small, queries are
straightforward, and the existing `pipelines/storage.py` uses raw SQL too.
"""
from __future__ import annotations

import secrets
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from datetime import UTC, datetime
from pathlib import Path

import aiosqlite

from scrape.config import get_settings
from scrape.logging import get_logger

log = get_logger(__name__)

_API_SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL DEFAULT '',
    is_admin INTEGER NOT NULL DEFAULT 0,
    email_verified INTEGER NOT NULL DEFAULT 0,
    verified_at TEXT,
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    urls_json TEXT NOT NULL,
    max_tier INTEGER NOT NULL DEFAULT 1,
    use_browser INTEGER NOT NULL DEFAULT 1,
    use_llm INTEGER NOT NULL DEFAULT 0,
    schema_name TEXT,
    schema_json TEXT,
    captcha_hint TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    error TEXT,
    total INTEGER NOT NULL DEFAULT 0,
    completed INTEGER NOT NULL DEFAULT 0,
    succeeded INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    started_at TEXT,
    finished_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_jobs_user ON jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);

CREATE TABLE IF NOT EXISTS api_keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    prefix TEXT NOT NULL,           -- visible part: 'sk_live_abcd1234'
    secret_hash TEXT NOT NULL,      -- bcrypt of the full secret
    last_used_at TEXT,
    created_at TEXT NOT NULL,
    revoked_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys(prefix);

CREATE TABLE IF NOT EXISTS password_resets (
    token TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TEXT NOT NULL,
    used_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_password_resets_user ON password_resets(user_id);

CREATE TABLE IF NOT EXISTS email_verifications (
    token TEXT PRIMARY KEY,           -- sha256 of the user-facing token
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TEXT NOT NULL,
    used_at TEXT,
    sent_to TEXT NOT NULL,            -- email address it was sent to (for audit)
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_email_verifications_user ON email_verifications(user_id);

CREATE TABLE IF NOT EXISTS webhooks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    secret TEXT NOT NULL,
    events_json TEXT NOT NULL,      -- JSON array of subscribed events
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    last_status INTEGER,
    last_attempt_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_webhooks_user ON webhooks(user_id);

CREATE TABLE IF NOT EXISTS webhook_deliveries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    webhook_id INTEGER NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
    event TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    status INTEGER,
    error TEXT,
    attempts INTEGER NOT NULL DEFAULT 0,
    delivered_at TEXT,
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook ON webhook_deliveries(webhook_id);
"""

_MIGRATIONS = (
    # Each is (description, SQL). Wrapped in try/except so re-runs are no-ops.
    ("fetches.job_id", "ALTER TABLE fetches ADD COLUMN job_id TEXT"),
    ("extracted.job_id", "ALTER TABLE extracted ADD COLUMN job_id TEXT"),
    ("idx_fetches_job_id", "CREATE INDEX IF NOT EXISTS idx_fetches_job_id ON fetches(job_id)"),
    (
        "idx_extracted_job_id",
        "CREATE INDEX IF NOT EXISTS idx_extracted_job_id ON extracted(job_id)",
    ),
    # Cost telemetry — added so the API db's fetches table is in sync with
    # what storage.py writes. Older deployments need the columns at runtime.
    ("fetches.proxy_bytes", "ALTER TABLE fetches ADD COLUMN proxy_bytes INTEGER NOT NULL DEFAULT 0"),
    ("fetches.solver_cost_usd", "ALTER TABLE fetches ADD COLUMN solver_cost_usd REAL NOT NULL DEFAULT 0"),
    # Job-level CAPTCHA hint override (Tier-2 fallback)
    ("jobs.captcha_hint", "ALTER TABLE jobs ADD COLUMN captcha_hint TEXT"),
    # Email verification — added so existing deployments pick up the column
    # without dropping the users table.
    ("users.email_verified", "ALTER TABLE users ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 0"),
    ("users.verified_at", "ALTER TABLE users ADD COLUMN verified_at TEXT"),
    (
        "email_verifications",
        """CREATE TABLE IF NOT EXISTS email_verifications (
            token TEXT PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            expires_at TEXT NOT NULL,
            used_at TEXT,
            sent_to TEXT NOT NULL,
            created_at TEXT NOT NULL
        )""",
    ),
    (
        "idx_email_verifications_user",
        "CREATE INDEX IF NOT EXISTS idx_email_verifications_user ON email_verifications(user_id)",
    ),
)


async def init_db() -> None:
    """Create schema + apply best-effort migrations."""
    cfg = get_settings()
    cfg.storage.sqlite_path.parent.mkdir(parents=True, exist_ok=True)
    async with aiosqlite.connect(cfg.storage.sqlite_path) as db:
        await db.executescript(
            # Reuse the main storage schema first so fetches/extracted exist.
            """
            CREATE TABLE IF NOT EXISTS fetches (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                url TEXT NOT NULL,
                final_url TEXT NOT NULL,
                status INTEGER NOT NULL,
                tier_used INTEGER NOT NULL,
                block_reason TEXT NOT NULL,
                proxy_used TEXT,
                fingerprint_id TEXT,
                elapsed_ms INTEGER NOT NULL,
                body_sha256 TEXT,
                body_size INTEGER,
                fetched_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS extracted (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                url TEXT NOT NULL,
                schema_name TEXT NOT NULL,
                data_json TEXT NOT NULL,
                confidence REAL NOT NULL,
                extracted_at TEXT NOT NULL
            );
            """
        )
        await db.executescript(_API_SCHEMA)
        for desc, sql in _MIGRATIONS:
            try:
                await db.execute(sql)
            except aiosqlite.OperationalError as e:
                if "duplicate column" not in str(e):
                    log.debug("migration.skip", step=desc, reason=str(e))
        await db.commit()


@asynccontextmanager
async def connect() -> AsyncIterator[aiosqlite.Connection]:
    cfg = get_settings()
    db = await aiosqlite.connect(cfg.storage.sqlite_path)
    db.row_factory = aiosqlite.Row
    # Make foreign-key constraints actually enforce
    await db.execute("PRAGMA foreign_keys = ON")
    try:
        yield db
    finally:
        await db.close()


def now_iso() -> str:
    return datetime.now(UTC).isoformat()


def new_job_id() -> str:
    # Short, URL-safe, sortable-ish id
    return secrets.token_urlsafe(12)


def db_path() -> Path:
    return get_settings().storage.sqlite_path
