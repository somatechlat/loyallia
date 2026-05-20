"""Bootstrap runtime-configurable platform settings.

Run with:
    docker compose exec api python manage.py seed_platform_settings
    docker compose exec api python manage.py seed_platform_settings --mode=development
    docker compose exec api python manage.py seed_platform_settings --mode=production
    docker compose exec api python manage.py seed_platform_settings --update-existing

Idempotent  safe to run multiple times; existing keys are skipped unless
--update-existing is passed.
"""

import json
from pathlib import Path

from django.core.management.base import BaseCommand

from apps.tenants.models import PlatformSetting

FIXTURE_PATH = (
    Path(__file__).parent.parent.parent / "fixtures" / "platform_settings.json"
)

# System mode settings
_SYSTEM_MODE_SETTINGS = [
    {
        "key": "development_mode",
        "value": "false",
        "description": "Enable development mode for debugging and extra logging",
        "category": "system_mode",
    },
    {
        "key": "trial_days",
        "value": "14",
        "description": "Number of trial days for new tenants",
        "category": "system_mode",
    },
    {
        "key": "trial_customers_limit",
        "value": "500",
        "description": "Maximum customers allowed during trial period",
        "category": "system_mode",
    },
    {
        "key": "trial_programs_limit",
        "value": "50",
        "description": "Maximum loyalty programs allowed during trial period",
        "category": "system_mode",
    },
    {
        "key": "sandbox_webhooks",
        "value": "true",
        "description": "Use sandbox/test mode for webhook payloads (safe default)",
        "category": "system_mode",
    },
]

# Backup settings
_BACKUP_SETTINGS = [
    {
        "key": "backup_frequency",
        "value": "daily",
        "description": "Backup frequency: manual, hourly, 6h, 12h, daily, weekly",
        "category": "backup",
    },
    {
        "key": "backup_time",
        "value": "03:00",
        "description": "Time of day to run backups (24h format, UTC)",
        "category": "backup",
    },
    {
        "key": "backup_retention_days",
        "value": "30",
        "description": "Number of days to retain backup files",
        "category": "backup",
    },
    {
        "key": "backup_encryption",
        "value": "true",
        "description": "Encrypt backup files before storage",
        "category": "backup",
    },
    {
        "key": "backup_compression",
        "value": "true",
        "description": "Compress backup files to reduce storage",
        "category": "backup",
    },
    {
        "key": "backup_verify_after",
        "value": "true",
        "description": "Verify backup integrity after creation",
        "category": "backup",
    },
    {
        "key": "backup_include_media",
        "value": "true",
        "description": "Include uploaded media files in backups",
        "category": "backup",
    },
    {
        "key": "backup_s3_bucket",
        "value": "loyallia-backups",
        "description": "S3 bucket name for backup storage",
        "category": "backup",
    },
    {
        "key": "backup_notify_email",
        "value": "admin@loyallia.com",
        "description": "Email address for backup notifications",
        "category": "backup",
    },
]

# URL settings
_URL_SETTINGS = [
    {
        "key": "api_base_url",
        "value": "https://rewards.loyallia.com/api/v1/",
        "description": "Base URL for the Loyallia API",
        "category": "url",
    },
    {
        "key": "dashboard_url",
        "value": "https://rewards.loyallia.com",
        "description": "Main dashboard / frontend URL",
        "category": "url",
    },
    {
        "key": "webhook_base_url",
        "value": "https://rewards.loyallia.com/api/v1/webhooks/",
        "description": "Base URL for incoming webhooks",
        "category": "url",
    },
    {
        "key": "wallet_web_service_url",
        "value": "https://rewards.loyallia.com/api/v1/pass/",
        "description": "Apple/Google Wallet webServiceURL base",
        "category": "url",
    },
    {
        "key": "scanner_url",
        "value": "https://rewards.loyallia.com/scanner",
        "description": "QR code scanner web app URL",
        "category": "url",
    },
]

# Notification settings
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
        "key": "sms_default_sender",
        "value": "Loyallia",
        "description": "Default sender ID for SMS messages",
        "category": "notification",
    },
    {
        "key": "push_notification_ttl",
        "value": "86400",
        "description": "Push notification time-to-live in seconds (24h default)",
        "category": "notification",
    },
]

# Rate limit & security settings
_RATE_LIMIT_SETTINGS = [
    {
        "key": "api_rate_limit_per_minute",
        "value": "60",
        "description": "Maximum API requests per minute per client",
        "category": "rate_limit",
    },
    {
        "key": "max_upload_file_size_mb",
        "value": "10",
        "description": "Maximum upload file size in megabytes",
        "category": "rate_limit",
    },
    {
        "key": "max_bulk_import_rows",
        "value": "10000",
        "description": "Maximum rows per bulk import operation",
        "category": "rate_limit",
    },
    {
        "key": "session_timeout_minutes",
        "value": "60",
        "description": "User session timeout in minutes",
        "category": "rate_limit",
    },
    {
        "key": "password_expiry_days",
        "value": "90",
        "description": "Number of days before password must be changed",
        "category": "rate_limit",
    },
    {
        "key": "min_password_length",
        "value": "12",
        "description": "Minimum password length for all users",
        "category": "rate_limit",
    },
]

# Worker settings
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

# Flatten all setting groups (legacy loaded from fixture)
ALL_DEFAULTS = (
    _SYSTEM_MODE_SETTINGS
    + _BACKUP_SETTINGS
    + _URL_SETTINGS
    + _NOTIFICATION_SETTINGS
    + _RATE_LIMIT_SETTINGS
    + _WORKER_SETTINGS
)

# Mode-specific overrides
_MODE_OVERRIDES = {
    "development": {
        "development_mode": "true",
        "sandbox_webhooks": "true",
        "api_base_url": "http://localhost:8000/api/v1/",
        "dashboard_url": "http://localhost:3000",
        "webhook_base_url": "http://localhost:8000/api/v1/webhooks/",
        "wallet_web_service_url": "http://localhost:8000/api/v1/pass/",
        "scanner_url": "http://localhost:3000/scanner",
    },
    "production": {
        "development_mode": "false",
        "sandbox_webhooks": "true",
    },
}


def _load_legacy_fixture():
    """Load the 3 legacy platform settings from canonical JSON fixture."""
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

        # Apply mode overrides to existing settings ONLY if --update-existing
        if update_existing:
            for key, value in overrides.items():
                try:
                    setting = PlatformSetting.objects.get(key=key)
                    if setting.value != value:
                        old = setting.value
                        setting.value = value
                        setting.save(update_fields=["value", "updated_at"])
                        self.stdout.write(
                            self.style.WARNING(f"Updated: {key} = {value} (was {old})")
                        )
                        updated_count += 1
                except PlatformSetting.DoesNotExist:
                    pass

        self.stdout.write(
            self.style.SUCCESS(
                f"\nDone [{mode}]. "
                f"{created_count} created, "
                f"{updated_count} updated, "
                f"{skipped_count} skipped."
            )
        )
