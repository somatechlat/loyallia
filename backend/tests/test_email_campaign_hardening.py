"""Email campaign hardening tests: quota, escaping, correlation, webhooks."""

import hashlib
import hmac
import json
from unittest import mock

from django.core import mail
from django.test import TestCase
from django.utils import timezone

from apps.notifications.api.webhooks import process_mailjet_event
from apps.notifications.models import (
    CampaignDeliveryLog,
    CampaignRun,
    CampaignStatus,
    DeliveryStatus,
    NotificationChannel,
)
from apps.notifications.tasks.email import (
    _build_campaign_html,
    _is_safe_image_url,
    send_email_campaign,
)
from common.messages import get_message
from common.vault import clear_test_overrides, set_test_override
from tests.factories import (
    make_customer,
    make_plan,
    make_subscription,
    make_tenant,
)


def _prepare_tenant_with_quota(max_emails_month: int = 100):
    tenant = make_tenant()
    plan = make_plan(max_emails_month=max_emails_month)
    make_subscription(tenant, plan=plan)
    return tenant


class ImageUrlValidationTest(TestCase):
    def test_accepts_http_and_https(self):
        self.assertTrue(_is_safe_image_url("https://cdn.example.com/hero.png"))
        self.assertTrue(_is_safe_image_url("http://cdn.example.com/hero.png"))

    def test_rejects_empty_and_non_http(self):
        self.assertFalse(_is_safe_image_url(""))
        self.assertFalse(_is_safe_image_url("javascript:alert(1)"))
        self.assertFalse(_is_safe_image_url("ftp://example.com/x.png"))
        self.assertFalse(_is_safe_image_url("data:text/html,<script>"))


class EmailHtmlEscapingTest(TestCase):
    def test_subject_and_tenant_are_escaped(self):
        html_out = _build_campaign_html(
            tenant_name='<img src=x onerror=alert(1)>',
            subject='<script>alert(2)</script>',
            html_body="<p>body</p>",
            image_url="",
            primary_color="#6366f1",
            brand_url="https://loyallia.com",
            year=2026,
        )
        self.assertNotIn("<script>alert(2)</script>", html_out)
        self.assertNotIn("<img src=x onerror=alert(1)>", html_out)
        self.assertIn("&lt;script&gt;", html_out)
        self.assertIn("&lt;img", html_out)

    def test_image_url_escaped_and_only_rendered_for_http(self):
        html_out = _build_campaign_html(
            tenant_name="Shop",
            subject="Sub",
            html_body="<p>b</p>",
            image_url="javascript:alert(1)",
            primary_color="#6366f1",
            brand_url="https://loyallia.com",
            year=2026,
        )
        self.assertNotIn("javascript:alert(1)", html_out)
        self.assertNotIn("hero-img", html_out)

        html_ok = _build_campaign_html(
            tenant_name="Shop",
            subject="Sub",
            html_body="<p>b</p>",
            image_url="https://cdn.example.com/a.png",
            primary_color="#6366f1",
            brand_url="https://loyallia.com",
            year=2026,
        )
        self.assertIn("https://cdn.example.com/a.png", html_ok)
        self.assertIn("hero-img", html_ok)

    def test_no_noqa_markers_in_email_html(self):
        html_out = _build_campaign_html(
            tenant_name="Shop",
            subject="Sub",
            html_body="<p>b</p>",
            image_url="https://cdn.example.com/a.png",
            primary_color="#6366f1",
            brand_url="https://loyallia.com",
            year=2026,
        )
        self.assertNotIn("# noqa", html_out)
        self.assertNotIn("noqa", html_out)

    def test_footer_copy_uses_get_message(self):
        html_out = _build_campaign_html(
            tenant_name="Shop",
            subject="Sub",
            html_body="<p>b</p>",
            image_url="",
            primary_color="#6366f1",
            brand_url="https://loyallia.com",
            year=2026,
        )
        self.assertIn(get_message("EMAIL_FOOTER_UNSUBSCRIBE"), html_out)


class EmailCampaignQuotaTest(TestCase):
    def test_recipients_beyond_quota_marked_skipped_quota(self):
        tenant = _prepare_tenant_with_quota(max_emails_month=1)
        make_customer(tenant, email="one@example.com")
        make_customer(tenant, email="two@example.com")

        result = send_email_campaign(
            tenant_id=str(tenant.id),
            subject="Promo",
            html_body="<p>Hello</p>",
        )

        self.assertTrue(result["success"])
        self.assertEqual(result["attempted"], 2)
        self.assertEqual(result["succeeded"], 1)
        self.assertEqual(result["quota_skipped"], 1)

        run = CampaignRun.objects.get(id=result["campaign_run_id"])
        logs = CampaignDeliveryLog.objects.filter(campaign_run=run)
        self.assertEqual(logs.filter(status=DeliveryStatus.SENT).count(), 1)
        skipped = logs.filter(error_code="SKIPPED_QUOTA")
        self.assertEqual(skipped.count(), 1)
        self.assertEqual(
            skipped.first().error_message, get_message("EMAIL_QUOTA_REACHED")
        )

    def test_quota_zero_skips_all(self):
        tenant = _prepare_tenant_with_quota(max_emails_month=0)
        make_customer(tenant, email="one@example.com")

        result = send_email_campaign(
            tenant_id=str(tenant.id),
            subject="Promo",
            html_body="<p>Hello</p>",
        )

        self.assertEqual(result["succeeded"], 0)
        self.assertEqual(result["quota_skipped"], 1)
        run = CampaignRun.objects.get(id=result["campaign_run_id"])
        log = CampaignDeliveryLog.objects.filter(campaign_run=run).first()
        self.assertEqual(log.error_code, "SKIPPED_QUOTA")

    def test_no_email_recipient_excluded_from_audience(self):
        tenant = _prepare_tenant_with_quota(max_emails_month=10)
        make_customer(tenant, email="")
        make_customer(tenant, email="ok@example.com")

        result = send_email_campaign(
            tenant_id=str(tenant.id),
            subject="Promo",
            html_body="<p>Hello</p>",
        )

        self.assertEqual(result["attempted"], 1)
        self.assertEqual(result["succeeded"], 1)
        run = CampaignRun.objects.get(id=result["campaign_run_id"])
        logs = CampaignDeliveryLog.objects.filter(campaign_run=run)
        self.assertEqual(logs.count(), 1)
        self.assertFalse(logs.filter(error_code="NO_EMAIL").exists())


class EmailCampaignFailureStatusTest(TestCase):
    def test_catastrophic_failure_marks_campaign_failed(self):
        tenant = _prepare_tenant_with_quota(max_emails_month=10)
        make_customer(tenant, email="one@example.com")

        class _BoomAudience:
            def count(self):
                return 1

            def iterator(self, chunk_size=None):
                raise RuntimeError("boom")

        with (
            mock.patch(
                "apps.customers.segment_api.apply_campaign_filters",
                return_value=_BoomAudience(),
            ),
            self.assertRaises(RuntimeError),
        ):
            send_email_campaign(
                tenant_id=str(tenant.id),
                subject="Promo",
                html_body="<p>Hello</p>",
            )

        run = CampaignRun.objects.filter(tenant=tenant).first()
        self.assertIsNotNone(run)
        self.assertEqual(run.status, CampaignStatus.FAILED)
        self.assertTrue(run.error_summary)

    def test_send_exception_per_recipient_does_not_fail_campaign(self):
        tenant = _prepare_tenant_with_quota(max_emails_month=10)
        make_customer(tenant, email="one@example.com")

        with mock.patch(
            "django.core.mail.EmailMultiAlternatives.send",
            side_effect=RuntimeError("smtp down"),
        ):
            result = send_email_campaign(
                tenant_id=str(tenant.id),
                subject="Promo",
                html_body="<p>Hello</p>",
            )

        self.assertTrue(result["success"])
        run = CampaignRun.objects.get(id=result["campaign_run_id"])
        self.assertEqual(run.status, CampaignStatus.COMPLETED)
        log = CampaignDeliveryLog.objects.filter(campaign_run=run).first()
        self.assertEqual(log.status, DeliveryStatus.FAILED)
        self.assertEqual(log.error_code, "EMAIL_SEND_ERROR")


class EmailCampaignCorrelationTest(TestCase):
    def test_message_id_and_custom_id_stored_for_webhook_match(self):
        tenant = _prepare_tenant_with_quota(max_emails_month=10)
        make_customer(tenant, email="one@example.com")

        result = send_email_campaign(
            tenant_id=str(tenant.id),
            subject="Promo",
            html_body="<p>Hello</p>",
        )
        self.assertTrue(result["success"])

        log = CampaignDeliveryLog.objects.filter(
            campaign_run_id=result["campaign_run_id"]
        ).first()
        self.assertEqual(log.status, DeliveryStatus.SENT)
        self.assertTrue(log.external_message_id)
        self.assertIn("@", log.external_message_id)

        sent = mail.outbox[-1]
        self.assertEqual(
            sent.extra_headers.get("Message-ID"), f"<{log.external_message_id}>"
        )
        self.assertEqual(
            sent.extra_headers.get("X-MJCUSTOMID"), log.external_message_id
        )


class MailjetEventProcessingTest(TestCase):
    def _make_log(self, external_message_id: str = "abc123@loyallia.com"):
        tenant = _prepare_tenant_with_quota(max_emails_month=10)
        run = CampaignRun.objects.create(
            tenant=tenant,
            channel=NotificationChannel.EMAIL,
            title="T",
            message_preview="p",
            status=CampaignStatus.COMPLETED,
        )
        customer = make_customer(tenant)
        log = CampaignDeliveryLog.objects.create(
            campaign_run=run,
            customer=customer,
            recipient_email=customer.email,
            status=DeliveryStatus.SENT,
            external_message_id=external_message_id,
            sent_at=timezone.now(),
        )
        return run, log

    def test_sent_event_sets_sent_status_and_timestamp(self):
        _, log = self._make_log("sent-id@x.com")
        log.status = DeliveryStatus.QUEUED
        log.sent_at = None
        log.save()

        ok = process_mailjet_event(
            {"event": "sent", "CustomID": "sent-id@x.com"}
        )
        self.assertTrue(ok)
        log.refresh_from_db()
        self.assertEqual(log.status, DeliveryStatus.SENT)
        self.assertIsNotNone(log.sent_at)

    def test_delivered_event_sets_delivered_status_and_timestamp(self):
        _, log = self._make_log("delivered-id@x.com")

        ok = process_mailjet_event(
            {"event": "delivered", "Message_GUID": "delivered-id@x.com"}
        )
        self.assertTrue(ok)
        log.refresh_from_db()
        self.assertEqual(log.status, DeliveryStatus.DELIVERED)
        self.assertIsNotNone(log.delivered_at)
        self.assertIsNotNone(log.sent_at)

    def test_open_event_sets_read_status_and_timestamp(self):
        _, log = self._make_log("open-id@x.com")

        ok = process_mailjet_event({"event": "open", "CustomID": "open-id@x.com"})
        self.assertTrue(ok)
        log.refresh_from_db()
        self.assertEqual(log.status, DeliveryStatus.READ)
        self.assertIsNotNone(log.read_at)

    def test_click_event_implies_read(self):
        _, log = self._make_log("click-id@x.com")

        ok = process_mailjet_event({"event": "click", "CustomID": "click-id@x.com"})
        self.assertTrue(ok)
        log.refresh_from_db()
        self.assertEqual(log.status, DeliveryStatus.READ)
        self.assertIsNotNone(log.read_at)
        self.assertIsNotNone(log.delivered_at)

    def test_bounce_event_sets_bounced_status_and_error(self):
        _, log = self._make_log("bounce-id@x.com")

        ok = process_mailjet_event(
            {
                "event": "bounce",
                "CustomID": "bounce-id@x.com",
                "error": "mailbox full",
            }
        )
        self.assertTrue(ok)
        log.refresh_from_db()
        self.assertEqual(log.status, DeliveryStatus.BOUNCED)
        self.assertIsNotNone(log.failed_at)
        self.assertEqual(log.error_code, "bounce")
        self.assertEqual(log.error_message, "mailbox full")

    def test_custom_id_and_message_guid_both_match(self):
        _, log = self._make_log("dual-id@x.com")

        ok = process_mailjet_event({"event": "open", "CustomID": "dual-id@x.com"})
        self.assertTrue(ok)
        log.refresh_from_db()
        self.assertEqual(log.status, DeliveryStatus.READ)

        _, log2 = self._make_log("guid-id@x.com")
        ok2 = process_mailjet_event(
            {"event": "delivered", "Message_GUID": "guid-id@x.com"}
        )
        self.assertTrue(ok2)
        log2.refresh_from_db()
        self.assertEqual(log2.status, DeliveryStatus.DELIVERED)

    def test_unknown_event_returns_false(self):
        _, log = self._make_log("unknown-id@x.com")
        ok = process_mailjet_event({"event": "weird", "CustomID": "unknown-id@x.com"})
        self.assertFalse(ok)
        log.refresh_from_db()
        self.assertEqual(log.status, DeliveryStatus.SENT)

    def test_unmatched_message_returns_false(self):
        ok = process_mailjet_event({"event": "open", "CustomID": "nope@x.com"})
        self.assertFalse(ok)

    def test_counters_updated_on_parent_run(self):
        run, log = self._make_log("count-id@x.com")
        process_mailjet_event({"event": "open", "CustomID": "count-id@x.com"})
        run.refresh_from_db()
        self.assertEqual(run.read_count, 1)
        self.assertEqual(run.delivered_count, 1)


class MailjetWebhookEndpointTest(TestCase):
    def setUp(self):
        clear_test_overrides()
        self.secret = "test-mailjet-secret"
        set_test_override("mailjet_secret_key", self.secret)

    def tearDown(self):
        clear_test_overrides()

    def _sign(self, body: bytes) -> str:
        return hmac.new(
            self.secret.encode("utf-8"), body, hashlib.sha256
        ).hexdigest()

    def _post(self, payload, signature=None):
        body = json.dumps(payload).encode("utf-8")
        headers = {"content_type": "application/json"}
        if signature is not None:
            headers["HTTP_X_MAILJET_SIGNATURE"] = signature
        return self.client.post(
            "/api/v1/webhooks/mailjet/", data=body, **headers
        )

    def _make_log(self, external_message_id: str):
        tenant = _prepare_tenant_with_quota(max_emails_month=10)
        run = CampaignRun.objects.create(
            tenant=tenant,
            channel=NotificationChannel.EMAIL,
            title="T",
            message_preview="p",
            status=CampaignStatus.COMPLETED,
        )
        customer = make_customer(tenant)
        return CampaignDeliveryLog.objects.create(
            campaign_run=run,
            customer=customer,
            recipient_email=customer.email,
            status=DeliveryStatus.SENT,
            external_message_id=external_message_id,
            sent_at=timezone.now(),
        )

    def test_valid_signature_processes_events(self):
        log = self._make_log("hook-id@x.com")
        payload = [{"event": "open", "CustomID": "hook-id@x.com"}]
        body = json.dumps(payload).encode("utf-8")

        resp = self.client.post(
            "/api/v1/webhooks/mailjet/",
            data=body,
            content_type="application/json",
            HTTP_X_MAILJET_SIGNATURE=self._sign(body),
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(data["success"])
        self.assertEqual(data["processed"], 1)
        log.refresh_from_db()
        self.assertEqual(log.status, DeliveryStatus.READ)

    def test_missing_signature_rejected(self):
        resp = self._post([{"event": "open"}], signature=None)
        self.assertEqual(resp.status_code, 401)

    def test_invalid_signature_rejected(self):
        resp = self._post(
            [{"event": "open", "CustomID": "x@y.com"}], signature="bad-signature"
        )
        self.assertEqual(resp.status_code, 401)

    def test_missing_secret_returns_503(self):
        clear_test_overrides()
        set_test_override("mailjet_secret_key", "")
        body = json.dumps([{"event": "open"}]).encode("utf-8")
        resp = self.client.post(
            "/api/v1/webhooks/mailjet/",
            data=body,
            content_type="application/json",
            HTTP_X_MAILJET_SIGNATURE=self._sign(body),
        )
        self.assertEqual(resp.status_code, 503)

    def test_batch_of_events_processed(self):
        log_a = self._make_log("batch-a@x.com")
        log_b = self._make_log("batch-b@x.com")
        payload = [
            {"event": "delivered", "CustomID": "batch-a@x.com"},
            {"event": "bounce", "CustomID": "batch-b@x.com", "error": "hard"},
        ]
        body = json.dumps(payload).encode("utf-8")
        resp = self.client.post(
            "/api/v1/webhooks/mailjet/",
            data=body,
            content_type="application/json",
            HTTP_X_MAILJET_SIGNATURE=self._sign(body),
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["processed"], 2)
        log_a.refresh_from_db()
        log_b.refresh_from_db()
        self.assertEqual(log_a.status, DeliveryStatus.DELIVERED)
        self.assertEqual(log_b.status, DeliveryStatus.BOUNCED)
