# ruff: noqa: F811  # pytest fixtures are imported for discovery then injected via parameters
"""
Guards + remote_issue side-effect tests (split for 650-line ceiling).
"""

import pytest

from apps.customers.pass_engine.notify import (
    SKIP_CONSENT_REQUIRED,
    notify_event,
)
from apps.redemption.result import RedemptionResult
from apps.redemption.side_effects import (
    SKIP_MEMBERSHIP_INVALID,
    post_redemption_side_effects,
)
from tests.factories import (
    make_card,
    make_customer,
    make_customer_pass,
    make_staff,
    make_tenant,
)
from tests.redemption_fixtures import (  # noqa: F401
    _FakeRequest,
    automation_stub,
    qr_stub,
    wallet_spy,
)


@pytest.mark.django_db
class TestGuards:
    def test_membership_invalid_does_not_notify_success(self, wallet_spy):
        tenant = make_tenant()
        card = make_card(tenant, card_type="vip_membership")
        make_customer_pass(make_customer(tenant), card)
        result = RedemptionResult(
            success=True,
            transaction_type="membership_validated",
            pass_updated=False,
            intent_resolved="validate",
            new_state={"membership_valid": False, "reason": "membership_expired"},
        )

        outcome = post_redemption_side_effects(result, tenant=tenant)

        assert outcome["enqueued"] is False
        assert any(s.get("reason") == SKIP_MEMBERSHIP_INVALID for s in outcome["skipped"])
        assert wallet_spy.trigger == []
        assert wallet_spy.message == []

    def test_require_consent_skips_without_consent(self, wallet_spy):

        tenant = make_tenant()
        card = make_card(
            tenant,
            metadata={
                "wallet_settings": {
                    "notifications": {
                        "onRedeem": {
                            "enabled": True,
                            "google": True,
                            "apple": True,
                            "requireConsent": True,
                        }
                    }
                }
            },
        )
        cp = make_customer_pass(
            make_customer(tenant), card, pass_data={"notification_consent": False}
        )

        result = notify_event(cp, event="redeemed")

        assert result["google"] == {}
        assert result["apple_devices"] == 0
        assert any(
            s.get("reason") == SKIP_CONSENT_REQUIRED for s in result["skipped"]
        )
        assert wallet_spy.google == []
        assert wallet_spy.apple == []

    def test_redeem_require_consent_defaults_false(self, wallet_spy):
        """Pure-transactional redeem notifies without an explicit opt-in."""

        tenant = make_tenant()
        card = make_card(tenant, card_type="cashback")
        cp = make_customer_pass(make_customer(tenant), card)

        result = notify_event(cp, event="redeemed", include_apple=False)

        assert result["google"].get("success") is True
        assert len(wallet_spy.google) == 1
        assert wallet_spy.apple == []


# ---------------------------------------------------------------------------
# remote_issue uses the same helper
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestRemoteIssue:
    def test_remote_issue_runs_side_effect_helper(
        self,
        wallet_spy,
        qr_stub,
        automation_stub,
        django_capture_on_commit_callbacks,
    ):
        from apps.transactions.api import RemoteIssueIn, remote_issue

        tenant = make_tenant()
        card = make_card(tenant, card_type="stamp", metadata={"stamps_required": 10})
        customer = make_customer(tenant)
        make_customer_pass(customer, card)
        staff = make_staff(tenant)
        request = _FakeRequest(tenant, staff)

        with django_capture_on_commit_callbacks(execute=True):
            result = remote_issue(
                request,
                RemoteIssueIn(
                    customer_id=str(customer.id),
                    card_id=str(card.id),
                    quantity=1,
                ),
            )

        assert result["success"] is True
        assert len(wallet_spy.trigger) == 1
        # Earn-style remote issue → single wake + transactional value_changed Google copy.
        assert len(wallet_spy.message) == 1
        assert wallet_spy.message[0][0][1] == "value_changed"
        assert wallet_spy.apple == []
