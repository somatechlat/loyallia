import requests

res = requests.post('http://localhost:8000/api/v1/auth/login/', json={"email": "test_owner@loyallia.com", "password": "123456"})
token = res.json()["access_token"]
c_res = requests.get('http://localhost:8000/api/v1/notifications/campaigns/', headers={"Authorization": f"Bearer {token}"})
print(c_res.status_code, c_res.json())
