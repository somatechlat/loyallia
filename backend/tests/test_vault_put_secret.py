"""Unit tests for common.vault.put_secret HTTP method fallback.

SEC: The loyallia-app Vault policy grants ["read", "create", "update"] but not
"patch", so Vault rejects PATCH requests with HTTP 403. put_secret must fall
back to its read-merge-write POST (which uses the update capability) and must
still return False when the token genuinely cannot write. All secret values
below are synthetic test data — no real credentials are involved.
"""

from __future__ import annotations

import io
import json
import urllib.error
import urllib.request
from types import SimpleNamespace

import pytest

from common import vault


class _FakeResponse:
    """Minimal context-manager response exposing .status and .read()."""

    def __init__(self, status: int = 200, body: bytes = b"{}"):
        self.status = status
        self._body = body

    def read(self) -> bytes:
        return self._body

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False


def _http_error(code: int) -> urllib.error.HTTPError:
    return urllib.error.HTTPError(
        "https://vault.test/v1/secret/data/loyallia/production",
        code,
        f"HTTP {code}",
        None,
        io.BytesIO(b""),
    )


def _existing_secrets_body() -> bytes:
    return json.dumps(
        {"data": {"data": {"ai_agent_base_url": "http://old-base:8000"}}}
    ).encode("utf-8")


class _Recorder:
    """Scripted urllib.urlopen replacement recording every Vault HTTP call.

    handlers maps HTTP method -> response instance or exception to raise.
    An unexpected method raises AssertionError so tests fail loudly when the
    fallback order changes.
    """

    def __init__(self, **handlers):
        self._handlers = handlers
        self.calls: list[tuple[str, bytes | None]] = []

    def __call__(self, req, **kwargs):
        method = req.get_method()
        self.calls.append((method, req.data))
        if method not in self._handlers:
            raise AssertionError(f"unexpected Vault HTTP call: {method}")
        action = self._handlers[method]
        if isinstance(action, BaseException):
            raise action
        return action

    @property
    def methods(self) -> list[str]:
        return [m for m, _ in self.calls]


@pytest.fixture
def vault_mod(monkeypatch, tmp_path):
    """Run put_secret against hermetic TLS config and the real request logic."""
    ca_file = tmp_path / "vault.crt"
    ca_file.write_text("unit-test-ca", encoding="utf-8")
    monkeypatch.setenv("VAULT_CACERT", str(ca_file))
    monkeypatch.delenv("VAULT_SKIP_VERIFY", raising=False)
    monkeypatch.setattr(vault, "VAULT_ADDR", "https://vault.test:8200")
    monkeypatch.setattr(vault, "_get_vault_token", lambda: "unit-test-token")
    # Scope TLS + urllib substitutions to this module so the HTTP behavior
    # under test runs unmocked while no real network or cert I/O happens.
    monkeypatch.setattr(
        vault,
        "ssl",
        SimpleNamespace(
            create_default_context=lambda *a, **k: SimpleNamespace(
                load_verify_locations=lambda *a, **k: None,
                check_hostname=True,
                verify_mode=None,
            ),
            CERT_NONE=0,
            CERT_REQUIRED=1,
        ),
    )
    vault.clear_cache()
    yield vault
    vault.clear_cache()


def _wire(monkeypatch, recorder: _Recorder) -> None:
    monkeypatch.setattr(
        vault,
        "urllib",
        SimpleNamespace(
            request=SimpleNamespace(
                Request=urllib.request.Request, urlopen=recorder
            ),
            error=urllib.error,
        ),
    )


def test_patch_403_falls_back_to_merge_write(vault_mod, monkeypatch):
    """Policy without 'patch' -> 403 on PATCH -> read-merge-write POST wins."""
    recorder = _Recorder(
        PATCH=_http_error(403),
        GET=_FakeResponse(200, _existing_secrets_body()),
        POST=_FakeResponse(204),
    )
    _wire(monkeypatch, recorder)

    assert vault_mod.put_secret("ai_agent_api_key", "synthetic-key-0123456789") is True
    assert recorder.methods == ["PATCH", "GET", "POST"]

    merge_payload = json.loads(recorder.calls[-1][1])
    # The merge write must preserve pre-existing secrets...
    assert merge_payload["data"]["ai_agent_base_url"] == "http://old-base:8000"
    # ...while writing the new key.
    assert merge_payload["data"]["ai_agent_api_key"] == "synthetic-key-0123456789"


def test_merge_write_forbidden_returns_false(vault_mod, monkeypatch):
    """403 on both PATCH and merge write means no write capability: False."""
    recorder = _Recorder(
        PATCH=_http_error(403),
        GET=_FakeResponse(200, _existing_secrets_body()),
        POST=_http_error(403),
    )
    _wire(monkeypatch, recorder)

    assert vault_mod.put_secret("ai_agent_api_key", "synthetic-key-0123456789") is False
    assert recorder.methods == ["PATCH", "GET", "POST"]


def test_direct_patch_success_skips_fallback(vault_mod, monkeypatch):
    """With a policy granting 'patch', a single PATCH succeeds."""
    recorder = _Recorder(PATCH=_FakeResponse(204))
    _wire(monkeypatch, recorder)

    assert vault_mod.put_secret("ai_agent_api_key", "synthetic-key-0123456789") is True
    assert recorder.methods == ["PATCH"]


def test_unrelated_patch_error_fails_fast(vault_mod, monkeypatch):
    """A server error (500) must not trigger the merge-write fallback."""
    recorder = _Recorder(PATCH=_http_error(500))
    _wire(monkeypatch, recorder)

    assert vault_mod.put_secret("ai_agent_api_key", "synthetic-key-0123456789") is False
    assert recorder.methods == ["PATCH"]
