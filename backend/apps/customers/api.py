"""
Loyallia — Customers API router.
Phase 5 implementation of customer + pass management endpoints.
"""

from typing import List, Optional
import pandas as pd
from ninja import Router, File
from ninja.files import UploadedFile
from ninja.errors import HttpError
from pydantic import BaseModel, EmailStr, field_validator
from django.shortcuts import get_object_or_404
from django.db.models import Q
from common.permissions import jwt_auth, is_owner, is_manager_or_owner
from common.messages import get_message
from apps.customers.models import Customer, CustomerPass
from apps.cards.models import Card

router = Router()


# =============================================================================
# SCHEMAS
# =============================================================================


class CustomerCreateIn(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    phone: Optional[str] = ""
    date_of_birth: Optional[str] = None  # ISO format date
    gender: Optional[str] = ""
    notes: Optional[str] = ""

    @field_validator("first_name", "last_name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        if len(v.strip()) < 1:
            raise ValueError("Name cannot be empty")
        return v.strip()

    @field_validator("gender")
    @classmethod
    def validate_gender(cls, v: str) -> str:
        if v and v not in ["M", "F", "O"]:
            raise ValueError("Gender must be M, F, or O")
        return v


class CustomerUpdateIn(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None

    @field_validator("first_name", "last_name")
    @classmethod
    def validate_name(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and len(v.strip()) < 1:
            raise ValueError("Name cannot be empty")
        return v.strip() if v else v


class CustomerOut(BaseModel):
    id: str
    first_name: str
    last_name: str
    email: str
    phone: str
    date_of_birth: Optional[str]
    gender: str
    referral_code: str
    is_active: bool
    total_visits: int
    total_spent: str  # Decimal as string
    last_visit: Optional[str]
    created_at: str
    updated_at: str

    @staticmethod
    def from_model(customer: Customer) -> "CustomerOut":
        return CustomerOut(
            id=str(customer.id),
            first_name=customer.first_name,
            last_name=customer.last_name,
            email=customer.email,
            phone=customer.phone,
            date_of_birth=customer.date_of_birth.isoformat()
            if customer.date_of_birth
            else None,
            gender=customer.gender,
            referral_code=customer.referral_code,
            is_active=customer.is_active,
            total_visits=customer.total_visits,
            total_spent=str(customer.total_spent),
            last_visit=customer.last_visit.isoformat() if customer.last_visit else None,
            created_at=customer.created_at.isoformat(),
            updated_at=customer.updated_at.isoformat(),
        )


class CustomerPassOut(BaseModel):
    id: str
    customer_id: str
    card_id: str
    card_name: str
    card_type: str
    qr_code: str
    is_active: bool
    enrolled_at: str
    last_updated: str
    wallet_urls: dict = {}

    @staticmethod
    def from_model(pass_obj: CustomerPass) -> "CustomerPassOut":
        pass_id = str(pass_obj.id)
        return CustomerPassOut(
            id=pass_id,
            customer_id=str(pass_obj.customer.id),
            card_id=str(pass_obj.card.id),
            card_name=pass_obj.card.name,
            card_type=pass_obj.card.card_type,
            qr_code=pass_obj.qr_code,
            is_active=pass_obj.is_active,
            enrolled_at=pass_obj.enrolled_at.isoformat(),
            last_updated=pass_obj.last_updated.isoformat(),
            wallet_urls={
                "apple": f"/api/v1/wallet/apple/{pass_id}/",
                "google": f"/api/v1/wallet/google/{pass_id}/",
                "status": f"/api/v1/wallet/status/{pass_id}/",
            },
        )


class MessageOut(BaseModel):
    success: bool
    message: str


# =============================================================================
# ENDPOINTS
# =============================================================================


class CustomerListOut(BaseModel):
    customers: List[CustomerOut]
    total: int


@router.get("/", auth=jwt_auth, response=CustomerListOut, summary="Listar clientes")
def list_customers(
    request, search: Optional[str] = None, limit: int = 50, offset: int = 0
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
    Processing pipeline:
      1. Parse file (CSV / XLSX / XLS)
      2. Normalize column names
      3. Validate & sanitize each row
      4. Deduplicate within the file (by email)
      5. Skip emails already in DB (no overwrite — unique per tenant)
      6. Map all supported Customer model fields
      7. bulk_create in batches of 500
    """
    if not is_owner(request):
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))
    import logging
    import re
    from django.utils.dateparse import parse_date

    logger = logging.getLogger(__name__)

    # ── 1. Parse file ───────────────────────────────────────────────────────
    filename = file.name.lower()
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

    # ── 2. Normalize column names ────────────────────────────────────────────
    df.columns = [str(c).strip().lower().replace(" ", "_") for c in df.columns]

    # Flexible fuzzy column detection for each field
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

    if not col_first or not col_email:
        raise HttpError(
            400,
            "El archivo debe tener al menos las columnas 'nombre' y 'email'. "
            f"Columnas detectadas: {list(df.columns)}",
        )

    # ── 3. Load existing DB emails for this tenant (dedup check) ────────────
    existing_emails: set[str] = set(
        Customer.objects.filter(tenant=request.tenant).values_list("email", flat=True)
    )

    # ── 4. Process rows ──────────────────────────────────────────────────────
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
        lineno = int(row_idx) + 2  # 1-indexed, +1 header

        # ── Email: required, valid format, lowercase ─────────────────────
        email_raw = str(row.get(col_email, "")).strip().lower()
        if not email_raw or not EMAIL_RE.match(email_raw):
            errors.append(f"Fila {lineno}: email inválido '{email_raw}' — omitida.")
            skipped_invalid += 1
            continue

        if email_raw in seen_in_file or email_raw in existing_emails:
            skipped_duplicate += 1
            continue

        # ── first_name: required, title-case ────────────────────────────
        first_name = str(row.get(col_first, "")).strip().title()
        if not first_name:
            errors.append(f"Fila {lineno}: 'nombre' vacío — omitida.")
            skipped_invalid += 1
            continue

        # ── Optional fields: sanitize ────────────────────────────────────
        last_name = str(row.get(col_last, "")).strip().title() if col_last else ""
        phone = (
            re.sub(r"[^\d\+\- ]", "", str(row.get(col_phone, "")).strip())
            if col_phone
            else ""
        )
        phone = phone[:20]  # enforce max_length

        # date_of_birth: attempt parse, silently ignore garbage
        date_of_birth = None
        if col_dob:
            dob_raw = str(row.get(col_dob, "")).strip()
            if dob_raw:
                try:
                    date_of_birth = parse_date(dob_raw)
                except Exception:
                    date_of_birth = None

        # gender: normalize to M/F/O or blank
        gender = ""
        if col_gender:
            gender_raw = str(row.get(col_gender, "")).strip().lower()
            gender = GENDER_MAP.get(gender_raw, "")

        notes = str(row.get(col_notes, "")).strip()[:2000] if col_notes else ""

        # ── Append to batch ──────────────────────────────────────────────
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
            )
        )

    # ── 5. Bulk insert in batches of 500 ────────────────────────────────────
    # bulk_create bypasses model.save(), so referral codes must be pre-generated.
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
            f"✅ {len(customers_to_create)} clientes importados. "
            f"Duplicados omitidos: {skipped_duplicate}. "
            f"Filas inválidas: {skipped_invalid}."
        ),
    }
    if errors:
        response_payload["errors"] = errors[:20]  # cap at 20 for readability
    return response_payload


@router.post(
    "/enroll/", response=CustomerPassOut, summary="Auto-inscripción de cliente"
)
def enroll_customer_public(request, card_id: str, customer_data: CustomerCreateIn):
    """Public endpoint for customer self-enrollment via QR code scan."""
    # Find the card
    try:
        card = Card.objects.select_related("tenant").get(id=card_id, is_active=True)
    except Card.DoesNotExist:
        raise HttpError(404, get_message("PROGRAM_NOT_FOUND"))

    # Parse date if provided
    date_of_birth = None
    if customer_data.date_of_birth:
        from django.utils.dateparse import parse_date

        date_of_birth = parse_date(customer_data.date_of_birth)

    # Check if customer already exists
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
        # Update existing customer info if provided
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

    # Check if already enrolled
    existing_pass = CustomerPass.objects.filter(customer=customer, card=card).first()
    if existing_pass:
        raise HttpError(400, get_message("ENROLLMENT_DUPLICATE", email=customer.email))

    # Create pass
    pass_obj = CustomerPass.objects.create(
        customer=customer,
        card=card,
    )

    # Create enrollment audit record
    from apps.transactions.models import Enrollment

    Enrollment.objects.create(
        tenant=card.tenant, customer=customer, card=card, enrollment_method="qr_scan"
    )

    # Fire automation trigger (non-blocking)
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

    # Generate QR code image asynchronously; do not fail enrollment if worker/broker is unavailable.
    from apps.customers.tasks import generate_qr_for_pass
    import logging

    try:
        generate_qr_for_pass.delay(str(pass_obj.id))
    except Exception:
        logging.getLogger(__name__).warning(
            "Could not queue QR generation task for pass %s; enrollment continues.",
            str(pass_obj.id),
            exc_info=True,
        )

    return CustomerPassOut.from_model(pass_obj)


# =============================================================================
# SEGMENTATION (Phase 9)
# =============================================================================

# Built-in segment definitions: {segment_id: {name, description, queryset_filter}}
_BUILTIN_SEGMENTS = {
    "all": {
        "name": "Todos los clientes",
        "description": "Todos los clientes activos",
        "filter": {"is_active": True},
    },
    "active": {
        "name": "Clientes activos",
        "description": "Clientes con al menos una visita en los últimos 30 días",
        "filter": {"is_active": True, "last_visit__isnull": False},
        "extra": "last_30d",
    },
    "at_risk": {
        "name": "En riesgo",
        "description": "Clientes sin visitas en 30-60 días",
        "filter": {"is_active": True},
        "extra": "at_risk",
    },
    "lost": {
        "name": "Clientes perdidos",
        "description": "Clientes sin visitas en más de 60 días",
        "filter": {"is_active": True},
        "extra": "lost",
    },
    "vip": {
        "name": "Clientes VIP",
        "description": "Top 10% de clientes por gasto total",
        "filter": {"is_active": True},
        "extra": "vip",
    },
}


def _apply_segment_filter(queryset, segment_id: str):
    """Apply segment filter to a Customer queryset."""
    from django.utils import timezone
    from datetime import timedelta
    from django.db.models import Q

    seg = _BUILTIN_SEGMENTS.get(segment_id)
    if not seg:
        return queryset.none()

    base = queryset.filter(**seg["filter"])
    extra = seg.get("extra")

    if extra == "last_30d":
        cutoff = timezone.now() - timedelta(days=30)
        return base.filter(last_visit__gte=cutoff)
    elif extra == "at_risk":
        now = timezone.now()
        return base.filter(
            last_visit__gte=now - timedelta(days=60),
            last_visit__lt=now - timedelta(days=30),
        )
    elif extra == "lost":
        cutoff = timezone.now() - timedelta(days=60)
        return base.filter(
            Q(last_visit__lt=cutoff) | Q(last_visit__isnull=True, created_at__lt=cutoff)
        )
    elif extra == "vip":
        # Top 10% by total_spent — sorted slice, no DB-specific aggregate needed
        count = base.count()
        if count == 0:
            return base.none()
        threshold_index = max(0, int(count * 0.9))
        sorted_spends = list(
            base.order_by("total_spent").values_list("total_spent", flat=True)
        )
        threshold = (
            sorted_spends[threshold_index]
            if threshold_index < len(sorted_spends)
            else sorted_spends[-1]
        )
        return base.filter(total_spent__gte=threshold)

    return base


@router.get("/segments/", auth=jwt_auth, summary="Listar segmentos de clientes")
def list_segments(request):
    """List all available customer segments with their current member count."""
    results = []
    base_queryset = Customer.objects.filter(tenant=request.tenant)

    for seg_id, seg_def in _BUILTIN_SEGMENTS.items():
        count = _apply_segment_filter(base_queryset, seg_id).count()
        results.append(
            {
                "id": seg_id,
                "name": seg_def["name"],
                "description": seg_def["description"],
                "member_count": count,
                "type": "builtin",
            }
        )

    return {"segments": results}


@router.post("/segments/", auth=jwt_auth, summary="Crear segmento personalizado")
def create_segment(request):
    """
    Phase 9: Custom segments require a Segment model (not yet implemented).
    Currently returns the list of built-in segments as a reference.
    This endpoint returns 200 with a message explaining the current state.
    """
    return {
        "message": get_message("SERVER_ERROR"),
        "available_segments": list(_BUILTIN_SEGMENTS.keys()),
        "note": "Custom segment persistence requires Phase 9 model. Use built-in segment IDs.",
    }


@router.get(
    "/segments/{segment_id}/members/", auth=jwt_auth, summary="Miembros del segmento"
)
def segment_members(request, segment_id: str, limit: int = 50, offset: int = 0):
    """Returns members of a segment with pagination."""
    if segment_id not in _BUILTIN_SEGMENTS:
        raise HttpError(404, get_message("NOT_FOUND"))

    base_queryset = Customer.objects.filter(tenant=request.tenant)
    members = _apply_segment_filter(base_queryset, segment_id).order_by(
        "-last_visit", "-created_at"
    )
    total = members.count()

    return {
        "segment_id": segment_id,
        "segment_name": _BUILTIN_SEGMENTS[segment_id]["name"],
        "total": total,
        "members": [
            CustomerOut.from_model(c) for c in members[offset : offset + limit]
        ],
    }


@router.get(
    "/segments/{segment_id}/export/", auth=jwt_auth, summary="Exportar segmento a CSV"
)
def export_segment(request, segment_id: str):
    """CSV export of segment members."""
    from django.http import StreamingHttpResponse

    if segment_id not in _BUILTIN_SEGMENTS:
        raise HttpError(404, get_message("NOT_FOUND"))

    base_queryset = Customer.objects.filter(tenant=request.tenant)
    members = _apply_segment_filter(base_queryset, segment_id).order_by("-created_at")

    def generate_rows():
        yield "id,first_name,last_name,email,phone,total_visits,total_spent,last_visit,created_at\n"
        for customer in members.iterator(chunk_size=500):
            yield (
                f"{customer.id},{customer.first_name},{customer.last_name},"
                f"{customer.email},{customer.phone},{customer.total_visits},"
                f"{customer.total_spent},"
                f"{customer.last_visit.isoformat() if customer.last_visit else ''},"
                f"{customer.created_at.isoformat()}\n"
            )

    seg_name = _BUILTIN_SEGMENTS[segment_id]["name"].replace(" ", "_").lower()
    response = StreamingHttpResponse(generate_rows(), content_type="text/csv")
    response["Content-Disposition"] = f'attachment; filename="segment_{seg_name}.csv"'
    return response


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


@router.delete("/{customer_id}/", auth=jwt_auth, summary="Eliminar cliente permanentemente")
def delete_customer(request, customer_id: str):
    """Permanent delete of a customer and all associated data. OWNER only."""
    from common.permissions import is_owner

    if not is_owner(request):
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))

    customer = get_object_or_404(Customer, id=customer_id, tenant=request.tenant)

    # Permanent delete (triggers cascading delete for passes, transactions, enrollments)
    customer.delete()

    return {"success": True, "message": "Cliente eliminado permanentemente"}


@router.get(
    "/{customer_id}/passes/",
    auth=jwt_auth,
    response=List[CustomerPassOut],
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

    # Check if already enrolled
    if CustomerPass.objects.filter(customer=customer, card=card).exists():
        raise HttpError(400, get_message("ENROLLMENT_DUPLICATE", email=customer.email))

    # Create pass
    pass_obj = CustomerPass.objects.create(
        customer=customer,
        card=card,
    )

    # Create enrollment record
    from apps.transactions.models import Enrollment

    Enrollment.objects.create(
        tenant=request.tenant, customer=customer, card=card, enrollment_method="manual"
    )

    # Fire automation trigger (non-blocking)
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

    # Generate QR code image asynchronously; do not fail enrollment if worker/broker is unavailable.
    from apps.customers.tasks import generate_qr_for_pass
    import logging

    try:
        generate_qr_for_pass.delay(str(pass_obj.id))
    except Exception:
        logging.getLogger(__name__).warning(
            "Could not queue QR generation task for pass %s; enrollment continues.",
            str(pass_obj.id),
            exc_info=True,
        )

    return CustomerPassOut.from_model(pass_obj)
