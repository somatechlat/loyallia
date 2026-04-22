"""
Loyallia — API Router (Django Ninja)
Central registration of all sub-routers.
Mounted at /api/v1/ in loyallia/urls.py
"""
from ninja import NinjaAPI
from ninja.errors import ValidationError, HttpError
from django.http import HttpRequest, JsonResponse

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
    """Platform health check endpoint for load balancers and monitoring."""
    return {"status": "ok", "version": "1.0.0", "platform": "Loyallia"}


# --- Mount all app routers ---
from apps.authentication.api import router as auth_router
from apps.tenants.api import router as tenants_router
from apps.cards.api import router as cards_router
from apps.customers.api import router as customers_router
from apps.transactions.api import router as transactions_router, scanner_router
from apps.notifications.api import router as notifications_router
from apps.automation.api import router as automation_router
from apps.analytics.api import router as analytics_router
from apps.billing.api import router as billing_router
from apps.tenants.super_admin_api import router as super_admin_router
from apps.customers.wallet_api import router as wallet_router
from apps.api.upload_api import router as upload_router

api.add_router("/auth/", auth_router, tags=["Authentication"])
api.add_router("/tenants/", tenants_router, tags=["Tenants"])
api.add_router("/programs/", cards_router, tags=["Loyalty Programs"])
api.add_router("/customers/", customers_router, tags=["Customers"])
api.add_router("/scanner/", scanner_router, tags=["Scanner"])
api.add_router("/transactions/", transactions_router, tags=["Transactions"])
api.add_router("/notifications/", notifications_router, tags=["Push Notifications"])
api.add_router("/automation/", automation_router, tags=["Automation"])
api.add_router("/analytics/", analytics_router, tags=["Analytics"])
api.add_router("/billing/", billing_router, tags=["Billing"])
api.add_router("/admin/", super_admin_router, tags=["Super Admin"])
api.add_router("/", wallet_router, tags=["Wallet"])
api.add_router("/upload/", upload_router, tags=["Uploads"])


# --- Global error handlers ---
@api.exception_handler(ValidationError)
def validation_error_handler(request: HttpRequest, exc: ValidationError) -> JsonResponse:
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
