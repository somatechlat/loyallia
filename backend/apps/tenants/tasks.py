import contextlib
import logging
import uuid
from uuid import uuid4

from celery import shared_task
from django.conf import settings
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.db import connection

from apps.authentication.models import User
from apps.cards.models import Card
from apps.customers.models import Customer, CustomerPass
from apps.notifications.email_engine.client import send_raw_email
from apps.tenants.models import Tenant
from apps.transactions.models import Enrollment, Transaction

logger = logging.getLogger(__name__)


@shared_task(queue="default")
def export_tenant_data(tenant_id: str, user_email: str):
    """
    SEC: LOPDP Art. 17 (Right to Data Portability and Access).
    Generates an asynchronous ZIP bundle containing all tenant data and
    delivers a download link via email to the authorized requester.
    """
    logger.info(f"Starting data export for tenant {tenant_id} requested by {user_email}")
    try:
        tenant = Tenant.objects.get(id=tenant_id)
        user = User.objects.get(email=user_email)

        # SEC: Cross-tenant guard -- verify the user belongs to the tenant being exported
        if str(user.tenant_id) != str(tenant_id):
            logger.warning(
                "SECURITY: Cross-tenant export blocked -- user %s (tenant %s) "
                "requested export of tenant %s",
                user_email, user.tenant_id, tenant_id,
            )
            return

        from apps.tenants.data_export_service import generate_tenant_export

        zip_filename = f"export_{tenant.id}_{uuid4().hex[:8]}.zip"
        storage_path = f"exports/{tenant.id}/{zip_filename}"
        export_buffer = generate_tenant_export(tenant)
        saved_path = default_storage.save(storage_path, ContentFile(export_buffer.getvalue()))

        download_url = default_storage.url(saved_path)
        if not download_url.startswith("http"):
            backend_url = getattr(settings, "BACKEND_URL", "")
            if not backend_url:
                raise RuntimeError("BACKEND_URL is not configured.")
            download_url = f"{backend_url.rstrip('/')}{download_url}"

        from common.messages import get_message

        body = get_message("DATA_EXPORT_EMAIL_BODY", download_url=download_url)
        send_raw_email(
            to_email=user.email,
            subject=get_message("DATA_EXPORT_EMAIL_SUBJECT"),
            body_html=body,
        )

        logger.info(f"Export successful for tenant {tenant_id}. Email sent to {user_email}.")

    except Exception as e:
        logger.exception(f"Failed to export data for tenant {tenant_id}: {str(e)}")
        with contextlib.suppress(Exception):
            from common.messages import get_message

            send_raw_email(
                to_email=user_email,
                subject=get_message("DATA_EXPORT_ERROR_SUBJECT"),
                body_html=get_message("DATA_EXPORT_ERROR_BODY"),
            )


def hard_delete_tenant(tenant_id: str, *, require_scheduled_deletion: bool = True) -> str:
    """
    Synchronously hard-delete ALL tenant data.

    Cascade order (dependency-safe):
    1. Notifications & Campaigns
    2. Automation Rules & Executions
    3. Customer Passes → Enrollments → Transactions → Customers
    4. Programs
    5. Locations
    6. Subscriptions, Invoices, PaymentMethods
    7. Team users (non-OWNER first, then OWNER)
    8. Anonymize AuditLog
    9. Delete Tenant

    Returns the tenant name for logging.
    """
    logger.info("Starting hard deletion for tenant %s", tenant_id)

    try:
        tenant = Tenant.objects.get(id=tenant_id)
    except Tenant.DoesNotExist:
        logger.warning("Tenant %s already deleted, skipping", tenant_id)
        return ""

    # SEC: Cross-tenant guard -- only delete tenants with a scheduled deletion
    if require_scheduled_deletion and tenant.scheduled_deletion_at is None:
        logger.warning(
            "SECURITY: Hard-delete blocked for tenant %s -- no scheduled_deletion_at",
            tenant_id,
        )
        return ""

    tenant_name = tenant.name

 # 1. Notifications & campaign delivery records.
    with contextlib.suppress(Exception):
        from apps.notifications.models import (
            CampaignDeliveryLog,
            CampaignRun,
            Notification,
            PushDevice,
            TenantEmailConfig,
            WhatsAppSession,
        )

        CampaignDeliveryLog.objects.filter(campaign_run__tenant=tenant).delete()
        CampaignRun.objects.filter(tenant=tenant).delete()
        Notification.objects.filter(tenant=tenant).delete()
        PushDevice.objects.filter(customer__tenant=tenant).delete()
        TenantEmailConfig.objects.filter(tenant=tenant).delete()
        WhatsAppSession.objects.filter(tenant=tenant).delete()

 # 2. Automation
    with contextlib.suppress(Exception):
        from apps.automation.models import Automation, AutomationExecution

        AutomationExecution.objects.filter(automation__tenant=tenant).delete()
        Automation.objects.filter(tenant=tenant).delete()

 # 3. Customer chain
    with contextlib.suppress(Exception):
        Enrollment.objects.filter(tenant=tenant).delete()
    with contextlib.suppress(Exception):
        Transaction.objects.filter(tenant=tenant).delete()
    with contextlib.suppress(Exception):
        CustomerPass.objects.filter(customer__tenant=tenant).delete()
    with contextlib.suppress(Exception):
        Customer.objects.filter(tenant=tenant).delete()

 # 4. Programs
    with contextlib.suppress(Exception):
        Card.objects.filter(tenant=tenant).delete()

 # 5. Locations
    with contextlib.suppress(Exception):
        from apps.tenants.models import Location

        Location.objects.filter(tenant=tenant).delete()

 # 6. Billing
    with contextlib.suppress(Exception):
        from apps.billing.models import Invoice, PaymentMethod, Subscription

        Invoice.objects.filter(tenant=tenant).delete()
        PaymentMethod.objects.filter(tenant=tenant).delete()
        Subscription.objects.filter(tenant=tenant).delete()

 # 7. Team users
    User.objects.filter(tenant=tenant).exclude(role="OWNER").delete()
    User.objects.filter(tenant=tenant, role="OWNER").delete()

 # 8. Anonymize audit log (LYL-FR-DPR-025.7)
    with contextlib.suppress(Exception):
        from apps.audit.models import AuditLog

        AuditLog.objects.filter(tenant_id=tenant.id).update(
            actor_email="[DELETED]",
            details={},
        )

 # 9. Delete Tenant. Related tenant data is explicitly cleaned above; use a
 # direct delete so optional/missing local tables do not block SuperAdmin purges.
    with connection.cursor() as cursor:
        cursor.execute(
            f'DELETE FROM "{Tenant._meta.db_table}" WHERE "id" = %s',
            [tenant.id],
        )

    logger.info("Hard deletion COMPLETE for tenant '%s' (%s)", tenant_name, tenant_id)
    return tenant_name


@shared_task(queue="default", bind=True, max_retries=2)
def delete_tenant_cascade(self, tenant_id: str):
    """
    LYL-FR-DPR-025.6/025.7: LOPDP Art. 18  Hard-delete ALL tenant data.
    Runs 24 hours after owner requests deletion via POST /tenants/delete-account/.
    """
    logger.info("Starting cascade deletion for tenant %s", tenant_id)

    try:
        tenant = Tenant.objects.get(id=tenant_id)
    except Tenant.DoesNotExist:
        logger.warning("Tenant %s already deleted, skipping", tenant_id)
        return

    # SEC: Cross-tenant guard -- only proceed if deletion was scheduled by owner
    # This prevents arbitrary tenant deletion via task queue injection
    if tenant.scheduled_deletion_at is None:
        logger.warning(
            "SECURITY: Cascade delete blocked for tenant %s -- "
            "no scheduled_deletion_at (possible task queue injection)",
            tenant_id,
        )
        return

    tenant_name = hard_delete_tenant(tenant_id)

 # Final audit entry (owner not present in Celery context)
    with contextlib.suppress(Exception):
        from apps.audit.models import AuditAction, AuditLog

        AuditLog.objects.create(
            actor_id=uuid.UUID(int=0),
            actor_email="[SYSTEM]",
            actor_role="system",
            action=AuditAction.DELETE,
            resource_type="tenant",
            resource_id=tenant_id,
            tenant_id=None,
            ip_address="",
            details={"deletion_type": "lopdp_art18_cascade", "tenant_name": tenant_name},
        )

    logger.info("Cascade deletion COMPLETE for tenant '%s' (%s)", tenant_name, tenant_id)
