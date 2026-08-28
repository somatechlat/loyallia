"""
Loyallia Backup API package.

Re-exports the combined router for backward compatibility.
"""

# Import submodules to register their endpoints on the router
# IMPORTANT: settings must be imported BEFORE jobs so that /settings/
# is registered before the catch-all /{backup_id}/ route.
from . import (
    jobs,  # noqa: F401
    offsite,  # noqa: F401
    restores,  # noqa: F401
    settings,  # noqa: F401
)
from .core import router

__all__ = ["router"]
