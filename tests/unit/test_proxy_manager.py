from scrape.core.proxy_manager import (
    BrightDataProvider,
    GenericResidentialProvider,
    NoneProvider,
    ProxyManager,
)


def test_none_provider_returns_empty_url():
    p = NoneProvider()
    lease = p.lease("session-1")
    assert lease.url == ""


def test_generic_provider_username_format():
    p = GenericResidentialProvider("proxy.example:8000", "myuser", "secret", default_country="us")
    lease = p.lease("abc")
    assert lease.url == "http://user-myuser-country-us-session-abc:secret@proxy.example:8000"


def test_brightdata_username_format():
    p = BrightDataProvider("brd.superproxy.io:22225", "brd-customer-x-zone-y", "pw")
    lease = p.lease("session1", country="DE")
    assert lease.url == "http://brd-customer-x-zone-y-country-de-session-session1:pw@brd.superproxy.io:22225"


def test_proxy_manager_sticky_within_window():
    mgr = ProxyManager(GenericResidentialProvider("p.example:9000", "u", "p"))
    a = mgr.lease("S")
    b = mgr.lease("S")
    assert a.url == b.url
    assert a.session_id == b.session_id


def test_proxy_manager_cooldown_after_3_failures():
    mgr = ProxyManager(GenericResidentialProvider("p.example:9000", "u", "p"))
    sid = "burnme"
    mgr.lease(sid)
    for _ in range(3):
        mgr.report(sid, ok=False)
    new_lease = mgr.lease(sid)
    # session_id should have been mutated to a fresh one because of cooldown
    assert new_lease.session_id != sid


def test_health_score():
    mgr = ProxyManager(NoneProvider())
    sid = "x"
    mgr.lease(sid)
    for _ in range(5):
        mgr.report(sid, ok=True)
    mgr.report(sid, ok=False)
    rate = mgr.success_rate(sid)
    assert 0.7 < rate < 0.9
