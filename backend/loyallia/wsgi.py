"""
Loyallia WSGI configuration.
"""

import os

from django.core.wsgi import get_wsgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "loyallia.settings.development")

# LYL-L-INFRA-034: Validate required environment variables on startup
from common.env_validation import check_or_die

check_or_die(is_production=not os.environ.get("DEBUG", "").lower() in ("true", "1", "yes"))

application = get_wsgi_application()
