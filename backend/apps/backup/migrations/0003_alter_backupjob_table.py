# Generated manually for P3 polish

from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("backup", "0002_alter_backupjob_backup_type_and_more"),
    ]

    operations = [
        migrations.AlterModelTable(
            name="backupjob",
            table="loyallia_backup_jobs",
        ),
    ]
