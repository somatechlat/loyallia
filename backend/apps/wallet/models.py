import uuid

from django.contrib.auth import get_user_model
from django.core.validators import MaxLengthValidator, MinLengthValidator
from django.db import models

User = get_user_model()


class WalletTemplate(models.Model):
    """User-saved wallet pass template."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(
        "tenants.Tenant", on_delete=models.CASCADE, related_name="wallet_templates"
    )
    owner = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="wallet_templates"
    )
    name = models.CharField(
        max_length=50,
        validators=[MinLengthValidator(2), MaxLengthValidator(50)],
        help_text="Template name (2-50 chars)",
    )
    description = models.CharField(max_length=200, blank=True, default="")
    card_type = models.CharField(
        max_length=30,
        choices=[
            ("stamp", "Stamp"),
            ("cashback", "Cashback"),
            ("coupon", "Coupon"),
            ("vip_membership", "VIP Membership"),
            ("gift_certificate", "Gift Certificate"),
            ("discount", "Discount"),
            ("referral_pass", "Referral Pass"),
            ("affiliate", "Affiliate"),
            ("corporate_discount", "Corporate Discount"),
            ("multipass", "Multipass"),
        ],
    )
    industry = models.CharField(max_length=30, default="retail")
    design_state = models.JSONField(
        help_text="Full WalletStudioState serialized as JSON"
    )
    include_back_content = models.BooleanField(default=True)
    is_favorite = models.BooleanField(default=False)
    usage_count = models.PositiveIntegerField(default=0)
    last_used_at = models.DateTimeField(null=True, blank=True)
    is_system = models.BooleanField(default=False)
    tags = models.JSONField(default=list, blank=True)
    preview_image_url = models.URLField(max_length=500, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "wallet_templates"
        ordering = ["-is_favorite", "-updated_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["tenant", "owner", "name"],
                name="unique_template_name_per_user",
            )
        ]
        indexes = [
            models.Index(fields=["tenant", "owner", "is_favorite"]),
            models.Index(fields=["tenant", "card_type"]),
            models.Index(fields=["is_system", "industry"]),
        ]

    def __str__(self) -> str:
        return f"{self.name} ({self.card_type})"


class WalletPassOperationLog(models.Model):
    """Audit log for wallet pass studio operations."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(
        "tenants.Tenant",
        on_delete=models.CASCADE,
        related_name="wallet_operation_logs",
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="wallet_operation_logs",
    )
    operation_type = models.CharField(
        max_length=30,
        choices=[
            ("template_create", "Template Create"),
            ("template_update", "Template Update"),
            ("template_delete", "Template Delete"),
            ("template_use", "Template Use"),
            ("ai_design", "AI Design"),
        ],
    )
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "wallet_pass_operation_logs"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["tenant", "operation_type", "created_at"]),
            models.Index(fields=["tenant", "created_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.operation_type} by {self.user} at {self.created_at}"
