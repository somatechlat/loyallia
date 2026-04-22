import json
import urllib.parse
import urllib.request

data = json.dumps({"email":"test_owner@loyallia.com", "password":"123456"}).encode("utf-8")
req = urllib.request.Request("http://localhost:8000/api/v1/auth/login/", data=data, headers={"Content-Type": "application/json"})
response = urllib.request.urlopen(req)
token = json.loads(response.read())["access_token"]

try:
    req2 = urllib.request.Request("http://localhost:8000/api/v1/automation/stats/", headers={"Authorization": f"Bearer {token}"})
    res2 = urllib.request.urlopen(req2)
except Exception as e:
    if hasattr(e, 'read'):
        html = e.read().decode("utf-8")
        with open('error.html', 'w') as f:
            f.write(html)
        print("WROTE ERROR HTML")
