"""
Loyallia — Customer CSV Export API
Extracted from customers/api.py for Rule 245 compliance.
"""

import csv
import logging

from django.http import HttpResponse
from ninja import Router
from ninja.errors import HttpError

from apps.audit.service import log_data_export
from apps.customers.models import Customer
from common.messages import get_message
from common.permissions import is_owner, jwt_auth
from common.request import require_tenant

logger = logging.getLogger(__name__)

router = Router(tags=["Customer Export"])


def _sanitize_csv_cell(value: str) -> str:
    """Sanitize a CSV cell value to prevent CSV injection attacks.
    Prefixes dangerous characters with a single quote."""
    if not value:
        return value
    value_str = str(value)
    if value_str and value_str[0] in ("=", "+", "-", "@", "\t", "\r"):
        return "'" + value_str
    return value_str


@router.get("/export/", auth=jwt_auth, summary="Exportar clientes a CSV")
def export_customers(request):
    """Export all customer data to CSV. OWNER only. Forensic tracking enabled."""
    if not is_owner(request):
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))

    customers = Customer.objects.filter(tenant=require_tenant(request)).order_by(
        "created_at"
    )

    # LOPDP Forensic Audit Log
    log_data_export(
        request=request,
        resource_type="customer_database",
        record_count=customers.count(),
    )

    response = HttpResponse(content_type="text/csv; charset=utf-8")
    response["Content-Disposition"] = 'attachment; filename="clientes_loyallia.csv"'

    writer = csv.writer(response)
    writer.writerow(
        [
            "ID",
            "Email",
            "Nombre",
            "Apellido",
            "Telefono",
            "Genero",
            "Fecha Nacimiento",
            "Gasto Total",
            "Visitas Totales",
            "Notas",
            "Registrado El",
        ]
    )

    for c in customers:
        writer.writerow(
            [
                _sanitize_csv_cell(str(c.id)),
                _sanitize_csv_cell(c.email),
                _sanitize_csv_cell(c.first_name),
                _sanitize_csv_cell(c.last_name),
                _sanitize_csv_cell(c.phone),
                _sanitize_csv_cell(c.gender),
                _sanitize_csv_cell(str(c.date_of_birth) if c.date_of_birth else ""),
                c.total_spent,
                c.total_visits,
                _sanitize_csv_cell(c.notes),
                _sanitize_csv_cell(c.created_at.strftime("%Y-%m-%d %H:%M:%S")),
            ]
        )

    return response
