#!/usr/bin/env python
import os
import sys

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "loyallia.settings")
sys.path.insert(0, "/app")

import django

django.setup()

from apps.customers.models import CustomerPass

passes = CustomerPass.objects.filter(is_active=True).select_related("card", "customer")
print(f"Total: {passes.count()}")
for p in passes:
    print(f"{p.id} | {p.customer.first_name} {p.customer.last_name} | {p.card.name}")
