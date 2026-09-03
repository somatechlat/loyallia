"""
Loyallia Authentication Celery Tasks

"""

import logging

from celery import shared_task
from django.conf import settings

logger = logging.getLogger(__name__)


@shared_task(
    bind=True,
    max_retries=settings.CELERY_MAX_RETRIES_LOW,
    default_retry_delay=settings.CELERY_DEFAULT_RETRY_DELAY_MEDIUM,
    queue="default",
    name="apps.authentication.tasks.cleanup_expired_tokens",
)
def cleanup_expired_tokens(self) -> dict:
    """Delete expired refresh tokens to prevent database bloat."""
    from django.utils import timezone

    from apps.authentication.models import RefreshToken

    try:
        deleted_count, _ = RefreshToken.objects.filter(expires_at__lt=timezone.now()).delete()

        if deleted_count > 0:
            logger.info("Cleaned up %d expired refresh tokens", deleted_count)

        return {"deleted": deleted_count}
    except Exception as exc:
        logger.error("cleanup_expired_tokens failed: %s", exc)
        raise self.retry(exc=exc)
