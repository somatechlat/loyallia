"""Notifications API router package.

Re-exports the shared router and imports all submodules so that
Django Ninja discovers the registered routes.
"""

from common.plan_enforcement import enforce_limit

from . import analytics, campaigns, inbox, misc, push  # noqa: F401
from .base import router
from .campaigns import create_campaign

__all__ = ["router", "enforce_limit", "create_campaign"]
