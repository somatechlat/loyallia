import urllib.request
import urllib.parse
import json

data = json.dumps({"email":"test_owner@loyallia.com", "password":"123456"}).encode("utf-8")
req = urllib.request.Request("http://localhost:8000/api/v1/auth/login/", data=data, headers={"Content-Type": "application/json"})
response = urllib.request.urlopen(req)
token = json.loads(response.read())["access_token"]
print("LOGIN SUCCESS", token[:10])

c_data = json.dumps({"title":"Python Req", "message":"Test", "segment_id":"all"}).encode("utf-8")
req2 = urllib.request.Request("http://localhost:8000/api/v1/notifications/campaigns/", data=c_data, headers={"Content-Type": "application/json", "Authorization": f"Bearer {token}"})
res2 = urllib.request.urlopen(req2)
print("CREATE:", res2.status, res2.read().decode("utf-8"))

try:
    req3 = urllib.request.Request("http://localhost:8000/api/v1/notifications/campaigns/", headers={"Authorization": f"Bearer {token}"})
    res3 = urllib.request.urlopen(req3)
    print("LIST SUCCESS:", res3.status, res3.read().decode("utf-8"))
except Exception as e:
    print("LIST FAILED:", e)
