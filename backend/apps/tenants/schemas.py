"""
Loyallia — Tenants API Schemas (Pydantic models)
"""

from pydantic import BaseModel, EmailStr

from apps.tenants.models import Location, Tenant


class TenantOut(BaseModel):
    id: str
    name: str
    slug: str
    plan: str
    is_active: bool
    trial_days_remaining: int
    logo_url: str
    primary_color: str
    secondary_color: str
    country: str
    timezone: str
    phone: str
    website: str
    address: str

    @classmethod
    def from_tenant(cls, t: Tenant) -> "TenantOut":
        return cls(
            id=str(t.id),
            name=t.name,
            slug=t.slug,
            plan=t.plan,
            is_active=t.is_active,
            trial_days_remaining=t.trial_days_remaining,
            logo_url=t.logo_url,
            primary_color=t.primary_color,
            secondary_color=t.secondary_color,
            country=t.country,
            timezone=t.timezone,
            phone=t.phone,
            website=t.website,
            address=t.address,
        )


class TenantUpdateIn(BaseModel):
    name: str | None = None
    logo_url: str | None = None
    primary_color: str | None = None
    secondary_color: str | None = None
    phone: str | None = None
    website: str | None = None
    address: str | None = None
    timezone: str | None = None


class LocationOut(BaseModel):
    id: str
    name: str
    address: str
    city: str
    country: str
    latitude: float | None
    longitude: float | None
    phone: str
    is_active: bool
    is_primary: bool

    @classmethod
    def from_location(cls, loc: Location) -> "LocationOut":
        return cls(
            id=str(loc.id),
            name=loc.name,
            address=loc.address,
            city=loc.city,
            country=loc.country,
            latitude=float(loc.latitude) if loc.latitude is not None else None,
            longitude=float(loc.longitude) if loc.longitude is not None else None,
            phone=loc.phone,
            is_active=loc.is_active,
            is_primary=loc.is_primary,
        )


class LocationCreateIn(BaseModel):
    name: str
    address: str = ""
    city: str = ""
    country: str = "EC"
    latitude: float | None = None
    longitude: float | None = None
    phone: str = ""
    is_primary: bool = False


class LocationUpdateIn(BaseModel):
    name: str | None = None
    address: str | None = None
    city: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    phone: str | None = None
    is_active: bool | None = None
    is_primary: bool | None = None


class MessageOut(BaseModel):
    success: bool
    message: str


class TeamMemberOut(BaseModel):
    id: str
    email: str
    first_name: str
    last_name: str
    role: str
    is_active: bool
    date_joined: str

    @classmethod
    def from_user(cls, u) -> "TeamMemberOut":
        return cls(
            id=str(u.id),
            email=u.email,
            first_name=u.first_name,
            last_name=u.last_name,
            role=u.role,
            is_active=u.is_active,
            date_joined=u.date_joined.isoformat(),
        )


class TeamMemberCreateIn(BaseModel):
    email: EmailStr
    first_name: str
    last_name: str
    role: str

    class Config:
        json_schema_extra = {
            "example": {
                "email": "nuevo@ejemplo.com",
                "first_name": "Juan",
                "last_name": "Perez",
                "role": "staff",
            }
        }


class TeamMemberUpdateIn(BaseModel):
    role: str | None = None
    is_active: bool | None = None
