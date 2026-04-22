#!/usr/bin/env python
import os
import sys

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "loyallia.settings")
sys.path.insert(0, "/app")

import django

django.setup()

from apps.cards.models import Card
from apps.tenants.models import Tenant

# Search for claro tenant
tenants = Tenant.objects.filter(name__icontains="claro")
print("=== Claro tenants ===")
for t in tenants:
    print(f"{t.id} | {t.name}")

# Get the most recent tenant
print("\n=== Recent tenants ===")
recent = Tenant.objects.order_by("-created_at")[:5]
for t in recent:
    print(f"{t.id} | {t.name}")

# Find cards for recent tenants
print("\n=== Cards for recent tenants ===")
for t in recent:
    cards = Card.objects.filter(tenant=t)
    print(f"\nTenant: {t.name}")
    for c in cards:
        print(f"  - {c.id} | {c.name} | {c.card_type}")
