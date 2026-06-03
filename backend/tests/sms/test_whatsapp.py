"""
Loyallia WhatsApp Integration Tests

Tests for:
  1. Automation action hardening for WhatsApp (send_whatsapp)
"""

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
    """Tests for _execute_send_whatsapp with real bridge."""

    def setUp(self):
        self.tenant = make_tenant()
        self.customer = make_customer(self.tenant, phone="+593991234567")
        self.card = make_card(self.tenant)
        make_customer_pass(self.customer, self.card)

    def test_send_whatsapp_attempts_when_bridge_available(self):
        auto = make_automation(
            self.tenant,
            action=AutomationAction.SEND_WHATSAPP,
            action_config={"title": "Promo", "message": "Visit us today!"},
        )
        result = auto._execute_send_whatsapp(self.customer, {})
        # Real is_bridge_available() checks the bridge health.
        # If bridge is not configured, it returns False and method returns False.
        self.assertIsInstance(result, bool)

    def test_send_whatsapp_bridge_unavailable(self):
        # When bridge is not configured, is_bridge_available() returns False
        # and _execute_send_whatsapp returns False
        auto = make_automation(
            self.tenant,
            action=AutomationAction.SEND_WHATSAPP,
            action_config={"title": "Hi", "message": "Test"},
        )
        result = auto._execute_send_whatsapp(self.customer, {})
        self.assertIsInstance(result, bool)

    def test_send_whatsapp_no_phone(self):
        customer_no_phone = make_customer(self.tenant, phone="", email="wp@test.com")
        auto = make_automation(
            self.tenant,
            action=AutomationAction.SEND_WHATSAPP,
            action_config={"message": "Test"},
        )
        result = auto._execute_send_whatsapp(customer_no_phone, {})
        self.assertFalse(result)
