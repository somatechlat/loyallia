import sys
import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()

from apps.authentication.models import User
from apps.customers.models import Customer
from apps.notifications.models import Notification

owner = User.objects.get(email="test_owner@loyallia.com")
tenant = owner.tenant

print("Customers:", Customer.objects.filter(tenant=tenant).count())
print("Notifications:", Notification.objects.filter(tenant=tenant).count())
for n in Notification.objects.filter(tenant=tenant)[:5]:
    print(n.title, n.notification_type)
