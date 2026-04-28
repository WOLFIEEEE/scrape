"""Session store: persists cookie jars + browser storage_state per (host, fp, proxy).

Two layers:
- Hot in-memory dict (per-process)
- Cold JSON files in `data/sessions/` (survive restarts)

Identity rule: cookies belong to a *triple* (host_etld, fingerprint_id, proxy_session_id).
Sharing across triples is exactly what gets you banned — different IP + same
cookies is the canonical "shared account" / "credential stuffing" signal.
"""
from __future__ import annotations

import contextlib
import hashlib
import json
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import tldextract

from scrape.config import DATA_DIR
from scrape.logging import get_logger

log = get_logger(__name__)

SESSIONS_DIR = DATA_DIR / "sessions"


def host_key(url: str) -> str:
    parts = tldextract.extract(url)
    if parts.suffix:
        return f"{parts.domain}.{parts.suffix}".lower()
    fqdn = parts.fqdn or f"{parts.subdomain}.{parts.domain}".strip(".")
    return fqdn.lower() or url.lower()


@dataclass
class Session:
    triple: str  # composite identity
    host: str
    fingerprint_id: str
    proxy_session_id: str
    cookies: dict[str, str] = field(default_factory=dict)
    storage_state: dict[str, Any] | None = None  # for browser tier
    created_at: float = field(default_factory=time.time)
    last_used_at: float = field(default_factory=time.time)
    request_count: int = 0


def _triple_key(host: str, fp: str, proxy_session: str) -> str:
    raw = f"{host}|{fp}|{proxy_session}".encode()
    return hashlib.sha256(raw).hexdigest()[:16]


class SessionStore:
    def __init__(self, root: Path = SESSIONS_DIR):
        self._root = root
        self._root.mkdir(parents=True, exist_ok=True)
        self._hot: dict[str, Session] = {}

    def _path(self, triple: str) -> Path:
        return self._root / f"{triple}.json"

    def get_or_create(self, host: str, fp: str, proxy_session: str) -> Session:
        triple = _triple_key(host, fp, proxy_session)
        if triple in self._hot:
            return self._hot[triple]
        # Try cold load
        path = self._path(triple)
        if path.exists():
            try:
                data = json.loads(path.read_text())
                sess = Session(
                    triple=triple,
                    host=data["host"],
                    fingerprint_id=data["fingerprint_id"],
                    proxy_session_id=data["proxy_session_id"],
                    cookies=data.get("cookies", {}),
                    storage_state=data.get("storage_state"),
                    created_at=data.get("created_at", time.time()),
                    last_used_at=data.get("last_used_at", time.time()),
                    request_count=data.get("request_count", 0),
                )
                self._hot[triple] = sess
                return sess
            except (OSError, ValueError, KeyError) as e:
                log.warning("session.load_failed", triple=triple, error=str(e))
        sess = Session(
            triple=triple, host=host, fingerprint_id=fp, proxy_session_id=proxy_session
        )
        self._hot[triple] = sess
        return sess

    def update_cookies(self, sess: Session, cookies: dict[str, str]) -> None:
        sess.cookies.update(cookies)
        sess.last_used_at = time.time()
        sess.request_count += 1

    def update_storage_state(self, sess: Session, state: dict[str, Any]) -> None:
        sess.storage_state = state
        sess.last_used_at = time.time()

    def persist(self, sess: Session) -> None:
        try:
            self._path(sess.triple).write_text(
                json.dumps(
                    {
                        "host": sess.host,
                        "fingerprint_id": sess.fingerprint_id,
                        "proxy_session_id": sess.proxy_session_id,
                        "cookies": sess.cookies,
                        "storage_state": sess.storage_state,
                        "created_at": sess.created_at,
                        "last_used_at": sess.last_used_at,
                        "request_count": sess.request_count,
                    },
                    indent=2,
                )
            )
        except OSError as e:
            log.warning("session.persist_failed", triple=sess.triple, error=str(e))

    def discard(self, sess: Session) -> None:
        self._hot.pop(sess.triple, None)
        path = self._path(sess.triple)
        if path.exists():
            with contextlib.suppress(OSError):
                path.unlink()
        log.info("session.discarded", triple=sess.triple, host=sess.host)
