"""
Loyallia Notification Model Tests

Tests for CampaignRun, CampaignDeliveryLog, PushDevice, and WhatsAppSession.
"""

from datetime import timedelta

from django.test import TestCase
from django.utils import timezone

from apps.notifications.models import (
    CampaignDeliveryLog,
    CampaignRun,
    CampaignStatus,
    DeliveryStatus,
    NotificationChannel,
)
from apps.notifications.models.misc import WhatsAppSession
from apps.notifications.models.push import PushDevice
from tests.factories import make_customer, make_tenant


class CampaignRunModelTest(TestCase):
    """Tests for CampaignRun aggregate metrics and properties."""

    def test_create_defaults(self):
        tenant = make_tenant()
        run = CampaignRun.objects.create(
            tenant=tenant,
            channel=NotificationChannel.EMAIL,
            title="Test Campaign",
            message_preview="Hello",
        )
        self.assertEqual(run.status, CampaignStatus.QUEUED)
        self.assertEqual(run.sent_count, 0)
        self.assertEqual(run.delivered_count, 0)
        self.assertEqual(run.failed_count, 0)
        self.assertEqual(run.read_count, 0)
        self.assertEqual(run.total_recipients, 0)
        self.assertEqual(str(run), "Test Campaign (email)  queued")

    def test_delivery_rate_zero_sent(self):
        tenant = make_tenant()
        run = CampaignRun.objects.create(tenant=tenant, channel=NotificationChannel.SMS, title="T")
        self.assertEqual(run.delivery_rate, 0.0)

    def test_delivery_rate_calculated(self):
        tenant = make_tenant()
        run = CampaignRun.objects.create(
            tenant=tenant,
            channel=NotificationChannel.SMS,
            title="T",
            sent_count=100,
            delivered_count=95,
        )
        self.assertEqual(run.delivery_rate, 95.0)

    def test_read_rate_zero_delivered(self):
        tenant = make_tenant()
        run = CampaignRun.objects.create(tenant=tenant, channel=NotificationChannel.SMS, title="T")
        self.assertEqual(run.read_rate, 0.0)

    def test_read_rate_calculated(self):
        tenant = make_tenant()
        run = CampaignRun.objects.create(
            tenant=tenant,
            channel=NotificationChannel.SMS,
            title="T",
            delivered_count=100,
            read_count=45,
        )
        self.assertEqual(run.read_rate, 45.0)

    def test_failure_rate_calculated(self):
        tenant = make_tenant()
        run = CampaignRun.objects.create(
            tenant=tenant,
            channel=NotificationChannel.SMS,
            title="T",
            total_recipients=200,
            failed_count=10,
        )
        self.assertEqual(run.failure_rate, 5.0)

    def test_duration_minutes(self):
        tenant = make_tenant()
        now = timezone.now()
        run = CampaignRun.objects.create(
            tenant=tenant,
            channel=NotificationChannel.SMS,
            title="T",
            started_at=now,
            completed_at=now + timedelta(minutes=15),
        )
        self.assertEqual(run.duration_minutes, 15)

    def test_duration_minutes_none_when_missing(self):
        tenant = make_tenant()
        run = CampaignRun.objects.create(tenant=tenant, channel=NotificationChannel.SMS, title="T")
        self.assertIsNone(run.duration_minutes)


class CampaignDeliveryLogModelTest(TestCase):
    """Tests for CampaignDeliveryLog per-recipient tracking."""

    def test_create_defaults(self):
        tenant = make_tenant()
        run = CampaignRun.objects.create(tenant=tenant, channel=NotificationChannel.SMS, title="T")
        customer = make_customer(tenant)
        log = CampaignDeliveryLog.objects.create(
            campaign_run=run,
            customer=customer,
            recipient_phone="+593991111111",
            recipient_name="Test User",
        )
        self.assertEqual(log.status, DeliveryStatus.QUEUED)
        self.assertEqual(log.external_message_id, "")
        self.assertEqual(str(log), "Test User  queued")

    def test_status_transitions(self):
        tenant = make_tenant()
        run = CampaignRun.objects.create(tenant=tenant, channel=NotificationChannel.SMS, title="T")
        customer = make_customer(tenant)
        log = CampaignDeliveryLog.objects.create(campaign_run=run, customer=customer)

        log.status = DeliveryStatus.SENT
        log.sent_at = timezone.now()
        log.save()
        log.refresh_from_db()
        self.assertEqual(log.status, DeliveryStatus.SENT)

        log.status = DeliveryStatus.DELIVERED
        log.delivered_at = timezone.now()
        log.save()
        log.refresh_from_db()
        self.assertEqual(log.status, DeliveryStatus.DELIVERED)

    def test_unique_together_campaign_customer(self):
        from django.db import IntegrityError

        tenant = make_tenant()
        run = CampaignRun.objects.create(tenant=tenant, channel=NotificationChannel.SMS, title="T")
        customer = make_customer(tenant)
        CampaignDeliveryLog.objects.create(campaign_run=run, customer=customer)
        with self.assertRaises(IntegrityError):
            CampaignDeliveryLog.objects.create(campaign_run=run, customer=customer)

    def test_customer_null_allowed(self):
        tenant = make_tenant()
        run = CampaignRun.objects.create(tenant=tenant, channel=NotificationChannel.SMS, title="T")
        log = CampaignDeliveryLog.objects.create(
            campaign_run=run,
            customer=None,
            recipient_name="Anonymous",
        )
        self.assertIsNone(log.customer)
        self.assertEqual(str(log), "Anonymous  queued")


class PushDeviceModelTest(TestCase):
    """Tests for PushDevice registration."""

    def test_create_and_str(self):
        tenant = make_tenant()
        customer = make_customer(tenant, first_name="Ana", last_name="García")
        device = PushDevice.objects.create(
            customer=customer,
            device_type="ios",
            device_token="tok_abc_123",
            apns_token="apns_tok",
        )
        self.assertTrue(device.is_active)
        self.assertEqual(device.push_failures, 0)
        self.assertEqual(str(device), "Ana García - ios")

    def test_unique_together_customer_token(self):
        from django.db import IntegrityError

        tenant = make_tenant()
        customer = make_customer(tenant)
        PushDevice.objects.create(customer=customer, device_type="ios", device_token="same")
        with self.assertRaises(IntegrityError):
            PushDevice.objects.create(customer=customer, device_type="android", device_token="same")

    def test_multi_device_per_customer(self):
        tenant = make_tenant()
        customer = make_customer(tenant)
        d1 = PushDevice.objects.create(customer=customer, device_type="ios", device_token="t1")
        d2 = PushDevice.objects.create(customer=customer, device_type="android", device_token="t2")
        self.assertEqual(customer.devices.count(), 2)
        self.assertEqual(d1.device_type, "ios")
        self.assertEqual(d2.device_type, "android")

    def test_push_failures_increment(self):
        tenant = make_tenant()
        customer = make_customer(tenant)
        device = PushDevice.objects.create(customer=customer, device_type="web", device_token="t")
        device.push_failures = 3
        device.save()
        device.refresh_from_db()
        self.assertEqual(device.push_failures, 3)


class WhatsAppSessionModelTest(TestCase):
    """Tests for WhatsAppSession rate limiting and warmup."""

    def test_create_defaults(self):
        tenant = make_tenant()
        session = WhatsAppSession.objects.create(tenant=tenant)
        self.assertFalse(session.is_connected)
        self.assertEqual(session.messages_sent_today, 0)
        self.assertEqual(session.daily_limit, 200)
        self.assertEqual(session.warmup_day, 0)
        self.assertEqual(session.daily_limit_override, 0)
        self.assertIn("sin vincular", str(session))

    def test_connected_str(self):
        tenant = make_tenant()
        session = WhatsAppSession.objects.create(tenant=tenant, is_connected=True, phone_number="+593991111111")
        self.assertIn("[ON]", str(session))
        self.assertIn("+593991111111", str(session))

    def test_plan_daily_limit_override(self):
        from apps.billing.models import SubscriptionPlan

        tenant = make_tenant()
        plan = SubscriptionPlan.objects.create(
            slug="wa-test",
            name="WA Test",
            price_monthly=0,
            max_whatsapp_day=100,
            features=["whatsapp_campaigns"],
        )
        from apps.billing.models import Subscription, SubscriptionStatus

        Subscription.objects.create(
            tenant=tenant,
            subscription_plan=plan,
            status=SubscriptionStatus.ACTIVE,
        )
        session = WhatsAppSession.objects.create(tenant=tenant)
        self.assertEqual(session.plan_daily_limit, 100)

    def test_plan_daily_limit_with_override(self):
        tenant = make_tenant()
        session = WhatsAppSession.objects.create(tenant=tenant, daily_limit_override=150)
        self.assertEqual(session.plan_daily_limit, 150)

    def test_effective_daily_limit_warmup(self):
        tenant = make_tenant()
        session = WhatsAppSession.objects.create(tenant=tenant, daily_limit_override=200, warmup_day=0)
        # base=20, ceiling=200, warmup_day=0 -> min(200, 20) = 20
        self.assertEqual(session.effective_daily_limit, 20)

    def test_effective_daily_limit_fully_warmed(self):
        tenant = make_tenant()
        session = WhatsAppSession.objects.create(tenant=tenant, daily_limit_override=200, warmup_day=7)
        self.assertEqual(session.effective_daily_limit, 200)

    def test_messages_remaining_today(self):
        tenant = make_tenant()
        session = WhatsAppSession.objects.create(tenant=tenant, daily_limit_override=100, warmup_day=7)
        session.messages_sent_today = 30
        session.save()
        self.assertEqual(session.messages_remaining_today, 70)

    def test_messages_remaining_cannot_be_negative(self):
        tenant = make_tenant()
        session = WhatsAppSession.objects.create(tenant=tenant, daily_limit_override=50, warmup_day=7)
        session.messages_sent_today = 100
        session.save()
        self.assertEqual(session.messages_remaining_today, 0)
