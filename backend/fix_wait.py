import glob
for filepath in glob.glob("frontend/tests/e2e/*.ts"):
    with open(filepath, 'r') as f:
        content = f.read()
    
    content = content.replace("response.url().includes('login')", "response.url().includes('auth/login')")
        
    with open(filepath, 'w') as f:
        f.write(content)

print("Wait fixed")
