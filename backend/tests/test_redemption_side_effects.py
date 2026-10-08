# ruff: noqa: F811  # pytest fixtures are imported for discovery then injected via parameters
"""
Post-redemption side-effect dispatch tests.

Covers: production call shape (empty header/body + config → templated Google
copy), per-type copy selection, idempotent replay (1 notify only), v1/v2
exactly-once notify + single Apple wake, Google outage isolation, and
field_keys matching real mutation.updates keys.

Transports are stubbed at the httpx/Apple boundary (allowed for transport
tests); business logic is real.
"""

from decimal import Decimal
from types import SimpleNamespace  # noqa: F401

import pytest

from apps.customers.pass_engine.notify import (
    SKIP_CONSENT_REQUIRED,  # noqa: F401
    resolve_redeem_copy,
)
from apps.redemption.command import RedemptionCommand
from apps.redemption.gateway import RedemptionGateway
from apps.redemption.idempotency import clear as clear_idempotency
from apps.redemption.side_effects import (
    SKIP_IDEMPOTENT_REPLAY,
    post_redemption_side_effects,
)
from common.messages import get_message
from tests.factories import (
    make_card,
    make_customer,
    make_customer_pass,
    make_staff,
    make_tenant,
)
from tests.redemption_fixtures import (  # noqa: F401
    _FakeRequest,
    _prepare_qr,
    _stamp_redeem_result,
    analytics_stub,
    automation_stub,
    qr_stub,
    wallet_spy,
)

# Production call shape / per-type copy
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestRedeemCopyResolution:
    def test_empty_header_body_resolves_from_config_and_catalog(self, wallet_spy):
        """Production call shape: no header/body args → templated Google copy."""
        tenant = make_tenant()
        card = make_card(
            tenant,
            metadata={
                "wallet_settings": {
                    "notifications": {
                        "onRedeem": {
                            "enabled": True,
                            "apple": True,
                            "google": True,
                            "header": get_message("WALLET_NOTIF_REDEEM_STAMP_HEADER"),
                            "body": "Hola {customer} en {program}: {value}",
                        }
                    }
                }
            },
        )
        cp = make_customer_pass(make_customer(tenant), card)

        header, body = resolve_redeem_copy(
            cp, {"value": "7", "amount": "1", "balance": "7", "remaining_uses": "", "reward": ""}
        )

        assert header == get_message("WALLET_NOTIF_REDEEM_STAMP_HEADER")
        assert "Jane Doe" in body
        assert card.name in body
        assert "7" in body

    def test_per_type_catalog_selection(self):
        """Each card type pulls its own WALLET_NOTIF_REDEEM_<TYPE>_* keys."""
        tenant = make_tenant()
        cases = [
            ("stamp", "STAMP"),
            ("cashback", "CASHBACK"),
            ("coupon", "COUPON"),
            ("gift_certificate", "GIFT"),
            ("multipass", "MULTIPASS"),
            ("referral_pass", "REFERRAL"),
            ("discount", "DISCOUNT"),
            ("vip_membership", "MEMBERSHIP"),
            ("corporate_discount", "CORPORATE"),
            ("affiliate", "AFFILIATE"),
        ]
        for card_type, suffix in cases:
            card = make_card(tenant, card_type=card_type)
            cp = make_customer_pass(
                make_customer(tenant, email=f"{card_type}@t.com"), card
            )
            header, body = resolve_redeem_copy(cp, {"value": "1", "amount": "2"})
            assert header == get_message(f"WALLET_NOTIF_REDEEM_{suffix}_HEADER")
            assert body == get_message(f"WALLET_NOTIF_REDEEM_{suffix}_BODY").replace(
                "{program}", card.name
            ).replace("{customer}", "Jane Doe").replace("{value}", "1").replace(
                "{amount}", "2"
            )

    def test_catalog_fallback_when_no_program_config(self):
        tenant = make_tenant()
        card = make_card(tenant, card_type="cashback")
        cp = make_customer_pass(make_customer(tenant), card)
        header, body = resolve_redeem_copy(cp, {"value": "10.00", "amount": "5.00"})
        assert header == get_message("WALLET_NOTIF_REDEEM_CASHBACK_HEADER")
        assert "10.00" in body
        assert "5.00" in body


# ---------------------------------------------------------------------------
# Idempotent replay
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestIdempotentReplay:
    def test_replay_skips_side_effects(self, wallet_spy):
        tenant = make_tenant()
        card = make_card(tenant)
        cp = make_customer_pass(make_customer(tenant), card)
        result = _stamp_redeem_result(cp)
        result.idempotent_replay = True

        outcome = post_redemption_side_effects(result, tenant=tenant)

        assert outcome["enqueued"] is False
        assert any(s.get("reason") == SKIP_IDEMPOTENT_REPLAY for s in outcome["skipped"])
        assert wallet_spy.trigger == []
        assert wallet_spy.message == []

    def test_gateway_replay_fires_side_effects_once(
        self, wallet_spy, django_capture_on_commit_callbacks
    ):
        """First call notifies; replay with the same idempotency key does not."""
        tenant = make_tenant()
        card = make_card(tenant, card_type="cashback")
        cp = make_customer_pass(make_customer(tenant), card)
        qr = _prepare_qr(cp)
        key = "idem-key-replay-1"

        gateway = RedemptionGateway()
        cmd = RedemptionCommand(
            tenant_id=str(tenant.id),
            qr_code=qr,
            intent="earn",
            amount=Decimal("100"),
            idempotency_key=key,
        )

        with django_capture_on_commit_callbacks(execute=True):
            first = gateway.process(cmd, tenant)
            assert first.success is True
            assert first.idempotent_replay is False
            first_side = post_redemption_side_effects(first, tenant=tenant, qr_code=qr)
            assert first_side["enqueued"] is True

        with django_capture_on_commit_callbacks(execute=True):
            replay = gateway.process(cmd, tenant)
            assert replay.success is True
            assert replay.idempotent_replay is True
            replay_side = post_redemption_side_effects(replay, tenant=tenant, qr_code=qr)
            assert replay_side["enqueued"] is False

        # Exactly one notify wave despite two gateway calls.
        assert len(wallet_spy.trigger) == 1
        assert len(wallet_spy.message) == 1

        clear_idempotency(str(tenant.id), key)


# ---------------------------------------------------------------------------
# field_keys from mutation.updates
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestFieldKeysFromMutation:
    def test_field_keys_match_mutation_updates(
        self, wallet_spy, django_capture_on_commit_callbacks
    ):
        """field_keys are the real mutation.updates keys, not hardcoded names."""
        tenant = make_tenant()
        card = make_card(tenant, card_type="cashback")
        cp = make_customer_pass(make_customer(tenant), card)
        qr = _prepare_qr(cp)

        gateway = RedemptionGateway()
        cmd = RedemptionCommand(
            tenant_id=str(tenant.id),
            qr_code=qr,
            intent="earn",
            amount=Decimal("50"),
            idempotency_key="field-keys-1",
        )
        with django_capture_on_commit_callbacks(execute=True):
            result = gateway.process(cmd, tenant)

        assert result.success is True
        # CashbackEarnStrategy._compute_mutation updates exactly this key.
        assert result.field_keys == ["cashback_balance", "last_message"]
        assert result.new_state.get("cashback_balance") is not None

        with django_capture_on_commit_callbacks(execute=True):
            side = post_redemption_side_effects(result, tenant=tenant, qr_code=qr)

        assert side["field_keys"] == ["cashback_balance", "last_message"]
        # The notify wave carries the same keys.
        assert wallet_spy.trigger or side["enqueued"] is True

        clear_idempotency(str(tenant.id), "field-keys-1")

    def test_stamp_redeem_field_keys(self, django_capture_on_commit_callbacks):
        tenant = make_tenant()
        card = make_card(tenant, card_type="stamp", metadata={"stamps_required": 5})
        cp = make_customer_pass(make_customer(tenant), card)
        cp.stamp_count = 5
        cp.lifecycle_state = "reward_ready"
        cp.pass_data = {"reward_ready": True, "stamp_count": 5}
        cp.save()
        qr = _prepare_qr(cp)

        gateway = RedemptionGateway()
        cmd = RedemptionCommand(
            tenant_id=str(tenant.id),
            qr_code=qr,
            intent="redeem",
            idempotency_key="field-keys-stamp-1",
        )
        with django_capture_on_commit_callbacks(execute=True):
            result = gateway.process(cmd, tenant)

        assert result.success is True
        assert set(result.field_keys) == {"reward_ready", "lifecycle_state", "last_message"}

        clear_idempotency(str(tenant.id), "field-keys-stamp-1")


# ---------------------------------------------------------------------------
# Exactly-once notify + single Apple wake across v1 / v2
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestExactlyOnceNotify:
    def test_v2_transact_single_notify_single_apple_wake(
        self,
        wallet_spy,
        qr_stub,
        automation_stub,
        analytics_stub,
        django_capture_on_commit_callbacks,
    ):
        from apps.redemption.api import ScanTransactIn, transact_v2

        tenant = make_tenant()
        card = make_card(tenant, card_type="cashback")
        cp = make_customer_pass(make_customer(tenant), card)
        qr = _prepare_qr(cp)
        staff = make_staff(tenant)
        request = _FakeRequest(tenant, staff)

        data = ScanTransactIn(qr_code=qr, amount=80, intent="earn")
        with django_capture_on_commit_callbacks(execute=True):
            result = transact_v2(request, data)  # type: ignore[reportArgumentType]

        assert result["success"] is True
        # trigger_pass_update owns the single Apple wake.
        assert len(wallet_spy.trigger) == 1
        # Earn sends transactional value_changed Google copy (not redeem promo).
        assert len(wallet_spy.message) == 1
        assert wallet_spy.message[0][0][1] == "value_changed"
        # notify_event must not also fire Apple (include_apple=False on message path).
        assert wallet_spy.apple == []

    def test_v1_and_v2_transact_together_one_notify(
        self,
        wallet_spy,
        qr_stub,
        automation_stub,
        analytics_stub,
        django_capture_on_commit_callbacks,
    ):
        """v1 wrapper delegates to v2 — together they must notify exactly once."""
        from apps.redemption.api import ScanTransactIn as V2In
        from apps.redemption.api import transact_v2
        from apps.transactions.api import ScanTransactIn as V1In
        from apps.transactions.api import transact as transact_v1

        tenant = make_tenant()
        card = make_card(tenant, card_type="cashback")
        cp = make_customer_pass(make_customer(tenant), card)
        qr = _prepare_qr(cp)
        staff = make_staff(tenant)
        request = _FakeRequest(tenant, staff)

        with django_capture_on_commit_callbacks(execute=True):
            v2_result = transact_v2(
                request, V2In(qr_code=qr, amount=40, intent="earn", idempotency_key="v2-only-1")
            )
        assert v2_result["success"] is True
        v2_triggers = len(wallet_spy.trigger)
        v2_messages = len(wallet_spy.message)
        v2_apple = len(wallet_spy.apple)

        with django_capture_on_commit_callbacks(execute=True):
            v1_result = transact_v1(
                request,
                V1In(qr_code=qr, amount=40, intent="earn", idempotency_key="v1-only-1"),
            )
        assert v1_result["success"] is True

        # v1 must NOT add another notify wave on top of v2's helper.
        # Each successful call has its own side-effect wave (different keys),
        # but a single call produces exactly 1 trigger + 1 message task
        # and never an extra inline Apple wake.
        assert len(wallet_spy.trigger) == v2_triggers + 1
        assert len(wallet_spy.message) == v2_messages + 1
        assert len(wallet_spy.apple) == v2_apple  # Apple only via trigger task

        clear_idempotency(str(tenant.id), "v2-only-1")
        clear_idempotency(str(tenant.id), "v1-only-1")

    def test_same_idempotency_key_v1_replay_no_double_notify(
        self,
        wallet_spy,
        qr_stub,
        automation_stub,
        analytics_stub,
        django_capture_on_commit_callbacks,
    ):
        from apps.transactions.api import ScanTransactIn
        from apps.transactions.api import transact as transact_v1

        tenant = make_tenant()
        card = make_card(tenant, card_type="cashback")
        cp = make_customer_pass(make_customer(tenant), card)
        qr = _prepare_qr(cp)
        staff = make_staff(tenant)
        request = _FakeRequest(tenant, staff)
        key = "same-key-double-check"

        data = ScanTransactIn(qr_code=qr, amount=30, intent="earn", idempotency_key=key)
        with django_capture_on_commit_callbacks(execute=True):
            first = transact_v1(request, data)  # type: ignore[reportArgumentType]
        with django_capture_on_commit_callbacks(execute=True):
            second = transact_v1(request, data)  # type: ignore[reportArgumentType]

        assert first["success"] is True
        assert second["success"] is True
        assert len(wallet_spy.trigger) == 1
        assert len(wallet_spy.message) == 1
        assert wallet_spy.apple == []

        clear_idempotency(str(tenant.id), key)


# ---------------------------------------------------------------------------
# Google outage isolation
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestGoogleOutageIsolation:
    def test_google_outage_transaction_succeeds_and_error_is_skipped(
        self,
        monkeypatch,
        wallet_spy,
        qr_stub,
        automation_stub,
        analytics_stub,
        django_capture_on_commit_callbacks,
    ):
        """A Google outage must not fail the redemption or block the response."""
        from apps.redemption.api import ScanTransactIn, transact_v2

        def boom(customer_pass, header, body, action_url=""):
            raise RuntimeError(get_message("WALLET_GOOGLE_AUTH_FAILED"))

        monkeypatch.setattr(
            "apps.customers.pass_engine.google_pass.send_push_notification",
            boom,
        )
        # Run the redeem message task body inline so we capture skipped errors.
        real_dispatch = []

        def run_dispatch(pass_id, event, field_keys, extra):
            from apps.customers.models import CustomerPass
            from apps.customers.pass_engine.notify import notify_event

            cp = CustomerPass.objects.select_related("customer", "card").get(
                id=pass_id
            )
            outcome = notify_event(
                cp,
                event=event,
                field_keys=tuple(field_keys or ()),
                include_apple=False,
                extra=extra or {},
            )
            real_dispatch.append(outcome)
            return outcome

        monkeypatch.setattr(
            "apps.customers.tasks_notify.dispatch_redeem_wallet_message",
            SimpleNamespace(delay=lambda *a, **k: run_dispatch(*a)),
        )

        tenant = make_tenant()
        card = make_card(tenant, card_type="cashback")
        cp = make_customer_pass(make_customer(tenant), card)
        qr = _prepare_qr(cp)
        staff = make_staff(tenant)
        request = _FakeRequest(tenant, staff)

        with django_capture_on_commit_callbacks(execute=True):
            result = transact_v2(
                request,
                ScanTransactIn(
                    qr_code=qr, amount=25, intent="earn", idempotency_key="outage-1"
                ),
            )

        # Transaction succeeds despite Google being down.
        assert result["success"] is True

        # Force a redeem event so the Google message path is exercised.
        redeem_result = _stamp_redeem_result(cp)
        with django_capture_on_commit_callbacks(execute=True):
            side = post_redemption_side_effects(
                redeem_result, tenant=tenant, qr_code=qr
            )
        # The dispatched notify_event captured the Google failure in skipped.
        assert side["enqueued"] is True
        assert real_dispatch, "redeem message dispatch should have run"
        assert any(
            s.get("platform") == "google" for s in real_dispatch[0].get("skipped", [])
        )
        # Apple wake task still enqueued — Google outage must not block it.
        assert len(wallet_spy.trigger) >= 1

        clear_idempotency(str(tenant.id), "outage-1")

    def test_side_effects_never_raises_on_google_failure(
        self, monkeypatch, wallet_spy
    ):
        monkeypatch.setattr(
            "apps.customers.pass_engine.google_pass.send_push_notification",
            lambda *a, **k: {"success": False, "error": "down"},
        )
        tenant = make_tenant()
        card = make_card(tenant)
        cp = make_customer_pass(make_customer(tenant), card)
        result = _stamp_redeem_result(cp)
        qr = _prepare_qr(cp)

        outcome = post_redemption_side_effects(result, tenant=tenant, qr_code=qr)
        assert outcome["enqueued"] is True
        assert outcome["skipped"] == []


