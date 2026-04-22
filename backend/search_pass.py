#!/usr/bin/env python
import os
import sys

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "loyallia.settings")
sys.path.insert(0, "/app")

import django

django.setup()

from apps.customers.models import CustomerPass

# Search by QR code containing ce7f508b
passes = CustomerPass.objects.filter(qr_code__icontains="ce7f5")
print(f"Passes with QR containing 'ce7f5': {passes.count()}")
for p in passes:
    print(f"{p.id} | {p.customer.first_name} | {p.card.name} | QR: {p.qr_code}")

# Also check for google_pass_id
print("\n---")
passes2 = CustomerPass.objects.filter(google_pass_id__icontains="ce7f5")
print(f"Passes with google_pass_id containing 'ce7f5': {passes2.count()}")
for p in passes2:
    print(f"{p.id} | {p.customer.first_name} | {p.card.name}")
