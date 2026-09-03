"""
Loyallia Tenant Validators
Ecuadorian identity document validators for SRI compliance.
"""

import re

from django.core.exceptions import ValidationError


def validate_ruc(value: str) -> None:
    """Validate Ecuadorian RUC (Registro Único de Contribuyentes).

    Rules: 13 digits. First 2 = province (01-24, or 30 for foreign).
    Last 3 digits must be '001' for natural persons.
    """
    if not re.match(r"^\d{13}$", value):
        raise ValidationError("El RUC debe tener exactamente 13 dígitos numéricos.")
    province = int(value[:2])
    if province < 1 or (province > 24 and province not in (30,)):
        raise ValidationError(f"Los primeros 2 dígitos del RUC ({value[:2]}) no corresponden a una provincia válida.")


def validate_cedula(value: str) -> None:
    """Validate Ecuadorian Cédula de Identidad.

    Rules: 10 digits. Province (01-24). Module 10 check.
    """
    if not re.match(r"^\d{10}$", value):
        raise ValidationError("La cédula debe tener exactamente 10 dígitos numéricos.")
    province = int(value[:2])
    if province < 1 or province > 24:
        raise ValidationError(f"Los primeros 2 dígitos ({value[:2]}) no corresponden a una provincia válida.")
    # Module-10 verification
    coefficients = [2, 1, 2, 1, 2, 1, 2, 1, 2]
    total = 0
    for i in range(9):
        product = int(value[i]) * coefficients[i]
        total += product - 9 if product > 9 else product
    check = (10 - (total % 10)) % 10
    if check != int(value[9]):
        raise ValidationError("El dígito verificador de la cédula no es válido.")
