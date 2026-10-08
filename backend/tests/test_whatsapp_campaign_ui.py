"""WhatsApp campaign task tests — UI/API path with mocked bridge client."""

from unittest import mock

import pytest
from django.test import TestCase

from apps.notifications.models import (
    CampaignDeliveryLog,
    CampaignRun,
    CampaignStatus,
    DeliveryStatus,
    NotificationChannel,
    WhatsAppSession,
)
from apps.notifications.tasks.whatsapp_campaign import send_whatsapp_campaign
from tests.factories import make_customer, make_plan, make_subscription, make_tenant


def _prepare_tenant_with_session(phone: str = "+593997202547"):
    tenant = make_tenant()
    plan = make_plan(
        features=[
            "whatsapp_campaigns",
            "email_campaigns",
            "wallet_campaigns",
            "sms_campaigns",
        ],
        max_whatsapp_accounts=5,
        max_whatsapp_day=200,
    )
    make_subscription(tenant, plan=plan)
    session = WhatsAppSession.objects.create(
        tenant=tenant,
        label="Test",
        is_active=True,
        is_connected=True,
        phone_number="593979445965",
    )
    customer = make_customer(tenant, phone=phone, email="wa-target@loyallia.com")
    return tenant, session, customer


def _patch_wa_client():
    """Patch the module imported inside the task (`client as wa_client`)."""
    return mock.patch.multiple(
        "apps.notifications.whatsapp.client",
        is_bridge_available=mock.Mock(return_value=True),
        check_whatsapp_cooldown=mock.Mock(return_value=False),
        send_message=mock.Mock(return_value={"job_id": "42", "queued": True}),
    )


class WhatsAppCampaignTaskTest(TestCase):
    def test_campaign_targets_customer_with_phone_and_marks_sent(self):
        tenant, session, customer = _prepare_tenant_with_session()

        with mock.patch(
            "apps.notifications.whatsapp.client.is_bridge_available",
            return_value=True,
        ), mock.patch(
            "apps.notifications.whatsapp.client.check_whatsapp_cooldown",
            return_value=False,
        ), mock.patch(
            "apps.notifications.whatsapp.client.send_message",
            return_value={"job_id": "42", "queued": True},
        ) as send_mock:
            result = send_whatsapp_campaign(
                tenant_id=str(tenant.id),
                title="Campaña WhatsApp UI",
                message="Hola desde la campaña de prueba Loyallia",
            )

        self.assertTrue(result["success"])
        self.assertEqual(result["attempted"], 1)
        self.assertEqual(result["succeeded"], 1)
        self.assertEqual(result["failed"], 0)

        run = CampaignRun.objects.get(id=result["campaign_run_id"])
        self.assertEqual(run.channel, NotificationChannel.WHATSAPP)
        self.assertEqual(run.status, CampaignStatus.COMPLETED)
        self.assertEqual(run.sent_count, 1)
        self.assertEqual(run.whatsapp_session_id, session.id)

        log = CampaignDeliveryLog.objects.get(campaign_run=run)
        self.assertEqual(log.status, DeliveryStatus.SENT)
        self.assertEqual(log.recipient_phone, customer.phone)
        self.assertEqual(log.external_message_id, "42")

        send_mock.assert_called_once()
        kwargs = send_mock.call_args.kwargs
        self.assertEqual(kwargs["session_id"], str(session.id))
        self.assertEqual(kwargs["phone"], customer.phone)
        self.assertIn("Hola desde la campaña", kwargs["message"])

        # Quota reserved at enqueue — UI counter must move
        session.refresh_from_db()
        self.assertEqual(session.messages_sent_today, 1)

    def test_campaign_skips_customer_without_phone(self):
        tenant, _session, _customer = _prepare_tenant_with_session()
        make_customer(tenant, phone="", email="nophone@loyallia.com")

        with mock.patch(
            "apps.notifications.whatsapp.client.is_bridge_available",
            return_value=True,
        ), mock.patch(
            "apps.notifications.whatsapp.client.check_whatsapp_cooldown",
            return_value=False,
        ), mock.patch(
            "apps.notifications.whatsapp.client.send_message",
            return_value={"job_id": "ok"},
        ):
            result = send_whatsapp_campaign(
                tenant_id=str(tenant.id),
                title="Sin teléfono",
                message="No debería enviarse a quien no tiene teléfono",
            )

        self.assertTrue(result["success"])
        self.assertEqual(result["succeeded"], 1)
        self.assertEqual(result["failed"], 1)

    def test_campaign_blocked_without_whatsapp_feature(self):
        tenant = make_tenant()
        plan = make_plan(features=[], max_whatsapp_accounts=0, max_whatsapp_day=0)
        make_subscription(tenant, plan=plan)

        result = send_whatsapp_campaign(
            tenant_id=str(tenant.id),
            title="Bloqueada",
            message="No debería enviarse",
        )

        self.assertFalse(result["success"])
        self.assertTrue(result.get("blocked_by_plan"))


@pytest.mark.django_db
def test_campaign_pytest_style_marks_sent():
    tenant, _session, customer = _prepare_tenant_with_session()
    with mock.patch(
        "apps.notifications.whatsapp.client.is_bridge_available",
        return_value=True,
    ), mock.patch(
        "apps.notifications.whatsapp.client.check_whatsapp_cooldown",
        return_value=False,
    ), mock.patch(
        "apps.notifications.whatsapp.client.send_message",
        return_value={"job_id": "pytest-1"},
    ):
        result = send_whatsapp_campaign(
            tenant_id=str(tenant.id),
            title="Pytest WhatsApp",
            message="Desde pytest hacia el celular del cliente",
        )
    assert result["succeeded"] == 1
    log = CampaignDeliveryLog.objects.filter(
        campaign_run_id=result["campaign_run_id"]
    ).first()
    assert log is not None
    assert log.recipient_phone == customer.phone
    assert log.status == DeliveryStatus.SENT
