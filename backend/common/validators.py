"""
Loyallia — Custom Validators
Reusable Django validators for authentication and data integrity.
"""

import re

from django.core.exceptions import ValidationError
from django.utils.translation import gettext as _


class ComplexityValidator:
    """
    Validate password complexity: requires at least one uppercase letter,
    one lowercase letter, one digit, and one special character.

    SECURITY (LYL-M-SEC-014): Enforced alongside MinimumLengthValidator (12+ chars).
    """

    SPECIAL_CHARS = r"[!@#$%^&*()_+\-=\[\]{}|;':\",./<>?`~\\]"

    def validate(self, password, user=None):
        errors = []
        if not re.search(r"[A-Z]", password):
            errors.append(_("La contraseña debe contener al menos una letra mayúscula."))
        if not re.search(r"[a-z]", password):
            errors.append(_("La contraseña debe contener al menos una letra minúscula."))
        if not re.search(r"[0-9]", password):
            errors.append(_("La contraseña debe contener al menos un dígito."))
        if not re.search(self.SPECIAL_CHARS, password):
            errors.append(_("La contraseña debe contener al menos un carácter especial."))
        if errors:
            raise ValidationError(errors, code="password_complexity")

    def get_help_text(self):
        return _(
            "La contraseña debe contener al menos 12 caracteres, incluyendo "
            "una letra mayúscula, una minúscula, un dígito y un carácter especial."
        )
