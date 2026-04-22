"""
Loyallia — Super Admin API Package
Re-exports a unified router that combines all super admin endpoint modules.

Import contract: `from apps.tenants.super_admin_api import router as super_admin_router`
"""

from ninja import Router

from apps.tenants.super_admin_api.platform import router as platform_router
from apps.tenants.super_admin_api.tenants import router as tenants_router

router = Router()
router.add_router("", tenants_router)
router.add_router("", platform_router)

__all__ = ["router"]
