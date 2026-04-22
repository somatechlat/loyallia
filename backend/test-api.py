import sys

import requests

res = requests.post('http://localhost:8000/api/v1/auth/login/', json={"email": "test_owner@loyallia.com", "password": "123456"})
token = res.json()["access_token"]

list_res = requests.get('http://localhost:8000/api/v1/customers/', headers={"Authorization": f"Bearer {token}"})
try:
    first_id = list_res.json()["customers"][0]["id"]
except Exception:
    print("NO CUSTOMERS:", list_res.text)
    sys.exit(1)

cust_res = requests.get(f'http://localhost:8000/api/v1/customers/{first_id}/', headers={"Authorization": f"Bearer {token}"})
if cust_res.status_code == 200:
    print("Customer Fetch Success:", cust_res.json()["first_name"])
else:
    print("Customer Fetch Failed:", cust_res.status_code, cust_res.text)
