const puppeteer = require('puppeteer');
const path = require('path');

async function captureScreenshots() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 800 });

  const screenshotsDir = __dirname;

  try {
    // 1. Public listings page
    console.log('Capturing public listings...');
    await page.goto('http://localhost:5175/', { waitUntil: 'networkidle2', timeout: 30000 });
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: path.join(screenshotsDir, 'screenshot-public-listings.png'),
      fullPage: false
    });
    console.log('✓ Public listings captured');

    // 2. Sign in page
    console.log('Capturing sign in page...');
    // Click sign in link if exists
    const signInLink = await page.$('a[href*="sign"], button:has-text("Sign In")');
    if (signInLink) {
      await signInLink.click();
      await page.waitForTimeout(1000);
    }
    await page.screenshot({
      path: path.join(screenshotsDir, 'screenshot-signin.png'),
      fullPage: false
    });
    console.log('✓ Sign in page captured');

  } catch (error) {
    console.error('Error capturing screenshots:', error.message);
  }

  await browser.close();
  console.log('\nScreenshots saved to docs/ folder');
}

captureScreenshots();
