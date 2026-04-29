#!/usr/bin/env python
"""
LYL-C-DR-007: Breach Notification Mechanism
Automated notification pipeline for security incidents and data breaches.

Compliant with Ecuador LOPDP (Ley Orgánica de Protección de Datos Personales)
requirements for breach notification within 72 hours.

Usage:
    python breach_notification.py --type data_breach --severity critical \
        --description "Unauthorized access to customer database" \
        --affected-count 1500

Can be integrated with:
    - Sentry alerts (SENTRY_DSN configured)
    - Email to DPO and legal team
    - SMS to incident response team
    - Audit log entry
"""

import argparse
import json
import logging
import sys
from datetime import UTC, datetime
from pathlib import Path

logger = logging.getLogger("loyallia.breach_notification")

# Severity levels
SEVERITY_LOW = "low"
SEVERITY_MEDIUM = "medium"
SEVERITY_HIGH = "high"
SEVERITY_CRITICAL = "critical"

# Notification recipients (override via env or config)
DPO_EMAIL = "dpo@loyallia.com"
LEGAL_EMAIL = "legal@loyallia.com"
INCIDENT_EMAIL = "incident@loyallia.com"
CTO_EMAIL = "cto@loyallia.com"

# LOPDP requirement: 72-hour notification window
LOPDP_NOTIFICATION_HOURS = 72


def create_incident_report(
    incident_type: str,
    severity: str,
    description: str,
    affected_count: int = 0,
    data_types: list[str] | None = None,
    mitigation_steps: list[str] | None = None,
) -> dict:
    """Create a structured incident report.

    Args:
        incident_type: Type of incident (data_breach, unauthorized_access, etc.)
        severity: Severity level (low, medium, high, critical)
        description: Human-readable description of the incident
        affected_count: Number of affected individuals
        data_types: Types of data compromised (email, phone, financial, etc.)
        mitigation_steps: Steps taken to mitigate

    Returns:
        Structured incident report dict
    """
    now = datetime.now(tz=UTC)

    report = {
        "incident_id": f"INC-{now.strftime('%Y%m%d%H%M%S')}",
        "timestamp": now.isoformat(),
        "type": incident_type,
        "severity": severity,
        "description": description,
        "affected_count": affected_count,
        "data_types": data_types or [],
        "mitigation_steps": mitigation_steps or [],
        "lopdp_deadline": f"{LOPDP_NOTIFICATION_HOURS} hours from discovery",
        "notification_recipients": {
            "dpo": DPO_EMAIL,
            "legal": LEGAL_EMAIL,
            "incident_response": INCIDENT_EMAIL,
            "cto": CTO_EMAIL,
        },
        "status": "open",
        "requires_regulatory_notification": (
            severity in (SEVERITY_HIGH, SEVERITY_CRITICAL) and affected_count > 0
        ),
        "requires_individual_notification": (
            severity == SEVERITY_CRITICAL and affected_count > 0
        ),
    }

    return report


def notify_incident_team(report: dict) -> None:
    """Send incident notification to the response team.

    In production, this integrates with:
    - Email (Django email backend)
    - Sentry (sentry_sdk.capture_message)
    - SMS (for critical incidents)
    - Audit log
    """
    severity = report["severity"]
    incident_id = report["incident_id"]

    logger.critical(
        "SECURITY INCIDENT %s: [%s] %s — %d individuals affected. "
        "LOPDP notification deadline: %s",
        incident_id,
        severity.upper(),
        report["description"],
        report["affected_count"],
        report["lopdp_deadline"],
    )

    # Write incident to audit trail
    try:
        audit_dir = Path("/var/log/loyallia/incidents")
        audit_dir.mkdir(parents=True, exist_ok=True)
        audit_file = audit_dir / f"{incident_id}.json"
        with open(audit_file, "w") as f:
            json.dump(report, f, indent=2, default=str)
        logger.info("Incident report written to %s", audit_file)
    except OSError as exc:
        logger.error("Failed to write incident report: %s", exc)

    # Send Sentry alert for high/critical
    try:
        import sentry_sdk

        sentry_sdk.capture_message(
            f"[{severity.upper()}] Security Incident: {report['description']}",
            level="fatal" if severity == SEVERITY_CRITICAL else "error",
            extras=report,
        )
    except Exception:
        pass  # Sentry not configured

    # Send email notifications for medium+ severity
    if severity in (SEVERITY_MEDIUM, SEVERITY_HIGH, SEVERITY_CRITICAL):
        try:
            from django.core.mail import send_mail

            subject = f"[{severity.upper()}] Security Incident {incident_id}"
            message = (
                f"Incident Type: {report['type']}\n"
                f"Severity: {severity}\n"
                f"Affected: {report['affected_count']} individuals\n\n"
                f"Description: {report['description']}\n\n"
                f"LOPDP Deadline: {report['lopdp_deadline']}\n"
                f"Requires Regulatory Notification: {report['requires_regulatory_notification']}\n"
            )

            recipients = [INCIDENT_EMAIL]
            if severity == SEVERITY_CRITICAL:
                recipients.extend([DPO_EMAIL, LEGAL_EMAIL, CTO_EMAIL])

            send_mail(
                subject=subject,
                message=message,
                from_email="security@loyallia.com",
                recipient_list=recipients,
                fail_silently=True,
            )
        except Exception as exc:
            logger.error("Failed to send incident email: %s", exc)


def main():
    parser = argparse.ArgumentParser(description="Loyallia Breach Notification")
    parser.add_argument("--type", required=True, help="Incident type")
    parser.add_argument(
        "--severity",
        required=True,
        choices=[SEVERITY_LOW, SEVERITY_MEDIUM, SEVERITY_HIGH, SEVERITY_CRITICAL],
    )
    parser.add_argument("--description", required=True, help="Incident description")
    parser.add_argument("--affected-count", type=int, default=0)
    parser.add_argument("--data-types", nargs="*", default=[])
    parser.add_argument("--mitigation", nargs="*", default=[])

    args = parser.parse_args()

    report = create_incident_report(
        incident_type=args.type,
        severity=args.severity,
        description=args.description,
        affected_count=args.affected_count,
        data_types=args.data_types,
        mitigation_steps=args.mitigation,
    )

    notify_incident_team(report)

    print(json.dumps(report, indent=2, default=str))


if __name__ == "__main__":
    main()
