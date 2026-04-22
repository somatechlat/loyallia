import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        
        # Capture console logs
        page.on("console", lambda msg: print(f"Browser Console: {msg.text}"))
        page.on("pageerror", lambda err: print(f"Browser Error: {err}"))
        
        print("Navigating to register page...")
        await page.goto('http://localhost:3000/register')
        await page.wait_for_timeout(2000)
        
        print("Clicking country code button...")
        btn = page.locator('#country-code-btn')
        print(f"Button bounding box before click: {await btn.bounding_box()}")
        await btn.click()
        await page.wait_for_timeout(1000)
        
        dropdown = page.locator('.absolute.top-full')
        print(f"Dropdown bounding box: {await dropdown.bounding_box()}")
        
        print("Typing in search...")
        search = page.locator('#country-search')
        await search.fill('col')
        await page.wait_for_timeout(1000)
        
        print("Clicking Colombia...")
        colombia = page.locator('text=Colombia')
        print(f"Colombia option bounding box: {await colombia.bounding_box()}")
        await colombia.click()
        await page.wait_for_timeout(1000)
        
        print(f"Button bounding box after click: {await btn.bounding_box()}")
        
        await browser.close()

asyncio.run(main())
