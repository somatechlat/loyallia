"""
Loyallia API Router (Django Ninja)
Central registration of all sub-routers.
Mounted at /api/v1/ in loyallia/urls.py
"""

from typing import Any

from django.http import HttpRequest, JsonResponse
from ninja import NinjaAPI
from ninja.errors import HttpError, ValidationError

from apps.agent_api.api import router as agent_api_router
from apps.analytics.api import router as analytics_router
from apps.api.upload_api import router as upload_router
from apps.audit.api import router as audit_router
from apps.authentication.api import router as auth_router
from apps.authentication.api_phone_verify import router as phone_verify_router
from apps.authentication.users_api import router as users_router
from apps.automation import api as automation_api
from apps.automation.api import router as automation_router
from apps.backup.api import router as backup_router
from apps.billing.api import router as billing_router
from apps.billing.payment_api import router as billing_payment_router
from apps.cards import api as cards_api
from apps.cards.api import router as cards_router
from apps.customers.api import router as customers_router
from apps.customers.export_api import router as customer_export_router
from apps.customers.portal_api import router as portal_router
from apps.customers.segment_api import router as segment_router
from apps.customers.wallet_api import router as wallet_router
from apps.notifications.api import router as notifications_router
from apps.notifications.whatsapp.api import router as whatsapp_router
from apps.redemption.api import router as redemption_router
from apps.tenants.api import router as tenants_router
from apps.tenants.security_privacy_api import router as tenant_security_privacy_router
from apps.tenants.super_admin_api import router as super_admin_router
from apps.tenants.super_admin_api.platform_reset import router as platform_reset_router
from apps.transactions.api import router as transactions_router
from apps.transactions.api import scanner_router

api = NinjaAPI(
    title="Loyallia API",
    version="1.0.0",
    description="Loyallia Digital Loyalty Platform REST API",
    urls_namespace="loyallia_api",
    docs_url="/docs/",
    openapi_url="/openapi.json",
)


# Health check (unauthenticated)
@api.get("/health/", auth=None, tags=["System"])
def health_check(request: HttpRequest):
    """Liveness probe  returns 200 if the process is running."""
    return {"status": "ok", "version": "1.0.0", "platform": "Loyallia"}


@api.get("/health/ready/", auth=None, tags=["System"])
def readiness_check(request: HttpRequest):
    """Readiness probe  verifies all dependencies (PostgreSQL, Redis) are healthy.
    Returns HTTP 200 if all dependencies are healthy, HTTP 503 if any are down.
    """
    import time

    checks = {}
    all_healthy = True

    # PostgreSQL check
    try:
        from django.db import connection

        start = time.monotonic()
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        checks["database"] = {
            "status": "ok",
            "latency_ms": round((time.monotonic() - start) * 1000, 2),
        }
    except Exception as e:
        checks["database"] = {"status": "error", "detail": str(e)}
        all_healthy = False

    # Redis check
    try:
        from django.core.cache import cache

        start = time.monotonic()
        cache.set("_health_check", "ok", timeout=5)
        val = cache.get("_health_check")
        checks["cache"] = {
            "status": "ok" if val == "ok" else "error",
            "latency_ms": round((time.monotonic() - start) * 1000, 2),
        }
        if val != "ok":
            all_healthy = False
    except Exception as e:
        checks["cache"] = {"status": "error", "detail": str(e)}
        all_healthy = False

    status_code = 200 if all_healthy else 503
    response = {
        "status": "ok" if all_healthy else "degraded",
        "version": "1.0.0",
        "platform": "Loyallia",
        "checks": checks,
    }

    from django.http import JsonResponse as DjJsonResponse

    return DjJsonResponse(response, status=status_code)


@api.get("/health/celery/", auth=None, tags=["System"])
def celery_health(request: HttpRequest):
    """Celery worker health probe.
    Returns HTTP 200 if at least one worker responds to ping, 503 otherwise.
    """
    import logging

    logger = logging.getLogger(__name__)
    try:
        from loyallia.celery import app as celery_app

        inspector = celery_app.control.inspect(timeout=2.0)
        ping_result = inspector.ping()
        if ping_result:
            workers = list(ping_result.keys())
            return {"status": "ok", "workers": len(workers), "nodes": workers}
        else:
            logger.warning("Celery health: no workers responded to ping")
            from django.http import JsonResponse as DjJsonResponse

            return DjJsonResponse({"status": "no_workers", "workers": 0}, status=503)
    except Exception as e:
        logger.error("Celery health check failed: %s", e)
        from django.http import JsonResponse as DjJsonResponse

        return DjJsonResponse({"status": "error", "detail": str(e)}, status=503)


# Mount all app routers
api.add_router("/auth/", auth_router, tags=["Authentication"])
api.add_router("/auth/phone/", phone_verify_router, tags=["Authentication"])
api.add_router("/auth/users/", users_router, tags=["Authentication"])
api.add_router("/tenants/", tenants_router, tags=["Tenants"])
api.add_router(
    "/tenants/privacy/", tenant_security_privacy_router, tags=["Tenant Privacy"]
)
api.add_router("/programs/", cards_router, tags=["Loyalty Programs"])
api.add_router("/customers/export/", customer_export_router, tags=["Customer Export"])
api.add_router("/customers/", customers_router, tags=["Customers"])
api.add_router("/customers/segments/", segment_router, tags=["Customer Segments"])
api.add_router("/scanner/", scanner_router, tags=["Scanner"])
api.add_router("/scanner/v2/", redemption_router, tags=["Scanner V2"])
api.add_router("/transactions/", transactions_router, tags=["Transactions"])
api.add_router("/notifications/", notifications_router, tags=["Push Notifications"])
api.add_router("/whatsapp/", whatsapp_router, tags=["WhatsApp"])
api.add_router("/automation/", automation_router, tags=["Automation"])
api.add_router("/analytics/", analytics_router, tags=["Analytics"])
api.add_router("/billing/", billing_router, tags=["Billing"])
api.add_router(
    "/billing/payments/", billing_payment_router, tags=["Billing - Payments"]
)
api.add_router("/admin/", super_admin_router, tags=["Super Admin"])
api.add_router("/admin/reset/", platform_reset_router, tags=["Super Admin"])
api.add_router("/portal/", portal_router, tags=["Customer Portal"])
api.add_router("/", wallet_router, tags=["Wallet"])
api.add_router("/upload/", upload_router, tags=["Uploads"])
api.add_router("/agent/", agent_api_router, tags=["Agent API"])
api.add_router("/admin/audit/", audit_router, tags=["Audit"])
api.add_router("/admin/backups/", backup_router, tags=["Backup & Restore"])


# Mailjet webhook receiver mounted at root so URL is /api/v1/webhooks/mailjet/
@api.post("/webhooks/mailjet/", auth=None, tags=["Webhooks"])
def mailjet_webhook(request, payload: list[dict[str, Any]]) -> dict:
    """Receive Mailjet event webhooks for email delivery tracking.

    SEC: No authentication required  Mailjet sends signed requests.
    IP whitelisting should be configured at Nginx level.
    """
    from apps.notifications.api.webhooks import process_mailjet_event

    processed = 0
    for event in payload:
        if process_mailjet_event(event):
            processed += 1

    return {"success": True, "processed": processed}


# Backward-compatible aliases for legacy clients and tests.
api.get(
    "/cards/",
    auth=cards_api.jwt_auth,
    response=cards_api.CardListOut,
    tags=["Loyalty Programs"],
)(cards_api.list_programs)
api.post(
    "/cards/",
    auth=cards_api.jwt_auth,
    response=cards_api.CardOut,
    tags=["Loyalty Programs"],
)(cards_api.create_program)
api.get(
    "/cards/{program_id}/",
    auth=cards_api.jwt_auth,
    response=cards_api.CardOut,
    tags=["Loyalty Programs"],
)(cards_api.get_program)
api.get(
    "/automations/",
    auth=automation_api.jwt_auth,
    tags=["Automation"],
)(automation_api.list_automations)


# Global error handlers
@api.exception_handler(ValidationError)
def validation_error_handler(
    request: HttpRequest, exc: ValidationError
) -> JsonResponse:
    return JsonResponse(
        {"success": False, "error": "VALIDATION_ERROR", "detail": exc.errors},
        status=422,
    )


@api.exception_handler(HttpError)
def http_error_handler(request: HttpRequest, exc: HttpError) -> JsonResponse:
    return JsonResponse(
        {"success": False, "error": str(exc.message)},
        status=exc.status_code,
    )
