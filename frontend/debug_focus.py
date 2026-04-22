import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        
        await page.goto('http://localhost:3000/register')
        await page.wait_for_timeout(2000)
        
        await page.click('#country-code-btn')
        await page.wait_for_timeout(500)
        
        # Focus search and type slowly
        search = page.locator('#country-search')
        
        # Type first char
        await page.keyboard.press('c')
        await page.wait_for_timeout(100)
        # Check focus
        is_focused = await search.evaluate('el => el === document.activeElement')
        print(f"Is focused after 'c': {is_focused}")
        
        # Type second char
        await page.keyboard.press('o')
        await page.wait_for_timeout(100)
        is_focused = await search.evaluate('el => el === document.activeElement')
        print(f"Is focused after 'o': {is_focused}")
        
        # Get value
        val = await search.input_value()
        print(f"Input value: {val}")
        
        await browser.close()

asyncio.run(main())
