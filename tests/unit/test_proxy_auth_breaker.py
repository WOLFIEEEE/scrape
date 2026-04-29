"""Circuit-breaker tests for the proxy auth failure path."""
from __future__ import annotations

import pytest

from scrape.core.proxy_manager import NoneProvider, ProxyAuthBroken, ProxyManager


def test_breaker_silent_below_threshold():
    mgr = ProxyManager(NoneProvider(), auth_failure_threshold=3)
    mgr.report_auth_failure()
    mgr.report_auth_failure()  # ok, below threshold


def test_breaker_raises_at_threshold():
    mgr = ProxyManager(NoneProvider(), auth_failure_threshold=3)
    mgr.report_auth_failure()
    mgr.report_auth_failure()
    with pytest.raises(ProxyAuthBroken):
        mgr.report_auth_failure()


def test_breaker_reset_on_success():
    mgr = ProxyManager(NoneProvider(), auth_failure_threshold=3)
    mgr.report_auth_failure()
    mgr.report_auth_failure()
    mgr.reset_auth_failures()
    # Counter is now zero — should take 3 more before raising
    mgr.report_auth_failure()
    mgr.report_auth_failure()
    with pytest.raises(ProxyAuthBroken):
        mgr.report_auth_failure()
