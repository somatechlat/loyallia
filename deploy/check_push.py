import os, sys

sys.path.insert(0, "/app")
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "loyallia.settings.development")
import django

django.setup()
from apps.notifications.models import PushDevice
from apps.loyalty.models import LoyaltyPass

print("Push devices:", PushDevice.objects.count())
print("Loyalty passes:", LoyaltyPass.objects.count())
for p in LoyaltyPass.objects.all()[:5]:
    print(
        "  Pass ID=%s customer=%s program=%s status=%s"
        % (p.id, p.customer_id, p.program_id, p.status)
    )
for d in PushDevice.objects.all()[:5]:
    fcm = d.fcm_token[:25] if d.fcm_token else "NONE"
    active = "YES" if d.is_active else "NO"
    print(
        "  Device ID=%s user=%s type=%s active=%s fcm=%s..."
        % (d.id, d.user_id, d.device_type, active, fcm)
    )
