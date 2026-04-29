"""Email sender abstraction.

Two implementations ship:
  - ResendEmailSender — production. Uses Resend's REST API via httpx.
  - ConsoleEmailSender — dev. Logs the email body to stdout. No API key
    required. Lets local development work without a Resend account and is
    the auto-fallback when EMAIL_PROVIDER isn't set.

The abstraction is async because email send is on the critical path of
registration / password reset; we don't want to block the FastAPI worker
on a synchronous HTTP call.
"""
from __future__ import annotations

import asyncio
from dataclasses import dataclass, field
from typing import Protocol

import httpx

from scrape.logging import get_logger

log = get_logger(__name__)

RESEND_API_URL = "https://api.resend.com/emails"


@dataclass
class EmailMessage:
    to: str
    subject: str
    html: str
    text: str
    # Optional reply-to for support / vulnerability disclosures.
    reply_to: str | None = None
    # Tagging lets Resend's analytics + your own webhook router segment by
    # type (verify, reset, welcome, alert).
    tags: list[tuple[str, str]] = field(default_factory=list)


class EmailSender(Protocol):
    name: str

    async def send(self, msg: EmailMessage, *, sender: str) -> str | None:
        """Deliver `msg`. Return the provider's message id when known.

        Implementations must NOT raise on transient failures — they should
        return None and log. The caller's job creation / registration flow
        treats email send as best-effort, never a blocker.
        """
        ...


class ConsoleEmailSender:
    """Logs the email instead of sending. Used when EMAIL_PROVIDER is unset
    or in dev. Keeps the registration / reset flows functional locally
    without anyone needing a Resend account."""

    name = "console"

    async def send(self, msg: EmailMessage, *, sender: str) -> str | None:
        # Render visibly so it's obvious in the log stream.
        log.info(
            "email.console",
            sender=sender, to=msg.to, subject=msg.subject,
            text_preview=msg.text[:200],
            tags=dict(msg.tags) if msg.tags else None,
        )
        # Print full body separately — readable in tail-following dev logs.
        # Uses print rather than log so multi-line bodies stay un-flattened.
        print("\n" + "─" * 60)
        print(f"FROM:    {sender}")
        print(f"TO:      {msg.to}")
        print(f"SUBJECT: {msg.subject}")
        if msg.tags:
            print(f"TAGS:    {dict(msg.tags)}")
        print("─" * 60)
        print(msg.text)
        print("─" * 60 + "\n", flush=True)
        return f"console-{abs(hash((msg.to, msg.subject))):x}"


class ResendEmailSender:
    """Production sender using Resend's REST API.

    Resend rate-limits at ~10 req/s on the default plan; we send one email
    per inbound registration / reset, so we never approach that. The send
    timeout is 10 s to fail fast if Resend is having a bad day — better to
    fall back to the application surfacing 'we couldn't send the email,
    try again' than to block the request loop for 60 s.
    """

    name = "resend"

    def __init__(self, api_key: str, timeout_s: int = 10):
        if not api_key:
            raise ValueError("ResendEmailSender requires api_key (RESEND_API_KEY)")
        self._api_key = api_key
        self._timeout_s = timeout_s

    async def send(self, msg: EmailMessage, *, sender: str) -> str | None:
        payload: dict[str, object] = {
            "from": sender,
            "to": [msg.to],
            "subject": msg.subject,
            "html": msg.html,
            "text": msg.text,
        }
        if msg.reply_to:
            payload["reply_to"] = msg.reply_to
        if msg.tags:
            # Resend tag schema: list of {name, value}
            payload["tags"] = [{"name": k, "value": v} for k, v in msg.tags]

        headers = {
            "Authorization": f"Bearer {self._api_key}",
            "Content-Type": "application/json",
        }
        try:
            async with httpx.AsyncClient(timeout=self._timeout_s) as client:
                resp = await client.post(RESEND_API_URL, json=payload, headers=headers)
        except httpx.HTTPError as e:
            log.warning("email.resend_network_error", to=msg.to, error=str(e))
            return None

        if resp.status_code >= 400:
            log.warning(
                "email.resend_api_error",
                to=msg.to, status=resp.status_code, body=resp.text[:300],
            )
            return None
        try:
            data = resp.json()
            mid = data.get("id") if isinstance(data, dict) else None
        except Exception:
            mid = None
        log.info("email.sent", provider="resend", to=msg.to, message_id=mid, subject=msg.subject)
        return mid


class NullEmailSender:
    """Used when an admin explicitly disables email delivery (e.g. air-gapped
    self-host). Returns None so callers don't try to read message ids."""

    name = "none"

    async def send(self, msg: EmailMessage, *, sender: str) -> str | None:
        log.debug("email.disabled", to=msg.to, subject=msg.subject)
        return None


def build_email_sender(
    provider: str,
    *,
    resend_api_key: str = "",
) -> EmailSender:
    """Factory used by API startup. Falls through to ConsoleEmailSender when
    `provider` is unset/auto and no Resend key is configured — that way local
    dev never silently drops registration emails."""
    p = (provider or "auto").lower()
    if p == "resend":
        if not resend_api_key:
            log.warning("email.resend_missing_key_falling_back_to_console")
            return ConsoleEmailSender()
        return ResendEmailSender(api_key=resend_api_key)
    if p == "none":
        return NullEmailSender()
    if p == "console":
        return ConsoleEmailSender()
    # auto: prefer resend if key present, else console
    if resend_api_key:
        return ResendEmailSender(api_key=resend_api_key)
    return ConsoleEmailSender()


# Module-level singleton populated at startup. Keeps callers from passing
# the sender through every layer just so account_routes.forgot can use it.
_sender: EmailSender | None = None
_default_from: str = ""


def configure(sender: EmailSender, default_from: str) -> None:
    """Wire up the email subsystem at app startup. `default_from` is the
    'From:' string used when callers don't override (most callers don't).
    """
    global _sender, _default_from
    _sender = sender
    _default_from = default_from


async def send(
    msg: EmailMessage,
    *,
    sender: str | None = None,
) -> str | None:
    """Top-level send. Uses the configured sender. If configure() hasn't
    been called yet (e.g. during a CLI command), falls back to console so
    nobody discovers a misconfiguration via a silent NoneType crash."""
    s = _sender or ConsoleEmailSender()
    from_addr = sender or _default_from or "Scrape <noreply@example.com>"
    try:
        return await asyncio.wait_for(s.send(msg, sender=from_addr), timeout=15)
    except TimeoutError:
        log.warning("email.send_timeout", to=msg.to, subject=msg.subject)
        return None
