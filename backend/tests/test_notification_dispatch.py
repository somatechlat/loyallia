"""Unified wallet notification engine dispatch tests (transports stubbed)."""

from datetime import timedelta
from types import SimpleNamespace

import pytest
from django.utils import timezone

from apps.customers.pass_engine.field_notifications import (
    SKIP_GOOGLE_DISABLED,
    SKIP_TRIGGER_MISMATCH,
    compute_changed_field_ids,
    emit_field_change_notifications,
    snapshot_field_values,
)
from apps.customers.pass_engine.notify import (
    SKIP_EVENT_DISABLED,
    SKIP_INVALID_EVENT,
    get_program_notifications,
    notify_card_event,
    notify_event,
    resolve_field_notification_settings,
)
from apps.customers.schemas import CustomerCreateIn
from apps.customers.services import public_enroll
from apps.customers.tasks_notify import (
    dispatch_scheduled_field_notifications,
    redistribute_card_design,
)
from common.messages import get_message
from tests.factories import make_card, make_customer, make_customer_pass, make_tenant

# Helpers


def _wallet_settings(**events) -> dict:
    """Build a wallet_settings.notifications block from event overrides."""
    notifications = {}
    for key, cfg in events.items():
        notifications[key] = cfg
    return {"wallet_settings": {"notifications": notifications}}


@pytest.fixture
def platform_spy(monkeypatch):
    """Replace Apple/Google transports and record every call."""
    apple_calls: list = []
    google_calls: list = []

    def fake_apple(customer_pass):
        apple_calls.append(customer_pass)
        return 2

    def fake_google(customer_pass, header, body, action_url=""):
        google_calls.append({"pass": customer_pass, "header": header, "body": body})
        return {"success": True, "message_id": "msg_test"}

    monkeypatch.setattr(
        "apps.customers.pass_engine.apple_push.notify_pass_updated", fake_apple
    )
    monkeypatch.setattr(
        "apps.customers.pass_engine.google_pass.send_push_notification", fake_google
    )
    return SimpleNamespace(apple=apple_calls, google=google_calls)


@pytest.fixture
def qr_stub(monkeypatch):
    """Keep eager Celery QR generation away from the MinIO transport."""
    calls: list = []
    monkeypatch.setattr(
        "apps.customers.tasks.generate_qr_for_pass",
        SimpleNamespace(delay=lambda pid: calls.append(pid)),
    )
    return calls


@pytest.fixture
def automation_stub(monkeypatch):
    """Keep on-commit automation evaluation out of notification unit tests."""
    calls: list = []

    def fake_fire_trigger_async(**kwargs):
        calls.append(kwargs)

    monkeypatch.setattr(
        "apps.automation.engine.fire_trigger_async",
        fake_fire_trigger_async,
    )
    return calls


# notify_event


@pytest.mark.django_db
class TestNotifyEvent:
    def test_emits_both_platforms(self, platform_spy):
        tenant = make_tenant()
        card = make_card(
            tenant,
            metadata=_wallet_settings(onRedeem={"enabled": True, "apple": True, "google": True}),
        )
        cp = make_customer_pass(make_customer(tenant), card)

        result = notify_event(
            cp,
            event="redeemed",
            header=get_message("WALLET_NOTIF_REDEEM_HEADER"),
            body=get_message("WALLET_NOTIF_REDEEM_BODY"),
        )

        assert result["apple_devices"] == 2
        assert result["google"]["success"] is True
        assert result["skipped"] == []
        assert len(platform_spy.apple) == 1
        assert len(platform_spy.google) == 1
        assert platform_spy.google[0]["header"] == get_message("WALLET_NOTIF_REDEEM_HEADER")
        assert platform_spy.google[0]["body"] == get_message("WALLET_NOTIF_REDEEM_BODY")

    def test_respects_program_disabled(self, platform_spy):
        tenant = make_tenant()
        card = make_card(
            tenant,
            metadata=_wallet_settings(
                onRedeem={"enabled": False, "apple": True, "google": True}
            ),
        )
        customer = make_customer(tenant)
        cp = make_customer_pass(customer, card)

        result = notify_event(cp, event="redeemed", header="H", body="B")

        assert result["apple_devices"] == 0
        assert result["google"] == {}
        assert platform_spy.apple == []
        assert platform_spy.google == []
        assert any(s.get("reason") == SKIP_EVENT_DISABLED for s in result["skipped"])

    def test_respects_per_platform_flags(self, platform_spy):
        tenant = make_tenant()
        card = make_card(
            tenant,
            metadata=_wallet_settings(
                onRedeem={"enabled": True, "apple": False, "google": True}
            ),
        )
        customer = make_customer(tenant)
        cp = make_customer_pass(customer, card)

        result = notify_event(cp, event="redeemed", header="H", body="B")

        assert result["apple_devices"] == 0
        assert platform_spy.apple == []
        assert len(platform_spy.google) == 1
        assert result["google"]["success"] is True

    def test_force_bypasses_disabled_event(self, platform_spy):
        tenant = make_tenant()
        card = make_card(
            tenant,
            metadata=_wallet_settings(
                onRedeem={"enabled": False, "apple": True, "google": True}
            ),
        )
        customer = make_customer(tenant)
        cp = make_customer_pass(customer, card)

        result = notify_event(cp, event="redeemed", header="H", body="B", force=True)

        assert len(platform_spy.apple) == 1
        assert len(platform_spy.google) == 1
        assert result["skipped"] == []

    def test_google_outage_does_not_block_apple(self, monkeypatch, platform_spy):
        tenant = make_tenant()
        card = make_card(tenant)
        customer = make_customer(tenant)
        cp = make_customer_pass(customer, card)

        def boom(customer_pass, header, body, action_url=""):
            raise RuntimeError(get_message("WALLET_GOOGLE_AUTH_FAILED"))

        monkeypatch.setattr(
            "apps.customers.pass_engine.google_pass.send_push_notification",
            boom,
        )

        result = notify_event(cp, event="redeemed", header="H", body="B")

        assert result["apple_devices"] == 2
        assert len(platform_spy.apple) == 1
        assert any(s["platform"] == "google" for s in result["skipped"])

    def test_google_skipped_without_header_body(self, platform_spy):
        tenant = make_tenant()
        cp = make_customer_pass(make_customer(tenant), make_card(tenant))
        result = notify_event(cp, event="design_updated")

        assert result["apple_devices"] == 2
        assert result["google"] == {}
        assert platform_spy.google == []

    def test_invalid_event_is_rejected(self, platform_spy):
        tenant = make_tenant()
        cp = make_customer_pass(make_customer(tenant), make_card(tenant))
        result = notify_event(cp, event="not_a_real_event")

        assert result["apple_devices"] == 0
        assert platform_spy.apple == []
        assert any(s.get("reason") == SKIP_INVALID_EVENT for s in result["skipped"])


# Program notification config


@pytest.mark.django_db
class TestProgramNotificationsConfig:
    def test_defaults_on_enroll_off_redeem_and_value_on(self):
        tenant = make_tenant()
        card = make_card(tenant)

        cfg = get_program_notifications(card)

        assert cfg["onEnroll"]["enabled"] is False
        assert cfg["onRedeem"]["enabled"] is True
        assert cfg["onValueChange"]["enabled"] is True

    def test_reads_camel_and_snake_case_keys(self):
        tenant = make_tenant()
        welcome = get_message("WALLET_NOTIF_ENROLL_BODY", program="X")
        card_camel = make_card(
            tenant,
            metadata=_wallet_settings(
                onEnroll={"enabled": True, "message": welcome}
            ),
        )
        card_snake = make_card(
            tenant,
            metadata=_wallet_settings(
                on_enroll={"enabled": True, "message": welcome}
            ),
        )

        assert get_program_notifications(card_camel)["onEnroll"]["enabled"] is True
        assert get_program_notifications(card_snake)["onEnroll"]["enabled"] is True

    def test_resolve_field_notification_settings(self):
        tenant = make_tenant()
        apple_msg = get_message("WALLET_CHANGE_NEW_STAMP")
        google_body = get_message("WALLET_NOTIF_VALUE_CHANGED_BODY")
        card = make_card(
            tenant,
            metadata={
                "wallet_studio": {
                    "fields": [
                        {
                            "id": "points",
                            "notifications": {
                                "appleChangeMessage": {
                                    "enabled": True,
                                    "message": apple_msg,
                                },
                                "googleMessage": {
                                    "enabled": True,
                                    "header": get_message(
                                        "WALLET_NOTIF_VALUE_CHANGED_HEADER"
                                    ),
                                    "body": google_body,
                                    "trigger": "onChange",
                                },
                            },
                        }
                    ]
                }
            },
        )

        settings = resolve_field_notification_settings(card, "points")

        assert settings["appleChangeMessage"]["enabled"] is True
        assert settings["appleChangeMessage"]["message"] == apple_msg
        assert settings["googleMessage"]["trigger"] == "onChange"
        assert settings["googleMessage"]["body"] == google_body

        missing = resolve_field_notification_settings(card, "nope")
        assert missing["appleChangeMessage"]["enabled"] is False
        assert missing["googleMessage"]["enabled"] is False


# Field change notifications


@pytest.mark.django_db
class TestFieldChangeNotifications:
    def _studio_card(self, tenant, google_enabled=True, trigger="onChange"):
        field = {
            "id": "points",
            "label": get_message("WALLET_LABEL_POINTS"),
            "value": "0",
            "isDynamic": True,
            "dynamicTemplate": "{{loyalty.points_balance}}",
            "notifications": {
                "appleChangeMessage": {
                    "enabled": True,
                    "message": get_message("WALLET_CHANGE_NEW_STAMP"),
                },
                "googleMessage": {
                    "enabled": google_enabled,
                    "header": get_message("WALLET_NOTIF_VALUE_CHANGED_HEADER"),
                    "body": get_message("WALLET_NOTIF_VALUE_CHANGED_BODY"),
                    "trigger": trigger,
                },
            },
        }
        return make_card(
            tenant, metadata={"wallet_studio": {"fields": [field]}}
        )

    def test_compute_changed_field_ids_diffs_before_after(self, platform_spy):
        tenant = make_tenant()
        card = self._studio_card(tenant)
        cp = make_customer_pass(make_customer(tenant), card)
        before = snapshot_field_values(card, cp)
        assert before["points"] == "0"
        cp.stamp_count = 5
        cp.cashback_balance = 125
        cp.save()
        changed = compute_changed_field_ids(card, cp, previous_values=before)
        assert changed["points"] == ("0", "125")

    def test_emit_field_change_sends_google_with_value_substitution(
        self, platform_spy
    ):
        tenant = make_tenant()
        cp = make_customer_pass(make_customer(tenant), self._studio_card(tenant))
        cp.cashback_balance = 50
        cp.save()

        outcome = emit_field_change_notifications(cp, ["points"], {"points": "0"})

        assert outcome["emitted"] == 1
        assert len(platform_spy.google) == 1
        assert platform_spy.google[0]["header"] == get_message(
            "WALLET_NOTIF_VALUE_CHANGED_HEADER"
        )
        expected = (
            get_message("WALLET_NOTIF_VALUE_CHANGED_BODY")
            .replace("{value}", "50")
            .replace("%@", "50")
        )
        assert platform_spy.google[0]["body"] == expected

    def test_emit_skips_when_google_disabled(self, platform_spy):
        tenant = make_tenant()
        cp = make_customer_pass(
            make_customer(tenant), self._studio_card(tenant, google_enabled=False)
        )
        cp.cashback_balance = 50
        cp.save()

        outcome = emit_field_change_notifications(cp, ["points"], {"points": "0"})

        assert outcome["emitted"] == 0
        assert platform_spy.google == []
        assert any(s.get("reason") == SKIP_GOOGLE_DISABLED for s in outcome["skipped"])

    def test_emit_skips_when_trigger_is_not_on_change(self, platform_spy):
        tenant = make_tenant()
        cp = make_customer_pass(
            make_customer(tenant), self._studio_card(tenant, trigger="scheduled")
        )
        cp.cashback_balance = 50
        cp.save()

        outcome = emit_field_change_notifications(cp, ["points"], {"points": "0"})

        assert outcome["emitted"] == 0
        assert platform_spy.google == []
        assert any(s.get("reason") == SKIP_TRIGGER_MISMATCH for s in outcome["skipped"])


# Event defaults


@pytest.mark.django_db
class TestEventDefaults:
    def test_redeem_emits_by_default(self, platform_spy):
        """onRedeem defaults to enabled — a redeem notification goes out."""
        tenant = make_tenant()
        card = make_card(tenant)  # no wallet_settings → defaults
        cp = make_customer_pass(make_customer(tenant), card)

        result = notify_event(
            cp,
            event="redeemed",
            header=get_message("WALLET_NOTIF_REDEEM_HEADER"),
            body=get_message("WALLET_NOTIF_REDEEM_BODY"),
        )

        assert result["apple_devices"] == 2
        assert result["google"]["success"] is True
        assert len(platform_spy.apple) == 1
        assert len(platform_spy.google) == 1

    def test_enroll_disabled_by_default(self, platform_spy):
        """onEnroll defaults to disabled — no welcome push without config+opt-in."""
        tenant = make_tenant()
        card = make_card(tenant)
        cp = make_customer_pass(make_customer(tenant), card)
        result = notify_event(
            cp,
            event="enrolled",
            header=get_message("WALLET_NOTIF_ENROLL_HEADER"),
            body=get_message("WALLET_NOTIF_ENROLL_BODY", program=card.name),
        )

        assert result["apple_devices"] == 0
        assert platform_spy.apple == []
        assert platform_spy.google == []
        assert any(s.get("reason") == SKIP_EVENT_DISABLED for s in result["skipped"])


# Enroll opt-in


@pytest.mark.django_db
class TestEnrollNotification:
    def _enroll_card(self, tenant, enabled=True):
        # Raw catalog template keeps `{program}` for send-time substitution.
        on_enroll = {
            "enabled": enabled,
            "requireConsent": True,
            "apple": True,
            "google": True,
            "message": get_message("WALLET_NOTIF_ENROLL_BODY"),
        }
        return make_card(tenant, metadata=_wallet_settings(onEnroll=on_enroll))

    def test_schema_notify_on_enroll_defaults_false(self):
        base = {"first_name": "Ana", "last_name": "Ruiz", "email": "ana@example.com"}
        assert CustomerCreateIn.model_validate(base).notify_on_enroll is False
        assert CustomerCreateIn.model_validate(
            {**base, "notify_on_enroll": True}
        ).notify_on_enroll is True

    def test_enroll_opt_in_default_off(
        self,
        platform_spy,
        qr_stub,
        automation_stub,
        django_capture_on_commit_callbacks,
    ):
        tenant = make_tenant()
        card = self._enroll_card(tenant, enabled=True)

        with django_capture_on_commit_callbacks(execute=True):
            pass_obj, customer, already, created = public_enroll(
                card, {"first_name": "Laura", "last_name": "Paz", "email": "laura@example.com"},
            )

        assert already is False
        assert platform_spy.apple == []
        assert platform_spy.google == []

    def test_enroll_opt_in_on_emits(
        self,
        platform_spy,
        qr_stub,
        automation_stub,
        django_capture_on_commit_callbacks,
    ):
        tenant = make_tenant()
        card = self._enroll_card(tenant, enabled=True)

        with django_capture_on_commit_callbacks(execute=True):
            pass_obj, customer, already, created = public_enroll(
                card,
                {
                    "first_name": "Laura",
                    "last_name": "Paz",
                    "email": "laura@example.com",
                    "notify_on_enroll": True,
                },
            )

        assert already is False
        assert len(platform_spy.apple) == 1
        assert len(platform_spy.google) == 1
        assert platform_spy.google[0]["header"] == get_message("WALLET_NOTIF_ENROLL_HEADER")
        assert card.name in platform_spy.google[0]["body"]

    def test_enroll_program_disabled_blocks_even_with_opt_in(
        self,
        platform_spy,
        qr_stub,
        automation_stub,
        django_capture_on_commit_callbacks,
    ):
        tenant = make_tenant()
        card = self._enroll_card(tenant, enabled=False)

        with django_capture_on_commit_callbacks(execute=True):
            public_enroll(
                card,
                {
                    "first_name": "Laura",
                    "last_name": "Paz",
                    "email": "laura@example.com",
                    "notify_on_enroll": True,
                },
            )

        assert platform_spy.apple == []
        assert platform_spy.google == []


# Card-level fan-out


@pytest.mark.django_db
class TestNotifyCardEvent:
    def test_card_event_fans_out_apple_and_enqueues_google(
        self,
        monkeypatch,
        platform_spy,
        qr_stub,
        automation_stub,
        django_capture_on_commit_callbacks,
    ):
        tenant = make_tenant()
        card = make_card(tenant)
        customer = make_customer(tenant)
        make_customer_pass(customer, card)

        apple_card_calls: list = []
        monkeypatch.setattr(
            "apps.customers.pass_engine.apple_push.notify_card_updated",
            lambda c: apple_card_calls.append(c) or 3,
        )

        fanout_calls: list = []
        monkeypatch.setattr(
            "apps.customers.tasks_notify.notify_card_google_fanout",
            SimpleNamespace(delay=lambda *a, **k: fanout_calls.append((a, k))),
        )

        with django_capture_on_commit_callbacks(execute=True):
            result = notify_card_event(
                card, event="design_updated", header="H", body="B", force=True
            )

        assert result["apple_devices"] == 3
        assert result["google"]["enqueued"] is True
        assert len(apple_card_calls) == 1
        assert len(fanout_calls) == 1


# redistribute_card_design


@pytest.mark.django_db
class TestRedistributeCardDesign:
    def test_enqueues_per_active_pass(
        self,
        monkeypatch,
        qr_stub,
        automation_stub,
        django_capture_on_commit_callbacks,
    ):
        tenant = make_tenant()
        card = make_card(tenant)
        for i in range(3):
            customer = make_customer(tenant, email=f"r{i}@test.com")
            make_customer_pass(customer, card)
        # Inactive pass must NOT be enqueued.
        inactive_customer = make_customer(tenant, email="inactive@test.com")
        make_customer_pass(inactive_customer, card, is_active=False)

        enqueued: list = []
        monkeypatch.setattr(
            "apps.customers.tasks.trigger_pass_update",
            SimpleNamespace(delay=lambda pid: enqueued.append(pid)),
        )
        monkeypatch.setattr(
            "apps.customers.pass_engine.apple_push.notify_card_updated",
            lambda c: 4,
        )

        with django_capture_on_commit_callbacks(execute=True):
            result = redistribute_card_design(str(card.id))

        assert result["success"] is True
        assert result["total_passes"] == 3
        assert result["enqueued"] == 3
        assert result["apple_devices"] == 4
        assert len(enqueued) == 3

    def test_missing_card_returns_error(self):
        result = redistribute_card_design("00000000-0000-0000-0000-000000000000")
        assert result["success"] is False
        assert result["error"] == get_message("PROGRAM_NOT_FOUND")


# Scheduled field notifications


@pytest.mark.django_db
class TestScheduledFieldNotifications:
    @pytest.mark.parametrize(
        ("offset_hours", "expect_sent"),
        [(-1, 1), (48, 0)],
        ids=["due", "future"],
    )
    def test_scheduled_field_emits_only_when_due(
        self, platform_spy, offset_hours, expect_sent
    ):
        tenant = make_tenant()
        scheduled_at = (timezone.now() + timedelta(hours=offset_hours)).isoformat()
        card = make_card(
            tenant,
            metadata={
                "wallet_studio": {
                    "fields": [
                        {
                            "id": "promo",
                            "notifications": {
                                "googleMessage": {
                                    "enabled": True,
                                    "header": get_message(
                                        "WALLET_NOTIF_DESIGN_UPDATED_HEADER"
                                    ),
                                    "body": get_message(
                                        "WALLET_NOTIF_DESIGN_UPDATED_BODY"
                                    ),
                                    "trigger": "scheduled",
                                    "scheduledAt": scheduled_at,
                                }
                            },
                        }
                    ]
                }
            },
        )
        make_customer_pass(make_customer(tenant), card)
        result = dispatch_scheduled_field_notifications()
        assert result["success"] is True
        assert result["sent"] == expect_sent
        assert len(platform_spy.google) == expect_sent
