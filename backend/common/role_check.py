"""
Loyallia — Shared Role-Check Decorator
Replaces inline role checks scattered across api.py files.
"""

import functools

from ninja.errors import HttpError

from common.messages import get_message


def require_role(*roles):
    """
    Decorator: blocks request if user doesn't have one of the specified roles.

    Usage:
        @require_role("OWNER")
        def my_endpoint(request, ...):

        @require_role("OWNER", "MANAGER")
        def my_endpoint(request, ...):
    """

    def decorator(func):
        @functools.wraps(func)
        def wrapper(request, *args, **kwargs):
            if not hasattr(request, "user") or request.user is None:
                raise HttpError(401, get_message("AUTH_TOKEN_INVALID"))
            if request.user.role not in roles:
                raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))
            return func(request, *args, **kwargs)

        return wrapper

    return decorator
