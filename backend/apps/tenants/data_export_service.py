"""
Loyallia — Full Tenant Data Export Service (LYL-FR-DPR-020)
LOPDP Art. 17 & 20: Right of Access / Data Portability.

Generates a ZIP containing tenant data in JSON and CSV formats.
Called by tenants/api.py for data export and account deletion.
"""

from __future__ import annotations

import csv
import io
import json
import logging
import zipfile
from datetime import datetime
from typing import Any

from django.db.models import QuerySet

logger = logging.getLogger("loyallia.data_export")


def _clean_value(value: Any) -> Any:
    if hasattr(value, "isoformat"):
        return value.isoformat()
    if hasattr(value, "hex"):
        return str(value)
    if isinstance(value, (dict, list, int, float, bool)) or value is None:
        return value
    return str(value)


def _serialize_qs(qs: QuerySet, fields: list[str]) -> list[dict]:
    """Convert a queryset to serializable dictionaries."""
    rows = []
    for obj in qs.iterator():
        row = {}
        for field in fields:
            if field.endswith("_id") and hasattr(obj, field):
                row[field] = _clean_value(getattr(obj, field))
            else:
                row[field] = _clean_value(getattr(obj, field, None))
        rows.append(row)
    return rows


def _write_json(zf: zipfile.ZipFile, filename: str, data: list | dict) -> None:
    zf.writestr(filename, json.dumps(data, ensure_ascii=False, indent=2, default=str))


def _write_csv(zf: zipfile.ZipFile, filename: str, rows: list[dict]) -> None:
    buffer = io.StringIO()
    if rows:
        writer = csv.DictWriter(buffer, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)
    zf.writestr(filename, buffer.getvalue())


def _write_table(
    zf: zipfile.ZipFile,
    basename: str,
    qs: QuerySet,
    fields: list[str],
    csv_copy: bool = False,
) -> list[dict]:
    rows = _serialize_qs(qs, fields)
    _write_json(zf, f"{basename}.json", rows)
    if csv_copy:
        _write_csv(zf, f"{basename}.csv", rows)
    return rows


def generate_tenant_export(tenant) -> io.BytesIO:
    """
    Generate a complete in-memory ZIP export for one tenant.
    """
    from apps.analytics.models import (
        CustomerAnalytics,
        DailyAnalytics,
        ProgramAnalytics,
    )
    from apps.audit.models import AuditLog
    from apps.authentication.models import User
    from apps.automation.models import Automation, AutomationExecution
    from apps.billing.models import Invoice, PaymentMethod, Subscription
    from apps.cards.models import Card
    from apps.customers.models import Customer, CustomerPass
    from apps.notifications.models import CampaignDeliveryLog, CampaignRun, Notification
    from apps.tenants.models import Location
    from apps.transactions.models import Enrollment, Transaction

    buf = io.BytesIO()
    now = datetime.now()

    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        _write_json(
            zf,
            "_metadata.json",
            {
                "export_version": "1.0",
                "exported_at": now.isoformat(),
                "tenant_id": str(tenant.id),
                "tenant_name": tenant.name,
                "tenant_slug": tenant.slug,
                "format": "LOPDP Art. 17/20 full tenant export",
            },
        )

        tenant_fields = [
            "id",
            "name",
            "slug",
            "plan",
            "is_active",
            "entity_type",
            "cedula",
            "legal_name",
            "ruc",
            "industry",
            "legal_rep_name",
            "legal_rep_cedula",
            "trial_start",
            "trial_end",
            "scheduled_deletion_at",
            "logo_url",
            "primary_color",
            "secondary_color",
            "country",
            "province",
            "city",
            "timezone",
            "phone",
            "email",
            "website",
            "address",
            "default_language",
            "created_at",
            "updated_at",
        ]
        _write_json(
            zf,
            "tenant_info.json",
            {
                field: _clean_value(getattr(tenant, field, None))
                for field in tenant_fields
            },
        )

        owner = User.objects.filter(tenant=tenant, role="OWNER").first()
        if owner:
            _write_json(
                zf,
                "owner_profile.json",
                {
                    "id": str(owner.id),
                    "email": owner.email,
                    "first_name": owner.first_name,
                    "last_name": owner.last_name,
                    "role": owner.role,
                    "phone_number": owner.phone_number,
                    "date_joined": _clean_value(owner.date_joined),
                    "last_login": _clean_value(owner.last_login),
                },
            )

        user_fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "role",
            "is_active",
            "phone_number",
            "date_joined",
            "last_login",
        ]
        _write_table(
            zf,
            "team_members",
            User.objects.filter(tenant=tenant).exclude(role="SUPER_ADMIN"),
            user_fields,
            csv_copy=True,
        )

        _write_table(
            zf,
            "customers",
            Customer.objects.filter(tenant=tenant),
            [
                "id",
                "first_name",
                "last_name",
                "email",
                "phone",
                "date_of_birth",
                "gender",
                "referral_code",
                "is_active",
                "notes",
                "total_visits",
                "total_spent",
                "last_visit",
                "created_at",
                "updated_at",
            ],
            csv_copy=True,
        )

        _write_table(
            zf,
            "customer_passes",
            CustomerPass.objects.filter(customer__tenant=tenant),
            [
                "id",
                "customer_id",
                "card_id",
                "pass_data",
                "stamp_count",
                "cashback_balance",
                "referral_count",
                "multipass_remaining",
                "gift_balance",
                "apple_pass_id",
                "google_pass_id",
                "qr_code",
                "is_active",
                "enrolled_at",
                "last_updated",
            ],
            csv_copy=True,
        )

        _write_table(
            zf,
            "loyalty_programs",
            Card.objects.filter(tenant=tenant),
            [
                "id",
                "card_type",
                "name",
                "description",
                "logo_url",
                "background_color",
                "text_color",
                "strip_image_url",
                "icon_url",
                "barcode_type",
                "is_active",
                "stamps_required",
                "cashback_percentage",
                "minimum_purchase",
                "credit_expiry_days",
                "metadata",
                "locations",
                "created_at",
                "updated_at",
            ],
        )

        _write_table(
            zf,
            "transactions",
            Transaction.objects.filter(tenant=tenant),
            [
                "id",
                "tenant_id",
                "customer_pass_id",
                "staff_id",
                "location_id",
                "transaction_type",
                "amount",
                "quantity",
                "notes",
                "transaction_data",
                "is_remote",
                "created_at",
            ],
            csv_copy=True,
        )

        _write_table(
            zf,
            "enrollments",
            Enrollment.objects.filter(tenant=tenant),
            [
                "id",
                "tenant_id",
                "customer_id",
                "card_id",
                "enrollment_method",
                "referral_code_used",
                "location_id",
                "user_agent",
                "ip_address",
                "enrolled_at",
            ],
            csv_copy=True,
        )

        _write_table(
            zf,
            "subscriptions",
            Subscription.objects.filter(tenant=tenant),
            [
                "id",
                "plan",
                "subscription_plan_id",
                "status",
                "billing_cycle",
                "trial_start",
                "trial_end",
                "current_period_start",
                "current_period_end",
                "cancel_at_period_end",
                "gateway_subscription_id",
                "failed_payment_count",
                "last_payment_error",
                "last_payment_at",
                "created_at",
                "updated_at",
            ],
        )

        _write_table(
            zf,
            "invoices",
            Invoice.objects.filter(tenant=tenant),
            [
                "id",
                "invoice_number",
                "status",
                "subtotal",
                "tax_rate",
                "tax_amount",
                "total",
                "currency",
                "period_start",
                "period_end",
                "gateway_charge_id",
                "paid_at",
                "invoice_data",
                "pdf_url",
                "created_at",
                "updated_at",
            ],
            csv_copy=True,
        )

        _write_table(
            zf,
            "payment_methods",
            PaymentMethod.objects.filter(tenant=tenant),
            [
                "id",
                "card_brand",
                "card_last_four",
                "card_exp_month",
                "card_exp_year",
                "cardholder_name",
                "is_default",
                "is_active",
                "created_at",
                "updated_at",
            ],
        )

        _write_table(
            zf,
            "locations",
            Location.objects.filter(tenant=tenant),
            [
                "id",
                "name",
                "address",
                "city",
                "country",
                "latitude",
                "longitude",
                "phone",
                "is_primary",
                "is_active",
                "created_at",
                "updated_at",
            ],
        )

        _write_table(
            zf,
            "notifications",
            Notification.objects.filter(tenant=tenant),
            [
                "id",
                "customer_id",
                "customer_pass_id",
                "notification_type",
                "channel",
                "title",
                "message",
                "image_url",
                "action_url",
                "notification_data",
                "is_sent",
                "is_read",
                "is_clicked",
                "created_at",
                "sent_at",
                "read_at",
                "clicked_at",
            ],
        )

        _write_table(
            zf,
            "campaigns",
            CampaignRun.objects.filter(tenant=tenant),
            [
                "id",
                "channel",
                "title",
                "message_preview",
                "segment_id",
                "status",
                "total_recipients",
                "sent_count",
                "delivered_count",
                "failed_count",
                "read_count",
                "started_at",
                "completed_at",
                "error_summary",
                "sender_domain",
                "created_at",
                "updated_at",
            ],
        )

        _write_table(
            zf,
            "campaign_delivery_logs",
            CampaignDeliveryLog.objects.filter(campaign_run__tenant=tenant),
            [
                "id",
                "campaign_run_id",
                "customer_id",
                "recipient_phone",
                "recipient_email",
                "recipient_name",
                "status",
                "external_message_id",
                "error_code",
                "error_message",
                "sent_at",
                "delivered_at",
                "read_at",
                "created_at",
            ],
        )

        _write_table(
            zf,
            "automations",
            Automation.objects.filter(tenant=tenant),
            [
                "id",
                "name",
                "description",
                "trigger",
                "trigger_config",
                "action",
                "action_config",
                "target_segments",
                "is_active",
                "schedule_config",
                "max_executions_per_day",
                "cooldown_hours",
                "total_executions",
                "last_executed",
                "created_at",
                "updated_at",
            ],
        )

        _write_table(
            zf,
            "automation_executions",
            AutomationExecution.objects.filter(automation__tenant=tenant),
            [
                "id",
                "automation_id",
                "customer_id",
                "trigger_event",
                "execution_context",
                "success",
                "executed_at",
            ],
        )

        customer_analytics = _write_table(
            zf,
            "customer_analytics",
            CustomerAnalytics.objects.filter(tenant=tenant),
            [
                "id",
                "customer_id",
                "total_passes",
                "active_passes",
                "total_visits",
                "total_spent",
                "average_transaction",
                "total_rewards_earned",
                "total_rewards_redeemed",
                "segment",
                "last_updated",
            ],
        )
        program_analytics = _write_table(
            zf,
            "program_analytics",
            ProgramAnalytics.objects.filter(tenant=tenant),
            [
                "id",
                "card_id",
                "total_enrollments",
                "active_members",
                "total_transactions",
                "total_revenue",
                "average_order_value",
                "total_rewards_issued",
                "total_rewards_redeemed",
                "redemption_rate",
                "engagement_rate",
                "repeat_purchase_rate",
                "last_updated",
            ],
        )
        daily_analytics = _write_table(
            zf,
            "daily_analytics",
            DailyAnalytics.objects.filter(tenant=tenant),
            [
                "id",
                "analytics_date",
                "new_customers",
                "new_enrollments",
                "transactions",
                "daily_revenue",
                "rewards_issued",
                "rewards_redeemed",
                "notifications_sent",
            ],
        )
        _write_json(
            zf,
            "analytics.json",
            {
                "customer_analytics": customer_analytics,
                "program_analytics": program_analytics,
                "daily_analytics": daily_analytics,
            },
        )

        _write_table(
            zf,
            "audit_log",
            AuditLog.objects.filter(tenant_id=tenant.id).order_by("-created_at")[:5000],
            [
                "id",
                "actor_id",
                "actor_email",
                "actor_role",
                "action",
                "resource_type",
                "resource_id",
                "tenant_id",
                "ip_address",
                "user_agent",
                "justification",
                "details",
                "status",
                "created_at",
            ],
        )

    buf.seek(0)
    logger.info(
        "Data export generated for tenant '%s' (%s) — %d bytes",
        tenant.name,
        tenant.slug,
        buf.getbuffer().nbytes,
    )
    return buf
