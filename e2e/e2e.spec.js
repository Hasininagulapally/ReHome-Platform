import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const SCREENSHOT_DIR = path.resolve('e2e/screenshots');
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

test.describe('ReHome Full System E2E Suite', () => {
  // Capture all console warnings and errors
  test('Console Cleanliness & Zero-Error Check across navigation', async ({ page }) => {
    const consoleIssues = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleIssues.push(`[${msg.type()}] ${msg.text()}`);
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.goto('/search');
    await page.waitForLoadState('networkidle');
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.goto('/register');
    await page.waitForLoadState('networkidle');

    expect(consoleIssues.filter((msg) => !msg.includes('favicon'))).toEqual([]);
  });

  test('Route Redirection: unknown path redirects to Home', async ({ page }) => {
    await page.goto('/non-existent-random-route-404');
    await expect(page).toHaveURL('http://localhost:5173/');
    await expect(page.locator('h1.hero-heading')).toBeVisible();
  });

  test('Demo Account Authentication: auto-fill & login flow', async ({ page }) => {
    await page.goto('/login');
    await page.click('button.fill-demo-btn');

    // Confirm inputs populated
    await expect(page.locator('input[type="email"], input[id*="email"]')).toHaveValue('priya@rehome.org');

    await page.click('button.auth-submit-btn');
    await expect(page).toHaveURL('http://localhost:5173/');

    // Check navbar greeting
    await expect(page.locator('.nav-user-name')).toContainText('Priya');

    // Verify token persistence on reload
    await page.reload();
    await expect(page.locator('.nav-user-name')).toContainText('Priya');

    // Logout
    await page.click('.nav-user-profile');
    await page.click('text=Logout');
    await expect(page.locator('.login-link')).toBeVisible();
  });

  test('Full User Journey: Register -> Login -> Post Item -> Browse -> Details', async ({ page }) => {
    const testEmail = `qa_tester_${Date.now()}@rehome.test`;

    // 1. Register
    await page.goto('/register');
    await page.fill('input#fullName', 'Ananya Iyer');
    await page.fill('input#email', testEmail);
    await page.fill('input#password', 'securePass123');
    await page.fill('input#confirmPassword', 'securePass123');
    await page.click('button.auth-submit-btn');

    // Redirected to home after registration
    await expect(page).toHaveURL('http://localhost:5173/');
    await expect(page.locator('.nav-user-name')).toContainText('Ananya');

    // 2. Open Post Item Modal
    await page.click('button.post-item-btn');
    await expect(page.locator('.rehome-post-modal')).toBeVisible();

    // 3. Fill and submit item form
    const itemTitle = `Vintage Teak Coffee Table ${Date.now()}`;
    await page.fill('input#title', itemTitle);
    await page.fill('input#location', 'Indiranagar, Bangalore');
    await page.fill('textarea#description', 'Beautiful handmade coffee table looking for a warm home.');
    await page.fill('input#customImageUrl', 'https://images.unsplash.com/photo-1538688525198-9b88f6f53126?auto=format&fit=crop&w=600&q=80');

    // Publish
    await page.click('button.post-submit-btn');
    await expect(page.locator('.rehome-post-modal')).not.toBeVisible();

    // 4. Verify item appears on Browse / Search page
    await page.goto('/search');
    await page.waitForLoadState('networkidle');
    await page.fill('#rehome-search-input', itemTitle);
    await page.click('.search-submit-btn');
    await page.waitForTimeout(600);

    const targetCardTitle = page.locator(`h3.item-card-title:has-text("${itemTitle}")`);
    await expect(targetCardTitle).toBeVisible();

    // 5. Navigate to item details
    const card = page.locator('.rehome-item-card', { hasText: itemTitle });
    await card.locator('button.view-details-btn').click();
    await expect(page.locator('.details-item-title')).toContainText(itemTitle);
    await expect(page.locator('.details-price-badge')).toBeVisible();
  });

  test('Responsive Layouts & Viewport Screenshots (360px, 768px, 1280px, 1920px)', async ({ page }) => {
    const viewports = [
      { name: 'mobile-360px', width: 360, height: 640 },
      { name: 'tablet-768px', width: 768, height: 1024 },
      { name: 'laptop-1280px', width: 1280, height: 800 },
      { name: 'desktop-1920px', width: 1920, height: 1080 }
    ];

    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const screenshotPath = path.join(SCREENSHOT_DIR, `home-${vp.name}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: false });

      // Verify header and brand are properly displayed
      await expect(page.locator('.rehome-brand-text .brand-name')).toBeVisible();

      if (vp.width <= 768) {
        // Mobile hamburger menu button visible
        await expect(page.locator('button.mobile-menu-trigger')).toBeVisible();
      } else {
        // Desktop nav links visible
        await expect(page.locator('.rehome-nav-links')).toBeVisible();
      }
    }
  });

  test('Accessibility Basics: Alt text on images, form labels, keyboard tab navigation', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 1. Alt attributes check on item card images
    const images = await page.locator('.rehome-item-card img').all();
    for (const img of images) {
      const alt = await img.getAttribute('alt');
      expect(alt).toBeTruthy();
    }

    // 2. Form labels check on Login page
    await page.goto('/login');
    const emailLabel = await page.locator('label[for="email"]').textContent();
    expect(emailLabel).toContain('Email address');

    // 3. Tab navigation check
    await page.keyboard.press('Tab');
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedElement).toBeTruthy();
  });
});
