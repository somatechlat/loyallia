"""
Loyallia — Customer API Schemas (Pydantic models)
"""

from pydantic import BaseModel, EmailStr, field_validator

from apps.customers.models import Customer, CustomerPass


class CustomerCreateIn(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    phone: str | None = ""
    date_of_birth: str | None = None
    gender: str | None = ""
    notes: str | None = ""

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
    first_name: str | None = None
    last_name: str | None = None
    phone: str | None = None
    date_of_birth: str | None = None
    gender: str | None = None
    notes: str | None = None
    is_active: bool | None = None

    @field_validator("first_name", "last_name")
    @classmethod
    def validate_name(cls, v: str | None) -> str | None:
        if v is not None and len(v.strip()) < 1:
            raise ValueError("Name cannot be empty")
        return v.strip() if v else v


class CustomerOut(BaseModel):
    id: str
    first_name: str
    last_name: str
    email: str
    phone: str
    date_of_birth: str | None
    gender: str
    referral_code: str
    is_active: bool
    total_visits: int
    total_spent: str
    last_visit: str | None
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
            date_of_birth=(
                customer.date_of_birth.isoformat() if customer.date_of_birth else None
            ),
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


class CustomerListOut(BaseModel):
    customers: list[CustomerOut]
    total: int
