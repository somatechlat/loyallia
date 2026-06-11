# Generated manually for WalletTemplate model

import django.core.validators
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("tenants", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="WalletTemplate",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                (
                    "name",
                    models.CharField(
                        help_text="Template name (2-50 chars)",
                        max_length=50,
                        validators=[
                            django.core.validators.MinLengthValidator(2),
                            django.core.validators.MaxLengthValidator(50),
                        ],
                    ),
                ),
                (
                    "description",
                    models.CharField(blank=True, default="", max_length=200),
                ),
                (
                    "card_type",
                    models.CharField(
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
                    ),
                ),
                ("industry", models.CharField(default="retail", max_length=30)),
                (
                    "design_state",
                    models.JSONField(
                        help_text="Full WalletStudioState serialized as JSON"
                    ),
                ),
                ("include_back_content", models.BooleanField(default=True)),
                ("is_favorite", models.BooleanField(default=False)),
                ("usage_count", models.PositiveIntegerField(default=0)),
                ("last_used_at", models.DateTimeField(blank=True, null=True)),
                ("is_system", models.BooleanField(default=False)),
                ("tags", models.JSONField(blank=True, default=list)),
                (
                    "preview_image_url",
                    models.URLField(blank=True, default="", max_length=500),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "owner",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="wallet_templates",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "tenant",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="wallet_templates",
                        to="tenants.tenant",
                    ),
                ),
            ],
            options={
                "db_table": "wallet_templates",
                "ordering": ["-is_favorite", "-updated_at"],
            },
        ),
        migrations.AddConstraint(
            model_name="wallettemplate",
            constraint=models.UniqueConstraint(
                fields=("tenant", "owner", "name"), name="unique_template_name_per_user"
            ),
        ),
        migrations.AddIndex(
            model_name="wallettemplate",
            index=models.Index(
                fields=["tenant", "owner", "is_favorite"],
                name="wallet_temp_tenant_own_fav_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="wallettemplate",
            index=models.Index(
                fields=["tenant", "card_type"], name="wallet_temp_tenant_card_idx"
            ),
        ),
        migrations.AddIndex(
            model_name="wallettemplate",
            index=models.Index(
                fields=["is_system", "industry"], name="wallet_temp_system_ind_idx"
            ),
        ),
    ]
