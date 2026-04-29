"""Detect when a response is actually a block / challenge / soft-fail.

This is the brain of tier escalation: every fetch result passes through here.
Cheap regex/header checks — no DOM parsing — so it runs on every response.
"""
from __future__ import annotations

import re

from scrape.models import BlockReason, FetchResult

# Cloudflare challenge markers — present in interactive / JS-challenge HTML
_CF_MARKERS = (
    re.compile(rb"<title>\s*Just a moment", re.IGNORECASE),
    re.compile(rb"cf-challenge", re.IGNORECASE),
    re.compile(rb"cf_chl_opt", re.IGNORECASE),
    re.compile(rb"challenges\.cloudflare\.com", re.IGNORECASE),
    re.compile(rb"cf-turnstile", re.IGNORECASE),
)

# DataDome
_DD_MARKERS = (
    re.compile(rb"datadome", re.IGNORECASE),
    re.compile(rb"geo\.captcha-delivery\.com", re.IGNORECASE),
)

# PerimeterX / HUMAN
_PX_MARKERS = (
    re.compile(rb"_pxhd", re.IGNORECASE),
    re.compile(rb"px-captcha", re.IGNORECASE),
    re.compile(rb"PerimeterX", re.IGNORECASE),
)

# Generic CAPTCHA references
_CAPTCHA_MARKERS = (
    re.compile(rb"g-recaptcha", re.IGNORECASE),
    re.compile(rb"h-captcha", re.IGNORECASE),
    re.compile(rb"hcaptcha\.com", re.IGNORECASE),
    re.compile(rb"recaptcha/api\.js", re.IGNORECASE),
)

# Site-specific or generic JS-challenge interstitials. These pages return 200
# with a body that is a meta-refresh or POST self-submit form whose only
# purpose is to fingerprint the client. Examples: Reddit's "Please wait for
# verification", Akamai Bot Manager's pixel challenge, Imperva Incapsula's
# rdwr fence, Kasada's KPSDK shim.
_INTERSTITIAL_MARKERS = (
    re.compile(rb"<title>\s*Reddit\s*-\s*Please wait for verification", re.IGNORECASE),
    re.compile(rb"_Incapsula_Resource", re.IGNORECASE),
    re.compile(rb"window\._abck", re.IGNORECASE),       # Akamai Bot Manager
    re.compile(rb"bm-verify", re.IGNORECASE),           # Akamai Bot Manager
    re.compile(rb"kpsdk-(?:cd|ct|v)", re.IGNORECASE),   # Kasada KPSDK
)

# WAF / bot-block specific server headers
_SUSPICIOUS_HEADERS = ("server", "cf-mitigated", "x-datadome", "x-px-action")


def detect(result: FetchResult) -> BlockReason:
    """Return the most specific block reason, or NONE if the response looks real."""
    if result.block_reason != BlockReason.NONE:
        return result.block_reason  # already populated by transport layer

    status = result.status

    if status in (429,):
        return BlockReason.RATE_LIMITED
    if status in (401, 403, 451, 407):
        return BlockReason.STATUS_4XX
    if 500 <= status < 600:
        return BlockReason.STATUS_5XX

    body = result.body
    body_len = len(body)
    head = body[:65536]  # challenge markers are always near top

    # Header heuristics first — cheapest signal, definitive when present
    cf_mit = result.headers.get("cf-mitigated", "")
    if cf_mit and cf_mit.lower() == "challenge":
        return BlockReason.CHALLENGE_PAGE

    # Marker checks before size heuristics — challenge pages can be tiny
    if any(p.search(head) for p in _CF_MARKERS):
        return BlockReason.CHALLENGE_PAGE
    if any(p.search(head) for p in _DD_MARKERS):
        return BlockReason.CHALLENGE_PAGE
    if any(p.search(head) for p in _PX_MARKERS):
        return BlockReason.CHALLENGE_PAGE

    if any(p.search(head) for p in _CAPTCHA_MARKERS):
        return BlockReason.CAPTCHA_REQUIRED

    # JS-challenge interstitials: status is 200, body looks legitimate at a
    # glance, but the page exists only to fingerprint the client and bounce
    # back. Needs Tier 1 (browser) to execute the challenge.
    if any(p.search(head) for p in _INTERSTITIAL_MARKERS):
        return BlockReason.CHALLENGE_PAGE

    if status == 200 and body_len < 512:
        # 200 OK with tiny HTML body is a classic soft-block (hide content).
        # Allow when content-type clearly isn't HTML.
        ctype = result.headers.get("content-type", "").lower()
        if "html" in ctype or ctype == "":
            return BlockReason.EMPTY_BODY

    return BlockReason.NONE


def needs_browser(reason: BlockReason) -> bool:
    """Tier 1 escalation trigger."""
    return reason in (BlockReason.CHALLENGE_PAGE, BlockReason.EMPTY_BODY)


def needs_captcha(reason: BlockReason) -> bool:
    """Tier 2 escalation trigger."""
    return reason == BlockReason.CAPTCHA_REQUIRED


def needs_unblock_api(reason: BlockReason) -> bool:
    """Tier 3 final escalation."""
    return reason in (
        BlockReason.RATE_LIMITED,
        BlockReason.STATUS_4XX,
        BlockReason.STATUS_5XX,
    )
