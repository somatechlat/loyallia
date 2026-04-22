import os
import sys

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "loyallia.settings.development")
sys.path.insert(0, "/app")
import django

django.setup()
from apps.notifications.models import PushDevice
from apps.loyalty.models import LoyaltyPass

print(f"=== Firebase Push Verification ===")
print(f"Total push devices: {PushDevice.objects.count()}")
print(f"Total loyalty passes: {LoyaltyPass.objects.count()}")
print()
print("Push devices:")
for d in PushDevice.objects.all()[:10]:
    fcm = d.fcm_token[:30] if d.fcm_token else "NONE"
    active = "YES" if d.is_active else "NO"
    print(
        f"  ID={d.id} user={d.user_id} type={d.device_type} active={active} fcm={fcm}..."
    )
print()
print("Loyalty passes with customers:")
for p in LoyaltyPass.objects.select_related("customer", "program").all()[:10]:
    print(
        f"  Pass ID={p.id} customer={p.customer_id} program={p.program_id} status={p.status}"
    )

# Test FCM auth
print()
print("Testing FCM authentication...")
from apps.notifications.push.fcm_client import _get_access_token

token, project_id = _get_access_token()
if token and project_id:
    print(f"  FCM Auth: OK (project={project_id})")
    print(f"  Token prefix: {token[:20]}...")
else:
    print("  FCM Auth: FAILED")
