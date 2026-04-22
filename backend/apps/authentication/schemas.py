"""
Loyallia — Authentication API Schemas (Pydantic models)
"""

from datetime import datetime

from pydantic import BaseModel, EmailStr, field_validator

from apps.authentication.models import User, UserRole


class RegisterIn(BaseModel):
    business_name: str
    email: EmailStr
    password: str
    first_name: str = ""
    last_name: str = ""
    phone_number: str = ""

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("La contrasena debe tener al menos 8 caracteres.")
        return v

    @field_validator("business_name")
    @classmethod
    def business_name_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("El nombre del negocio es obligatorio.")
        return v


class RegisterOut(BaseModel):
    success: bool
    message: str
    tenant_id: str
    user_id: str


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class TokenOut(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user_id: str
    tenant_id: str | None
    role: str


class RefreshIn(BaseModel):
    refresh_token: str


class RefreshOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


class LogoutIn(BaseModel):
    refresh_token: str


class MessageOut(BaseModel):
    success: bool
    message: str


class PasswordResetRequestIn(BaseModel):
    email: EmailStr


class PasswordResetConfirmIn(BaseModel):
    email: EmailStr
    otp: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("La contrasena debe tener al menos 8 caracteres.")
        return v


class VerifyEmailIn(BaseModel):
    email: EmailStr
    otp: str


class InviteIn(BaseModel):
    email: EmailStr
    role: str
    first_name: str = ""
    last_name: str = ""

    @field_validator("role")
    @classmethod
    def role_must_be_valid(cls, v: str) -> str:
        allowed = {UserRole.MANAGER, UserRole.STAFF}
        if v not in allowed:
            raise ValueError(f"Rol invalido. Permitidos: {', '.join(allowed)}")
        return v


class UserOut(BaseModel):
    id: str
    email: str
    first_name: str
    last_name: str
    role: str
    is_active: bool
    is_email_verified: bool
    date_joined: datetime

    @classmethod
    def from_user(cls, user: User) -> "UserOut":
        return cls(
            id=str(user.id),
            email=user.email,
            first_name=user.first_name,
            last_name=user.last_name,
            role=user.role,
            is_active=user.is_active,
            is_email_verified=user.is_email_verified,
            date_joined=user.date_joined,
        )


class ProfileUpdateIn(BaseModel):
    first_name: str | None = None
    last_name: str | None = None


class ChangePasswordIn(BaseModel):
    current_password: str
    new_password: str


class ForgotPasswordIn(BaseModel):
    """Schema for requesting a password reset link."""

    email: EmailStr


class ResetPasswordIn(BaseModel):
    """Schema for confirming a password reset with a token."""

    uid: str
    token: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("La contrasena debe tener al menos 6 caracteres")
        return v


class GoogleTokenIn(BaseModel):
    """Schema for Google OAuth: frontend sends the Google ID token or authorization code."""

    credential: str
    business_name: str = ""


class PhoneVerifyRequestIn(BaseModel):
    """Request phone number verification OTP."""

    phone_number: str

    @field_validator("phone_number")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        import re

        v = v.strip()
        # Accept E.164 format: +[country_code][number], 8-15 digits
        if not re.match(r"^\+[1-9]\d{7,14}$", v):
            raise ValueError(
                "Formato inválido. Usa formato internacional: +593991234567"
            )
        return v


class PhoneVerifyConfirmIn(BaseModel):
    """Confirm phone verification with OTP code."""

    phone_number: str
    otp: str
