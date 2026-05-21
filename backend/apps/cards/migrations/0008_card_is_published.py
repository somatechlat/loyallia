# Generated manually: add is_published field and backfill existing active cards

from django.db import migrations, models


def backfill_published(apps, schema_editor):
    """Set is_published=True for all existing active cards."""
    Card = apps.get_model("cards", "Card")
    Card.objects.filter(is_active=True).update(is_published=True)


def reverse_backfill(apps, schema_editor):
    """No-op reverse."""
    pass


class Migration(migrations.Migration):
    # B-019: atomic=False prevents PostgreSQL deadlock when AddField holds
    # ACCESS EXCLUSIVE lock and RunPython uses ORM connection pool.
    atomic = False

    dependencies = [
        ("cards", "0007_alter_card_icon_url_alter_card_logo_url_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="card",
            name="is_published",
            field=models.BooleanField(default=False, verbose_name="Programa publicado"),
        ),
        migrations.RunPython(backfill_published, reverse_backfill),
    ]
