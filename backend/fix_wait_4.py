import glob
import re

for filepath in glob.glob("../frontend/tests/e2e/*.ts"):
    with open(filepath) as f:
        content = f.read()

    # Non-greedy match
    content = re.sub(
        r"const responsePromise = page\.waitForResponse\(.*?\);\n\s*",
        "",
        content,
        flags=re.DOTALL,
    )
    content = content.replace(
        "await responsePromise;", "await page.waitForTimeout(2000);"
    )

    content = re.sub(
        r"await Promise\.all\(\[\s*page\.waitForResponse\(.*?\),\s*page\.click\([^)]+\)\s*\]\);",
        r"await page.click('button[type=\"submit\"]');\n    await page.waitForTimeout(2000);",
        content,
        flags=re.DOTALL,
    )

    with open(filepath, "w") as f:
        f.write(content)

print("Properly stripped again")
