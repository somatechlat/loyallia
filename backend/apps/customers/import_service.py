"""
Loyallia Customer Import Service
Handles parsing, normalization, and bulk ingestion of customer data from external files.
Decoupled from api.py per Rule 245.
"""

import logging
import re
from contextlib import suppress
from typing import Any

import pandas as pd
from django.db import transaction
from django.utils.dateparse import parse_date

from apps.customers.models import Customer
from common.messages import get_message

logger = logging.getLogger(__name__)


class CustomerImportService:
    """Service to handle customer database imports."""

 # AGENT.md business rule: max import file size 10MB, max 50,000 rows.
    MAX_FILE_SIZE = 10 * 1024 * 1024
    MAX_ROWS = 50_000

 # Supported gender mappings for normalization
    GENDER_MAP = {
        "m": "M",
        "masculino": "M",
        "male": "M",
        "hombre": "M",
        "f": "F",
        "femenino": "F",
        "female": "F",
        "mujer": "F",
        "o": "O",
        "otro": "O",
        "other": "O",
    }

 # Email regex for basic validation before DB hit
    EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

    def __init__(self, tenant):
        self.tenant = tenant

    def process_import(self, file_obj: Any, filename: str) -> dict:
        """
        Main entry point for processing an imported file.
        Returns a summary of the operation.
        """
        filename = filename.lower()

        try:
            if filename.endswith(".csv"):
                df = pd.read_csv(file_obj, dtype=str, keep_default_na=False)
            elif filename.endswith((".xlsx", ".xls")):
                df = pd.read_excel(file_obj, dtype=str, keep_default_na=False)
            else:
                return {
                    "success": False,
                    "error": get_message("CUSTOMER_IMPORT_INVALID_FORMAT"),
                }
        except Exception as exc:
            logger.error("Error parsing import file: %s", exc)
            return {
                "success": False,
                "error": get_message("CUSTOMER_IMPORT_FILE_CORRUPT"),
            }

        if df.empty:
            return {
                "success": False,
                "error": get_message("CUSTOMER_IMPORT_FILE_EMPTY"),
            }

        if len(df.index) > self.MAX_ROWS:
            return {
                "success": False,
                "error": get_message(
                    "VALIDATION_ERROR",
                    detail=f"El archivo supera el máximo de {self.MAX_ROWS} filas.",
                ),
            }

 # Normalize column names
        df.columns = [str(c).strip().lower().replace(" ", "_") for c in df.columns]

        col_map = self._detect_columns(df)
        if not col_map.get("first_name") or not col_map.get("email"):
            return {
                "success": False,
                "error": get_message(
                    "VALIDATION_ERROR",
                    detail=f"Columnas 'nombre' y 'email' requeridas. Detectadas: {list(df.columns)}",
                ),
            }

        return self._ingest_data(df, col_map)

    def _detect_columns(self, df: pd.DataFrame) -> dict:
        """Detect relevant columns using keyword matching."""

        def _find_col(keywords: list) -> str | None:
            for col in df.columns:
                if any(kw in col for kw in keywords):
                    return col
            return None

        return {
            "first_name": _find_col(["nombre", "first_name", "first", "name"]),
            "last_name": _find_col(["apellido", "last_name", "last", "surname"]),
            "email": _find_col(["email", "correo", "mail", "e-mail"]),
            "phone": _find_col(["telefono", "teléfono", "phone", "cel", "movil", "móvil"]),
            "dob": _find_col(["fecha_nac", "nacimiento", "birth", "dob", "fecha_de_nacimiento"]),
            "gender": _find_col(["genero", "género", "gender", "sexo"]),
            "notes": _find_col(["notas", "notes", "nota", "observaciones", "comentarios"]),
            "total_spent": _find_col(["gasto", "spent", "total_spent", "compras", "monto"]),
            "total_visits": _find_col(["visitas", "visits", "total_visits", "frecuencia", "scan"]),
        }

    def _ingest_data(self, df: pd.DataFrame, col_map: dict) -> dict:
        """Iterate through rows and perform bulk ingestion."""
        existing_emails = set(Customer.objects.filter(tenant=self.tenant).values_list("email", flat=True))

        customers_to_create = []
        seen_in_file = set()
        skipped_duplicate = 0
        skipped_invalid = 0
        errors = []

        for row_idx, row in df.iterrows():
            lineno = int(str(row_idx)) + 2
            email_raw = str(row.get(col_map["email"], "")).strip().lower()

            if not email_raw or not self.EMAIL_RE.match(email_raw):
                errors.append(
                    get_message(
                        "VALIDATION_ERROR",
                        detail=f"Fila {lineno}: email invalido '{email_raw}'",
                    )
                )
                skipped_invalid += 1
                continue

            if email_raw in seen_in_file or email_raw in existing_emails:
                skipped_duplicate += 1
                continue

            first_name = str(row.get(col_map["first_name"], "")).strip().title()
            if not first_name:
                errors.append(get_message("VALIDATION_ERROR", detail=f"Fila {lineno}: nombre vacio"))
                skipped_invalid += 1
                continue

 # Normalized data extraction
            last_name = str(row.get(col_map["last_name"], "")).strip().title() if col_map["last_name"] else ""
            phone = re.sub(r"[^\d\+\- ]", "", str(row.get(col_map["phone"], "")))[:20] if col_map["phone"] else ""

            date_of_birth = None
            if col_map["dob"]:
                dob_raw = str(row.get(col_map["dob"], "")).strip()
                if dob_raw:
                    with suppress(Exception):
                        date_of_birth = parse_date(dob_raw)

            gender = ""
            if col_map["gender"]:
                gender_raw = str(row.get(col_map["gender"], "")).strip().lower()
                gender = self.GENDER_MAP.get(gender_raw, "")

            notes = str(row.get(col_map["notes"], ""))[:2000] if col_map["notes"] else ""

            total_spent = 0.0
            if col_map["total_spent"]:
                try:
                    spent_raw = re.sub(r"[^\d\.]", "", str(row.get(col_map["total_spent"], "0")))
                    total_spent = float(spent_raw) if spent_raw else 0.0
                except ValueError:
                    pass

            total_visits = 0
            if col_map["total_visits"]:
                try:
                    visits_raw = re.sub(r"[^\d]", "", str(row.get(col_map["total_visits"], "0")))
                    total_visits = int(visits_raw) if visits_raw else 0
                except ValueError:
                    pass

            seen_in_file.add(email_raw)
            customers_to_create.append(
                Customer(
                    tenant=self.tenant,
                    first_name=first_name,
                    last_name=last_name,
                    email=email_raw,
                    phone=phone,
                    date_of_birth=date_of_birth,
                    gender=gender,
                    notes=notes,
                    total_spent=total_spent,
                    total_visits=total_visits,
                )
            )

        capacity_error = self._check_plan_capacity(len(customers_to_create))
        if capacity_error:
            return {"success": False, "error": capacity_error}

        if customers_to_create:
            with transaction.atomic():
                for customer in customers_to_create:
                    customer.referral_code = customer.generate_referral_code()
                Customer.objects.bulk_create(customers_to_create, batch_size=500)

        return {
            "success": True,
            "imported": len(customers_to_create),
            "skipped_duplicate": skipped_duplicate,
            "skipped_invalid": skipped_invalid,
            "errors": errors[:20],
            "message": (
                get_message("CUSTOMER_CREATED")
                if len(customers_to_create) > 0
                else get_message("VALIDATION_ERROR", detail="No se importaron nuevos clientes.")
            ),
        }

    def _check_plan_capacity(self, pending_count: int) -> str | None:
        """Return an error message when an import would exceed customer limits."""
        if pending_count <= 0:
            return None

        from apps.billing.models import Subscription

        subscription = Subscription.objects.filter(tenant=self.tenant).first()
        if not subscription:
            return get_message("BILLING_PLAN_REQUIRED")

        limit = subscription.get_limit("customers")
        current = Customer.objects.filter(tenant=self.tenant).count()
        if current + pending_count > limit:
            return get_message("PLAN_LIMIT_EXCEEDED", resource="customers", limit=limit)
        return None
