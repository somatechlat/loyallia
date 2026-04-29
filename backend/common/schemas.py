"""
Loyallia — Shared Schemas (DRY)
Common Pydantic/Ninja schemas used across multiple apps.
Import from here instead of defining duplicates in each app.
"""

from ninja import Schema


class MessageOut(Schema):
    """Standard success/error response envelope."""

    success: bool
    message: str


class UserOut(Schema):
    """Standard user representation for API responses."""

    id: str
    email: str
    first_name: str
    last_name: str
    role: str
    is_active: bool


class PaginatedResponse(Schema):
    """Standard paginated list response wrapper."""

    total: int
    limit: int
    offset: int
