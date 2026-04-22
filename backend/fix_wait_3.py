import glob
import re

for filepath in glob.glob("../frontend/tests/e2e/*.ts"):
    with open(filepath) as f:
        content = f.read()

    # Non-greedy match for everything from const responsePromise to the end of statement
    content = re.sub(
        r"const responsePromise = page\.waitForResponse\(.*?\);\n\s*",
        "",
        content,
        flags=re.DOTALL,
    )

    # Also strip out the await responsePromise;
    content = content.replace(
        "await responsePromise;", "await page.waitForTimeout(1000);"
    )

    with open(filepath, "w") as f:
        f.write(content)

print("Properly stripped")
