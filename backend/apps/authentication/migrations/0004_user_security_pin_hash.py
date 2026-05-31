# Security PIN support.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("authentication", "0003_user_phone_verification"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="security_pin_hash",
            field=models.CharField(
                blank=True,
                default="",
                help_text="Argon2-hashed 6-digit PIN set by OWNER for impersonation verification.",
                max_length=128,
                verbose_name="PIN de seguridad (hash)",
            ),
        ),
    ]
