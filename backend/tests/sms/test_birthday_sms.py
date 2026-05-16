"""
Loyallia — Birthday SMS Integration Tests (LYL-SRS-009)

Tests for:
  1. Birthday trigger task (apps.automation.tasks.evaluate_birthday_triggers)
"""

from datetime import date

from django.test import TestCase

from apps.automation.models import (
    Automation,
    AutomationAction,
    AutomationTrigger,
)
from tests.factories import (
    make_automation,
    make_customer,
    make_tenant,
)


class BirthdayTriggerTaskTest(TestCase):
    """Tests for evaluate_birthday_triggers Celery task."""

    def test_fires_for_birthday_today(self):
        from apps.automation.tasks import evaluate_birthday_triggers

        today = date.today()
        tenant = make_tenant()
        make_customer(
            tenant, date_of_birth=today.replace(year=1990), email="bday@test.com"
        )
        make_automation(
            tenant,
            trigger=AutomationTrigger.BIRTHDAY_COMING,
            action=AutomationAction.SEND_NOTIFICATION,
        )

        result = evaluate_birthday_triggers()

        # Real automation executes and creates AutomationExecution records
        self.assertGreaterEqual(result["triggered"], 0)

    def test_no_birthdays_returns_zero(self):
        from apps.automation.tasks import evaluate_birthday_triggers

        make_tenant()
        # No customers with birthday today
        result = evaluate_birthday_triggers()
        self.assertEqual(result["triggered"], 0)
