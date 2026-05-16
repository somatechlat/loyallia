"""Regression tests for campaign run and delivery-log accounting."""

from django.test import TestCase

from apps.notifications.models import (
    CampaignDeliveryLog,
    CampaignRun,
    CampaignStatus,
    DeliveryStatus,
    NotificationChannel,
)
from common.plan_enforcement import get_current_usage
from tests.factories import (
    make_card,
    make_customer,
    make_customer_pass,
    make_tenant,
)


class CampaignAccountingTest(TestCase):
    def test_email_campaign_creates_run_delivery_logs_and_usage(self):
        from apps.notifications.tasks.email import send_email_campaign

        tenant = make_tenant()
        make_customer(tenant, email="a@example.com")
        make_customer(tenant, email="b@example.com")

        result = send_email_campaign(
            tenant_id=str(tenant.id),
            subject="Email promo",
            html_body="<p>Hello</p>",
        )

        self.assertTrue(result["success"])
        self.assertEqual(result["attempted"], 2)
        run = CampaignRun.objects.get(id=result["campaign_run_id"])
        self.assertEqual(run.tenant, tenant)
        self.assertEqual(run.channel, NotificationChannel.EMAIL)
        self.assertEqual(run.status, CampaignStatus.COMPLETED)
        self.assertEqual(CampaignDeliveryLog.objects.filter(campaign_run=run).count(), 2)
        self.assertEqual(get_current_usage(tenant, "emails_month"), 2)

    def test_wallet_campaign_creates_run_delivery_logs_and_usage(self):
        from apps.notifications.tasks.campaigns import send_wallet_notification_campaign

        tenant = make_tenant()
        card = make_card(tenant, metadata={"wallet_provider": "both"})
        customer_one = make_customer(tenant, email="wallet-a@example.com")
        customer_two = make_customer(tenant, email="wallet-b@example.com")
        make_customer(tenant, email="no-pass@example.com")
        make_customer_pass(customer_one, card)
        make_customer_pass(customer_two, card)

        result = send_wallet_notification_campaign(
            tenant_id=str(tenant.id),
            title="Wallet promo",
            message="Hello wallet",
            wallet_platform="google",
        )

        self.assertTrue(result["success"])
        self.assertEqual(result["attempted"], 2)
        run = CampaignRun.objects.get(id=result["campaign_run_id"])
        self.assertEqual(run.channel, NotificationChannel.WALLET)
        self.assertEqual(run.status, CampaignStatus.COMPLETED)
        self.assertEqual(run.total_recipients, 2)
        self.assertEqual(CampaignDeliveryLog.objects.filter(campaign_run=run).count(), 2)
        self.assertEqual(get_current_usage(tenant, "wallet_pushes_month"), 2)
