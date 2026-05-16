"""
Loyallia — Pagination Utilities (common/exceptions.py — actually pagination)

Standard page-based pagination for all Django Ninja list endpoints.
Provides a generic PaginatedResponse envelope and a paginate_queryset() helper.

Performance (Rule 12):
    - paginate_queryset() uses QuerySet slicing (SQL LIMIT/OFFSET) — only the
      requested page of rows is loaded into Python memory.
    - MAX_PAGE_SIZE (100) caps memory usage per request.
    - count() query runs separately from the data query (Django ORM limitation).

Called by: Customer list, Transaction list, Program list, and other paginated endpoints.
"""

from typing import Any, Generic, TypeVar

from django.db.models import QuerySet
from pydantic import BaseModel

T = TypeVar("T")

# Default page size
DEFAULT_PAGE_SIZE = 25
MAX_PAGE_SIZE = 100


class PaginatedResponse(BaseModel, Generic[T]):
    """Standard paginated response envelope for all list endpoints."""

    count: int
    page: int
    page_size: int
    total_pages: int
    next: str | None = None
    previous: str | None = None
    results: list[T]


def paginate_queryset(
    queryset: QuerySet,
    page: int,
    page_size: int,
    request_url: str = "",
) -> dict[str, Any]:
    """
    Paginates a Django QuerySet and returns a dict ready for PaginatedResponse.

    Args:
        queryset: The Django queryset to paginate
        page: Current page number (1-indexed)
        page_size: Number of items per page (capped at MAX_PAGE_SIZE)
        request_url: Base URL for next/previous links

    Returns:
        Dict with count, page, page_size, total_pages, next, previous, results
    """
    page = max(1, page)
    page_size = min(max(1, page_size), MAX_PAGE_SIZE)

    total_count = queryset.count()
    total_pages = max(1, (total_count + page_size - 1) // page_size)
    offset = (page - 1) * page_size

    results = list(queryset[offset : offset + page_size])

    def build_url(p: int) -> str | None:
        if not request_url:
            return None
        separator = "&" if "?" in request_url else "?"
        return f"{request_url}{separator}page={p}&page_size={page_size}"

    return {
        "count": total_count,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
        "next": build_url(page + 1) if page < total_pages else None,
        "previous": build_url(page - 1) if page > 1 else None,
        "results": results,
    }
