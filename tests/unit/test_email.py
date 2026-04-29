"""Tests for the email abstraction (Resend/Console/Null senders)."""
from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest

from scrape.api.email import (
    ConsoleEmailSender,
    EmailMessage,
    NullEmailSender,
    ResendEmailSender,
    build_email_sender,
)


def _msg() -> EmailMessage:
    return EmailMessage(
        to="user@example.com",
        subject="Test",
        html="<p>hi</p>",
        text="hi",
        tags=[("type", "test")],
    )


@pytest.mark.asyncio
async def test_console_sender_returns_id():
    s = ConsoleEmailSender()
    mid = await s.send(_msg(), sender="from@example.com")
    assert isinstance(mid, str) and mid.startswith("console-")


@pytest.mark.asyncio
async def test_null_sender_returns_none():
    s = NullEmailSender()
    mid = await s.send(_msg(), sender="from@example.com")
    assert mid is None


def test_resend_requires_api_key():
    with pytest.raises(ValueError):
        ResendEmailSender(api_key="")


@pytest.mark.asyncio
async def test_resend_sender_posts_correct_payload():
    s = ResendEmailSender(api_key="re_test_key")

    class _Resp:
        status_code = 200

        def json(self):
            return {"id": "resend_123"}

        text = "{}"

    with patch("scrape.api.email.httpx.AsyncClient") as mock_cls:
        client = AsyncMock()
        client.__aenter__.return_value = client
        client.__aexit__.return_value = False
        client.post.return_value = _Resp()
        mock_cls.return_value = client

        mid = await s.send(_msg(), sender="Scrape <noreply@scrape.dev>")

    assert mid == "resend_123"
    # Verify the call shape — Resend API expects `from`, `to` (list), `tags`
    call = client.post.await_args
    assert call.args[0].endswith("/emails")
    payload = call.kwargs["json"]
    assert payload["from"] == "Scrape <noreply@scrape.dev>"
    assert payload["to"] == ["user@example.com"]
    assert payload["subject"] == "Test"
    assert payload["html"] == "<p>hi</p>"
    assert payload["text"] == "hi"
    assert payload["tags"] == [{"name": "type", "value": "test"}]


@pytest.mark.asyncio
async def test_resend_sender_returns_none_on_4xx_without_raising():
    s = ResendEmailSender(api_key="re_test_key")

    class _Resp:
        status_code = 422

        def json(self):
            return {"message": "validation_error"}

        text = '{"message":"validation_error"}'

    with patch("scrape.api.email.httpx.AsyncClient") as mock_cls:
        client = AsyncMock()
        client.__aenter__.return_value = client
        client.__aexit__.return_value = False
        client.post.return_value = _Resp()
        mock_cls.return_value = client

        # Must NOT raise — registration shouldn't crash on Resend 4xx.
        mid = await s.send(_msg(), sender="from@example.com")
    assert mid is None


def test_build_sender_falls_back_to_console_when_resend_missing_key():
    s = build_email_sender(provider="resend", resend_api_key="")
    assert isinstance(s, ConsoleEmailSender)


def test_build_sender_auto_prefers_resend_when_key_present():
    s = build_email_sender(provider="auto", resend_api_key="re_xxx")
    assert isinstance(s, ResendEmailSender)


def test_build_sender_explicit_none():
    s = build_email_sender(provider="none", resend_api_key="re_xxx")
    assert isinstance(s, NullEmailSender)


def test_build_sender_console_explicit():
    s = build_email_sender(provider="console", resend_api_key="re_xxx")
    assert isinstance(s, ConsoleEmailSender)
