# Generated manually — adds status workflow to SubscriptionPlan

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("billing", "0008_seed_vital_plans"),
    ]

    operations = [
        migrations.AddField(
            model_name="subscriptionplan",
            name="status",
            field=models.CharField(
                choices=[
                    ("draft", "Borrador"),
                    ("published", "Publicado"),
                    ("archived", "Archivado"),
                ],
                default="published",
                help_text="draft=Borrador (solo visible en SuperAdmin), published=Publicado (visible para todos), archived=Archivado (oculto)",
                max_length=20,
                verbose_name="Estado",
            ),
        ),
    ]
