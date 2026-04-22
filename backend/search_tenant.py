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

# Search for calro, claro, etc
print("=== Searching for 'calro', 'claro', etc ===")
for name in ["calro", "claro", "Calro", "Claro"]:
    tenants = Tenant.objects.filter(name__icontains=name)
    print(f"\n{name}: {tenants.count()}")
    for t in tenants:
        print(f"  {t.id} | {t.name}")

# Get ALL tenants and show recent ones
print("\n=== ALL tenants (ordered by created) ===")
all_tenants = Tenant.objects.all().order_by("-created_at")[:20]
for t in all_tenants:
    cards = Card.objects.filter(tenant=t).count()
    passes = CustomerPass.objects.filter(card__tenant=t, is_active=True).count()
    print(f"{t.id} | {t.name} | cards:{cards} | passes:{passes}")
