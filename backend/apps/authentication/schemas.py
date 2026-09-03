"""
Loyallia Authentication API Schemas (Pydantic models)
"""

from datetime import datetime

from pydantic import BaseModel, EmailStr, field_validator

from apps.authentication.models import User, UserRole
from common.messages import get_message


class RegisterIn(BaseModel):
    """Schema for user registration with business and account details."""

    business_name: str
    email: EmailStr
    password: str
    first_name: str = ""
    last_name: str = ""
    phone_number: str = ""
    phone_verification_sid: str = ""  # Twilio Verify SID (optional)

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        """Ensure password has at least 8 characters."""
        if len(v) < 8:
            raise ValueError(get_message("AUTH_PASSWORD_MIN_LENGTH_8"))
        return v

    @field_validator("business_name")
    @classmethod
    def business_name_not_empty(cls, v: str) -> str:
        """Ensure business name is not empty after stripping."""
        v = v.strip()
        if not v:
            raise ValueError(get_message("AUTH_BUSINESS_NAME_REQUIRED"))
        return v


class RegisterOut(BaseModel):
    """Response schema for successful registration."""

    success: bool
    message: str
    tenant_id: str
    user_id: str
    existing_email: bool = False  # True when email already exists (privacy-safe)


class LoginIn(BaseModel):
    """Schema for email and password login."""

    email: EmailStr
    password: str


class TokenOut(BaseModel):
    """Response schema for JWT access and refresh tokens."""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user_id: str
    tenant_id: str | None
    role: str


class RefreshIn(BaseModel):
    """Schema for refreshing an access token using a refresh token."""

    refresh_token: str


class RefreshOut(BaseModel):
    """Response schema for a refreshed access token."""

    access_token: str
    token_type: str = "bearer"


class LogoutIn(BaseModel):
    """Schema for logging out by revoking a refresh token."""

    refresh_token: str


class VerifyEmailIn(BaseModel):
    """Schema for verifying an email address with an OTP."""

    email: EmailStr
    otp: str


class InviteIn(BaseModel):
    """Schema for inviting a new team member."""

    email: EmailStr
    role: str
    first_name: str = ""
    last_name: str = ""

    @field_validator("role")
    @classmethod
    def role_must_be_valid(cls, v: str) -> str:
        """Ensure the invited role is either MANAGER or STAFF."""
        allowed = {UserRole.MANAGER, UserRole.STAFF}
        if v not in allowed:
            raise ValueError(get_message("AUTH_INVALID_ROLE", allowed=", ".join(allowed)))
        return v


class UserOut(BaseModel):
    """Public user profile representation."""

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
        """Build a UserOut instance from a User model."""
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
    """Schema for updating the authenticated user's profile."""

    first_name: str | None = None
    last_name: str | None = None


class ChangePasswordIn(BaseModel):
    """Schema for changing the current password."""

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
        """Ensure the new password has at least 6 characters."""
        if len(v) < 6:
            raise ValueError(get_message("AUTH_PASSWORD_MIN_LENGTH_6"))
        return v


class GoogleTokenIn(BaseModel):
    """Schema for Google OAuth: frontend sends the Google ID token or authorization code."""

    credential: str
    business_name: str = ""
    is_login_only: bool = False


class PhoneVerifyRequestIn(BaseModel):
    """Request phone number verification OTP."""

    phone_number: str

    @field_validator("phone_number")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        """Validate E.164 phone number format."""
        import re

        v = v.strip()
        # Accept E.164 format: +[country_code][number], 8-15 digits
        if not re.match(r"^\+[1-9]\d{7,14}$", v):
            raise ValueError(get_message("AUTH_PHONE_INVALID_FORMAT"))
        return v


class PhoneVerifyConfirmIn(BaseModel):
    """Confirm phone verification with OTP code."""

    phone_number: str
    otp: str


class PhoneVerifyStartIn(BaseModel):
    """Request to start phone verification."""

    phone: str
    channel: str = "sms"  # sms, whatsapp, voice, email, sna, auto


class PhoneVerifyStartOut(BaseModel):
    """Response from phone verification start."""

    success: bool
    message: str
    sid: str = ""
    strategy: str = ""
    channel: str = ""


class PhoneVerifyCheckIn(BaseModel):
    """Request to check phone verification code."""

    phone: str
    code: str
    sid: str = ""


class PhoneVerifyCheckOut(BaseModel):
    """Response from phone verification check."""

    success: bool
    message: str
    valid: bool = False
