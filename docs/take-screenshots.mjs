import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 900 });

console.log('Taking screenshots...\n');

// 1. Public listings
console.log('1. Public listings page...');
await page.goto('http://localhost:5175/', { waitUntil: 'networkidle0', timeout: 30000 });
await new Promise(r => setTimeout(r, 2000));
await page.screenshot({ path: join(__dirname, 'screenshot-1-public-listings.png') });
console.log('   ✓ Saved\n');

// 2. Click on a listing to expand it (if any exist)
console.log('2. Expanded listing detail...');
try {
  const listing = await page.$('.bg-white.rounded-xl.shadow');
  if (listing) {
    await listing.click();
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: join(__dirname, 'screenshot-2-listing-detail.png') });
    console.log('   ✓ Saved\n');
  } else {
    console.log('   (No listings to expand)\n');
  }
} catch (e) {
  console.log('   (Skipped - no listings)\n');
}

// 3. Filter panel
console.log('3. Filter panel...');
try {
  const filterBtn = await page.$('button:has(svg)');
  const buttons = await page.$$('button');
  for (const btn of buttons) {
    const text = await btn.evaluate(el => el.textContent);
    if (text && text.includes('Filter')) {
      await btn.click();
      await new Promise(r => setTimeout(r, 500));
      break;
    }
  }
  await page.screenshot({ path: join(__dirname, 'screenshot-3-filters.png') });
  console.log('   ✓ Saved\n');
} catch (e) {
  console.log('   (Skipped)\n');
}

// 4. Sign in page - look for sign in link
console.log('4. Sign in page...');
await page.goto('http://localhost:5175/', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 1000));
try {
  // Find and click "Sign In" or provider sign in link
  const links = await page.$$('a, button');
  for (const link of links) {
    const text = await link.evaluate(el => el.textContent);
    if (text && (text.includes('Sign') || text.includes('Report') || text.includes('Provider'))) {
      await link.click();
      await new Promise(r => setTimeout(r, 1500));
      break;
    }
  }
  await page.screenshot({ path: join(__dirname, 'screenshot-4-signin.png') });
  console.log('   ✓ Saved\n');
} catch (e) {
  console.log('   (Skipped)\n');
}

await browser.close();
console.log('Done! Screenshots saved to docs/ folder');
