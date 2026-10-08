"""Campaign audience recommendation engine tests."""

from datetime import UTC, datetime, timedelta
from decimal import Decimal

import pytest

from apps.notifications.services.recommendations import recommend_audience
from tests.factories import (
    make_card,
    make_customer,
    make_customer_pass,
    make_subscription,
    make_tenant,
)


@pytest.fixture
def reco_tenant():
    tenant = make_tenant()
    make_subscription(tenant)
    return tenant


@pytest.mark.django_db
class TestRecommendAudience:
    def test_returns_empty_for_tenant_without_customers(self):
        tenant = make_tenant()
        make_subscription(tenant)
        result = recommend_audience(tenant, channel="email")
        assert result["total"] == 0
        assert result["recommendations"] == []

    def test_welcome_new_for_recent_enrollment(self, reco_tenant):
        customer = make_customer(reco_tenant, email="new@example.com")
        card = make_card(reco_tenant)
        make_customer_pass(customer, card)

        result = recommend_audience(reco_tenant, channel="email")

        assert result["total"] >= 1
        hit = next(h for h in result["recommendations"] if h["customer_id"] == str(customer.id))
        assert "WELCOME_NEW" in hit["reasons"]
        assert hit["has_email"] is True

    def test_winback_for_inactive_customer(self, reco_tenant):
        customer = make_customer(reco_tenant, email="idle@example.com")
        customer.last_visit = datetime.now(UTC) - timedelta(days=50)
        customer.save(update_fields=["last_visit"])

        result = recommend_audience(
            reco_tenant, channel="email", enabled_rules=["WINBACK"]
        )

        hit = next(h for h in result["recommendations"] if h["customer_id"] == str(customer.id))
        assert "WINBACK" in hit["reasons"]
        assert hit["suggested_channel"] == "email"

    def test_near_reward_when_stamps_close(self, reco_tenant):
        customer = make_customer(reco_tenant, email="near@example.com")
        card = make_card(reco_tenant, stamps_required=10)
        cp = make_customer_pass(customer, card)
        cp.stamp_count = 8
        cp.save(update_fields=["stamp_count"])

        result = recommend_audience(
            reco_tenant, channel="whatsapp", enabled_rules=["NEAR_REWARD"]
        )

        hit = next(h for h in result["recommendations"] if h["customer_id"] == str(customer.id))
        assert "NEAR_REWARD" in hit["reasons"]

    def test_whatsapp_channel_requires_phone_viability(self, reco_tenant):
        customer = make_customer(
            reco_tenant, email="no-phone@example.com", phone=""
        )
        customer.last_visit = datetime.now(UTC) - timedelta(days=50)
        customer.save(update_fields=["last_visit"])

        result = recommend_audience(
            reco_tenant, channel="whatsapp", enabled_rules=["WINBACK"]
        )

        hit = next(h for h in result["recommendations"] if h["customer_id"] == str(customer.id))
        # No phone → fall back to email when available
        assert hit["suggested_channel"] == "email"

    def test_cross_tenant_isolation(self, reco_tenant):
        other = make_tenant()
        make_subscription(other)
        make_customer(other, email="other@example.com")

        result = recommend_audience(reco_tenant, channel="email")
        emails = [h.get("customer_name") for h in result["recommendations"]]
        assert all("other" not in (n or "").lower() for n in emails)
        assert result["total"] == 0 or all(
            h["customer_id"] != str(c.id)
            for c in other.customers.all()
            for h in result["recommendations"]
        )

    def test_vip_uses_spend_floor(self, reco_tenant):
        rich = make_customer(reco_tenant, email="vip@example.com")
        rich.total_spent = Decimal("500.00")
        rich.save(update_fields=["total_spent"])
        poor = make_customer(reco_tenant, email="poor@example.com")

        result = recommend_audience(reco_tenant, channel="email", enabled_rules=["VIP_TOUCH"])

        ids = {h["customer_id"] for h in result["recommendations"]}
        assert str(rich.id) in ids
        assert str(poor.id) not in ids
