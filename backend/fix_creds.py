import glob

replacements = {
    "test_owner@loyallia.com": "owner@example.com",
    "test_staff@loyallia.com": "staff@example.com",
    "test_manager@loyallia.com": "manager@example.com",
    "http://localhost:3000/": "/",
    "http://localhost:3000/login": "/login",
}

for filepath in glob.glob("../frontend/tests/e2e/*.ts"):
    with open(filepath) as f:
        content = f.read()

    for old, new in replacements.items():
        content = content.replace(old, new)

    with open(filepath, "w") as f:
        f.write(content)

print("Credentials replaced successfully")
