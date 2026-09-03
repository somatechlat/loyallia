"""Tests for campaign audience selection backend: segment counts, member counts,
most_active segment, and wallet platform filtering.
"""

from django.test import RequestFactory, TestCase

from apps.authentication.models import UserRole
from apps.customers.models import Customer
from apps.customers.segment_api import _apply_segment_filter
from tests.factories import (
    make_card,
    make_customer,
    make_customer_pass,
    make_tenant,
    make_user,
)


def _owner_request(tenant):
    """Return a real Django request with an authenticated OWNER user."""
    request = RequestFactory().get("/")
    request.user = make_user(tenant=tenant, role=UserRole.OWNER)
    request.tenant = tenant
    return request


class ProgramMemberCountTest(TestCase):
    def test_member_count_breaks_down_by_wallet_platform(self):
        tenant = make_tenant()
        card = make_card(tenant)

        c_apple = make_customer(tenant, email="apple@test.com")
        c_google = make_customer(tenant, email="google@test.com")
        c_both = make_customer(tenant, email="both@test.com")

        make_customer_pass(c_apple, card, apple_pass_id="pass-apple-1")
        make_customer_pass(c_google, card, google_pass_id="pass-google-1")
        make_customer_pass(c_both, card, apple_pass_id="pass-apple-2", google_pass_id="pass-google-2")

        from apps.cards.api import program_member_count

        request = _owner_request(tenant)
        result = program_member_count(request, str(card.id))  # type: ignore[reportArgumentType]

        self.assertEqual(result["count"], 3)
        self.assertEqual(result["active_count"], 3)


class ProgramSegmentCountsTest(TestCase):
    def test_segment_counts_respect_wallet_platform_filter(self):
        tenant = make_tenant()
        card = make_card(tenant)

        c1 = make_customer(tenant, email="a@test.com", total_visits=5)
        c2 = make_customer(tenant, email="b@test.com", total_visits=0)

        make_customer_pass(c1, card, apple_pass_id="ap1")
        make_customer_pass(c2, card, google_pass_id="gp1")

        from apps.cards.api import program_segment_counts

        request = _owner_request(tenant)

        result_all = program_segment_counts(request, str(card.id), wallet_platform="both")  # type: ignore[reportArgumentType]
        self.assertEqual(result_all["counts"]["all"], 2)

        result_apple = program_segment_counts(request, str(card.id), wallet_platform="apple")  # type: ignore[reportArgumentType]
        self.assertEqual(result_apple["counts"]["all"], 1)

        result_google = program_segment_counts(request, str(card.id), wallet_platform="google")  # type: ignore[reportArgumentType]
        self.assertEqual(result_google["counts"]["all"], 1)


class MostActiveSegmentTest(TestCase):
    def test_most_active_returns_top_15_percent(self):
        tenant = make_tenant()
        customers = []
        for i in range(20):
            c = make_customer(tenant, email=f"user{i}@test.com", total_visits=i, total_spent=i * 10)
            customers.append(c)

        qs = Customer.objects.filter(tenant=tenant)
        result = _apply_segment_filter(qs, "most_active")

        self.assertEqual(result.count(), 3)

    def test_most_active_empty_base_returns_none(self):
        tenant = make_tenant()
        qs = Customer.objects.filter(tenant=tenant)
        result = _apply_segment_filter(qs, "most_active")
        self.assertEqual(result.count(), 0)


class ApplyCampaignFiltersTest(TestCase):
    def test_wallet_platform_apple_filters_correctly(self):
        tenant = make_tenant()
        card = make_card(tenant)

        c_apple = make_customer(tenant, email="apple@test.com")
        c_google = make_customer(tenant, email="google@test.com")

        make_customer_pass(c_apple, card, apple_pass_id="ap1")
        make_customer_pass(c_google, card, google_pass_id="gp1")

        from apps.customers.segment_api import apply_campaign_filters

        qs = Customer.objects.filter(tenant=tenant)

        apple_result = apply_campaign_filters(
            qs,
            segment_id="all",
            target_program_ids=[str(card.id)],
            target_wallet_platform="apple",
        )
        self.assertEqual(apple_result.count(), 1)
        self.assertEqual(apple_result.first(), c_apple)

        google_result = apply_campaign_filters(
            qs,
            segment_id="all",
            target_program_ids=[str(card.id)],
            target_wallet_platform="google",
        )
        self.assertEqual(google_result.count(), 1)
        self.assertEqual(google_result.first(), c_google)
