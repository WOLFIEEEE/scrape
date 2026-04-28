from datetime import UTC, datetime

from scrape.core.block_detector import detect, needs_browser, needs_captcha
from scrape.models import BlockReason, FetchResult, Tier


def _result(status: int = 200, body: bytes | None = None, headers=None) -> FetchResult:
    if body is None:
        # Realistic-sized clean response so the empty-body heuristic doesn't fire
        body = b"<html><body>" + b"<p>filler</p>" * 60 + b"</body></html>"
    return FetchResult(
        url="https://example.com/x", final_url="https://example.com/x",
        status=status, headers=headers or {"content-type": "text/html"},
        body=body, elapsed_ms=10, tier_used=Tier.HTTP,
        fetched_at=datetime.now(UTC),
    )


def test_clean_response_is_not_blocked():
    assert detect(_result()) == BlockReason.NONE


def test_429_is_rate_limited():
    assert detect(_result(status=429)) == BlockReason.RATE_LIMITED


def test_403_is_4xx_block():
    assert detect(_result(status=403)) == BlockReason.STATUS_4XX


def test_cloudflare_just_a_moment_html():
    body = b"<html><head><title>Just a moment...</title></head><body></body></html>"
    r = _result(body=body)
    assert detect(r) == BlockReason.CHALLENGE_PAGE
    assert needs_browser(BlockReason.CHALLENGE_PAGE)


def test_recaptcha_present_means_captcha():
    body = b"<html><body><script src='https://www.google.com/recaptcha/api.js'></script></body></html>"
    r = _result(body=body)
    assert detect(r) == BlockReason.CAPTCHA_REQUIRED
    assert needs_captcha(BlockReason.CAPTCHA_REQUIRED)


def test_tiny_html_body_is_empty_block():
    r = _result(body=b"<html></html>")
    assert detect(r) == BlockReason.EMPTY_BODY


def test_small_json_body_is_not_blocked():
    r = _result(body=b'{"x":1}', headers={"content-type": "application/json"})
    assert detect(r) == BlockReason.NONE


def test_cf_mitigated_header():
    r = _result(headers={"content-type": "text/html", "cf-mitigated": "challenge"}, body=b"<html><body>" + b"a" * 1024 + b"</body></html>")
    assert detect(r) == BlockReason.CHALLENGE_PAGE
