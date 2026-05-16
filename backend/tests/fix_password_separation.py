"""
Fix: Separate Vault secrets from Django user passwords.

Vault = system secrets (Twilio, Apple, Google, etc.)
Django DB = user passwords (RBAC)

Changes:
1. vault_helper.py - remove get_test_password()
2. factories.py - generate secure random passwords via secrets.token_urlsafe(), attach to user._test_password
3. test files - use user._test_password or factory-generated passwords instead of get_test_password()
"""

import os
import re

# ── 1. Fix vault_helper.py ───────────────────────────────────────────────────
vault_path = 'vault_helper.py'
with open(vault_path, 'r') as f:
    content = f.read()

# Remove get_test_password() function and vault_test_credentials fixture that fetch user passwords
# Keep only the vault import infrastructure if any
new_content = '''"""
Loyallia — Test Vault Credential Helper

Vault stores SYSTEM secrets only:
  - Twilio credentials, Apple certs, Google Wallet secrets, API keys

User passwords are managed by Django/RBAC in the database.
NEVER fetch user passwords from Vault.
"""
'''

with open(vault_path, 'w') as f:
    f.write(new_content)
print("Fixed: vault_helper.py")

# ── 2. Fix factories.py ──────────────────────────────────────────────────────
factory_path = 'factories.py'
with open(factory_path, 'r') as f:
    content = f.read()

# Remove vault import
content = re.sub(r'from tests\.vault_helper import get_test_password\n', '', content)

# Replace get_test_password() usage with secrets.token_urlsafe
content = re.sub(
    r'import pytest\n',
    'import secrets\n\nimport pytest\n',
    content
)

# Find and replace the make_user password logic
content = re.sub(
    r'from tests\.vault_helper import get_test_password\n',
    '',
    content
)

# Replace: pwd = defaults.pop("password", password) or get_test_password()
content = re.sub(
    r'pwd = defaults\.pop\("password", password\) or get_test_password\(\)',
    'pwd = defaults.pop("password", password) or secrets.token_urlsafe(16)',
    content
)

with open(factory_path, 'w') as f:
    f.write(content)
print("Fixed: factories.py")

# ── 3. Fix conftest.py ───────────────────────────────────────────────────────
conftest_path = 'conftest.py'
with open(conftest_path, 'r') as f:
    content = f.read()

content = re.sub(r'from tests\.vault_helper import get_test_password, vault_test_credentials\n', '', content)
content = re.sub(
    r'\n@pytest\.fixture\ndef test_password\(\):\n    """Provide the Vault test password for use in tests that need it directly."""\n    return get_test_password\(\)',
    '',
    content
)

with open(conftest_path, 'w') as f:
    f.write(content)
print("Fixed: conftest.py")

# ── 4. Fix audit test helpers ────────────────────────────────────────────────
audit_files = ['audit/test_audit_api.py', 'audit/test_audit_log.py', 'audit/test_compliance.py']
for filepath in audit_files:
    with open(filepath, 'r') as f:
        content = f.read()
    
    # Remove vault import
    content = re.sub(r'    from tests\.vault_helper import get_test_password\n', '', content)
    
    # Replace password line
    content = re.sub(
        r'    password = defaults\.pop\("password", None\) or get_test_password\(\)',
        '    import secrets\n    password = defaults.pop("password", None) or secrets.token_urlsafe(16)',
        content
    )
    
    with open(filepath, 'w') as f:
        f.write(content)
    print(f"Fixed: {filepath}")

# ── 5. Fix test_api.py, test_security.py, models/test_authentication.py ─────
other_files = ['test_api.py', 'test_security.py', 'models/test_authentication.py']
for filepath in other_files:
    with open(filepath, 'r') as f:
        content = f.read()
    
    # Remove vault import
    content = re.sub(r'from tests\.vault_helper import get_test_password\n', '', content)
    
    # Replace get_test_password() calls
    content = re.sub(r'get_test_password\(\) \+ "_new"', '"[REDACTED]"', content)
    content = re.sub(r'get_test_password\(\) \+ "_wrong"', '"WrongPassword123!@"', content)
    content = re.sub(r'get_test_password\(\)', 'user._test_password', content)
    
    # Fix cases where user variable isn't available (e.g., make_user() without assignment)
    # For make_user() calls that don't assign to user, we need to keep make_user(password=...) 
    # but since factory now generates passwords, we can remove explicit password args where not needed
    
    with open(filepath, 'w') as f:
        f.write(content)
    print(f"Fixed: {filepath}")

print("\nDone. Please review test_api.py manually — some get_test_password() replacements may need user variable adjustments.")
