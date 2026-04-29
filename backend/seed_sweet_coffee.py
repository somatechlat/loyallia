import os
import secrets

import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "loyallia.settings")
django.setup()


from django.contrib.auth.hashers import make_password

from apps.authentication.models import User
from apps.cards.models import Card, CardType
from apps.tenants.models import Tenant

# 1. Create Tenant
tenant, created = Tenant.objects.get_or_create(
    name="Sweet and Coffee", defaults={"slug": "sweet-and-coffee"}
)

# 2. Create Owner — password is auto-generated and printed once.
#    SECURITY: No hardcoded passwords in source control.
generated_password = secrets.token_urlsafe(16)
owner, created = User.objects.get_or_create(
    email="owner@sweetandcoffee.com",
    defaults={
        "tenant": tenant,
        "first_name": "Gerente",
        "last_name": "SweetCoffee",
        "role": "OWNER",
        "password": make_password(generated_password),
        "is_active": True,
        "is_superuser": False,
        "is_staff": False,
    },
)
if created:
    print(f"Owner created — password: {generated_password}")
else:
    print("Owner already exists (password not changed).")

# 3. Create Card
card, created = Card.objects.get_or_create(
    tenant=tenant,
    name="Sweet & Coffee Rewards",
    defaults={
        "description": "Por cada 10 cafés, llévate 1 bebida gratis de cualquier tamaño.",
        "card_type": CardType.STAMP,
        "is_active": True,
        "background_color": "#3E2723",
        "text_color": "#FFFFFF",
        "metadata": {
            "stamps_required": 10,
            "reward_description": "1 Bebida Gratis de cualquier tamaño",
        },
    },
)

print("Data Seeded Successfully! ☕")
print(f"URL: {card.id}")
