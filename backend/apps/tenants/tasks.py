from __future__ import annotations

import contextlib
import csv
import logging
import os
import tempfile
import zipfile
from uuid import uuid4

from celery import shared_task
from django.conf import settings
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage

from apps.authentication.models import User
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

        with tempfile.TemporaryDirectory() as tmpdir:
            # 1. Customers
            customers = Customer.objects.filter(tenant=tenant)
            with open(os.path.join(tmpdir, "customers.csv"), "w", newline="") as f:
                writer = csv.writer(f)
                writer.writerow(["ID", "Phone", "First Name", "Last Name", "Email", "Status", "Created At"])
                for c in customers.iterator(chunk_size=1000):
                    writer.writerow([str(c.id), c.phone, c.first_name, c.last_name, c.email, c.status, c.created_at])

            # 2. Transactions
            transactions = Transaction.objects.filter(customer__tenant=tenant)
            with open(os.path.join(tmpdir, "transactions.csv"), "w", newline="") as f:
                writer = csv.writer(f)
                writer.writerow(["ID", "Customer ID", "Amount", "Points Earned", "Type", "Created At"])
                for t in transactions.iterator(chunk_size=1000):
                    writer.writerow([str(t.id), str(t.customer.id), t.amount, t.points_earned, t.type, t.created_at])

            # 3. Passes
            passes = CustomerPass.objects.filter(customer__tenant=tenant)
            with open(os.path.join(tmpdir, "passes.csv"), "w", newline="") as f:
                writer = csv.writer(f)
                writer.writerow(["ID", "Customer ID", "Platform", "Status", "Created At"])
                for p in passes.iterator(chunk_size=1000):
                    writer.writerow([str(p.id), str(p.customer.id), p.platform, p.status, p.created_at])

            # 4. Enrollments
            enrollments = Enrollment.objects.filter(customer__tenant=tenant)
            with open(os.path.join(tmpdir, "enrollments.csv"), "w", newline="") as f:
                writer = csv.writer(f)
                writer.writerow(["ID", "Customer ID", "Program ID", "Status", "Joined At"])
                for e in enrollments.iterator(chunk_size=1000):
                    writer.writerow([str(e.id), str(e.customer.id), str(e.program.id), e.status, e.joined_at])

            # Zip creation
            zip_filename = f"export_{tenant.id}_{uuid4().hex[:8]}.zip"
            zip_path = os.path.join(tmpdir, zip_filename)
            with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
                for root, _, files in os.walk(tmpdir):
                    for file in files:
                        if file.endswith(".csv"):
                            zf.write(os.path.join(root, file), arcname=file)

            # Secure Storage
            storage_path = f"exports/{tenant.id}/{zip_filename}"
            with open(zip_path, "rb") as zf:
                saved_path = default_storage.save(storage_path, ContentFile(zf.read()))

            download_url = default_storage.url(saved_path)
            if not download_url.startswith("http"):
                # Handle local dev media URLs
                backend_url = getattr(settings, "BACKEND_URL", "http://localhost:8000").rstrip("/")
                download_url = f"{backend_url}{download_url}"

            # Delivery
            body = (
                "<p>Hola,</p>"
                "<p>Tu solicitud de exportación de datos (Art. 17 LOPDP) ha sido completada.</p>"
                f"<p>Puedes descargar el archivo aquí: <a href='{download_url}'>Descargar Datos</a></p>"
                "<p>Este enlace expirará por razones de seguridad.</p>"
            )
            send_raw_email(
                to_email=user.email,
                subject="Tu exportación de datos está lista / Your data export is ready",
                body_html=body,
            )

            logger.info(f"Export successful for tenant {tenant_id}. Email sent to {user_email}.")

    except Exception as e:
        logger.exception(f"Failed to export data for tenant {tenant_id}: {str(e)}")
        with contextlib.suppress(Exception):
            send_raw_email(
                to_email=user_email,
                subject="Error en exportación de datos / Data export error",
                body_html="<p>Ocurrió un error al procesar tu solicitud de exportación de datos. Por favor, intenta nuevamente más tarde o contacta a soporte.</p>",
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

    # 1. Notifications & Campaigns
    with contextlib.suppress(Exception):
        from apps.notifications.models import Campaign, Notification
        Notification.objects.filter(tenant=tenant).delete()
        Campaign.objects.filter(tenant=tenant).delete()

    # 2. Automation
    with contextlib.suppress(Exception):
        from apps.automation.models import AutomationExecution, AutomationRule
        AutomationExecution.objects.filter(rule__tenant=tenant).delete()
        AutomationRule.objects.filter(tenant=tenant).delete()

    # 3. Customer chain
    with contextlib.suppress(Exception):
        CustomerPass.objects.filter(customer__tenant=tenant).delete()
    with contextlib.suppress(Exception):
        Enrollment.objects.filter(customer__tenant=tenant).delete()
    with contextlib.suppress(Exception):
        Transaction.objects.filter(customer__tenant=tenant).delete()
    with contextlib.suppress(Exception):
        Customer.objects.filter(tenant=tenant).delete()

    # 4. Programs
    with contextlib.suppress(Exception):
        from apps.programs.models import LoyaltyProgram
        LoyaltyProgram.objects.filter(tenant=tenant).delete()

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
        from common.audit import AuditLog
        AuditLog.objects.filter(tenant=tenant).update(
            actor_email="[DELETED]",
            details={},
        )
        # Final audit entry
        AuditLog.objects.create(
            tenant=tenant,
            actor_email="[SYSTEM]",
            action="TENANT_DELETED",
            resource="tenant",
            resource_id=str(tenant.id),
            ip_address="",
            details={"deletion_type": "lopdp_art18_cascade"},
        )

    # 9. Delete Tenant
    tenant_name = tenant.name
    tenant.delete()

    logger.info("Cascade deletion COMPLETE for tenant '%s' (%s)", tenant_name, tenant_id)
