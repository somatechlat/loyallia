"""
Loyallia Django Settings  DEVELOPMENT
Inherits from base. Enables DEBUG, relaxed CORS, console email.

LOCAL GOOGLE OAUTH SETUP:
  1. Create a separate OAuth 2.0 Client ID at Google Cloud Console
     (do NOT reuse the production client for security).
  2. Add these to the dev client:
        Authorized JS origins: http://localhost:3000
        Authorized redirect URIs: http://localhost:33905/api/v1/auth/google/callback/
  3. Set in your local .env or Vault:
        GOOGLE_OAUTH_CLIENT_ID=<your-dev-client-id>
        GOOGLE_OAUTH_CLIENT_SECRET=<your-dev-client-secret>
"""

from .base import *  # noqa: F401, F403

DEBUG = True
ALLOWED_HOSTS = ["*"]

from common.environment_guard import enforce_settings_environment  # noqa: E402

enforce_settings_environment(mode="development", databases=DATABASES)  # noqa: F405

# Email via Mailjet SMTP in development (real emails for testing wallet/card flows)
EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"

# Relaxed CORS in development
CORS_ALLOW_ALL_ORIGINS = True

# Show SQL queries in development (set to WARNING in production)
import logging  # noqa: E402

logging.getLogger("django.db.backends").setLevel(logging.DEBUG)

# Django extensions (shell_plus, etc.)
if "django_extensions" not in INSTALLED_APPS:  # noqa: F405
    INSTALLED_APPS += ["django_extensions"]  # noqa: F405

# Use local file storage instead of MinIO in development (optional)
# Uncomment to use local files instead of MinIO:
# STORAGES = {
# "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
# "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"},
# }

# Feature flags (NOT secrets — these are system-wide settings)
TWILIO_USE_TEST_MODE = True
