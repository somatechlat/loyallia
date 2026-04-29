"""
Loyallia — Cursor-Based Pagination Utility
Provides efficient pagination for large datasets using created_at as cursor.
Avoids OFFSET performance degradation on large tables.
"""

from ninja import Schema
from typing import Generic, TypeVar, List, Optional

T = TypeVar("T")


class CursorPage(Schema, Generic[T]):
    """Paginated response with cursor-based navigation."""

    items: List[T]
    next_cursor: Optional[str] = None
    has_next: bool = False


class CursorPagination:
    """
    Cursor-based pagination for list endpoints.

    Uses created_at (descending) as the cursor field.
    Much more efficient than OFFSET for large datasets.

    Usage:
        items, next_cursor = CursorPagination.paginate(
            queryset, cursor=request.GET.get("cursor"), limit=25
        )
    """

    DEFAULT_LIMIT = 25
    MAX_LIMIT = 100

    @staticmethod
    def paginate(queryset, cursor=None, limit=25):
        """
        Paginate a queryset using cursor-based pagination.

        Args:
            queryset: Django queryset (should be ordered by -created_at)
            cursor: ISO format datetime string from previous page's next_cursor
            limit: Number of items per page (max 100)

        Returns:
            Tuple of (items_list, next_cursor_string_or_None)
        """
        limit = min(limit, CursorPagination.MAX_LIMIT)
        limit = max(limit, 1)

        if cursor:
            queryset = queryset.filter(created_at__lt=cursor)

        items = list(queryset[: limit + 1])
        has_next = len(items) > limit

        if has_next:
            items = items[:limit]

        next_cursor = (
            items[-1].created_at.isoformat() if items and has_next else None
        )

        return items, next_cursor
