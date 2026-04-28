from __future__ import annotations

import shutil
import tempfile
from pathlib import Path

import pytest
import tldextract

from scrape.config import Settings

# Warm tldextract's PSL cache once for the whole test run — first call can
# block hundreds of ms if the snapshot isn't already on disk.
tldextract.extract("https://example.com")


@pytest.fixture
def tmp_data_dir():
    d = Path(tempfile.mkdtemp(prefix="scrape-test-"))
    yield d
    shutil.rmtree(d, ignore_errors=True)


@pytest.fixture
def settings(tmp_data_dir, monkeypatch):
    monkeypatch.setenv("STORAGE_SQLITE_PATH", str(tmp_data_dir / "scrape.db"))
    monkeypatch.setenv("STORAGE_RAW_HTML_DIR", str(tmp_data_dir / "raw"))
    s = Settings()
    s.storage.sqlite_path.parent.mkdir(parents=True, exist_ok=True)
    s.storage.raw_html_dir.mkdir(parents=True, exist_ok=True)
    return s
