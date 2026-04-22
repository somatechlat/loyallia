"""
Loyallia — Custom User Model
Extends AbstractBaseUser for full control.
Supports per-tenant RBAC with OWNER, MANAGER, STAFF, SUPER_ADMIN roles.
"""
import uuid

from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models


class UserRole(models.TextChoices):
    SUPER_ADMIN = "SUPER_ADMIN", "Super Administrador"
    OWNER = "OWNER", "Propietario"
    MANAGER = "MANAGER", "Gerente"
    STAFF = "STAFF", "Personal"


class UserManager(BaseUserManager):
    def create_user(self, email: str, password: str, **extra_fields):
        if not email:
            raise ValueError("El correo electrónico es obligatorio.")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email: str, password: str, **extra_fields):
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
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(
        "tenants.Tenant",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="users",
    )
    email = models.EmailField(unique=True)
    first_name = models.CharField(max_length=100, blank=True, default="")
    last_name = models.CharField(max_length=100, blank=True, default="")
    role = models.CharField(max_length=20, choices=UserRole.choices, default=UserRole.STAFF)

    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)  # Django admin access
    is_email_verified = models.BooleanField(default=False)

    # Invitation tracking
    invited_by = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="invited_users",
    )
    invitation_token = models.CharField(max_length=200, blank=True, default="")
    invitation_accepted_at = models.DateTimeField(null=True, blank=True)

    # Failed login tracking
    failed_login_count = models.SmallIntegerField(default=0)
    locked_until = models.DateTimeField(null=True, blank=True)

    date_joined = models.DateTimeField(auto_now_add=True)
    last_login = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    class Meta:
        db_table = "loyallia_users"
        verbose_name = "Usuario"
        verbose_name_plural = "Usuarios"
        ordering = ["-date_joined"]
        indexes = [
            models.Index(fields=["tenant", "role"]),
            models.Index(fields=["email"]),
        ]

    def __str__(self) -> str:
        return f"{self.email} ({self.role})"

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}".strip() or self.email

    @property
    def is_locked(self) -> bool:
        from django.utils import timezone
        if self.locked_until is None:
            return False
        return timezone.now() < self.locked_until

    def record_failed_login(self) -> None:
        """Increment failed login counter. Lock after 5 failures."""
        from datetime import timedelta

        from django.utils import timezone
        self.failed_login_count += 1
        if self.failed_login_count >= 5:
            self.locked_until = timezone.now() + timedelta(minutes=15)
        self.save(update_fields=["failed_login_count", "locked_until", "updated_at"])

    def reset_failed_login(self) -> None:
        """Reset on successful login."""
        self.failed_login_count = 0
        self.locked_until = None
        self.save(update_fields=["failed_login_count", "locked_until", "updated_at"])


class RefreshToken(models.Model):
    """Stores issued refresh tokens for revocation support."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="refresh_tokens")
    token_hash = models.CharField(max_length=64, unique=True)  # SHA-256 hash
    device_name = models.CharField(max_length=200, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    revoked_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "loyallia_refresh_tokens"
        indexes = [models.Index(fields=["token_hash"])]

    @property
    def is_valid(self) -> bool:
        from django.utils import timezone
        return self.revoked_at is None and timezone.now() < self.expires_at
