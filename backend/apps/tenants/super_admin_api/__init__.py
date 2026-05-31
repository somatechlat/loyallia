"""
Loyallia Super Admin API Package
Re-exports a unified router that combines all super admin endpoint modules.

Import contract: `from apps.tenants.super_admin_api import router as super_admin_router`
"""

from ninja import Router

from apps.tenants.super_admin_api.billing import router as billing_router
from apps.tenants.super_admin_api.impersonation import router as impersonation_router
from apps.tenants.super_admin_api.platform import router as platform_router
from apps.tenants.super_admin_api.platform_plans import router as platform_plans_router
from apps.tenants.super_admin_api.tenants import router as tenants_router

router = Router()
router.add_router("", tenants_router)
router.add_router("", platform_plans_router)
router.add_router("", platform_router)
router.add_router("", billing_router)
router.add_router("", impersonation_router)

__all__ = ["router"]
