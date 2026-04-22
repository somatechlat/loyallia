import urllib.request
import urllib.parse
import json
import re

data = json.dumps({"email":"test_owner@loyallia.com", "password":"123456"}).encode("utf-8")
req = urllib.request.Request("http://localhost:8000/api/v1/auth/login/", data=data, headers={"Content-Type": "application/json"})
response = urllib.request.urlopen(req)
token = json.loads(response.read())["access_token"]

try:
    req2 = urllib.request.Request("http://localhost:8000/api/v1/analytics/segments/", headers={"Authorization": f"Bearer {token}"})
    res2 = urllib.request.urlopen(req2)
except Exception as e:
    if hasattr(e, 'read'):
        html = e.read().decode("utf-8")
        with open('error.html', 'w') as f:
            f.write(html)
        match = re.search(r'<title>(.*?)</title>', html, re.IGNORECASE)
        print("EXCEPTION CAUGHT!", match.group(1) if match else "No title")
