"""
Loyallia Automation Webhook Executor
Extracted from engine.py to keep files under 650 lines.
"""

import logging

import requests
from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)


def execute_trigger_webhook(automation, customer, context) -> bool:
    """Trigger a webhook with automation context.

    Sends tenant_id, rule_id, customer_id, trigger type and timestamp.
    """
    webhook_url = automation.action_config.get("webhook_url")
    if not webhook_url:
        logger.warning("No webhook URL configured for automation %s", automation.id)
        return False

    payload = {
        "tenant_id": str(getattr(automation, "tenant_id", None)),
        "automation_id": str(automation.id),
        "automation_name": automation.name,
        "customer_id": str(customer.id),
        "customer_name": f"{customer.first_name} {customer.last_name}".strip(),
        "customer_email": getattr(customer, "email", None),
        "customer_phone": getattr(customer, "phone", None),
        "trigger": automation.trigger,
        "trigger_config": automation.trigger_config,
        "timestamp": timezone.now().isoformat(),
        "context": {
            k: v for k, v in (context or {}).items() if not str(k).startswith("_")
        },
    }

    try:
        headers = {"Content-Type": "application/json"}
        # Support custom headers from action_config
        custom_headers = automation.action_config.get("headers", {})
        if custom_headers:
            headers.update(custom_headers)

        response = requests.post(
            webhook_url,
            json=payload,
            headers=headers,
            timeout=settings.HTTP_TIMEOUT_AUTOMATION_WEBHOOK,
        )
        response.raise_for_status()
        logger.info(
            "Webhook triggered successfully: %s (automation=%s, customer=%s, status=%d)",
            webhook_url,
            automation.id,
            customer.id,
            response.status_code,
        )
        return True
    except requests.exceptions.Timeout:
        logger.error(
            "Webhook timeout: %s (automation=%s, customer=%s)",
            webhook_url,
            automation.id,
            customer.id,
        )
        return False
    except requests.RequestException as e:
        logger.error(
            "Webhook trigger failed: %s (automation=%s, customer=%s) - %s",
            webhook_url,
            automation.id,
            customer.id,
            str(e),
        )
        return False
