
import contextlib
import logging
import uuid
from uuid import uuid4

from celery import shared_task
from django.conf import settings
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage

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
    logger.info(
        f"Starting data export for tenant {tenant_id} requested by {user_email}"
    )
    try:
        tenant = Tenant.objects.get(id=tenant_id)
        user = User.objects.get(email=user_email)

        from apps.tenants.data_export_service import generate_tenant_export

        zip_filename = f"export_{tenant.id}_{uuid4().hex[:8]}.zip"
        storage_path = f"exports/{tenant.id}/{zip_filename}"
        export_buffer = generate_tenant_export(tenant)
        saved_path = default_storage.save(
            storage_path, ContentFile(export_buffer.getvalue())
        )

        download_url = default_storage.url(saved_path)
        if not download_url.startswith("http"):
            backend_url = getattr(
                settings, "BACKEND_URL", "http://localhost:8000"
            ).rstrip("/")
            download_url = f"{backend_url}{download_url}"

        from common.messages import get_message

        body = get_message("DATA_EXPORT_EMAIL_BODY", download_url=download_url)
        send_raw_email(
            to_email=user.email,
            subject=get_message("DATA_EXPORT_EMAIL_SUBJECT"),
            body_html=body,
        )

        logger.info(
            f"Export successful for tenant {tenant_id}. Email sent to {user_email}."
        )

    except Exception as e:
        logger.exception(f"Failed to export data for tenant {tenant_id}: {str(e)}")
        with contextlib.suppress(Exception):
            from common.messages import get_message

            send_raw_email(
                to_email=user_email,
                subject=get_message("DATA_EXPORT_ERROR_SUBJECT"),
                body_html=get_message("DATA_EXPORT_ERROR_BODY"),
            )


@shared_task(queue="default", bind=True, max_retries=2)
def delete_tenant_cascade(self, tenant_id: str):
    """
    LYL-FR-DPR-025.6/025.7: LOPDP Art. 18 — Hard-delete ALL tenant data.
    Runs 24 hours after owner requests deletion via POST /tenants/delete-account/.

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
    """
    logger.info("Starting cascade deletion for tenant %s", tenant_id)

    try:
        tenant = Tenant.objects.get(id=tenant_id)
    except Tenant.DoesNotExist:
        logger.warning("Tenant %s already deleted, skipping", tenant_id)
        return

    # Safety: only proceed if deletion was actually scheduled
    if tenant.scheduled_deletion_at is None:
        logger.warning("Tenant %s has no scheduled_deletion_at, aborting", tenant_id)
        return

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
        # Final audit entry
        AuditLog.objects.create(
            actor_id=uuid.UUID(int=0),
            actor_email="[SYSTEM]",
            actor_role="system",
            action="TENANT_DELETED",
            resource_type="tenant",
            resource_id=str(tenant.id),
            tenant_id=tenant.id,
            ip_address="",
            details={"deletion_type": "lopdp_art18_cascade"},
        )

    # 9. Delete Tenant
    tenant_name = tenant.name
    tenant.delete()

    logger.info(
        "Cascade deletion COMPLETE for tenant '%s' (%s)", tenant_name, tenant_id
    )
