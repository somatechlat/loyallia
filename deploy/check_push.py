import os, sys

sys.path.insert(0, "/app")
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "loyallia.settings.production")
import django

django.setup()
from apps.notifications.models import PushDevice
from apps.customers.models import CustomerPass

print("Push devices:", PushDevice.objects.count())
print("Customer passes:", CustomerPass.objects.count())
for p in CustomerPass.objects.all()[:5]:
    print(
        "  Pass ID=%s customer=%s card=%s active=%s"
        % (p.id, p.customer_id, p.card_id, p.is_active)
    )
for d in PushDevice.objects.all()[:5]:
    fcm = d.fcm_token[:25] if d.fcm_token else "NONE"
    active = "YES" if d.is_active else "NO"
    print(
        "  Device ID=%s user=%s type=%s active=%s fcm=%s..."
        % (d.id, d.user_id, d.device_type, active, fcm)
    )
