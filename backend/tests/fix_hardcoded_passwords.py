import re
import os

# Files to fix
files = [
    'test_api.py',
    'test_security.py',
    'models/test_authentication.py',
]

vault_import = "from tests.vault_helper import get_test_password\n"

def fix_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()
    
    original = content
    
    # Add vault import if not present
    if 'get_test_password' not in content:
        # Find a good place to add import
        lines = content.split('\n')
        import_idx = 0
        for i, line in enumerate(lines):
            if line.startswith('from ') or line.startswith('import '):
                import_idx = i + 1
        lines.insert(import_idx, 'from tests.vault_helper import get_test_password')
        content = '\n'.join(lines)
    
    # Replace _get_auth_header default password
    content = re.sub(
        r'def _get_auth_header\(user, password="[^"]*"\):',
        'def _get_auth_header(user, password=None):\n    password = password or get_test_password()',
        content
    )
    
    # Replace make_user(password="...") with make_user(password=get_test_password())
    content = re.sub(
        r'make_user\(([^)]*)password="[^"]*"([^)]*)\)',
        r'make_user(\1password=get_test_password()\2)',
        content
    )
    
    # Replace User.objects.create_superuser(password="...")
    content = re.sub(
        r'password="[^"]*"',
        'password=get_test_password()',
        content
    )
    
    # Replace hardcoded passwords in login data dicts
    content = re.sub(
        r'"password": "[REDACTED]"',
        '"password": get_test_password()',
        content
    )
    content = re.sub(
        r'"password": "[REDACTED]"',
        '"password": get_test_password()',
        content
    )
    content = re.sub(
        r'"password": "[REDACTED]"',
        '"password": get_test_password()',
        content
    )
    content = re.sub(
        r'"password": "[REDACTED]"',
        '"password": get_test_password() + "_new"',
        content
    )
    content = re.sub(
        r'"password": "WrongPass123!@"',
        '"password": get_test_password() + "_wrong"',
        content
    )
    content = re.sub(
        r'"password": "WrongPassword123!@"',
        '"password": get_test_password() + "_wrong"',
        content
    )
    content = re.sub(
        r'"password": "Whatever123!@"',
        '"password": get_test_password() + "_wrong"',
        content
    )
    
    # Replace current_password in change-password payloads
    content = re.sub(
        r'"current_password": "[REDACTED]"',
        '"current_password": get_test_password()',
        content
    )
    
    # Replace password arg in _get_auth_header calls
    content = re.sub(
        r'_get_auth_header\(([^,]+),\s*"[REDACTED]"\)',
        r'_get_auth_header(\1)',
        content
    )
    content = re.sub(
        r'_get_auth_header\(([^,]+),\s*"[REDACTED]"\)',
        r'_get_auth_header(\1)',
        content
    )
    
    # Replace user.check_password("...")
    content = re.sub(
        r'check_password\("[^"]*"\)',
        'check_password(get_test_password())',
        content
    )
    
    if content != original:
        with open(filepath, 'w') as f:
            f.write(content)
        print(f"Fixed: {filepath}")
    else:
        print(f"No changes: {filepath}")

for f in files:
    fix_file(f)
