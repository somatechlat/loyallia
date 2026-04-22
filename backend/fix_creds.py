import glob
import os

replacements = {
    "test_owner@loyallia.com": "carlos@cafeelritmo.ec",
    "test_staff@loyallia.com": "sebastian@cafeelritmo.ec",
    "test_manager@loyallia.com": "gabriela@cafeelritmo.ec",
    "http://localhost:3000/": "/",
    "http://localhost:3000/login": "/login",
}

for filepath in glob.glob("../frontend/tests/e2e/*.ts"):
    with open(filepath, 'r') as f:
        content = f.read()
    
    for old, new in replacements.items():
        content = content.replace(old, new)
        
    with open(filepath, 'w') as f:
        f.write(content)

print("Credentials replaced successfully")
