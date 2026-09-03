"""
Loyallia Centralized Constants (loyallia/settings/constants.py)

ALL tunable runtime values live here as Django settings.
No hardcoded numbers, timeouts, limits, or dimensions in production code.

Every value below has a safe default and may be overridden via
environment variable or Vault secret. The naming convention is:
  LOYALLIA_<CATEGORY>_<NAME>
"""

from decouple import config

# ═══════════════════════════════════════════════════════════════════════════════
# 1. CACHE / REDIS TTLs (seconds)
# ═══════════════════════════════════════════════════════════════════════════════

CACHE_TTL_PKPASS = config("LOYALLIA_CACHE_TTL_PKPASS", default=86_400, cast=int)  # 24h
CACHE_TTL_PKPASS_ERROR = config("LOYALLIA_CACHE_TTL_PKPASS_ERROR", default=300, cast=int)  # 5m
CACHE_TTL_FACTORY_RESET_SID = config("LOYALLIA_CACHE_TTL_FACTORY_RESET_SID", default=300, cast=int)
CACHE_TTL_IMPERSONATION_REVOKED = config("LOYALLIA_CACHE_TTL_IMPERSONATION_REVOKED", default=3_600, cast=int)
CACHE_TTL_HEALTH_CHECK = config("LOYALLIA_CACHE_TTL_HEALTH_CHECK", default=5, cast=int)
CACHE_TTL_BACKUP_SETTINGS = config("LOYALLIA_CACHE_TTL_BACKUP_SETTINGS", default=60, cast=int)
CACHE_TTL_PHONE_VERIFY_RATE = config("LOYALLIA_CACHE_TTL_PHONE_VERIFY_RATE", default=600, cast=int)
CACHE_TTL_OTP = config("LOYALLIA_CACHE_TTL_OTP", default=900, cast=int)  # 15m

# ═══════════════════════════════════════════════════════════════════════════════
# 2. HTTP / API TIMEOUTS (seconds)
# ═══════════════════════════════════════════════════════════════════════════════

HTTP_TIMEOUT_GOOGLE_WALLET = config("LOYALLIA_HTTP_TIMEOUT_GOOGLE_WALLET", default=10.0, cast=float)
HTTP_TIMEOUT_APPLE_WALLET = config("LOYALLIA_HTTP_TIMEOUT_APPLE_WALLET", default=10.0, cast=float)
HTTP_TIMEOUT_APPLE_PUSH = config("LOYALLIA_HTTP_TIMEOUT_APPLE_PUSH", default=10.0, cast=float)
HTTP_TIMEOUT_AI_PROXY = config("LOYALLIA_HTTP_TIMEOUT_AI_PROXY", default=30.0, cast=float)
HTTP_TIMEOUT_HEALTH_CHECK_CELERY = config("LOYALLIA_HTTP_TIMEOUT_HEALTH_CHECK_CELERY", default=2.0, cast=float)
HTTP_TIMEOUT_AUTOMATION_WEBHOOK = config("LOYALLIA_HTTP_TIMEOUT_AUTOMATION_WEBHOOK", default=30, cast=int)
HTTP_TIMEOUT_BACKUP_CLI = config("LOYALLIA_HTTP_TIMEOUT_BACKUP_CLI", default=900, cast=int)
HTTP_TIMEOUT_BACKUP_CLI_SHORT = config("LOYALLIA_HTTP_TIMEOUT_BACKUP_CLI_SHORT", default=300, cast=int)
HTTP_TIMEOUT_BACKUP_RESTORE = config("LOYALLIA_HTTP_TIMEOUT_BACKUP_RESTORE", default=3_600, cast=int)
HTTP_TIMEOUT_AUTH_EXTERNAL = config("LOYALLIA_HTTP_TIMEOUT_AUTH_EXTERNAL", default=10.0, cast=float)
HTTP_TIMEOUT_AUTH_USERS_API = config("LOYALLIA_HTTP_TIMEOUT_AUTH_USERS_API", default=300, cast=int)
HTTP_TIMEOUT_VAULT_READ = config("LOYALLIA_HTTP_TIMEOUT_VAULT_READ", default=5, cast=int)
HTTP_TIMEOUT_VAULT_WRITE = config("LOYALLIA_HTTP_TIMEOUT_VAULT_WRITE", default=5, cast=int)
HTTP_TIMEOUT_APNS = config("LOYALLIA_HTTP_TIMEOUT_APNS", default=10.0, cast=float)
HTTP_TIMEOUT_WWDR_DOWNLOAD = config("LOYALLIA_HTTP_TIMEOUT_WWDR_DOWNLOAD", default=10, cast=int)

# ═══════════════════════════════════════════════════════════════════════════════
# 3. CELERY TASK SETTINGS
# ═══════════════════════════════════════════════════════════════════════════════

CELERY_MAX_RETRIES_DEFAULT = config("LOYALLIA_CELERY_MAX_RETRIES_DEFAULT", default=3, cast=int)
CELERY_MAX_RETRIES_LOW = config("LOYALLIA_CELERY_MAX_RETRIES_LOW", default=2, cast=int)
CELERY_MAX_RETRIES_MINIMAL = config("LOYALLIA_CELERY_MAX_RETRIES_MINIMAL", default=1, cast=int)

CELERY_DEFAULT_RETRY_DELAY_SHORT = config("LOYALLIA_CELERY_DEFAULT_RETRY_DELAY_SHORT", default=30, cast=int)
CELERY_DEFAULT_RETRY_DELAY_MEDIUM = config("LOYALLIA_CELERY_DEFAULT_RETRY_DELAY_MEDIUM", default=60, cast=int)

CELERY_TIME_LIMIT_BACKUP_STANDARD = config("LOYALLIA_CELERY_TIME_LIMIT_BACKUP_STANDARD", default=900, cast=int)
CELERY_SOFT_TIME_LIMIT_BACKUP_STANDARD = config(
    "LOYALLIA_CELERY_SOFT_TIME_LIMIT_BACKUP_STANDARD", default=840, cast=int
)
CELERY_TIME_LIMIT_BACKUP_SHORT = config("LOYALLIA_CELERY_TIME_LIMIT_BACKUP_SHORT", default=300, cast=int)
CELERY_TIME_LIMIT_BACKUP_LONG = config("LOYALLIA_CELERY_TIME_LIMIT_BACKUP_LONG", default=1_800, cast=int)
CELERY_TIME_LIMIT_BACKUP_MEDIUM = config("LOYALLIA_CELERY_TIME_LIMIT_BACKUP_MEDIUM", default=600, cast=int)
CELERY_TIME_LIMIT_BACKUP_RESTORE = config("LOYALLIA_CELERY_TIME_LIMIT_BACKUP_RESTORE", default=3_600, cast=int)

CELERY_TIME_LIMIT_NOTIFICATIONS_CAMPAIGN = config(
    "LOYALLIA_CELERY_TIME_LIMIT_NOTIFICATIONS_CAMPAIGN", default=660, cast=int
)
CELERY_SOFT_TIME_LIMIT_NOTIFICATIONS_CAMPAIGN = config(
    "LOYALLIA_CELERY_SOFT_TIME_LIMIT_NOTIFICATIONS_CAMPAIGN", default=600, cast=int
)
CELERY_TIME_LIMIT_NOTIFICATIONS_CAMPAIGN_LARGE = config(
    "LOYALLIA_CELERY_TIME_LIMIT_NOTIFICATIONS_CAMPAIGN_LARGE", default=3_660, cast=int
)
CELERY_SOFT_TIME_LIMIT_NOTIFICATIONS_CAMPAIGN_LARGE = config(
    "LOYALLIA_CELERY_SOFT_TIME_LIMIT_NOTIFICATIONS_CAMPAIGN_LARGE",
    default=3_600,
    cast=int,
)
CELERY_TIME_LIMIT_NOTIFICATIONS_EMAIL = config("LOYALLIA_CELERY_TIME_LIMIT_NOTIFICATIONS_EMAIL", default=660, cast=int)
CELERY_SOFT_TIME_LIMIT_NOTIFICATIONS_EMAIL = config(
    "LOYALLIA_CELERY_SOFT_TIME_LIMIT_NOTIFICATIONS_EMAIL", default=600, cast=int
)
CELERY_TIME_LIMIT_NOTIFICATIONS_SMS = config("LOYALLIA_CELERY_TIME_LIMIT_NOTIFICATIONS_SMS", default=1_860, cast=int)
CELERY_SOFT_TIME_LIMIT_NOTIFICATIONS_SMS = config(
    "LOYALLIA_CELERY_SOFT_TIME_LIMIT_NOTIFICATIONS_SMS", default=1_800, cast=int
)
CELERY_TIME_LIMIT_NOTIFICATIONS_WHATSAPP = config(
    "LOYALLIA_CELERY_TIME_LIMIT_NOTIFICATIONS_WHATSAPP", default=360, cast=int
)
CELERY_SOFT_TIME_LIMIT_NOTIFICATIONS_WHATSAPP = config(
    "LOYALLIA_CELERY_SOFT_TIME_LIMIT_NOTIFICATIONS_WHATSAPP", default=300, cast=int
)

# ═══════════════════════════════════════════════════════════════════════════════
# 4. BATCH SIZES, CHUNK SIZES, LIMITS
# ═══════════════════════════════════════════════════════════════════════════════

BULK_CREATE_BATCH_SIZE = config("LOYALLIA_BULK_CREATE_BATCH_SIZE", default=500, cast=int)
ITERATOR_CHUNK_SIZE_DEFAULT = config("LOYALLIA_ITERATOR_CHUNK_SIZE_DEFAULT", default=100, cast=int)
ITERATOR_CHUNK_SIZE_SMALL = config("LOYALLIA_ITERATOR_CHUNK_SIZE_SMALL", default=50, cast=int)
CSV_CHUNK_SIZE = config("LOYALLIA_CSV_CHUNK_SIZE", default=500, cast=int)

API_LIMIT_SEARCH_DEFAULT = config("LOYALLIA_API_LIMIT_SEARCH_DEFAULT", default=10, cast=int)
API_LIMIT_TRANSACTIONS_DEFAULT = config("LOYALLIA_API_LIMIT_TRANSACTIONS_DEFAULT", default=50, cast=int)

# ═══════════════════════════════════════════════════════════════════════════════
# 5. PASS ENGINE DIMENSIONS & VALUES
# ═══════════════════════════════════════════════════════════════════════════════

PASS_MAX_DISTANCE_METERS = config("LOYALLIA_PASS_MAX_DISTANCE_METERS", default=100, cast=int)
PASS_QR_MAX_AGE_SECONDS = config("LOYALLIA_PASS_QR_MAX_AGE_SECONDS", default=86_400, cast=int)
PASS_QR_CLOCK_SKEW_SECONDS = config("LOYALLIA_PASS_QR_CLOCK_SKEW_SECONDS", default=300, cast=int)
PASS_QR_BOX_SIZE = config("LOYALLIA_PASS_QR_BOX_SIZE", default=10, cast=int)
PASS_QR_BORDER = config("LOYALLIA_PASS_QR_BORDER", default=4, cast=int)

PASS_IMAGE_MAX_DOWNLOAD_BYTES = config("LOYALLIA_PASS_IMAGE_MAX_DOWNLOAD_BYTES", default=5_242_880, cast=int)  # 5 MiB

# Apple Wallet placeholder image dimensions (points)
PASS_APPLE_ICON_SIZE = config("LOYALLIA_PASS_APPLE_ICON_SIZE", default=87, cast=int)
PASS_APPLE_ICON_SMALL = config("LOYALLIA_PASS_APPLE_ICON_SMALL", default=29, cast=int)
PASS_APPLE_ICON_MEDIUM = config("LOYALLIA_PASS_APPLE_ICON_MEDIUM", default=58, cast=int)
PASS_APPLE_LOGO_WIDTH = config("LOYALLIA_PASS_APPLE_LOGO_WIDTH", default=160, cast=int)
PASS_APPLE_LOGO_HEIGHT = config("LOYALLIA_PASS_APPLE_LOGO_HEIGHT", default=50, cast=int)
PASS_APPLE_LOGO_2X_WIDTH = config("LOYALLIA_PASS_APPLE_LOGO_2X_WIDTH", default=320, cast=int)
PASS_APPLE_LOGO_2X_HEIGHT = config("LOYALLIA_PASS_APPLE_LOGO_2X_HEIGHT", default=100, cast=int)
PASS_APPLE_STRIP_WIDTH = config("LOYALLIA_PASS_APPLE_STRIP_WIDTH", default=375, cast=int)
PASS_APPLE_STRIP_HEIGHT = config("LOYALLIA_PASS_APPLE_STRIP_HEIGHT", default=123, cast=int)
PASS_APPLE_STRIP_2X_WIDTH = config("LOYALLIA_PASS_APPLE_STRIP_2X_WIDTH", default=750, cast=int)
PASS_APPLE_STRIP_2X_HEIGHT = config("LOYALLIA_PASS_APPLE_STRIP_2X_HEIGHT", default=246, cast=int)

PASS_APPLE_DEFAULT_BARCODE = config("LOYALLIA_PASS_APPLE_DEFAULT_BARCODE", default="iso-8859-1")
PASS_APPLE_NFC_MESSAGE_MAX_BYTES = config("LOYALLIA_PASS_APPLE_NFC_MESSAGE_MAX_BYTES", default=64, cast=int)

# Google Wallet
PASS_GOOGLE_BUNDLE_SIZE_DEFAULT = config("LOYALLIA_PASS_GOOGLE_BUNDLE_SIZE_DEFAULT", default=10, cast=int)
PASS_GOOGLE_CASHBACK_DEFAULT_PCT = config("LOYALLIA_PASS_GOOGLE_CASHBACK_DEFAULT_PCT", default=10, cast=int)
PASS_GOOGLE_GIFTCARD_MICROS_MULTIPLIER = config(
    "LOYALLIA_PASS_GOOGLE_GIFTCARD_MICROS_MULTIPLIER", default=1_000_000, cast=int
)
PASS_GOOGLE_QR_TRUNCATE_LENGTH = config("LOYALLIA_PASS_GOOGLE_QR_TRUNCATE_LENGTH", default=10, cast=int)
PASS_GOOGLE_MAX_LOCATIONS = config("LOYALLIA_PASS_GOOGLE_MAX_LOCATIONS", default=10, cast=int)

# Generic placeholder colors
PASS_PLACEHOLDER_BG_COLOR = config("LOYALLIA_PASS_PLACEHOLDER_BG_COLOR", default="#5660ff")
PASS_PLACEHOLDER_FALLBACK_RGB = config("LOYALLIA_PASS_PLACEHOLDER_FALLBACK_RGB", default="rgb(26, 26, 46)")

# ═══════════════════════════════════════════════════════════════════════════════
# 6. AUTH / OTP SETTINGS
# ═══════════════════════════════════════════════════════════════════════════════

OTP_MAX_ATTEMPTS = config("LOYALLIA_OTP_MAX_ATTEMPTS", default=5, cast=int)

SLUG_MAX_LENGTH = config("LOYALLIA_SLUG_MAX_LENGTH", default=80, cast=int)
SLUG_MAX_ATTEMPTS = config("LOYALLIA_SLUG_MAX_ATTEMPTS", default=20, cast=int)
SLUG_FALLBACK_UUID_LEN = config("LOYALLIA_SLUG_FALLBACK_UUID_LEN", default=8, cast=int)

# ═══════════════════════════════════════════════════════════════════════════════
# 7. CUSTOMER SERVICE VALIDATION LIMITS
# ═══════════════════════════════════════════════════════════════════════════════

CUSTOMER_PHONE_MAX_LENGTH = config("LOYALLIA_CUSTOMER_PHONE_MAX_LENGTH", default=20, cast=int)
CUSTOMER_NOTES_MAX_LENGTH = config("LOYALLIA_CUSTOMER_NOTES_MAX_LENGTH", default=2_000, cast=int)

# ═══════════════════════════════════════════════════════════════════════════════
# 8. PUSH / NOTIFICATION SETTINGS
# ═══════════════════════════════════════════════════════════════════════════════

APNS_HTTP2_TIMEOUT = config("LOYALLIA_APNS_HTTP2_TIMEOUT", default=10.0, cast=float)

# ═══════════════════════════════════════════════════════════════════════════════
# 9. BACKUP / RESTORE SETTINGS
# ═══════════════════════════════════════════════════════════════════════════════

BACKUP_VAULT_TIMEOUT = config("LOYALLIA_BACKUP_VAULT_TIMEOUT", default=15, cast=int)

# ═══════════════════════════════════════════════════════════════════════════════
# 10. ANALYTICS / AUTOMATION
# ═══════════════════════════════════════════════════════════════════════════════

AUTOMATION_INACTIVE_DAYS_DEFAULT = config("LOYALLIA_AUTOMATION_INACTIVE_DAYS_DEFAULT", default=30, cast=int)
NOTIFICATION_INACTIVE_REMINDER_DAYS = config("LOYALLIA_NOTIFICATION_INACTIVE_REMINDER_DAYS", default=30, cast=int)

# ═══════════════════════════════════════════════════════════════════════════════
# 11. MINIO / STORAGE
# ═══════════════════════════════════════════════════════════════════════════════

MINIO_REGION_NAME = config("LOYALLIA_MINIO_REGION_NAME", default="us-east-1")

# ═══════════════════════════════════════════════════════════════════════════════
# 12. IMPORT / UPLOAD LIMITS
# ═══════════════════════════════════════════════════════════════════════════════

IMPORT_MAX_FILE_SIZE_BYTES = config("LOYALLIA_IMPORT_MAX_FILE_SIZE_BYTES", default=10_485_760, cast=int)  # 10 MiB
IMPORT_MAX_ROWS = config("LOYALLIA_IMPORT_MAX_ROWS", default=50_000, cast=int)
CARD_METADATA_MAX_SIZE_BYTES = config("LOYALLIA_CARD_METADATA_MAX_SIZE_BYTES", default=10_240, cast=int)  # 10 KiB

# ═══════════════════════════════════════════════════════════════════════════════
# 13. DATA EXPORT
# ═══════════════════════════════════════════════════════════════════════════════

DATA_EXPORT_AUDIT_LOG_LIMIT = config("LOYALLIA_DATA_EXPORT_AUDIT_LOG_LIMIT", default=5_000, cast=int)

# ═══════════════════════════════════════════════════════════════════════════════
# 14. AUTH RATE LIMITING
# ═══════════════════════════════════════════════════════════════════════════════

AUTH_RATE_LIMIT_CACHE_TTL = config("LOYALLIA_AUTH_RATE_LIMIT_CACHE_TTL", default=3_600, cast=int)  # 1 hour
AUTH_PWD_RESET_MAX_ATTEMPTS = config("LOYALLIA_AUTH_PWD_RESET_MAX_ATTEMPTS", default=3, cast=int)
AUTH_GOOGLE_OAUTH_MAX_ATTEMPTS = config("LOYALLIA_AUTH_GOOGLE_OAUTH_MAX_ATTEMPTS", default=20, cast=int)

# ═══════════════════════════════════════════════════════════════════════════════
# 15. OTP SETTINGS
# ═══════════════════════════════════════════════════════════════════════════════

OTP_TTL_SECONDS = config("LOYALLIA_OTP_TTL_SECONDS", default=300, cast=int)  # 5 minutes
OTP_MAX_ATTEMPTS = config("LOYALLIA_OTP_MAX_ATTEMPTS", default=3, cast=int)

# ═══════════════════════════════════════════════════════════════════════════════
# 16. WHATSAPP
# ═══════════════════════════════════════════════════════════════════════════════

WHATSAPP_COOLDOWN_SECONDS = config("LOYALLIA_WHATSAPP_COOLDOWN_SECONDS", default=3_600, cast=int)  # 1 hour

# ═══════════════════════════════════════════════════════════════════════════════
# 17. RATE LIMITING
# ═══════════════════════════════════════════════════════════════════════════════

ENROLL_RATE_LIMIT_MAX_REQUESTS = config("LOYALLIA_ENROLL_RATE_LIMIT_MAX_REQUESTS", default=10, cast=int)
ENROLL_RATE_LIMIT_WINDOW_SECONDS = config("LOYALLIA_ENROLL_RATE_LIMIT_WINDOW_SECONDS", default=3_600, cast=int)

# ═══════════════════════════════════════════════════════════════════════════════
# 18. CELERY RETRY DELAYS
# ═══════════════════════════════════════════════════════════════════════════════

CELERY_DEFAULT_RETRY_DELAY_LONG = config("LOYALLIA_CELERY_DEFAULT_RETRY_DELAY_LONG", default=120, cast=int)

CELERY_DEFAULT_RETRY_DELAY_EXTRA_LONG = config("LOYALLIA_CELERY_DEFAULT_RETRY_DELAY_EXTRA_LONG", default=300, cast=int)

# ═══════════════════════════════════════════════════════════════════════════════
# 19. ADDITIONAL RATE LIMITING
# ═══════════════════════════════════════════════════════════════════════════════

RESEND_PASS_EMAIL_RATE_LIMIT_MAX = config("LOYALLIA_RESEND_PASS_EMAIL_RATE_LIMIT_MAX", default=3, cast=int)
RESEND_PASS_EMAIL_RATE_LIMIT_WINDOW = config("LOYALLIA_RESEND_PASS_EMAIL_RATE_LIMIT_WINDOW", default=3_600, cast=int)
PORTAL_PASSWORD_RATE_LIMIT_MAX = config("LOYALLIA_PORTAL_PASSWORD_RATE_LIMIT_MAX", default=3, cast=int)
PORTAL_PASSWORD_RATE_LIMIT_WINDOW = config("LOYALLIA_PORTAL_PASSWORD_RATE_LIMIT_WINDOW", default=3_600, cast=int)
PHONE_VERIFY_RATE_LIMIT_MAX = config("LOYALLIA_PHONE_VERIFY_RATE_LIMIT_MAX", default=5, cast=int)
PHONE_VERIFY_RATE_LIMIT_WINDOW = config("LOYALLIA_PHONE_VERIFY_RATE_LIMIT_WINDOW", default=900, cast=int)
FORGOT_PASSWORD_RATE_LIMIT_MAX = config("LOYALLIA_FORGOT_PASSWORD_RATE_LIMIT_MAX", default=5, cast=int)
FORGOT_PASSWORD_RATE_LIMIT_WINDOW = config("LOYALLIA_FORGOT_PASSWORD_RATE_LIMIT_WINDOW", default=3_600, cast=int)
SCANNER_VALIDATE_RATE_LIMIT_MAX = config("LOYALLIA_SCANNER_VALIDATE_RATE_LIMIT_MAX", default=120, cast=int)
SCANNER_VALIDATE_RATE_LIMIT_WINDOW = config("LOYALLIA_SCANNER_VALIDATE_RATE_LIMIT_WINDOW", default=60, cast=int)
SCANNER_TRANSACT_RATE_LIMIT_MAX = config("LOYALLIA_SCANNER_TRANSACT_RATE_LIMIT_MAX", default=120, cast=int)
SCANNER_TRANSACT_RATE_LIMIT_WINDOW = config("LOYALLIA_SCANNER_TRANSACT_RATE_LIMIT_WINDOW", default=60, cast=int)
STRIPE_WEBHOOK_RATE_LIMIT_MAX = config("LOYALLIA_STRIPE_WEBHOOK_RATE_LIMIT_MAX", default=100, cast=int)
STRIPE_WEBHOOK_RATE_LIMIT_WINDOW = config("LOYALLIA_STRIPE_WEBHOOK_RATE_LIMIT_WINDOW", default=60, cast=int)
