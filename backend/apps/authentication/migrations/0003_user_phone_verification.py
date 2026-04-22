# Generated migration for phone verification fields

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("authentication", "0002_user_preferred_language"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="phone_number",
            field=models.CharField(
                blank=True,
                default="",
                help_text="E.164 format: +593991234567",
                max_length=20,
                verbose_name="Teléfono",
            ),
        ),
        migrations.AddField(
            model_name="user",
            name="is_phone_verified",
            field=models.BooleanField(default=False),
        ),
    ]
