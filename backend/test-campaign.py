import os

import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()

from django.test import Client

from apps.authentication.models import User

client = Client()
owner = User.objects.get(email="test_owner@loyallia.com")
owner.set_password("123456")
owner.save()

login_res = client.post(
    "/api/v1/auth/login/",
    {"email": "test_owner@loyallia.com", "password": "123456"},
    content_type="application/json",
)
token = login_res.json()["access_token"]
headers = {"HTTP_AUTHORIZATION": f"Bearer {token}"}

create_res = client.post(
    "/api/v1/notifications/campaigns/",
    {"title": "TEST CAMPAIGN", "message": "Test", "segment_id": "all"},
    content_type="application/json",
    **headers,
)
print("CREATE:", create_res.status_code, create_res.json())

list_res = client.get("/api/v1/notifications/campaigns/", **headers)
print("LIST:", list_res.status_code, list_res.json())
