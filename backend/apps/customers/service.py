"""
Loyallia Customer Service Layer
Extracted business logic from customer API views.
"""

import logging
import re

from django.conf import settings
from django.db import transaction
from django.db.models import Q
from django.utils.dateparse import parse_date

from apps.customers.models import Customer, CustomerPass
from apps.transactions.models import Enrollment

logger = logging.getLogger(__name__)

# Compiled regex for email validation
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
GENDER_MAP = {
    "m": "M",
    "masculino": "M",
    "male": "M",
    "hombre": "M",
    "f": "F",
    "femenino": "F",
    "female": "F",
    "mujer": "F",
    "o": "O",
    "otro": "O",
    "other": "O",
}


class CustomerService:
    """Service class encapsulating customer business logic."""

    @staticmethod
    def create(tenant, data):
        """
        Create a customer with validation.

        Args:
            tenant: Tenant instance
            data: dict with customer fields (first_name, last_name, email, etc.)

        Returns:
            Customer instance

        Raises:
            ValueError: If validation fails
        """
        email = data.get("email", "").strip().lower()
        if not email or not EMAIL_RE.match(email):
            raise ValueError(f"Invalid email: {email}")

        first_name = data.get("first_name", "").strip()
        if not first_name:
            raise ValueError("First name is required")

        # Check for existing customer
        if Customer.objects.filter(tenant=tenant, email=email).exists():
            raise ValueError(f"Customer with email {email} already exists")

        date_of_birth = None
        if data.get("date_of_birth"):
            date_of_birth = parse_date(data["date_of_birth"])

        gender = data.get("gender", "")
        if gender:
            gender = GENDER_MAP.get(gender.strip().lower(), gender)

        customer = Customer.objects.create(
            tenant=tenant,
            first_name=first_name,
            last_name=data.get("last_name", "").strip(),
            email=email,
            phone=data.get("phone", "").strip()[: settings.CUSTOMER_PHONE_MAX_LENGTH],
            date_of_birth=date_of_birth,
            gender=gender,
            notes=data.get("notes", "").strip()[: settings.CUSTOMER_NOTES_MAX_LENGTH],
        )

        return customer

    @staticmethod
    def update(customer, data):
        """
        Update customer fields safely.

        Args:
            customer: Customer instance
            data: dict with fields to update

        Returns:
            Updated Customer instance
        """
        update_fields = []

        if data.get("first_name") is not None:
            customer.first_name = data["first_name"].strip()
            update_fields.append("first_name")

        if data.get("last_name") is not None:
            customer.last_name = data["last_name"].strip()
            update_fields.append("last_name")

        if data.get("phone") is not None:
            customer.phone = data["phone"].strip()[: settings.CUSTOMER_PHONE_MAX_LENGTH]
            update_fields.append("phone")

        if data.get("date_of_birth") is not None:
            customer.date_of_birth = parse_date(data["date_of_birth"])
            update_fields.append("date_of_birth")

        if data.get("gender") is not None:
            customer.gender = data["gender"]
            update_fields.append("gender")

        if data.get("notes") is not None:
            customer.notes = data["notes"].strip()[: settings.CUSTOMER_NOTES_MAX_LENGTH]
            update_fields.append("notes")

        if data.get("is_active") is not None:
            customer.is_active = data["is_active"]
            update_fields.append("is_active")

        if update_fields:
            customer.save(update_fields=update_fields + ["updated_at"])

        return customer

    @staticmethod
    def search(tenant, query, limit=settings.API_LIMIT_SEARCH_DEFAULT):
        """
        Search customers by name, email, or phone.

        Args:
            tenant: Tenant instance
            query: Search string
            limit: Max results

        Returns:
            list of Customer instances
        """
        if not query or len(query.strip()) < 2:
            return []

        return list(
            Customer.objects.filter(tenant=tenant, is_active=True).filter(
                Q(email__icontains=query)
                | Q(phone__icontains=query)
                | Q(first_name__icontains=query)
                | Q(last_name__icontains=query)
            )[:limit]
        )

    @staticmethod
    def enroll_in_program(tenant, customer, card, enrollment_method="manual"):
        """
        Enroll a customer in a loyalty program.

        Args:
            tenant: Tenant instance
            customer: Customer instance
            card: Card instance
            enrollment_method: How enrollment happened

        Returns:
            CustomerPass instance

        Raises:
            ValueError: If already enrolled
        """
        if CustomerPass.objects.filter(customer=customer, card=card).exists():
            raise ValueError(
                f"Customer {customer.email} is already enrolled in {card.name}"
            )

        with transaction.atomic():
            pass_obj = CustomerPass.objects.create(customer=customer, card=card)

            Enrollment.objects.create(
                tenant=tenant,
                customer=customer,
                card=card,
                enrollment_method=enrollment_method,
            )

        return pass_obj
