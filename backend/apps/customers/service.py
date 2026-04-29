"""
Loyallia — Customer Service Layer
Extracted business logic from customer API views.
"""

import logging
import re

from django.db.models import Q
from django.utils.dateparse import parse_date

from apps.customers.models import Customer, CustomerPass
from apps.transactions.models import Enrollment

logger = logging.getLogger(__name__)

# Compiled regex for email validation
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
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


class CustomerService:
    """Service class encapsulating customer business logic."""

    @staticmethod
    def create(tenant, data):
        """
        Create a customer with validation.

        Args:
            tenant: Tenant instance
            data: dict with customer fields (first_name, last_name, email, etc.)

        Returns:
            Customer instance

        Raises:
            ValueError: If validation fails
        """
        email = data.get("email", "").strip().lower()
        if not email or not EMAIL_RE.match(email):
            raise ValueError(f"Invalid email: {email}")

        first_name = data.get("first_name", "").strip()
        if not first_name:
            raise ValueError("First name is required")

        # Check for existing customer
        if Customer.objects.filter(tenant=tenant, email=email).exists():
            raise ValueError(f"Customer with email {email} already exists")

        date_of_birth = None
        if data.get("date_of_birth"):
            date_of_birth = parse_date(data["date_of_birth"])

        gender = data.get("gender", "")
        if gender:
            gender = GENDER_MAP.get(gender.strip().lower(), gender)

        customer = Customer.objects.create(
            tenant=tenant,
            first_name=first_name,
            last_name=data.get("last_name", "").strip(),
            email=email,
            phone=data.get("phone", "").strip()[:20],
            date_of_birth=date_of_birth,
            gender=gender,
            notes=data.get("notes", "").strip()[:2000],
        )

        return customer

    @staticmethod
    def update(customer, data):
        """
        Update customer fields safely.

        Args:
            customer: Customer instance
            data: dict with fields to update

        Returns:
            Updated Customer instance
        """
        update_fields = []

        if data.get("first_name") is not None:
            customer.first_name = data["first_name"].strip()
            update_fields.append("first_name")

        if data.get("last_name") is not None:
            customer.last_name = data["last_name"].strip()
            update_fields.append("last_name")

        if data.get("phone") is not None:
            customer.phone = data["phone"].strip()[:20]
            update_fields.append("phone")

        if data.get("date_of_birth") is not None:
            customer.date_of_birth = parse_date(data["date_of_birth"])
            update_fields.append("date_of_birth")

        if data.get("gender") is not None:
            customer.gender = data["gender"]
            update_fields.append("gender")

        if data.get("notes") is not None:
            customer.notes = data["notes"].strip()[:2000]
            update_fields.append("notes")

        if data.get("is_active") is not None:
            customer.is_active = data["is_active"]
            update_fields.append("is_active")

        if update_fields:
            customer.save(update_fields=update_fields + ["updated_at"])

        return customer

    @staticmethod
    def import_csv(tenant, df):
        """
        Import customers from a parsed DataFrame (CSV/Excel).

        Args:
            tenant: Tenant instance
            df: pandas DataFrame with customer data

        Returns:
            dict with import results (imported, skipped_duplicate, skipped_invalid, errors)
        """
        df.columns = [str(c).strip().lower().replace(" ", "_") for c in df.columns]

        def _find_col(keywords):
            for col in df.columns:
                if any(kw in col for kw in keywords):
                    return col
            return None

        col_first = _find_col(["nombre", "first_name", "first", "name"])
        col_last = _find_col(["apellido", "last_name", "last", "surname"])
        col_email = _find_col(["email", "correo", "mail", "e-mail"])
        col_phone = _find_col(
            ["telefono", "teléfono", "phone", "cel", "movil", "móvil"]
        )
        col_dob = _find_col(
            ["fecha_nac", "nacimiento", "birth", "dob", "fecha_de_nacimiento"]
        )
        col_gender = _find_col(["genero", "género", "gender", "sexo"])
        col_notes = _find_col(
            ["notas", "notes", "nota", "observaciones", "comentarios"]
        )
        col_total_spent = _find_col(
            ["gasto", "spent", "total_spent", "compras", "monto"]
        )
        col_total_visits = _find_col(
            ["visitas", "visits", "total_visits", "frecuencia", "scan"]
        )

        if not col_first or not col_email:
            raise ValueError(
                f"File must have at least 'nombre' and 'email' columns. "
                f"Detected: {list(df.columns)}"
            )

        existing_emails = set(
            Customer.objects.filter(tenant=tenant).values_list("email", flat=True)
        )

        seen_in_file = set()
        customers_to_create = []
        skipped_duplicate = 0
        skipped_invalid = 0
        errors = []

        for row_idx, row in df.iterrows():
            lineno = int(row_idx) + 2
            email_raw = str(row.get(col_email, "")).strip().lower()

            if not email_raw or not EMAIL_RE.match(email_raw):
                errors.append(
                    f"Row {lineno}: invalid email '{email_raw}' — skipped."
                )
                skipped_invalid += 1
                continue

            if email_raw in seen_in_file or email_raw in existing_emails:
                skipped_duplicate += 1
                continue

            first_name = str(row.get(col_first, "")).strip().title()
            if not first_name:
                errors.append(f"Row {lineno}: empty 'nombre' — skipped.")
                skipped_invalid += 1
                continue

            last_name = (
                str(row.get(col_last, "")).strip().title() if col_last else ""
            )
            phone = (
                re.sub(r"[^\d\+\- ]", "", str(row.get(col_phone, "")).strip())
                if col_phone
                else ""
            )
            phone = phone[:20]

            date_of_birth = None
            if col_dob:
                dob_raw = str(row.get(col_dob, "")).strip()
                if dob_raw:
                    try:
                        date_of_birth = parse_date(dob_raw)
                    except Exception:
                        date_of_birth = None

            gender = ""
            if col_gender:
                gender_raw = str(row.get(col_gender, "")).strip().lower()
                gender = GENDER_MAP.get(gender_raw, "")

            notes = (
                str(row.get(col_notes, "")).strip()[:2000] if col_notes else ""
            )

            total_spent = 0.0
            if col_total_spent:
                try:
                    spent_raw = re.sub(
                        r"[^\d\.]", "", str(row.get(col_total_spent, "0"))
                    )
                    total_spent = float(spent_raw) if spent_raw else 0.0
                except ValueError:
                    pass

            total_visits = 0
            if col_total_visits:
                try:
                    visits_raw = re.sub(
                        r"[^\d]", "", str(row.get(col_total_visits, "0"))
                    )
                    total_visits = int(visits_raw) if visits_raw else 0
                except ValueError:
                    pass

            seen_in_file.add(email_raw)
            customers_to_create.append(
                Customer(
                    tenant=tenant,
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

        if customers_to_create:
            for customer in customers_to_create:
                customer.referral_code = customer.generate_referral_code()
            Customer.objects.bulk_create(customers_to_create, batch_size=500)

        return {
            "imported": len(customers_to_create),
            "skipped_duplicate": skipped_duplicate,
            "skipped_invalid": skipped_invalid,
            "errors": errors[:20],
        }

    @staticmethod
    def search(tenant, query, limit=10):
        """
        Search customers by name, email, or phone.

        Args:
            tenant: Tenant instance
            query: Search string
            limit: Max results

        Returns:
            list of Customer instances
        """
        if not query or len(query.strip()) < 2:
            return []

        return list(
            Customer.objects.filter(
                tenant=tenant, is_active=True
            )
            .filter(
                Q(email__icontains=query)
                | Q(phone__icontains=query)
                | Q(first_name__icontains=query)
                | Q(last_name__icontains=query)
            )[:limit]
        )

    @staticmethod
    def enroll_in_program(tenant, customer, card, enrollment_method="manual"):
        """
        Enroll a customer in a loyalty program.

        Args:
            tenant: Tenant instance
            customer: Customer instance
            card: Card instance
            enrollment_method: How enrollment happened

        Returns:
            CustomerPass instance

        Raises:
            ValueError: If already enrolled
        """
        if CustomerPass.objects.filter(customer=customer, card=card).exists():
            raise ValueError(
                f"Customer {customer.email} is already enrolled in {card.name}"
            )

        pass_obj = CustomerPass.objects.create(customer=customer, card=card)

        Enrollment.objects.create(
            tenant=tenant,
            customer=customer,
            card=card,
            enrollment_method=enrollment_method,
        )

        return pass_obj
