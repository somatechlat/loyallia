"""
Loyallia — Super Admin API Schemas (Pydantic models)
Used by all super_admin_api endpoint modules.
"""

from datetime import datetime

from pydantic import BaseModel, EmailStr

from apps.billing.models import SubscriptionPlan
from apps.tenants.models import Location, Tenant

# =============================================================================
# TENANT SCHEMAS
# =============================================================================


class TenantAdminOut(BaseModel):
    id: str
    name: str
    slug: str
    plan: str
    is_active: bool
    trial_days_remaining: int
    country: str
    ruc: str
    cedula: str
    entity_type: str
    legal_name: str
    industry: str
    province: str
    city: str
    email: str
    phone: str
    created_at: datetime
    user_count: int
    location_count: int

    @classmethod
    def from_tenant(cls, t: Tenant) -> "TenantAdminOut":
        return cls(
            id=str(t.id),
            name=t.name,
            slug=t.slug,
            plan=t.plan,
            is_active=t.is_active,
            trial_days_remaining=t.trial_days_remaining,
            country=t.country,
            ruc=t.ruc,
            cedula=getattr(t, "cedula", ""),
            entity_type=getattr(t, "entity_type", "juridica"),
            legal_name=t.legal_name,
            industry=t.industry,
            province=t.province,
            city=t.city,
            email=t.email,
            phone=t.phone,
            created_at=t.created_at,
            user_count=t.users.count(),
            location_count=t.locations.count(),
        )


class LocationIn(BaseModel):
    name: str
    address: str = ""
    city: str = ""
    latitude: float | None = None
    longitude: float | None = None
    is_primary: bool = False


class LocationOut(BaseModel):
    id: str
    name: str
    address: str
    city: str
    latitude: float | None
    longitude: float | None
    is_primary: bool
    is_active: bool

    @classmethod
    def from_location(cls, loc: Location) -> "LocationOut":
        return cls(
            id=str(loc.id),
            name=loc.name,
            address=loc.address,
            city=loc.city,
            latitude=float(loc.latitude) if loc.latitude else None,
            longitude=float(loc.longitude) if loc.longitude else None,
            is_primary=loc.is_primary,
            is_active=loc.is_active,
        )


class CreateTenantWizardIn(BaseModel):
    """Full 4-step wizard payload for creating a tenant."""

    # Step 1 — Entity Type + Company Data
    entity_type: str = "juridica"
    name: str
    legal_name: str = ""
    ruc: str = ""
    cedula: str = ""
    industry: str = "other"
    province: str = ""
    city: str = ""
    address: str = ""
    phone: str = ""
    email: str = ""
    website: str = ""
    # Step 2 — Owner
    owner_email: EmailStr
    owner_first_name: str
    owner_last_name: str
    owner_cedula: str = ""
    # Step 3 — Locations
    locations: list[LocationIn] = []
    # Step 4 — Plan
    plan_slug: str = "starter"
    billing_cycle: str = "monthly"


class TenantAdminUpdateIn(BaseModel):
    name: str | None = None
    legal_name: str | None = None
    ruc: str | None = None
    industry: str | None = None
    province: str | None = None
    city: str | None = None
    address: str | None = None
    phone: str | None = None
    email: str | None = None
    website: str | None = None
    plan: str | None = None
    is_active: bool | None = None


# =============================================================================
# COMMON SCHEMAS
# =============================================================================


class CreateTenantOut(BaseModel):
    success: bool
    message: str
    tenant_id: str
    owner_id: str


class PlatformMetricsOut(BaseModel):
    total_tenants: int
    active_tenants: int
    trial_tenants: int
    suspended_tenants: int
    total_users: int
    total_locations: int
    total_customers: int
    mrr: float
    recent_tenants: list


class MessageOut(BaseModel):
    success: bool
    message: str


class ExtendTrialIn(BaseModel):
    days: int


class BroadcastIn(BaseModel):
    subject: str
    message: str


class ImpersonateOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    impersonated_tenant_id: str
    impersonated_user_id: str


class InvoiceOut(BaseModel):
    id: str
    invoice_number: str
    subtotal: float
    tax_amount: float
    total: float
    status: str
    period_start: datetime
    period_end: datetime
    paid_at: datetime | None = None
    created_at: datetime


# =============================================================================
# PLAN SCHEMAS
# =============================================================================


class PlanOut(BaseModel):
    id: str
    name: str
    slug: str
    description: str
    price_monthly: float
    price_annual: float
    max_locations: int
    max_users: int
    max_customers: int
    max_programs: int
    features: list
    is_active: bool
    is_featured: bool
    trial_days: int
    sort_order: int

    @classmethod
    def from_plan(cls, p: SubscriptionPlan) -> "PlanOut":
        return cls(
            id=str(p.id),
            name=p.name,
            slug=p.slug,
            description=p.description,
            price_monthly=float(p.price_monthly),
            price_annual=float(p.price_annual),
            max_locations=p.max_locations,
            max_users=p.max_users,
            max_customers=p.max_customers,
            max_programs=p.max_programs,
            features=p.features,
            is_active=p.is_active,
            is_featured=p.is_featured,
            trial_days=p.trial_days,
            sort_order=p.sort_order,
        )


class PlanCreateIn(BaseModel):
    name: str
    slug: str
    description: str = ""
    price_monthly: float = 0
    price_annual: float = 0
    max_locations: int = 1
    max_users: int = 3
    max_customers: int = 500
    max_programs: int = 1
    features: list = []
    is_featured: bool = False
    trial_days: int = 14
    sort_order: int = 0


class PlanUpdateIn(BaseModel):
    name: str | None = None
    description: str | None = None
    price_monthly: float | None = None
    price_annual: float | None = None
    max_locations: int | None = None
    max_users: int | None = None
    max_customers: int | None = None
    max_programs: int | None = None
    features: list | None = None
    is_featured: bool | None = None
    is_active: bool | None = None
    trial_days: int | None = None
    sort_order: int | None = None
