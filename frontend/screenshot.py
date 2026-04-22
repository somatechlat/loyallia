import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        await page.goto('http://localhost:3000/register')
        await page.wait_for_timeout(2000)
        await page.screenshot(path='/Users/macbookpro201916i964gb1tb/.gemini/antigravity/brain/8c1bf91b-caea-410d-8ea8-86def098e10e/scratch/register.png', full_page=True)
        
        # Click the country button
        await page.click('#country-code-btn')
        await page.wait_for_timeout(1000)
        await page.screenshot(path='/Users/macbookpro201916i964gb1tb/.gemini/antigravity/brain/8c1bf91b-caea-410d-8ea8-86def098e10e/scratch/register_open.png', full_page=True)
        
        await browser.close()

asyncio.run(main())
