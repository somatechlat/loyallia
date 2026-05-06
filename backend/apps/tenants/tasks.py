from __future__ import annotations

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
from apps.customers.models import Customer, CustomerPass, Enrollment
from apps.tenants.models import Tenant
from apps.transactions.models import Transaction
from apps.notifications.email_engine.client import send_raw_email
from admin.common.messages import get_message

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
                to_emails=[user.email],
                subject="Tu exportación de datos está lista / Your data export is ready",
                html_content=body
            )
            
            logger.info(f"Export successful for tenant {tenant_id}. Email sent to {user_email}.")
            
    except Exception as e:
        logger.exception(f"Failed to export data for tenant {tenant_id}: {str(e)}")
        try:
            send_raw_email(
                to_emails=[user_email],
                subject="Error en exportación de datos / Data export error",
                html_content="<p>Ocurrió un error al procesar tu solicitud de exportación de datos. Por favor, intenta nuevamente más tarde o contacta a soporte.</p>"
            )
        except Exception:
            pass
