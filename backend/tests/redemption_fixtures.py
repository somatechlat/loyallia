"""
Shared fixtures/helpers for post-redemption side-effect tests.

Imported by test_redemption_side_effects*.py so each test module stays under
the 650-line project ceiling.
"""

from decimal import Decimal  # noqa: F401
from types import SimpleNamespace

import pytest

from apps.redemption.result import RedemptionResult
from common.messages import get_message


@pytest.fixture
def wallet_spy(monkeypatch):
    """Record Apple wake / Google addMessage / task enqueues."""
    apple_calls: list = []
    google_calls: list = []
    trigger_calls: list = []
    message_calls: list = []

    monkeypatch.setattr(
        "apps.customers.pass_engine.apple_push.notify_pass_updated",
        lambda cp: apple_calls.append(cp) or 1,
    )
    monkeypatch.setattr(
        "apps.customers.pass_engine.google_pass.send_push_notification",
        lambda cp, header, body, action_url="": google_calls.append(
            {"pass": cp, "header": header, "body": body}
        )
        or {"success": True, "message_id": "msg_test"},
    )
    monkeypatch.setattr(
        "apps.customers.tasks.trigger_pass_update",
        SimpleNamespace(
            delay=lambda *a, **k: trigger_calls.append((a, k)),
            apply_async=lambda *a, **k: trigger_calls.append((a, k)),
        ),
    )
    monkeypatch.setattr(
        "apps.customers.tasks_notify.dispatch_redeem_wallet_message",
        SimpleNamespace(
            delay=lambda *a, **k: message_calls.append((a, k)),
            apply_async=lambda *a, **k: message_calls.append((a, k)),
        ),
    )
    return SimpleNamespace(
        apple=apple_calls,
        google=google_calls,
        trigger=trigger_calls,
        message=message_calls,
    )


@pytest.fixture
def qr_stub(monkeypatch):
    calls: list = []
    monkeypatch.setattr(
        "apps.customers.tasks.generate_qr_for_pass",
        SimpleNamespace(delay=lambda pid: calls.append(pid)),
    )
    return calls


@pytest.fixture
def automation_stub(monkeypatch):
    calls: list = []

    def fake_fire_trigger_async(**kwargs):
        calls.append(kwargs)

    monkeypatch.setattr(
        "apps.automation.engine.fire_trigger_async",
        fake_fire_trigger_async,
    )
    return calls


@pytest.fixture
def analytics_stub(monkeypatch):
    calls: list = []
    monkeypatch.setattr(
        "apps.analytics.tasks.update_tenant_analytics",
        SimpleNamespace(apply_async=lambda *a, **k: calls.append((a, k))),
    )
    return calls


class _FakeRequest:
    """Minimal request stand-in for scanner API functions."""

    def __init__(self, tenant, user, remote_addr="127.0.0.1"):
        self.tenant = tenant
        self.user = user
        self.META = {"REMOTE_ADDR": remote_addr}


def _prepare_qr(pass_obj) -> str:
    from django.conf import settings

    from apps.customers.pass_engine.qr_generator import generate_qr_token

    qr_code = generate_qr_token(str(pass_obj.id), secret=settings.PASS_HMAC_SECRET)
    pass_obj.qr_code = qr_code
    pass_obj.save(update_fields=["qr_code"])
    return qr_code


def _stamp_redeem_result(pass_obj) -> RedemptionResult:
    """A realistic stamp-redeem result with mutation.updates keys."""
    return RedemptionResult(
        success=True,
        transaction_id=None,
        transaction_type="stamp_redeemed",
        pass_updated=True,
        reward_earned=False,
        reward_description=get_message("TRANSACTION_REWARD_REDEEMED"),
        intent_resolved="redeem",
        new_balance=str(pass_obj.stamp_count),
        new_state={"reward_ready": False, "lifecycle_state": "active"},
        field_keys=["reward_ready", "lifecycle_state"],
    )
