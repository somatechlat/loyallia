"""Bootstrap runtime-configurable platform settings.

Run with:
    docker compose exec api python manage.py seed_platform_settings
    docker compose exec api python manage.py seed_platform_settings --mode=development
    docker compose exec api python manage.py seed_platform_settings --mode=production
    docker compose exec api python manage.py seed_platform_settings --update-existing

Idempotent — safe to run multiple times; existing keys are skipped unless
--update-existing is passed.

Every key below is consumed by at least one PlatformSetting.get*() call in the
codebase. Dead settings were removed in the SuperAdmin dashboard redesign.
"""

import json
import os
from pathlib import Path

from django.core.management.base import BaseCommand

from apps.tenants.models import PlatformSetting

FIXTURE_PATH = Path(__file__).parent.parent.parent / "fixtures" / "platform_settings.json"

# ── System mode ──────────────────────────────────────────────────────────────
_SYSTEM_MODE_SETTINGS = [
    {
        "key": "development_mode",
        "value": "false",
        "description": "Enable development mode for debugging and extra logging",
        "category": "system_mode",
    },
    {
        "key": "TRIAL_DAYS",
        "value": "14",
        "description": "Number of trial days for new tenants",
        "category": "system_mode",
    },
    {
        "key": "PLATFORM_MODE",
        "value": "development",
        "description": "Platform environment: development or production",
        "category": "system_mode",
    },
]

# ── Backup ───────────────────────────────────────────────────────────────────
_BACKUP_SETTINGS = [
    {
        "key": "backup_frequency",
        "value": "daily",
        "description": "Backup frequency: manual, hourly, 6h, 12h, daily, weekly",
        "category": "backup",
    },
    {
        "key": "backup_hour",
        "value": "3",
        "description": "Hour of day to run backups (0-23, UTC)",
        "category": "backup",
    },
    {
        "key": "backup_minute",
        "value": "0",
        "description": "Minute of hour to run backups (0-59, UTC)",
        "category": "backup",
    },
    {
        "key": "backup_retention_days",
        "value": "30",
        "description": "Number of days to retain backup files",
        "category": "backup",
    },
    {
        "key": "backup_encryption_enabled",
        "value": "true",
        "description": "Encrypt backup files before storage",
        "category": "backup",
    },
    {
        "key": "backup_compression_enabled",
        "value": "true",
        "description": "Compress backup files to reduce storage",
        "category": "backup",
    },
    {
        "key": "backup_include_media",
        "value": "true",
        "description": "Include uploaded media files in backups",
        "category": "backup",
    },
    {
        "key": "backup_include_vault",
        "value": "true",
        "description": "Include Vault data in backups",
        "category": "backup",
    },
    {
        "key": "backup_s3_bucket",
        "value": "loyallia-backups",
        "description": "S3 bucket name for backup storage",
        "category": "backup",
    },
    {
        "key": "backup_alert_email",
        "value": "admin@loyallia.com",
        "description": "Email address for backup failure alerts",
        "category": "backup",
    },
]

# ── URLs ─────────────────────────────────────────────────────────────────────
_URL_SETTINGS = [
    {
        "key": "public_base_url",
        "value": "",
        "description": "Public base URL for links, emails, and wallet passes (overrides env)",
        "category": "url",
    },
    {
        "key": "api_base_url",
        "value": "",
        "description": "Base URL for the Loyallia API",
        "category": "url",
    },
    {
        "key": "dashboard_url",
        "value": "",
        "description": "Main dashboard / frontend URL",
        "category": "url",
    },
    {
        "key": "webhook_base_url",
        "value": "",
        "description": "Base URL for incoming webhooks",
        "category": "url",
    },
    {
        "key": "wallet_web_service_url",
        "value": "",
        "description": "Apple/Google Wallet webServiceURL base",
        "category": "url",
    },
    {
        "key": "scanner_url",
        "value": "",
        "description": "QR code scanner web app URL",
        "category": "url",
    },
    {
        "key": "minio_public_endpoint",
        "value": "",
        "description": "Public MinIO/S3 endpoint for asset URLs (overrides env)",
        "category": "url",
    },
    {
        "key": "google_oauth_redirect_uri",
        "value": "",
        "description": "Google OAuth redirect URI",
        "category": "url",
    },
    {
        "key": "ENROLL_BASE_URL",
        "value": "",
        "description": "Wallet enrollment page base URL",
        "category": "url",
    },
    {
        "key": "BRAND_HOME_URL",
        "value": "",
        "description": "Brand homepage URL for email footers",
        "category": "url",
    },
]

# ── Notifications ────────────────────────────────────────────────────────────
_NOTIFICATION_SETTINGS = [
    {
        "key": "mailjet_sender_email",
        "value": "noreply@loyallia.com",
        "description": "Default sender email address for Mailjet",
        "category": "notification",
    },
    {
        "key": "mailjet_sender_name",
        "value": "Loyallia",
        "description": "Default sender display name for Mailjet",
        "category": "notification",
    },
    {
        "key": "EMAIL_MESSAGE_ID_DOMAIN",
        "value": "loyallia.com",
        "description": "Domain for email Message-ID headers",
        "category": "notification",
    },
    {
        "key": "email_host",
        "value": "",
        "description": "SMTP server hostname (overrides env EMAIL_HOST)",
        "category": "notification",
    },
    {
        "key": "email_port",
        "value": "",
        "description": "SMTP server port (overrides env EMAIL_PORT)",
        "category": "notification",
    },
    {
        "key": "email_use_tls",
        "value": "",
        "description": "Use TLS for SMTP (true/false, overrides env EMAIL_USE_TLS)",
        "category": "notification",
    },
    {
        "key": "whatsapp_bridge_url",
        "value": "",
        "description": "WhatsApp Bridge base URL (overrides env)",
        "category": "notification",
    },
]

# ── Wallet defaults ──────────────────────────────────────────────────────────
_WALLET_SETTINGS = [
    {
        "key": "WALLET_FALLBACK_AVATAR_URL",
        "value": "",
        "description": "Fallback avatar image URL for wallet passes",
        "category": "wallet",
    },
    {
        "key": "WALLET_PLACEHOLDER_IMAGE",
        "value": "",
        "description": "Placeholder hero image for wallet passes",
        "category": "wallet",
    },
]

# ── Worker settings (all require restart) ────────────────────────────────────
_WORKER_SETTINGS = [
    {
        "key": "celery_worker_concurrency",
        "value": "8",
        "description": "Number of concurrent Celery worker processes",
        "category": "worker",
        "requires_restart": True,
    },
    {
        "key": "celery_task_soft_timeout",
        "value": "300",
        "description": "Celery task soft timeout in seconds (SIGTERM)",
        "category": "worker",
        "requires_restart": True,
    },
    {
        "key": "celery_task_hard_timeout",
        "value": "600",
        "description": "Celery task hard timeout in seconds (SIGKILL)",
        "category": "worker",
        "requires_restart": True,
    },
    {
        "key": "gunicorn_workers",
        "value": "8",
        "description": "Number of Gunicorn worker processes",
        "category": "worker",
        "requires_restart": True,
    },
    {
        "key": "gunicorn_threads",
        "value": "4",
        "description": "Number of threads per Gunicorn worker",
        "category": "worker",
        "requires_restart": True,
    },
    {
        "key": "gunicorn_timeout",
        "value": "120",
        "description": "Gunicorn worker timeout in seconds",
        "category": "worker",
        "requires_restart": True,
    },
]

ALL_DEFAULTS = (
    _SYSTEM_MODE_SETTINGS
    + _BACKUP_SETTINGS
    + _URL_SETTINGS
    + _NOTIFICATION_SETTINGS
    + _WALLET_SETTINGS
    + _WORKER_SETTINGS
)

# Mode-specific overrides
_MODE_OVERRIDES = {
    "development": {
        "development_mode": "true",
        "PLATFORM_MODE": "development",
        "public_base_url": os.getenv("PUBLIC_BASE_URL", "http://localhost"),
        "api_base_url": os.getenv("API_BASE_URL", "http://localhost:33905/api/v1/"),
        "dashboard_url": os.getenv("DASHBOARD_URL", "http://localhost:33906"),
        "webhook_base_url": os.getenv("WEBHOOK_BASE_URL", "http://localhost:33905/api/v1/webhooks/"),
        "wallet_web_service_url": os.getenv("WALLET_WEB_SERVICE_URL", "http://localhost:33905/api/v1/pass/"),
        "scanner_url": os.getenv("SCANNER_URL", "http://localhost:33906/scanner"),
        "minio_public_endpoint": os.getenv("MINIO_PUBLIC_ENDPOINT", "http://localhost:33903"),
        "google_oauth_redirect_uri": os.getenv(
            "GOOGLE_OAUTH_REDIRECT_URI",
            "http://localhost:33905/api/v1/auth/google/callback/",
        ),
        "email_host": os.getenv("EMAIL_HOST", "in-v3.mailjet.com"),
        "email_port": os.getenv("EMAIL_PORT", "587"),
        "email_use_tls": os.getenv("EMAIL_USE_TLS", "true"),
        "whatsapp_bridge_url": os.getenv("WHATSAPP_BRIDGE_URL", "http://whatsapp-bridge:3001"),
    },
    "production": {
        "development_mode": "false",
        "PLATFORM_MODE": "production",
        "public_base_url": os.environ["PUBLIC_BASE_URL"],
        "api_base_url": os.environ.get("API_BASE_URL", f"{os.environ['PUBLIC_BASE_URL']}/api/v1/"),
        "dashboard_url": os.environ.get("DASHBOARD_URL", os.environ["PUBLIC_BASE_URL"]),
        "webhook_base_url": os.environ.get("WEBHOOK_BASE_URL", f"{os.environ['PUBLIC_BASE_URL']}/api/v1/webhooks/"),
        "wallet_web_service_url": os.environ.get(
            "WALLET_WEB_SERVICE_URL", f"{os.environ['PUBLIC_BASE_URL']}/api/v1/pass/"
        ),
        "scanner_url": os.environ.get("SCANNER_URL", f"{os.environ['PUBLIC_BASE_URL']}/scanner"),
        "minio_public_endpoint": os.environ.get("MINIO_PUBLIC_ENDPOINT", os.environ["PUBLIC_BASE_URL"]),
        "google_oauth_redirect_uri": os.environ.get(
            "GOOGLE_OAUTH_REDIRECT_URI",
            f"{os.environ['PUBLIC_BASE_URL']}/api/v1/auth/google/callback/",
        ),
        "email_host": os.getenv("EMAIL_HOST", "in-v3.mailjet.com"),
        "email_port": os.getenv("EMAIL_PORT", "587"),
        "email_use_tls": os.getenv("EMAIL_USE_TLS", "true"),
        "whatsapp_bridge_url": os.getenv("WHATSAPP_BRIDGE_URL", "http://whatsapp-bridge:3001"),
    },
}


def _load_legacy_fixture():
    """Load legacy platform settings from canonical JSON fixture."""
    if not FIXTURE_PATH.exists():
        return []
    with open(FIXTURE_PATH) as f:
        data = json.load(f)
    return [
        {
            "key": item["fields"]["key"],
            "value": item["fields"]["value"],
            "description": item["fields"]["description"],
            "category": item["fields"]["category"],
            "requires_restart": item["fields"].get("requires_restart", False),
        }
        for item in data
    ]


class Command(BaseCommand):
    """Seed default platform settings (idempotent)."""

    help = "Seed default platform settings (idempotent)"

    def add_arguments(self, parser):
        parser.add_argument(
            "--mode",
            type=str,
            choices=["development", "production"],
            default="production",
            help="Platform mode: development or production (default: production)",
        )
        parser.add_argument(
            "--update-existing",
            action="store_true",
            help="Apply mode overrides to existing settings (default: skip existing)",
        )

    def handle(self, *args, **options):
        mode = options["mode"]
        update_existing = options["update_existing"]
        overrides = _MODE_OVERRIDES.get(mode, {})

        created_count = 0
        updated_count = 0
        skipped_count = 0

        all_items = _load_legacy_fixture() + list(ALL_DEFAULTS)

        for item in all_items:
            key = item["key"]
            value = overrides.get(key, item["value"])

            setting, created = PlatformSetting.objects.get_or_create(
                key=key,
                defaults={
                    "value": value,
                    "description": item.get("description", ""),
                    "category": item.get("category", "general"),
                    "requires_restart": item.get("requires_restart", False),
                },
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f"Created {key} = {value}"))
                created_count += 1
            else:
                self.stdout.write(self.style.NOTICE(f"Skipped {key} (already exists)"))
                skipped_count += 1

        if update_existing:
            for key, value in overrides.items():
                try:
                    setting = PlatformSetting.objects.get(key=key)
                    if setting.value != value:
                        old = setting.value
                        setting.value = value
                        setting.save(update_fields=["value", "updated_at"])
                        self.stdout.write(self.style.WARNING(f"Updated: {key} = {value} (was {old})"))
                        updated_count += 1
                except PlatformSetting.DoesNotExist:
                    self.stdout.write(self.style.WARNING(f"Override key {key} not found; skipping"))

        self.stdout.write(
            self.style.SUCCESS(
                f"\nDone [{mode}]. "
                f"{created_count} created, "
                f"{updated_count} updated, "
                f"{skipped_count} skipped."
            )
        )
