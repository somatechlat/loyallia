"""
Loyallia — API Router (Django Ninja)
Central registration of all sub-routers.
Mounted at /api/v1/ in loyallia/urls.py
"""

from django.http import HttpRequest, JsonResponse
from ninja import NinjaAPI
from ninja.errors import HttpError, ValidationError

api = NinjaAPI(
    title="Loyallia API",
    version="1.0.0",
    description="Loyallia Digital Loyalty Platform REST API",
    urls_namespace="loyallia_api",
    docs_url="/docs/",
    openapi_url="/openapi.json",
)


# --- Health check (unauthenticated) ---
@api.get("/health/", auth=None, tags=["System"])
def health_check(request: HttpRequest):
    """Liveness probe — returns 200 if the process is running."""
    return {"status": "ok", "version": "1.0.0", "platform": "Loyallia"}


@api.get("/health/ready/", auth=None, tags=["System"])
def readiness_check(request: HttpRequest):
    """Readiness probe — verifies all dependencies (PostgreSQL, Redis) are healthy.
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


# --- Mount all app routers ---
from apps.analytics.api import router as analytics_router
from apps.api.upload_api import router as upload_router
from apps.authentication.api import router as auth_router
from apps.authentication.users_api import router as users_router
from apps.automation.api import router as automation_router
from apps.billing.api import router as billing_router
from apps.billing.payment_api import router as billing_payment_router
from apps.cards.api import router as cards_router
from apps.customers.api import router as customers_router
from apps.customers.segment_api import router as segment_router
from apps.customers.wallet_api import router as wallet_router
from apps.notifications.api import router as notifications_router
from apps.tenants.api import router as tenants_router
from apps.tenants.super_admin_api import router as super_admin_router
from apps.audit.api import router as audit_router
from apps.agent_api.api import router as agent_api_router
from apps.transactions.api import router as transactions_router
from apps.transactions.api import scanner_router

api.add_router("/auth/", auth_router, tags=["Authentication"])
api.add_router("/auth/", users_router, tags=["Authentication"])
api.add_router("/tenants/", tenants_router, tags=["Tenants"])
api.add_router("/programs/", cards_router, tags=["Loyalty Programs"])
api.add_router("/customers/", customers_router, tags=["Customers"])
api.add_router("/customers/", segment_router, tags=["Customer Segments"])
api.add_router("/scanner/", scanner_router, tags=["Scanner"])
api.add_router("/transactions/", transactions_router, tags=["Transactions"])
api.add_router("/notifications/", notifications_router, tags=["Push Notifications"])
api.add_router("/automation/", automation_router, tags=["Automation"])
api.add_router("/analytics/", analytics_router, tags=["Analytics"])
api.add_router("/billing/", billing_router, tags=["Billing"])
api.add_router("/billing/", billing_payment_router, tags=["Billing - Payments"])
api.add_router("/admin/", super_admin_router, tags=["Super Admin"])
api.add_router("/", wallet_router, tags=["Wallet"])
api.add_router("/upload/", upload_router, tags=["Uploads"])
api.add_router("/agent/", agent_api_router, tags=["Agent API"])
api.add_router("/admin/audit/", audit_router, tags=["Audit"])


# --- Global error handlers ---
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
