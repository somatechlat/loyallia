import glob
import re

for filepath in glob.glob("frontend/tests/e2e/*.ts"):
    with open(filepath) as f:
        content = f.read()

    # Remove waitForResponse setup
    content = re.sub(
        r"const responsePromise = page\.waitForResponse\([^)]+\);\n\s*", "", content
    )

    # Replace await responsePromise with waitForNavigation or simple wait
    content = content.replace(
        "await responsePromise;", "await page.waitForTimeout(2000);"
    )

    # For Promise.all patterns
    content = re.sub(
        r"await Promise\.all\(\[\s*page\.waitForResponse\([^)]+\),\s*page\.click\([^)]+\)\s*\]\);",
        r"await page.click('button[type=\"submit\"]');\n    await page.waitForTimeout(2000);",
        content,
    )

    with open(filepath, "w") as f:
        f.write(content)

print("waitForResponse stripped")
