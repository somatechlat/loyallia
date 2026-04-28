"""
Loyallia — Authentication Celery Tasks
"""

import logging

from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(
    queue="default",
    name="apps.authentication.tasks.cleanup_expired_tokens",
)
def cleanup_expired_tokens() -> dict:
    """Delete expired refresh tokens to prevent database bloat."""
    from django.utils import timezone

    from apps.authentication.models import RefreshToken

    deleted_count, _ = RefreshToken.objects.filter(
        expires_at__lt=timezone.now()
    ).delete()

    if deleted_count > 0:
        logger.info("Cleaned up %d expired refresh tokens", deleted_count)

    return {"deleted": deleted_count}
