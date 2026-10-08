"""Wallet campaign Apple message tests.

Covers the W-CAMPAIGN-APPLE contract: per-pass ``last_message`` mutation
before the Apple wake, platform isolation (apple/google/both), duplicate
message pinning, safe truncation, and a pass.json field-diff proving the
``changeMessage`` value actually changes.
"""

from types import SimpleNamespace

import pytest

from apps.customers.pass_engine.apple_field_builders import _build_fields_for_type
from apps.customers.pass_engine.campaign_message import (
    CAMPAIGN_MESSAGE_MAX_LEN,
    apply_campaign_message,
)
from apps.notifications.tasks.campaigns import send_wallet_notification_campaign
from common.messages import get_message
from tests.factories import (
    make_card,
    make_customer,
    make_customer_pass,
    make_subscription,
    make_tenant,
)


def _campaign_tenant(**kwargs):
    """Tenant with an active plan that passes fire-time campaign gates."""
    tenant = make_tenant(**kwargs)
    make_subscription(tenant)
    return tenant


def _change_message_values(fields: dict) -> dict[str, str]:
    """Map field key → value for every field that has a changeMessage."""
    values: dict[str, str] = {}
    for group_fields in fields.values():
        for field in group_fields:
            if field.get("changeMessage"):
                values[str(field.get("key"))] = str(field.get("value", ""))
    return values


@pytest.fixture
def platform_spy(monkeypatch):
    """Replace Apple/Google transports and record every call."""
    apple_calls: list = []
    google_calls: list = []
    google_class_calls: list = []
    card_wake_calls: list = []

    def fake_apple(customer_pass):
        apple_calls.append(customer_pass)
        return 2

    def fake_google(customer_pass, header, body, action_url=""):
        google_calls.append(
            {"pass": customer_pass, "header": header, "body": body}
        )
        return {"success": True, "message_id": "msg_test"}

    def fake_google_class(card, header, body, action_url=""):
        google_class_calls.append(
            {"card": card, "header": header, "body": body}
        )
        return {"success": True, "message_id": "msg_class"}

    def fake_card_wake(card):
        card_wake_calls.append(card)
        return 1

    monkeypatch.setattr(
        "apps.customers.pass_engine.apple_push.notify_pass_updated", fake_apple
    )
    monkeypatch.setattr(
        "apps.customers.pass_engine.apple_push.notify_card_updated", fake_card_wake
    )
    monkeypatch.setattr(
        "apps.customers.pass_engine.google_pass.send_push_notification", fake_google
    )
    monkeypatch.setattr(
        "apps.customers.pass_engine.google_pass.send_push_notification_to_class",
        fake_google_class,
    )
    return SimpleNamespace(
        apple=apple_calls,
        google=google_calls,
        google_class=google_class_calls,
        card_wake=card_wake_calls,
    )


@pytest.mark.django_db
class TestApplyCampaignMessage:
    def test_writes_last_message_and_bumps_last_updated(self):
        tenant = make_tenant()
        cp = make_customer_pass(make_customer(tenant), make_card(tenant))
        before = cp.last_updated

        result = apply_campaign_message(cp, "Hola cartera")

        assert result == {"changed": True, "value": "Hola cartera", "truncated": False}
        cp.refresh_from_db()
        assert cp.pass_data["last_message"] == "Hola cartera"
        assert cp.last_updated > before

    def test_duplicate_message_is_pinned_without_rewrite(self):
        tenant = make_tenant()
        cp = make_customer_pass(make_customer(tenant), make_card(tenant))
        apply_campaign_message(cp, "Mensaje fijo")
        cp.refresh_from_db()
        mid = cp.last_updated

        result = apply_campaign_message(cp, "Mensaje fijo")

        assert result["changed"] is False
        assert result["value"] == "Mensaje fijo"
        cp.refresh_from_db()
        assert cp.last_updated == mid

    def test_empty_message_matches_empty_pin(self):
        tenant = make_tenant()
        cp = make_customer_pass(make_customer(tenant), make_card(tenant))

        result = apply_campaign_message(cp, "")

        assert result["changed"] is False
        cp.refresh_from_db()
        assert "last_message" not in cp.pass_data

    def test_truncates_to_max_len_with_i18n_mark(self):
        tenant = make_tenant()
        cp = make_customer_pass(make_customer(tenant), make_card(tenant))
        long_text = "x" * (CAMPAIGN_MESSAGE_MAX_LEN + 50)

        result = apply_campaign_message(cp, long_text)

        assert result["truncated"] is True
        assert result["changed"] is True
        mark = get_message("WALLET_MESSAGE_TRUNCATED_MARK")
        assert result["value"].endswith(mark)
        assert len(result["value"]) == CAMPAIGN_MESSAGE_MAX_LEN
        cp.refresh_from_db()
        assert cp.pass_data["last_message"] == result["value"]


@pytest.mark.django_db
class TestWalletCampaignPlatformIsolation:
    def test_apple_broadcast_mutates_wakes_and_skips_google(self, platform_spy):
        tenant = _campaign_tenant()
        card = make_card(tenant, metadata={"wallet_provider": "both"})
        cp = make_customer_pass(make_customer(tenant), card)
        before = cp.last_updated

        result = send_wallet_notification_campaign(
            tenant_id=str(tenant.id),
            title="Promo",
            message="Nuevo beneficio disponible",
            wallet_platform="apple",
        )

        assert result["success"] is True
        assert result["apple_push_sent"] == 2
        assert result["google_push_sent"] == 0
        cp.refresh_from_db()
        assert cp.pass_data["last_message"] == "Nuevo beneficio disponible"
        assert cp.last_updated > before
        assert len(platform_spy.apple) == 1
        assert platform_spy.apple[0].id == cp.id
        assert platform_spy.google == []
        assert platform_spy.google_class == []
        assert platform_spy.card_wake == []

    def test_google_targeted_addmessage_without_last_message(self, platform_spy):
        tenant = _campaign_tenant()
        card = make_card(tenant, metadata={"wallet_provider": "both"})
        customer = make_customer(tenant)
        cp = make_customer_pass(customer, card)

        result = send_wallet_notification_campaign(
            tenant_id=str(tenant.id),
            title="Promo",
            message="Solo Google",
            wallet_platform="google",
            target_customer_ids=[str(customer.id)],
        )

        assert result["success"] is True
        assert result["google_push_sent"] == 1
        assert result["apple_push_sent"] == 0
        assert len(platform_spy.google) == 1
        assert platform_spy.google[0]["header"] == "Promo"
        assert platform_spy.google[0]["body"] == "Solo Google"
        assert platform_spy.apple == []
        cp.refresh_from_db()
        assert "last_message" not in cp.pass_data

    def test_both_targeted_applies_wakes_and_pushes(self, platform_spy):
        tenant = _campaign_tenant()
        card = make_card(tenant, metadata={"wallet_provider": "both"})
        customer = make_customer(tenant)
        cp = make_customer_pass(customer, card)
        before = cp.last_updated

        result = send_wallet_notification_campaign(
            tenant_id=str(tenant.id),
            title="Promo",
            message="Ambas plataformas",
            wallet_platform="both",
            target_customer_ids=[str(customer.id)],
        )

        assert result["success"] is True
        assert result["google_push_sent"] == 1
        assert result["apple_push_sent"] == 2
        cp.refresh_from_db()
        assert cp.pass_data["last_message"] == "Ambas plataformas"
        assert cp.last_updated > before
        assert len(platform_spy.apple) == 1
        assert len(platform_spy.google) == 1

    def test_google_broadcast_uses_class_addmessage_without_mutation(
        self, platform_spy
    ):
        tenant = _campaign_tenant()
        card = make_card(tenant, metadata={"wallet_provider": "both"})
        cp = make_customer_pass(make_customer(tenant), card)

        result = send_wallet_notification_campaign(
            tenant_id=str(tenant.id),
            title="Promo",
            message="Broadcast Google",
            wallet_platform="google",
        )

        assert result["success"] is True
        assert len(platform_spy.google_class) == 1
        assert platform_spy.google == []
        assert platform_spy.apple == []
        assert platform_spy.card_wake == []
        cp.refresh_from_db()
        assert "last_message" not in cp.pass_data

    def test_both_broadcast_class_google_plus_per_pass_apple(self, platform_spy):
        tenant = _campaign_tenant()
        card = make_card(tenant, metadata={"wallet_provider": "both"})
        cp = make_customer_pass(make_customer(tenant), card)
        before = cp.last_updated

        result = send_wallet_notification_campaign(
            tenant_id=str(tenant.id),
            title="Promo",
            message="Broadcast ambos",
            wallet_platform="both",
        )

        assert result["success"] is True
        assert len(platform_spy.google_class) == 1
        assert platform_spy.google == []
        assert platform_spy.card_wake == []
        assert len(platform_spy.apple) == 1
        assert platform_spy.apple[0].id == cp.id
        cp.refresh_from_db()
        assert cp.pass_data["last_message"] == "Broadcast ambos"
        assert cp.last_updated > before

    def test_duplicate_message_pins_and_skips_rewake(self, platform_spy):
        tenant = _campaign_tenant()
        card = make_card(tenant, metadata={"wallet_provider": "both"})
        cp = make_customer_pass(make_customer(tenant), card)

        first = send_wallet_notification_campaign(
            tenant_id=str(tenant.id),
            title="Promo",
            message="Mensaje fijo",
            wallet_platform="apple",
        )
        assert first["apple_push_sent"] == 2
        assert len(platform_spy.apple) == 1

        second = send_wallet_notification_campaign(
            tenant_id=str(tenant.id),
            title="Promo",
            message="Mensaje fijo",
            wallet_platform="apple",
        )

        assert second["success"] is True
        assert second["apple_push_sent"] == 0
        assert len(platform_spy.apple) == 1
        cp.refresh_from_db()
        assert cp.pass_data["last_message"] == "Mensaje fijo"

    def test_field_diff_last_message_changes_on_campaign(self, platform_spy):
        tenant = _campaign_tenant()
        card = make_card(tenant, metadata={"wallet_provider": "both"})
        cp = make_customer_pass(make_customer(tenant), card)

        old_fields = _change_message_values(_build_fields_for_type(card, cp))
        assert "last_message" in old_fields
        old_value = old_fields["last_message"]

        send_wallet_notification_campaign(
            tenant_id=str(tenant.id),
            title="Promo",
            message="Cambio visible",
            wallet_platform="apple",
        )

        cp.refresh_from_db()
        new_fields = _change_message_values(_build_fields_for_type(card, cp))
        assert new_fields["last_message"] == "Cambio visible"
        assert new_fields["last_message"] != old_value

    def test_field_diff_truncated_message_still_changes(self, platform_spy):
        tenant = _campaign_tenant()
        card = make_card(tenant, metadata={"wallet_provider": "both"})
        cp = make_customer_pass(make_customer(tenant), card)

        old_fields = _change_message_values(_build_fields_for_type(card, cp))

        long_text = "y" * (CAMPAIGN_MESSAGE_MAX_LEN + 10)
        send_wallet_notification_campaign(
            tenant_id=str(tenant.id),
            title="Promo",
            message=long_text,
            wallet_platform="apple",
        )

        cp.refresh_from_db()
        new_fields = _change_message_values(_build_fields_for_type(card, cp))
        assert new_fields["last_message"] != old_fields.get("last_message")
        assert len(new_fields["last_message"]) == CAMPAIGN_MESSAGE_MAX_LEN
