"""
Loyallia — WhatsApp Integration Tests (LYL-SRS-009)

Tests for:
  1. Automation action hardening for WhatsApp (send_whatsapp)
"""

from unittest.mock import patch

from django.test import TestCase

from apps.automation.models import (
    AutomationAction,
)
from tests.factories import (
    make_automation,
    make_card,
    make_customer,
    make_customer_pass,
    make_tenant,
)


class AutomationSendWhatsAppTest(TestCase):
    """Tests for _execute_send_whatsapp with mocked bridge."""

    def setUp(self):
        self.tenant = make_tenant()
        self.customer = make_customer(self.tenant, phone="+593991234567")
        self.card = make_card(self.tenant)
        make_customer_pass(self.customer, self.card)

    @patch(
        "apps.notifications.whatsapp.client.send_message",
        return_value={"success": True, "job_id": "test_job", "queued": True},
    )
    @patch("apps.notifications.whatsapp.client.is_bridge_available", return_value=True)
    def test_send_whatsapp_success(self, mock_available, mock_send):
        auto = make_automation(
            self.tenant,
            action=AutomationAction.SEND_WHATSAPP,
            action_config={"title": "Promo", "message": "Visit us today!"},
        )
        result = auto._execute_send_whatsapp(self.customer, {})
        self.assertTrue(result)
        mock_send.assert_called_once()

    @patch("apps.notifications.whatsapp.client.is_bridge_available", return_value=False)
    def test_send_whatsapp_bridge_unavailable(self, mock_available):
        auto = make_automation(
            self.tenant,
            action=AutomationAction.SEND_WHATSAPP,
            action_config={"title": "Hi", "message": "Test"},
        )
        result = auto._execute_send_whatsapp(self.customer, {})
        self.assertFalse(result)

    def test_send_whatsapp_no_phone(self):
        customer_no_phone = make_customer(self.tenant, phone="", email="wp@test.com")
        auto = make_automation(
            self.tenant,
            action=AutomationAction.SEND_WHATSAPP,
            action_config={"message": "Test"},
        )
        result = auto._execute_send_whatsapp(customer_no_phone, {})
        self.assertFalse(result)
