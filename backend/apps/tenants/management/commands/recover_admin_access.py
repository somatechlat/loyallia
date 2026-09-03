"""
Admin Account Recovery — Resilient Login

Resets the superadmin password and clears any lockout state.
Use this if you are locked out of the system.

Usage (inside API container):
    python manage.py recover_admin_access --password NewPassword123! [--email admin@loyallia.com]

Usage (from host via docker compose):
    docker compose exec api python manage.py recover_admin_access --password "$ADMIN_PASSWORD"
"""

import secrets
from typing import cast

from django.core.management.base import BaseCommand, CommandError

from apps.authentication.models import User, UserManager

DEFAULT_ADMIN_EMAIL = "admin@loyallia.com"


class Command(BaseCommand):
    help = "Recover admin access: reset password and clear lockout"

    def add_arguments(self, parser):
        parser.add_argument(
            "--email",
            type=str,
            default=DEFAULT_ADMIN_EMAIL,
            help=f"Admin email to recover (default: {DEFAULT_ADMIN_EMAIL})",
        )
        parser.add_argument(
            "--password",
            type=str,
            default=None,
            help="New password (required unless --unlock-only)",
        )
        parser.add_argument(
            "--unlock-only",
            action="store_true",
            help="Only unlock the account, do not change password",
        )
        parser.add_argument(
            "--create",
            action="store_true",
            help="Create the admin account if it does not exist",
        )
        parser.add_argument(
            "--force",
            action="store_true",
            help="Bypass the production safety guard (required when DEBUG=False)",
        )

    def handle(self, *args, **options):
        from django.conf import settings

        email = options["email"]
        password = options["password"]
        unlock_only = options["unlock_only"]
        create = options["create"]
        force = options["force"]

        if not settings.DEBUG and not force:
            raise CommandError(
                "This command is restricted in production. " "Use --force to override (not recommended)."
            )

        if not settings.DEBUG and force:
            self.stdout.write(
                self.style.WARNING(
                    "WARNING: You are about to recover admin access in PRODUCTION. " "This is a sensitive operation."
                )
            )
            confirm = input("Type 'yes' to continue: ")
            if confirm.lower() != "yes":
                self.stdout.write("Aborted.")
                return

        if not unlock_only and not password:
            raise CommandError(
                "--password is required (or use --unlock-only). " "Example: --password 'MyStrongPass123!'"
            )

        user = User.objects.filter(email=email).first()

        if user is None:
            if create:
                if not password:
                    password = secrets.token_urlsafe(24)
                    self.stdout.write(self.style.WARNING(f"Auto-generated password: {password}"))
                user = cast(UserManager, User.objects).create_superuser(
                    email=email,
                    password=password,
                    first_name="Admin",
                    last_name="Loyallia",
                )
                self.stdout.write(self.style.SUCCESS(f"Created superuser: {email}"))
                self.stdout.write(self.style.NOTICE(f"  LOGIN: {email}"))
                self.stdout.write(self.style.NOTICE(f"  PASS:  {password}"))
                return
            else:
                self.stdout.write(self.style.ERROR(f"User '{email}' does not exist."))
                supers = list(User.objects.filter(is_superuser=True))
                if supers:
                    self.stdout.write(self.style.WARNING("Available superusers:"))
                    for u in supers:
                        self.stdout.write(f"  - {u.email}")
                else:
                    self.stdout.write(self.style.WARNING("No superusers exist. Use --create to create one."))
                return

        # Clear lockout
        user.failed_login_count = 0
        user.locked_until = None

        if not unlock_only:
            user.set_password(password)

        user.save()

        self.stdout.write(self.style.SUCCESS(f"Account recovered: {email}"))
        self.stdout.write(f"  Active: {user.is_active}")
        self.stdout.write(f"  Superuser: {user.is_superuser}")
        self.stdout.write(f"  Staff: {user.is_staff}")
        if not unlock_only:
            self.stdout.write(self.style.SUCCESS("  New password set."))
            self.stdout.write("")
            self.stdout.write(self.style.NOTICE(f"  LOGIN: {email}"))
            self.stdout.write(self.style.NOTICE(f"  PASS:  {password}"))
