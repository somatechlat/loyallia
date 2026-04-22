
import requests

res = requests.post('http://localhost:8000/api/v1/auth/login/', json={"email": "test_owner@loyallia.com", "password": "123456"})
token = res.json()["access_token"]
list_res = requests.get('http://localhost:8000/api/v1/customers/', headers={"Authorization": f"Bearer {token}"})
first_id = list_res.json()["customers"][0]["id"]
passes_res = requests.get(f'http://localhost:8000/api/v1/customers/{first_id}/passes/', headers={"Authorization": f"Bearer {token}"})
print("Passes HTTP:", passes_res.status_code)
if passes_res.status_code != 200:
    print(passes_res.text)
