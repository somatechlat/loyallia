import json
import urllib.parse
import urllib.request

data = json.dumps({"email":"test_owner@loyallia.com", "password":"123456"}).encode("utf-8")
req = urllib.request.Request("http://localhost:8000/api/v1/auth/login/", data=data, headers={"Content-Type": "application/json"})
response = urllib.request.urlopen(req)
token = json.loads(response.read())["access_token"]

auto_data = json.dumps({
    "name": "Welcome Message Sequence",
    "description": "Envía un mensaje de bienvenida",
    "trigger": "customer_enrolled",
    "action": "send_notification",
    "is_active": True,
    "cooldown_hours": 24
}).encode("utf-8")

try:
    req2 = urllib.request.Request("http://localhost:8000/api/v1/automation/", data=auto_data, headers={"Content-Type": "application/json", "Authorization": f"Bearer {token}"})
    res2 = urllib.request.urlopen(req2)
    print("AUTOMATION CREATED:", res2.status, res2.read().decode("utf-8"))
except Exception as e:
    if hasattr(e, 'read'):
        print(e.read().decode("utf-8"))
