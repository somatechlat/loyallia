"""
Loyallia — Authentication Celery Tasks

LYL-M-ARCH-030: All tasks are idempotent — safe to re-execute.
LYL-M-ARCH-031: Retry logic for transient failures.
"""

import logging

from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(
    bind=True,
    max_retries=2,
    default_retry_delay=60,
    queue="default",
    name="apps.authentication.tasks.cleanup_expired_tokens",
)
def cleanup_expired_tokens(self) -> dict:
    """Delete expired refresh tokens to prevent database bloat.

    LYL-M-ARCH-030: Idempotent — deleting already-deleted rows is a no-op.
    LYL-M-ARCH-031: Retries on transient DB failures.
    """
    from django.utils import timezone

    from apps.authentication.models import RefreshToken

    try:
        deleted_count, _ = RefreshToken.objects.filter(
            expires_at__lt=timezone.now()
        ).delete()

        if deleted_count > 0:
            logger.info("Cleaned up %d expired refresh tokens", deleted_count)

        return {"deleted": deleted_count}
    except Exception as exc:
        logger.error("cleanup_expired_tokens failed: %s", exc)
        raise self.retry(exc=exc)
