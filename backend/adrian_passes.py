#!/usr/bin/env python
import os
import sys

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "loyallia.settings")
sys.path.insert(0, "/app")

import django

django.setup()

from apps.cards.models import Card
from apps.customers.models import CustomerPass
from apps.tenants.models import Tenant

# Get Adrian Cadena tenant
tenant = Tenant.objects.filter(name="Adrian Cadena").first()
if tenant:
    print(f"Tenant: {tenant.name} ({tenant.id})")

    # Get all cards for this tenant
    cards = Card.objects.filter(tenant=tenant)
    print(f"\nCards: {cards.count()}")
    for c in cards:
        print(f"  - {c.id} | {c.name} | {c.card_type}")

        # Get passes for this card
        passes = CustomerPass.objects.filter(card=c, is_active=True).select_related(
            "customer"
        )
        print(f"    Passes: {passes.count()}")
        for p in passes[:5]:
            print(
                f"      {p.id} | {p.customer.first_name} {p.customer.last_name} | QR: {p.qr_code}"
            )
