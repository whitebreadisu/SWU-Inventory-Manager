from app.main import _api_docs_enabled


def test_docs_enabled_by_default(monkeypatch):
    monkeypatch.delenv("ENVIRONMENT", raising=False)
    assert _api_docs_enabled() is True


def test_docs_enabled_outside_production(monkeypatch):
    monkeypatch.setenv("ENVIRONMENT", "development")
    assert _api_docs_enabled() is True


def test_docs_disabled_in_production(monkeypatch):
    monkeypatch.setenv("ENVIRONMENT", "production")
    assert _api_docs_enabled() is False
