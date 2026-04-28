from scrape.core.session_store import SessionStore, host_key


def test_host_key_strips_subdomain():
    assert host_key("https://www.example.co.uk/path?x=1") == "example.co.uk"


def test_session_get_or_create_stable_triple(tmp_data_dir):
    store = SessionStore(root=tmp_data_dir)
    a = store.get_or_create("example.com", "fp1", "sess1")
    b = store.get_or_create("example.com", "fp1", "sess1")
    assert a.triple == b.triple
    assert a is b


def test_different_inputs_different_triples(tmp_data_dir):
    store = SessionStore(root=tmp_data_dir)
    a = store.get_or_create("example.com", "fp1", "sess1")
    b = store.get_or_create("example.com", "fp2", "sess1")
    c = store.get_or_create("other.com", "fp1", "sess1")
    assert len({a.triple, b.triple, c.triple}) == 3


def test_persist_and_reload(tmp_data_dir):
    store = SessionStore(root=tmp_data_dir)
    s = store.get_or_create("example.com", "fp1", "sess1")
    store.update_cookies(s, {"sid": "cookie-value"})
    store.persist(s)
    # New store instance should rehydrate from disk
    store2 = SessionStore(root=tmp_data_dir)
    s2 = store2.get_or_create("example.com", "fp1", "sess1")
    assert s2.cookies == {"sid": "cookie-value"}
    assert s2.request_count == 1


def test_discard(tmp_data_dir):
    store = SessionStore(root=tmp_data_dir)
    s = store.get_or_create("h", "fp", "ps")
    store.persist(s)
    store.discard(s)
    assert not (tmp_data_dir / f"{s.triple}.json").exists()
