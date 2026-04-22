"""
Loyallia — Customers API router.
Phase 5 implementation of customer + pass management endpoints.
"""

import logging

import pandas as pd
from django.db.models import Q
from django.shortcuts import get_object_or_404
from ninja import File, Router
from ninja.errors import HttpError
from ninja.files import UploadedFile

from apps.cards.models import Card
from apps.customers.models import Customer, CustomerPass
from apps.customers.schemas import (
    CustomerCreateIn,
    CustomerListOut,
    CustomerOut,
    CustomerPassOut,
    CustomerUpdateIn,
)
from common.messages import get_message
from common.permissions import is_manager_or_owner, is_owner, jwt_auth

logger = logging.getLogger(__name__)
router = Router()


# =============================================================================
# ENDPOINTS
# =============================================================================


@router.get("/", auth=jwt_auth, response=CustomerListOut, summary="Listar clientes")
def list_customers(
    request, search: str | None = None, limit: int = 50, offset: int = 0
):
    """List customers for the current tenant with optional search. MANAGER+ only."""
    if not is_manager_or_owner(request):
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))
    queryset = Customer.objects.filter(tenant=request.tenant)

    if search:
        queryset = queryset.filter(
            Q(first_name__icontains=search)
            | Q(last_name__icontains=search)
            | Q(email__icontains=search)
            | Q(phone__icontains=search)
        )

    customers = queryset.order_by("-created_at")[offset : offset + limit]
    total = queryset.count()
    return {"customers": [CustomerOut.from_model(c) for c in customers], "total": total}


@router.post(
    "/import/", auth=jwt_auth, summary="Importar clientes desde archivo (XLSX, CSV)"
)
def import_customers(request, file: UploadedFile = File(...)):
    """
    Import customers from an Excel or CSV file. OWNER only.
    Processing: Parse → Normalize columns → Validate → Deduplicate → bulk_create
    """
    if not is_owner(request):
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))

    import re

    from django.utils.dateparse import parse_date

    filename = file.name.lower()
    
    # SECURITY HARDENING: Prevent OOM (Memory Exhaustion) Attacks
    # Limit max upload size to 5MB before allowing pandas to load it into RAM.
    MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB
    if file.size > MAX_FILE_SIZE:
        raise HttpError(413, "El archivo es demasiado grande. El límite máximo es 5MB para proteger la estabilidad del sistema.")

    try:
        if filename.endswith(".csv"):
            df = pd.read_csv(file.file, dtype=str, keep_default_na=False)
        elif filename.endswith((".xlsx", ".xls")):
            df = pd.read_excel(file.file, dtype=str, keep_default_na=False)
        else:
            raise HttpError(400, get_message("CUSTOMER_IMPORT_INVALID_FORMAT"))
    except HttpError:
        raise
    except Exception as exc:
        logger.error("Error parsing import file: %s", exc)
        raise HttpError(400, get_message("CUSTOMER_IMPORT_FILE_CORRUPT"))

    if df.empty:
        raise HttpError(400, get_message("CUSTOMER_IMPORT_FILE_EMPTY"))

    df.columns = [str(c).strip().lower().replace(" ", "_") for c in df.columns]

    def _find_col(keywords: list) -> str | None:
        for col in df.columns:
            if any(kw in col for kw in keywords):
                return col
        return None

    col_first = _find_col(["nombre", "first_name", "first", "name"])
    col_last = _find_col(["apellido", "last_name", "last", "surname"])
    col_email = _find_col(["email", "correo", "mail", "e-mail"])
    col_phone = _find_col(["telefono", "teléfono", "phone", "cel", "movil", "móvil"])
    col_dob = _find_col(
        ["fecha_nac", "nacimiento", "birth", "dob", "fecha_de_nacimiento"]
    )
    col_gender = _find_col(["genero", "género", "gender", "sexo"])
    col_notes = _find_col(["notas", "notes", "nota", "observaciones", "comentarios"])
    col_total_spent = _find_col(["gasto", "spent", "total_spent", "compras", "monto"])
    col_total_visits = _find_col(["visitas", "visits", "total_visits", "frecuencia", "scan"])

    if not col_first or not col_email:
        raise HttpError(
            400,
            f"El archivo debe tener al menos las columnas 'nombre' y 'email'. "
            f"Columnas detectadas: {list(df.columns)}",
        )

    existing_emails: set[str] = set(
        Customer.objects.filter(tenant=request.tenant).values_list("email", flat=True)
    )

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

    seen_in_file: set[str] = set()
    customers_to_create: list[Customer] = []
    skipped_duplicate = 0
    skipped_invalid = 0
    errors: list[str] = []

    for row_idx, row in df.iterrows():
        lineno = int(row_idx) + 2
        email_raw = str(row.get(col_email, "")).strip().lower()
        if not email_raw or not EMAIL_RE.match(email_raw):
            errors.append(f"Fila {lineno}: email invalido '{email_raw}' -- omitida.")
            skipped_invalid += 1
            continue
        if email_raw in seen_in_file or email_raw in existing_emails:
            skipped_duplicate += 1
            continue

        first_name = str(row.get(col_first, "")).strip().title()
        if not first_name:
            errors.append(f"Fila {lineno}: 'nombre' vacio -- omitida.")
            skipped_invalid += 1
            continue

        last_name = str(row.get(col_last, "")).strip().title() if col_last else ""
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

        notes = str(row.get(col_notes, "")).strip()[:2000] if col_notes else ""

        # KPI Metrics: Safely cast to float and int, fallback to 0
        total_spent = 0.0
        if col_total_spent:
            try:
                # Remove currency symbols and commas
                spent_raw = re.sub(r"[^\d\.]", "", str(row.get(col_total_spent, "0")))
                total_spent = float(spent_raw) if spent_raw else 0.0
            except ValueError:
                pass
                
        total_visits = 0
        if col_total_visits:
            try:
                visits_raw = re.sub(r"[^\d]", "", str(row.get(col_total_visits, "0")))
                total_visits = int(visits_raw) if visits_raw else 0
            except ValueError:
                pass

        seen_in_file.add(email_raw)
        customers_to_create.append(
            Customer(
                tenant=request.tenant,
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

    response_payload = {
        "success": True,
        "imported": len(customers_to_create),
        "skipped_duplicate": skipped_duplicate,
        "skipped_invalid": skipped_invalid,
        "message": (
            f"{len(customers_to_create)} clientes importados. "
            f"Duplicados omitidos: {skipped_duplicate}. "
            f"Filas invalidas: {skipped_invalid}."
        ),
    }
    if errors:
        response_payload["errors"] = errors[:20]
    return response_payload


@router.post(
    "/enroll/", response=CustomerPassOut, summary="Auto-inscripcion de cliente"
)
def enroll_customer_public(request, card_id: str, customer_data: CustomerCreateIn):
    """Public endpoint for customer self-enrollment via QR code scan."""
    try:
        card = Card.objects.select_related("tenant").get(id=card_id, is_active=True)
    except Card.DoesNotExist:
        raise HttpError(404, get_message("PROGRAM_NOT_FOUND"))

    date_of_birth = None
    if customer_data.date_of_birth:
        from django.utils.dateparse import parse_date

        date_of_birth = parse_date(customer_data.date_of_birth)

    customer, created = Customer.objects.get_or_create(
        tenant=card.tenant,
        email=customer_data.email,
        defaults={
            "first_name": customer_data.first_name,
            "last_name": customer_data.last_name,
            "phone": customer_data.phone,
            "date_of_birth": date_of_birth,
            "gender": customer_data.gender,
            "notes": customer_data.notes,
        },
    )

    if not created:
        if customer_data.first_name:
            customer.first_name = customer_data.first_name
        if customer_data.last_name:
            customer.last_name = customer_data.last_name
        if customer_data.phone:
            customer.phone = customer_data.phone
        if customer_data.date_of_birth:
            customer.date_of_birth = date_of_birth
        if customer_data.gender:
            customer.gender = customer_data.gender
        if customer_data.notes:
            customer.notes = customer_data.notes
        customer.save()

    existing_pass = CustomerPass.objects.filter(customer=customer, card=card).first()
    if existing_pass:
        raise HttpError(400, get_message("ENROLLMENT_DUPLICATE", email=customer.email))

    # Extract any dynamic extra fields from the Pydantic model
    standard_fields = {"first_name", "last_name", "email", "phone", "date_of_birth", "gender", "notes"}
    dynamic_fields = {k: v for k, v in customer_data.model_dump().items() if k not in standard_fields}

    pass_obj = CustomerPass.objects.create(customer=customer, card=card)
    
    # Store custom enrollment metadata in pass_data
    if dynamic_fields:
        pass_obj.update_pass_data({"enrollment_data": dynamic_fields})

    from apps.transactions.models import Enrollment

    Enrollment.objects.create(
        tenant=card.tenant, customer=customer, card=card, enrollment_method="qr_scan"
    )

    from apps.automation.engine import fire_trigger_async

    fire_trigger_async(
        trigger="customer_enrolled",
        customer_id=str(customer.id),
        context={
            "card_id": str(card.id),
            "card_type": card.card_type,
            "method": "qr_scan",
            "is_new_customer": created,
        },
    )

    from apps.customers.tasks import generate_qr_for_pass

    try:
        generate_qr_for_pass.delay(str(pass_obj.id))
    except Exception:
        logger.warning(
            "Could not queue QR generation task for pass %s",
            str(pass_obj.id),
            exc_info=True,
        )

    return CustomerPassOut.from_model(pass_obj)


# =============================================================================
# CUSTOMER CRUD
# =============================================================================


@router.get(
    "/{customer_id}/", auth=jwt_auth, response=CustomerOut, summary="Perfil del cliente"
)
def get_customer(request, customer_id: str):
    """Customer profile with pass and transaction history."""
    customer = get_object_or_404(Customer, id=customer_id, tenant=request.tenant)
    return CustomerOut.from_model(customer)


@router.patch(
    "/{customer_id}/", auth=jwt_auth, response=CustomerOut, summary="Actualizar cliente"
)
def update_customer(request, customer_id: str, data: CustomerUpdateIn):
    """Update customer information. OWNER only."""
    if not is_owner(request):
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))
    customer = get_object_or_404(Customer, id=customer_id, tenant=request.tenant)

    update_fields = []
    if data.first_name is not None:
        customer.first_name = data.first_name
        update_fields.append("first_name")
    if data.last_name is not None:
        customer.last_name = data.last_name
        update_fields.append("last_name")
    if data.phone is not None:
        customer.phone = data.phone
        update_fields.append("phone")
    if data.date_of_birth is not None:
        from django.utils.dateparse import parse_date

        customer.date_of_birth = parse_date(data.date_of_birth)
        update_fields.append("date_of_birth")
    if data.gender is not None:
        customer.gender = data.gender
        update_fields.append("gender")
    if data.notes is not None:
        customer.notes = data.notes
        update_fields.append("notes")
    if data.is_active is not None:
        customer.is_active = data.is_active
        update_fields.append("is_active")
    if update_fields:
        customer.save(update_fields=update_fields + ["updated_at"])
    return CustomerOut.from_model(customer)


@router.delete(
    "/{customer_id}/", auth=jwt_auth, summary="Eliminar cliente permanentemente"
)
def delete_customer(request, customer_id: str):
    """Permanent delete of a customer and all associated data. OWNER only."""
    if not is_owner(request):
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))
    customer = get_object_or_404(Customer, id=customer_id, tenant=request.tenant)
    customer.delete()
    return {"success": True, "message": "Cliente eliminado permanentemente"}


@router.get(
    "/{customer_id}/passes/",
    auth=jwt_auth,
    response=list[CustomerPassOut],
    summary="Pases del cliente",
)
def get_customer_passes(request, customer_id: str):
    """Get all passes for a customer."""
    customer = get_object_or_404(Customer, id=customer_id, tenant=request.tenant)
    passes = CustomerPass.objects.filter(customer=customer).select_related("card")
    return [CustomerPassOut.from_model(pass_obj) for pass_obj in passes]


@router.post(
    "/{customer_id}/enroll/",
    auth=jwt_auth,
    response=CustomerPassOut,
    summary="Inscribir cliente en programa",
)
def enroll_customer(request, customer_id: str, card_id: str):
    """Enroll customer in a loyalty program. OWNER only."""
    if not is_owner(request):
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))
    customer = get_object_or_404(Customer, id=customer_id, tenant=request.tenant)
    card = get_object_or_404(Card, id=card_id, tenant=request.tenant, is_active=True)

    if CustomerPass.objects.filter(customer=customer, card=card).exists():
        raise HttpError(400, get_message("ENROLLMENT_DUPLICATE", email=customer.email))

    pass_obj = CustomerPass.objects.create(customer=customer, card=card)

    from apps.transactions.models import Enrollment

    Enrollment.objects.create(
        tenant=request.tenant, customer=customer, card=card, enrollment_method="manual"
    )

    from apps.automation.engine import fire_trigger_async

    fire_trigger_async(
        trigger="customer_enrolled",
        customer_id=str(customer.id),
        context={
            "card_id": str(card.id),
            "card_type": card.card_type,
            "method": "manual",
        },
    )

    from apps.customers.tasks import generate_qr_for_pass

    try:
        generate_qr_for_pass.delay(str(pass_obj.id))
    except Exception:
        logger.warning(
            "Could not queue QR generation task for pass %s",
            str(pass_obj.id),
            exc_info=True,
        )

    return CustomerPassOut.from_model(pass_obj)
