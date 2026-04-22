"""
Loyallia — Logging Utilities
Structured JSON log formatter for production log aggregation.
Falls back to standard text formatting if JSON dependencies are unavailable.
"""

import json
import logging
import traceback
from datetime import datetime, timezone


class JsonFormatter(logging.Formatter):
    """
    Structured JSON log formatter.

    Output format:
    {"timestamp": "...", "level": "INFO", "logger": "apps.auth", "message": "...", "module": "api", "line": 42}

    Includes exception traceback as 'exc_info' field when present.
    Compatible with ELK, CloudWatch, Datadog, and Loki log aggregators.
    """

    def format(self, record: logging.LogRecord) -> str:
        log_entry = {
            "timestamp": datetime.fromtimestamp(
                record.created, tz=timezone.utc
            ).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "line": record.lineno,
            "process": record.process,
            "thread": record.thread,
        }

        # Include exception info if present
        if record.exc_info and record.exc_info[0] is not None:
            log_entry["exc_info"] = traceback.format_exception(*record.exc_info)

        # Include extra fields if any
        for key in ("request_id", "tenant_id", "user_id", "ip", "path"):
            if hasattr(record, key):
                log_entry[key] = getattr(record, key)

        return json.dumps(log_entry, default=str, ensure_ascii=False)
