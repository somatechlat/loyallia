"""
Loyallia — Logging Utilities
Structured JSON log formatter for production log aggregation.
Falls back to standard text formatting if JSON dependencies are unavailable.

LYL-L-ARCH-036: PII masking — email addresses and phone numbers are redacted
in log output to comply with LOPDP (Ecuador data protection) requirements.
LYL-M-ARCH-021: JSON format in production, verbose in dev (configured in settings).
"""

import json
import logging
import re
import traceback
from datetime import datetime, timezone

# Regex patterns for PII detection
_EMAIL_RE = re.compile(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}")
_PHONE_RE = re.compile(r"\+?\d[\d\s\-]{7,}\d")


def mask_pii(text: str) -> str:
    """Mask PII (emails, phone numbers) in log messages.

    Emails: j***@example.com (keep first char + domain)
    Phones: +593***1234 (keep first 3 + last 4 digits)
    """
    # Mask emails: show first char + @domain
    def _mask_email(match: re.Match) -> str:
        addr = match.group(0)
        local, _, domain = addr.partition("@")
        if len(local) <= 1:
            return f"*@{domain}"
        return f"{local[0]}***@{domain}"

    text = _EMAIL_RE.sub(_mask_email, text)

    # Mask phone numbers: keep first 3 and last 4 digits
    def _mask_phone(match: re.Match) -> str:
        phone = match.group(0)
        digits = re.sub(r"[^\d]", "", phone)
        if len(digits) <= 7:
            return "***"
        return f"{phone[:3]}***{phone[-4:]}"

    text = _PHONE_RE.sub(_mask_phone, text)
    return text


class JsonFormatter(logging.Formatter):
    """
    Structured JSON log formatter.

    Output format:
    {"timestamp": "...", "level": "INFO", "logger": "apps.auth", "message": "...", "module": "api", "line": 42}

    Includes exception traceback as 'exc_info' field when present.
    Compatible with ELK, CloudWatch, Datadog, and Loki log aggregators.

    LYL-L-ARCH-036: All log messages pass through PII masking.
    """

    def format(self, record: logging.LogRecord) -> str:
        raw_message = record.getMessage()
        masked_message = mask_pii(raw_message)

        log_entry = {
            "timestamp": datetime.fromtimestamp(
                record.created, tz=timezone.utc
            ).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": masked_message,
            "module": record.module,
            "line": record.lineno,
            "process": record.process,
            "thread": record.thread,
        }

        # Include exception info if present (also mask PII)
        if record.exc_info and record.exc_info[0] is not None:
            exc_text = traceback.format_exception(*record.exc_info)
            log_entry["exc_info"] = [mask_pii(line) for line in exc_text]

        # Include extra fields if any
        for key in ("request_id", "tenant_id", "user_id", "ip", "path"):
            if hasattr(record, key):
                log_entry[key] = getattr(record, key)

        return json.dumps(log_entry, default=str, ensure_ascii=False)
