"""
Loyallia Custom User Model
Extends AbstractBaseUser for full control.
Supports per-tenant RBAC with OWNER, MANAGER, STAFF, SUPER_ADMIN roles.
"""

import uuid

from django.contrib.auth.models import (
    AbstractBaseUser,
    BaseUserManager,
    PermissionsMixin,
)
from django.db import models


class UserRole(models.TextChoices):
    """RBAC roles available in the Loyallia platform."""

    SUPER_ADMIN = "SUPER_ADMIN", "Super Administrador"
    OWNER = "OWNER", "Propietario"
    MANAGER = "MANAGER", "Gerente"
    STAFF = "STAFF", "Personal"


class UserManager(BaseUserManager["User"]):
    """Custom manager for the User model."""

    def create_user(self, email: str, password: str, **extra_fields) -> "User":
        """Create and save a regular user with the given email and password."""
        if not email:
            raise ValueError("El correo electrónico es obligatorio.")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email: str, password: str, **extra_fields) -> "User":
        """Create and save a superuser with the given email and password."""
        extra_fields.setdefault("role", UserRole.SUPER_ADMIN)
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)
        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    """
    Custom user model with per-tenant role-based access control.
    tenant is nullable for SUPER_ADMIN users (platform-level access).
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, help_text="Unique identifier for this record.")
    tenant = models.ForeignKey(
        "tenants.Tenant",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="users",
        help_text="The business this record belongs to.",
    )
    email = models.EmailField(unique=True, help_text="Email address.")
    first_name = models.CharField(max_length=100, blank=True, default="", help_text="First name.")
    last_name = models.CharField(max_length=100, blank=True, default="", help_text="Last name.")
    role = models.CharField(
        max_length=20, choices=UserRole.choices, default=UserRole.STAFF, db_index=True
        ,help_text="Role or permission level.",
    )

    is_active = models.BooleanField(default=True, help_text="Whether this record is currently active.")
    is_staff = models.BooleanField(default=False, help_text="Whether the user can access the Django admin.")  # Django admin access
    is_email_verified = models.BooleanField(default=False, help_text="Whether the email address has been verified.")

    # Phone verification
    phone_number = models.CharField(
        max_length=20,
        blank=True,
        default="",
        verbose_name="Teléfono",
        help_text="E.164 format: +593991234567",
    )
    is_phone_verified = models.BooleanField(default=False, help_text="Whether the phone number has been verified.")

    # Invitation tracking
    invited_by = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="invited_users",
        help_text="User who invited this person.",
    )
    invitation_token = models.CharField(max_length=200, blank=True, default="", help_text="Token for tracking invitations.")
    invitation_accepted_at = models.DateTimeField(null=True, blank=True, help_text="When the invitation was accepted.")

    # Failed login tracking
    failed_login_count = models.SmallIntegerField(default=0, help_text="Number of consecutive failed login attempts.")
    locked_until = models.DateTimeField(null=True, blank=True, help_text="Account lockout expiration time.")

    # i18n user language preference (REQ-I18N-001)
    preferred_language = models.CharField(
        max_length=5,
        default="",
        blank=True,
        verbose_name="Idioma preferido",
        help_text="ISO 639-1 code (es, en, fr, de). Empty = tenant default.",
    )

    # Security PIN for impersonation verification
    security_pin_hash = models.CharField(
        max_length=128,
        blank=True,
        default="",
        verbose_name="PIN de seguridad (hash)",
        help_text="Argon2-hashed 6-digit PIN set by OWNER for impersonation verification.",
    )

    date_joined = models.DateTimeField(auto_now_add=True, help_text="Date joined.")
    last_login = models.DateTimeField(null=True, blank=True, help_text="Timestamp of the last successful login.")
    updated_at = models.DateTimeField(auto_now=True, help_text="Timestamp for updated.")

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    class Meta:
        """Model metadata and database configuration."""
        db_table = "loyallia_users"
        verbose_name = "Usuario"
        verbose_name_plural = "Usuarios"
        ordering = ["-date_joined"]
        indexes = [
            models.Index(fields=["tenant", "role"]),
            models.Index(fields=["tenant"]),
            models.Index(fields=["email"]),
        ]

    def __str__(self) -> str:
        """Return a human-readable string representation."""
        return f"{self.email} ({self.role})"

    @property
    def full_name(self) -> str:
        """Return the user's full name, falling back to email if empty."""
        return f"{self.first_name} {self.last_name}".strip() or self.email

    @property
    def is_locked(self) -> bool:
        """Check if the user account is temporarily locked due to failed logins."""
        from django.utils import timezone

        if self.locked_until is None:
            return False
        return timezone.now() < self.locked_until

    def record_failed_login(self) -> None:
        """Increment failed login counter. Lock after 5 failures.

        Sends an email notification when account is locked.
        """
        import logging
        from datetime import timedelta

        from django.utils import timezone

        logger = logging.getLogger(__name__)
        was_locked = self.is_locked

        self.failed_login_count += 1
        if self.failed_login_count >= 5:
            self.locked_until = timezone.now() + timedelta(minutes=15)
        self.save(update_fields=["failed_login_count", "locked_until", "updated_at"])

        # Notify user on first lockout (not repeated lockouts)
        if self.is_locked and not was_locked:
            try:
                from django.core.mail import send_mail

                send_mail(
                    subject="Cuenta temporalmente bloqueada  Loyallia",
                    message=(
                        f"Hola {self.first_name},\n\n"
                        f"Tu cuenta ha sido temporalmente bloqueada debido a "
                        f"múltiples intentos de inicio de sesión fallidos.\n\n"
                        f"Se desbloqueará automáticamente en 15 minutos.\n\n"
                        f"Si no fuiste tú, te recomendamos cambiar tu contraseña.\n\n"
                        f" Equipo de Loyallia"
                    ),
                    from_email=None,
                    recipient_list=[self.email],
                    fail_silently=True,
                )
            except Exception:
                logger.warning(
                    "Failed to send lockout notification to %s",
                    self.email,
                    exc_info=True,
                )

    def reset_failed_login(self) -> None:
        """Reset on successful login."""
        self.failed_login_count = 0
        self.locked_until = None
        self.save(update_fields=["failed_login_count", "locked_until", "updated_at"])

        # Security PIN

    def set_security_pin(self, pin: str) -> None:
        """Hash and store a 6-digit security PIN for impersonation verification."""
        import re

        from django.contrib.auth.hashers import make_password

        if not re.fullmatch(r"\d{6}", pin):
            raise ValueError("PIN must be exactly 6 numeric digits.")
        self.security_pin_hash = make_password(pin)
        self.save(update_fields=["security_pin_hash", "updated_at"])

    def verify_security_pin(self, pin: str) -> bool:
        """Verify a PIN against the stored hash. Returns False if no PIN is set."""
        from django.contrib.auth.hashers import check_password

        if not self.security_pin_hash:
            return False
        return check_password(pin, self.security_pin_hash)

    @property
    def has_security_pin(self) -> bool:
        """Check if the user has configured a security PIN."""
        return bool(self.security_pin_hash)


class RefreshToken(models.Model):
    """Stores issued refresh tokens for revocation support."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, help_text="Unique identifier for this record.")
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="refresh_tokens"
        ,help_text="The user associated with this record.",
    )
    token_hash = models.CharField(max_length=64, unique=True, help_text="Token for authentication or verification.")  # SHA-256 hash
    device_name = models.CharField(max_length=200, blank=True, default="", help_text="Name of the device.")
    created_at = models.DateTimeField(auto_now_add=True, help_text="Timestamp for created.")
    expires_at = models.DateTimeField(help_text="Timestamp for expires.")
    revoked_at = models.DateTimeField(null=True, blank=True, help_text="Timestamp for revoked.")

    class Meta:
        """Model metadata and database configuration."""
        db_table = "loyallia_refresh_tokens"
        indexes = [
            models.Index(fields=["token_hash"]),
            models.Index(fields=["user", "created_at"]),
        ]

    @property
    def is_valid(self) -> bool:
        """Check if this refresh token is still valid (not revoked and not expired)."""
        from django.utils import timezone

        return self.revoked_at is None and timezone.now() < self.expires_at
