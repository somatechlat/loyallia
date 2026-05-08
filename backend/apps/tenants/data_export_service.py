"""
Loyallia — Full Tenant Data Export Service (LYL-FR-DPR-020)
LOPDP Art. 17 & 20: Right of Access / Data Portability.

Generates a ZIP containing ALL tenant data in JSON + CSV dual format.
Called by: tenants/api.py (GET /tenants/data-export/)
Called by: tenants/api.py (POST /tenants/delete-account/) — final export.
"""

from __future__ import annotations

import csv
import io
import json
import logging
import zipfile
from datetime import datetime

from django.db.models import QuerySet

logger = logging.getLogger("loyallia.data_export")


def _serialize_qs(qs: QuerySet, fields: list[str]) -> list[dict]:
    """Convert a QuerySet to a list of dicts with the given fields."""
    results = []
    for obj in qs.iterator():
        row: dict = {}
        for field in fields:
            val = getattr(obj, field, None)
            if hasattr(val, "isoformat"):
                val = val.isoformat()
            elif hasattr(val, "hex"):  # UUID
                val = str(val)
            elif isinstance(val, (dict, list)):
                pass  # keep as-is for JSON
            else:
                val = val if val is not None else ""
            row[field] = val
        results.append(row)
    return results


def _write_json(zf: zipfile.ZipFile, filename: str, data: list | dict) -> None:
    """Write a JSON file into the ZIP archive."""
    content = json.dumps(data, ensure_ascii=False, indent=2, default=str)
    zf.writestr(filename, content)


def _write_csv(zf: zipfile.ZipFile, filename: str, rows: list[dict]) -> None:
    """Write a CSV file into the ZIP archive."""
    if not rows:
        zf.writestr(filename, "")
        return
    buf = io.StringIO()
    writer = csv.DictWriter(buf, fieldnames=list(rows[0].keys()))
    writer.writeheader()
    writer.writerows(rows)
    zf.writestr(filename, buf.getvalue())


def generate_tenant_export(tenant) -> io.BytesIO:
    """
    Generate a complete ZIP export of ALL tenant data.
    Returns an in-memory BytesIO buffer with the ZIP.

    LYL-FR-DPR-020.1 through 020.11: All models exported.
    """
    from apps.authentication.models import User
    from apps.billing.models import Invoice, PaymentMethod, Subscription
    from apps.tenants.models import Location

    buf = io.BytesIO()
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")

    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        # ── 1. Metadata ────────────────────────────────────────────
        metadata = {
            "export_version": "1.0",
            "exported_at": datetime.now().isoformat(),
            "tenant_id": str(tenant.id),
            "tenant_name": tenant.name,
            "tenant_slug": tenant.slug,
            "format": "LOPDP Art. 17/20 compliant full export",
        }
        _write_json(zf, "_metadata.json", metadata)

        # ── 2. Tenant Info ─────────────────────────────────────────
        tenant_fields = [
            "id", "name", "slug", "plan", "is_active", "entity_type",
            "cedula", "legal_name", "ruc", "industry", "legal_rep_name",
            "legal_rep_cedula", "trial_end", "logo_url", "primary_color",
            "secondary_color", "country", "province", "city", "timezone",
            "phone", "email", "website", "address", "default_language",
            "created_at", "updated_at",
        ]
        tenant_data = {}
        for f in tenant_fields:
            val = getattr(tenant, f, None)
            tenant_data[f] = val.isoformat() if hasattr(val, "isoformat") else (str(val) if hasattr(val, "hex") else val)
        _write_json(zf, "tenant_info.json", tenant_data)

        # ── 3. Owner Profile ───────────────────────────────────────
        owner = User.objects.filter(tenant=tenant, role="OWNER").first()
        if owner:
            _write_json(zf, "owner_profile.json", {
                "id": str(owner.id), "email": owner.email,
                "first_name": owner.first_name, "last_name": owner.last_name,
                "role": owner.role, "phone_number": owner.phone_number,
                "date_joined": owner.date_joined.isoformat(),
                "last_login": owner.last_login.isoformat() if owner.last_login else None,
            })

        # ── 4. Team Members ───────────────────────────────────────
        users = User.objects.filter(tenant=tenant).exclude(role="SUPER_ADMIN")
        user_fields = ["id", "email", "first_name", "last_name", "role", "is_active",
                        "phone_number", "date_joined", "last_login"]
        users_data = _serialize_qs(users, user_fields)
        _write_json(zf, "team_members.json", users_data)
        _write_csv(zf, "team_members.csv", users_data)

        # ── 5. Customers ──────────────────────────────────────────
        try:
            from apps.customers.models import Customer
            customers = Customer.objects.filter(tenant=tenant)
            cust_fields = ["id", "first_name", "last_name", "email", "phone",
                           "birthday", "total_visits", "total_spent", "last_visit",
                           "is_active", "created_at", "updated_at"]
            cust_data = _serialize_qs(customers, cust_fields)
            _write_json(zf, "customers.json", cust_data)
            _write_csv(zf, "customers.csv", cust_data)
        except ImportError:
            logger.warning("Customer model not available for export")

        # ── 6. Loyalty Programs ───────────────────────────────────
        try:
            from apps.programs.models import LoyaltyProgram
            programs = LoyaltyProgram.objects.filter(tenant=tenant)
            prog_fields = ["id", "name", "program_type", "points_per_visit",
                           "reward_threshold", "reward_description", "is_active",
                           "created_at", "updated_at"]
            prog_data = _serialize_qs(programs, prog_fields)
            _write_json(zf, "loyalty_programs.json", prog_data)
        except ImportError:
            logger.warning("LoyaltyProgram model not available for export")

        # ── 7. Transactions ───────────────────────────────────────
        try:
            from apps.programs.models import Transaction
            txns = Transaction.objects.filter(tenant=tenant)
            txn_fields = ["id", "customer_id", "program_id", "transaction_type",
                          "points", "amount", "description", "created_at"]
            txn_data = _serialize_qs(txns, txn_fields)
            _write_json(zf, "transactions.json", txn_data)
            _write_csv(zf, "transactions.csv", txn_data)
        except ImportError:
            logger.warning("Transaction model not available for export")

        # ── 8. Subscriptions & Invoices ───────────────────────────
        subs = Subscription.objects.filter(tenant=tenant)
        sub_fields = ["id", "status", "billing_cycle", "trial_end",
                      "current_period_start", "current_period_end",
                      "cancel_at_period_end", "created_at", "updated_at"]
        subs_data = _serialize_qs(subs, sub_fields)
        _write_json(zf, "subscriptions.json", subs_data)

        invoices = Invoice.objects.filter(tenant=tenant)
        inv_fields = ["id", "invoice_number", "status", "subtotal",
                      "tax_amount", "total", "period_start", "period_end",
                      "due_date", "paid_at", "created_at"]
        inv_data = _serialize_qs(invoices, inv_fields)
        _write_json(zf, "invoices.json", inv_data)
        _write_csv(zf, "invoices.csv", inv_data)

        # ── 9. Payment Methods ────────────────────────────────────
        pms = PaymentMethod.objects.filter(tenant=tenant)
        pm_fields = ["id", "payment_type", "last_four", "brand",
                     "is_default", "created_at"]
        pms_data = _serialize_qs(pms, pm_fields)
        _write_json(zf, "payment_methods.json", pms_data)

        # ── 10. Locations ─────────────────────────────────────────
        locs = Location.objects.filter(tenant=tenant)
        loc_fields = ["id", "name", "address", "city", "country",
                      "latitude", "longitude", "phone", "is_primary",
                      "is_active", "created_at"]
        loc_data = _serialize_qs(locs, loc_fields)
        _write_json(zf, "locations.json", loc_data)

        # ── 11. Notifications ─────────────────────────────────────
        try:
            from apps.notifications.models import Campaign
            campaigns = Campaign.objects.filter(tenant=tenant)
            camp_fields = ["id", "title", "message", "channel",
                           "status", "scheduled_at", "sent_at", "created_at"]
            camp_data = _serialize_qs(campaigns, camp_fields)
            _write_json(zf, "campaigns.json", camp_data)
        except ImportError:
            logger.warning("Campaign model not available for export")

        # ── 12. Automations ───────────────────────────────────────
        try:
            from apps.automation.models import AutomationRule
            rules = AutomationRule.objects.filter(tenant=tenant)
            rule_fields = ["id", "name", "trigger_type", "action_type",
                           "is_active", "last_executed_at", "created_at"]
            rule_data = _serialize_qs(rules, rule_fields)
            _write_json(zf, "automations.json", rule_data)
        except ImportError:
            logger.warning("AutomationRule model not available for export")

        # ── 13. Audit Log (read-only copy) ────────────────────────
        try:
            from common.audit import AuditLog
            logs = AuditLog.objects.filter(tenant=tenant).order_by("-created_at")[:5000]
            log_fields = ["id", "actor_email", "action", "resource",
                          "resource_id", "ip_address", "status", "details",
                          "created_at"]
            log_data = _serialize_qs(logs, log_fields)
            _write_json(zf, "audit_log.json", log_data)
        except ImportError:
            logger.warning("AuditLog model not available for export")

    buf.seek(0)
    logger.info(
        "Data export generated for tenant '%s' (%s) — %d bytes",
        tenant.name, tenant.slug, buf.tell() or buf.getbuffer().nbytes,
    )
    return buf
