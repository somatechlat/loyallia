"""
Loyallia Automation Engine (apps/automation/engine.py)

Evaluates automation triggers and executes configured actions.
This is the core dispatcher that connects business events to automated responses.

Entry points:
    fire_trigger(trigger, customer, context) → synchronous, called from API events.
    fire_trigger_async(trigger, customer_id, context) → async via Celery.
    evaluate_scheduled_automations() → called by Celery Beat daily.

Performance (Rule 12):
    - PERF: fire_trigger_async() is the primary entry from scanner endpoints.
      It enqueues to Celery and returns immediately  scanner response is never blocked.
    - PERF: prefetch_related("target_programs") on matching automations prevents N+1.
    - PERF: _MAX_TRIGGER_DEPTH=3 caps recursion for self-triggering rules.

Security (SEC):
      (e.g. transaction_completed → issue_reward → transaction_completed → ...).
      from a parameter override, to prevent cross-tenant data access.
Called by: apps/transactions/api.py (transact), apps/customers/api.py (enroll).
"""

import logging
from datetime import timedelta

from django.db import models
from django.utils import timezone

logger = logging.getLogger(__name__)

# Maximum depth for nested automation triggers to prevent infinite loops
_MAX_TRIGGER_DEPTH = 3

# ---------------------------------------------------------------------------
# Trigger condition evaluators
# ---------------------------------------------------------------------------


def check_points_threshold(automation, customer) -> bool:
    """Check if customer's total points meet or exceed the configured threshold.

    Evaluates the 'points_threshold' trigger_config against the customer's
    total accumulated points across all transactions.
    """
    threshold = automation.trigger_config.get("points_threshold", 0)
    if threshold <= 0:
        return True  # No threshold configured, always pass

    from apps.transactions.models import Transaction

    customer_points = (
        Transaction.objects.filter(
            customer=customer, tenant=automation.tenant
        ).aggregate(total=models.Sum("points"))["total"]
        or 0
    )
    logger.debug(
        "check_points_threshold: customer=%s threshold=%d actual=%d",
        customer.id,
        threshold,
        customer_points,
    )
    return customer_points >= threshold


def check_inactivity(automation, customer) -> bool:
    """Check if customer has been inactive for the configured number of days.

    Returns True if the customer's last transaction is older than the
    configured inactive_days threshold, or if the customer has never
    made a transaction.
    """
    days = automation.trigger_config.get("inactive_days", 30)
    if days <= 0:
        return True  # No inactivity threshold, always pass

    cutoff = timezone.now() - timedelta(days=days)

    from apps.transactions.models import Transaction

    last_activity = (
        Transaction.objects.filter(customer=customer, tenant=automation.tenant)
        .order_by("-created_at")
        .values_list("created_at", flat=True)
        .first()
    )

    if not last_activity:
        logger.debug(
            "check_inactivity: customer=%s never active → INACTIVE",
            customer.id,
        )
        return True  # Never active = inactive

    is_inactive = last_activity < cutoff
    logger.debug(
        "check_inactivity: customer=%s last_activity=%s cutoff=%s → %s",
        customer.id,
        last_activity.isoformat(),
        cutoff.isoformat(),
        "INACTIVE" if is_inactive else "ACTIVE",
    )
    return is_inactive


def check_milestone(automation, customer) -> bool:
    """Check if customer has reached the configured milestone.

    Milestone can be defined as:
    - min_visits: minimum number of transactions
    - min_points: minimum total points accumulated
    """
    from apps.transactions.models import Transaction

    min_visits = automation.trigger_config.get("min_visits", 0)
    min_points = automation.trigger_config.get("min_points", 0)

    if min_visits <= 0 and min_points <= 0:
        return True  # No milestone configured, always pass

    aggregates = Transaction.objects.filter(
        customer=customer, tenant=automation.tenant
    ).aggregate(
        count=models.Count("id"),
        total_points=models.Sum("points"),
    )

    visit_count = aggregates["count"] or 0
    total_points = aggregates["total_points"] or 0

    meets_visits = min_visits <= 0 or visit_count >= min_visits
    meets_points = min_points <= 0 or total_points >= min_points

    logger.debug(
        "check_milestone: customer=%s visits=%d/%d points=%d/%d → %s",
        customer.id,
        visit_count,
        min_visits,
        total_points,
        min_points,
        "PASS" if (meets_visits and meets_points) else "FAIL",
    )
    return meets_visits and meets_points


def fire_trigger(
    trigger: str,
    customer,
    tenant=None,
    context: dict | None = None,
    _depth: int = 0,
) -> int:
    """Fire all active automations matching a trigger event for a customer.

    PERF: prefetch_related("target_programs") prevents N+1 on matching automations.

    Args:
        trigger:  AutomationTrigger value (e.g. "customer_enrolled")
        customer: Customer model instance

        context:  Optional event context dict
        _depth:   Internal recursion depth counter (do not pass manually)

    Returns:
        Number of automations successfully executed
    """
    from apps.automation.models import Automation

    resolved_tenant = customer.tenant
    if _depth >= _MAX_TRIGGER_DEPTH:
        logger.warning(
            "fire_trigger: max recursion depth (%d) reached for trigger=%s "
            "customer=%s  possible self-trigger loop. Aborting.",
            _MAX_TRIGGER_DEPTH,
            trigger,
            customer.id,
        )
        return 0
    trigger_chain = (context or {}).get("_trigger_chain", [])
    if trigger in trigger_chain:
        logger.warning(
            "fire_trigger: self-trigger loop detected  trigger=%s already in chain %s for customer=%s. Skipping.",
            trigger,
            trigger_chain,
            customer.id,
        )
        return 0
    matching = Automation.objects.filter(
        tenant=resolved_tenant,
        trigger=trigger,
        is_active=True,
    ).prefetch_related("target_programs")

    executed = 0
    ctx = dict(context or {})
    # Track trigger chain for loop detection
    ctx["_trigger_chain"] = [*trigger_chain, trigger]

    for automation in matching:
        if not automation.can_execute_for_customer(customer):
            continue

        # Evaluate trigger-specific conditions
        trigger_passes = True
        if automation.trigger == "points_threshold":
            trigger_passes = check_points_threshold(automation, customer)
        elif automation.trigger == "inactive_reminder":
            trigger_passes = check_inactivity(automation, customer)
        elif automation.trigger == "milestone_reached":
            trigger_passes = check_milestone(automation, customer)

        if not trigger_passes:
            logger.debug(
                "fire_trigger: trigger condition not met for automation=%s "
                "customer=%s trigger=%s",
                automation.id,
                customer.id,
                automation.trigger,
            )
            continue

        success = automation.execute(customer, ctx)

        if success:
            executed += 1

    logger.debug(
        "fire_trigger: trigger=%s customer=%s tenant=%s depth=%d → %d/%d executed",
        trigger,
        customer.id,
        resolved_tenant.id,
        _depth,
        executed,
        matching.count(),
    )
    return executed


def fire_trigger_async(
    trigger: str,
    customer_id: str,
    tenant_id: str | None = None,
    context: dict | None = None,
) -> None:
    """Enqueue automation trigger evaluation as a Celery task.

    PERF: Use this from API endpoints to avoid blocking the response.
    The scanner endpoint uses this to fire automation triggers without
    adding latency to the QR scan response.

    Failure is non-fatal: if Celery is unavailable, the event is logged
    and the API response continues normally.
    """
    import logging

    from apps.automation.tasks import evaluate_trigger_for_customer

    try:
        evaluate_trigger_for_customer.delay(  # type: ignore[reportCallIssue]
            trigger=trigger,
            customer_id=customer_id,
            tenant_id=tenant_id,
            context=context or {},
        )
    except Exception as e:
        logging.getLogger(__name__).warning(
            "Could not queue automation trigger %s for customer %s; event continues: %s",
            trigger,
            customer_id,
            e,
            exc_info=True,
        )


# ---------------------------------------------------------------------------
# Automation action executors
# ---------------------------------------------------------------------------


def execute_automation_action(automation, action, customer, context) -> bool:
    """Dispatch and execute an automation action.

    Maps the action type to the appropriate executor function.
    """
    from apps.automation.models import AutomationAction

    if action == AutomationAction.SEND_NOTIFICATION:
        return _execute_send_notification(automation, customer, context)
    elif action == AutomationAction.SEND_EMAIL:
        return _execute_send_email(automation, customer, context)
    elif action == AutomationAction.SEND_SMS:
        return _execute_send_sms(automation, customer, context)
    elif action == AutomationAction.SEND_WHATSAPP:
        return _execute_send_whatsapp(automation, customer, context)
    elif action == AutomationAction.ISSUE_REWARD:
        return _execute_issue_reward(automation, customer, context)
    elif action == AutomationAction.UPDATE_SEGMENT:
        return _execute_update_segment(automation, customer, context)
    elif action == AutomationAction.SEND_WALLET:
        return _execute_send_wallet(automation, customer, context)
    elif action == AutomationAction.TRIGGER_WEBHOOK:
        return _execute_trigger_webhook(automation, customer, context)
    return False


def _execute_send_notification(automation, customer, context) -> bool:
    """Send notification to customer."""
    from apps.notifications.models import (
        Notification,
        NotificationChannel,
        NotificationType,
    )
    from apps.notifications.service import NotificationService

    title = automation.action_config.get("title", "Notificación automática")
    message = automation.action_config.get("message", "")
    notification_type = automation.action_config.get(
        "notification_type", NotificationType.SYSTEM
    )

    notification = Notification.objects.create(
        tenant=automation.tenant,
        customer=customer,
        notification_type=notification_type,
        channel=NotificationChannel.PUSH,
        title=title,
        message=message,
    )

    return NotificationService.send_notification(notification)


def _execute_send_email(automation, customer, context) -> bool:
    """Send branded HTML email to customer via Django SMTP.

    Uses tenant branding (name, primary_color) for professional templates.
    """
    if not customer.email:
        return False

    from django.core.mail import EmailMultiAlternatives
    from django.template.loader import render_to_string

    from apps.notifications.models import (
        Notification,
        NotificationChannel,
        NotificationType,
    )
    from common.email_config import get_default_from_email

    subject = automation.action_config.get("title", "Notificación")
    body_text = automation.action_config.get("message", "")
    from_email = get_default_from_email()
    primary_color = getattr(automation.tenant, "primary_color", "#6366f1")

    # Create notification record for audit trail
    Notification.objects.create(
        tenant=automation.tenant,
        customer=customer,
        notification_type=NotificationType.SYSTEM,
        channel=NotificationChannel.EMAIL,
        title=subject,
        message=body_text[:500],
    )

    html_content = render_to_string(
        "automation/branded_email.html",
        {
            "primary_color": primary_color,
            "tenant_name": automation.tenant.name,
            "body_text": body_text,
        },
    )

    try:
        msg = EmailMultiAlternatives(
            subject=subject,
            body=body_text,
            from_email=from_email,
            to=[customer.email],
        )
        msg.attach_alternative(html_content, "text/html")
        msg.send(fail_silently=False)
        return True
    except Exception as exc:
        import logging

        logging.getLogger(__name__).error(
            "Automation email failed for %s: %s", customer.id, exc
        )
        return False


def _execute_send_sms(automation, customer, context) -> bool:
    """Send SMS via Twilio to customer."""
    if not customer.phone:
        return False

    from apps.notifications.sms.client import is_sms_available, send_sms

    if not is_sms_available():
        import logging

        logging.getLogger(__name__).warning(
            "Twilio SMS not configured  cannot send automation SMS"
        )
        return False

    title = automation.action_config.get("title", "")
    message = automation.action_config.get("message", "")
    full_msg = f"{title}: {message}" if title else message

    result = send_sms(phone=customer.phone, message=full_msg)
    return result.get("success", False)


def _execute_send_whatsapp(automation, customer, context) -> bool:
    """Send WhatsApp message via Baileys bridge."""
    if not customer.phone:
        return False

    from apps.notifications.whatsapp.client import is_bridge_available, send_message
    from common.plan_enforcement import check_plan_limit

    if not is_bridge_available():
        import logging

        logging.getLogger(__name__).warning(
            "WhatsApp bridge not available  cannot send automation message"
        )
        return False

    # Enforce daily WhatsApp plan limit (prevents automation bypass)
    try:
        check_plan_limit(automation.tenant, "whatsapp_day", write=True)
    except Exception as e:
        import logging

        logging.getLogger(__name__).warning(
            "WhatsApp automation blocked: plan limit exceeded for tenant %s (%s)",
            automation.tenant.id,
            e,
        )
        return False

    from apps.notifications.whatsapp.client import check_whatsapp_cooldown

    if check_whatsapp_cooldown(customer.phone):
        import logging

        logging.getLogger(__name__).info(
            "WhatsApp automation cooldown: skipping %s", customer.phone
        )
        return False

    title = automation.action_config.get("title", "")
    message = automation.action_config.get("message", "")
    full_msg = f"*{title}*\n{message}" if title else message

    try:
        result = send_message(
            tenant_id=str(automation.tenant.id),
            phone=customer.phone,
            message=full_msg,
        )
        return result.get("success", False)
    except Exception as exc:
        import logging

        logging.getLogger(__name__).error(
            "Automation WhatsApp failed for %s: %s", customer.id, exc
        )
        return False


def _execute_send_wallet(automation, customer, context) -> bool:
    """Send wallet push notification to customer's active passes.

    Respects wallet_platform config: "apple", "google", or "both" (default).
    """
    from apps.customers.models import CustomerPass

    passes = CustomerPass.objects.filter(
        customer=customer, is_active=True
    ).select_related("card", "card__tenant")

    if not passes.exists():
        return False

    title = automation.action_config.get("title", "Notificación")
    message = automation.action_config.get("message", "")
    wallet_platform = automation.action_config.get("wallet_platform", "both")
    push_sent = False

    for pass_obj in passes:
        # Google Wallet
        if wallet_platform in ("google", "both"):
            try:
                # Fire Google Wallet updates asynchronously to avoid blocking
                from apps.customers.tasks import (
                    send_google_push_notification_async,
                    update_wallet_object_async,
                )

                update_wallet_object_async.delay(str(pass_obj.id))  # type: ignore[reportCallIssue]
                push_sent = True

                from django.conf import settings

                from apps.tenants.models import PlatformSetting

                dashboard_url = PlatformSetting.get(
                    "dashboard_url", settings.PUBLIC_BASE_URL
                )
                action_url = f"{dashboard_url}/enroll/{str(pass_obj.card.id)}"
                send_google_push_notification_async.delay(  # type: ignore[reportCallIssue]
                    str(pass_obj.id),
                    header=title,
                    body=message,
                    action_url=action_url,
                )
            except Exception as exc:
                import logging

                logging.getLogger(__name__).warning(
                    "Google wallet enqueue failed for pass %s: %s", pass_obj.id, exc
                )

        # Apple Wallet
        if wallet_platform in ("apple", "both"):
            try:
                from apps.customers.pass_engine.apple_push import (
                    notify_pass_updated,
                )

                apple_count = notify_pass_updated(pass_obj)
                if apple_count > 0:
                    push_sent = True
            except Exception as exc:
                import logging

                logging.getLogger(__name__).warning(
                    "Apple wallet push failed for pass %s: %s", pass_obj.id, exc
                )

    return push_sent


def _execute_issue_reward(automation, customer, context) -> bool:
    """Issue a reward to customer."""
    from apps.cards.models import Card

    # Find customer's pass for the program
    program_id = automation.action_config.get("program_id")
    if program_id:
        try:
            card = Card.objects.get(id=program_id, tenant=automation.tenant)
            customer_pass = customer.passes.get(card=card, is_active=True)

            # Process reward transaction
            result = customer_pass.process_transaction("remote_reward")
            return result.get("pass_updated", False)
        except (Card.DoesNotExist, customer.passes.model.DoesNotExist):
            return False
    return False


def _execute_update_segment(automation, customer, context) -> bool:
    """Update customer's segment."""
    new_segment = automation.action_config.get("new_segment")
    if new_segment:
        from apps.analytics.models import CustomerAnalytics

        analytics, created = CustomerAnalytics.objects.get_or_create(
            customer=customer, defaults={"tenant": automation.tenant}
        )
        analytics.segment = new_segment
        analytics.save(update_fields=["segment"])
        return True
    return False


def _execute_trigger_webhook(automation, customer, context) -> bool:
    """Trigger a webhook with automation context."""
    from apps.automation.webhook_executor import execute_trigger_webhook as _exec

    return _exec(automation, customer, context)
