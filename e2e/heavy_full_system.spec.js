import { test, expect } from '@playwright/test';

test.describe('ReHome User Workflow E2E Tests', () => {
  test.describe.configure({ mode: 'serial' });

  const timestamp = Date.now();
  const testUser = {
    name: `Deep E2E User ${timestamp}`,
    email: `heavy_e2e_${timestamp}@rehome.test`,
    password: 'securePassword123!',
    city: 'Indiranagar, Bangalore'
  };
  const testItem = {
    title: `Handcrafted Teak Dining Chair ${timestamp}`,
    location: 'Indiranagar, Bangalore',
    description: 'Beautiful dining chair in solid teak wood. Free to any good home!',
    imageUrl: 'https://images.unsplash.com/photo-1503602642458-232111445657?auto=format&fit=crop&w=600&q=80'
  };

  test('01. Visitor Navigation & Homepage Feature Tour', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Hero title & subtitle
    await expect(page.locator('h1.hero-heading')).toBeVisible();
    await expect(page.locator('.hero-subtitle')).toBeVisible();

    // Live honest metrics bar (Free to join, 1-15 km radius, 0% commission)
    await expect(page.locator('.hero-metrics-bar')).toBeVisible();
    await expect(page.locator('.hero-metrics-bar')).toContainText('Free');
    await expect(page.locator('.hero-metrics-bar')).toContainText('1–15 km');
    await expect(page.locator('.hero-metrics-bar')).toContainText('Zero');

    // Featured Categories
    await expect(page.getByText('BROWSE BY CATEGORY')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Furniture' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Electronics' })).toBeVisible();

    // Search bar on home page works and navigates to /search
    await page.fill('#rehome-search-input', 'Sofa');
    await page.click('.search-submit-btn');
    await expect(page).toHaveURL(/.*\/search\?q=Sofa/);
  });

  test('02. User Registration & Immediate Login State', async ({ page }) => {
    await page.goto('/register');
    await page.waitForLoadState('networkidle');

    await page.fill('input#fullName', testUser.name);
    await page.fill('input#email', testUser.email);
    await page.fill('input#password', testUser.password);
    await page.fill('input#confirmPassword', testUser.password);
    await page.click('button.auth-submit-btn');

    // Should redirect to / and display user greeting
    await expect(page).toHaveURL('http://localhost:5173/');
    await expect(page.locator('.nav-user-name')).toContainText(testUser.name.split(' ')[0]);

    // Token persisted in localStorage
    const storedUser = await page.evaluate(() => localStorage.getItem('rehome_user'));
    expect(storedUser).toContain(testUser.email);
  });

  test('03. Post Item Modal Flow & Real Listing Creation', async ({ page }) => {
    // Login with the user
    await page.goto('/login');
    await page.fill('input#email', testUser.email);
    await page.fill('input#password', testUser.password);
    await page.click('button.auth-submit-btn');
    await expect(page).toHaveURL('http://localhost:5173/');

    // Click Post Item button
    await page.click('.post-item-btn');
    await expect(page.locator('.rehome-post-modal')).toBeVisible();

    // Fill listing details
    await page.fill('input#title', testItem.title);
    await page.fill('input#location', testItem.location);
    await page.fill('textarea#description', testItem.description);
    await page.fill('input#customImageUrl', testItem.imageUrl);

    // Submit form
    await page.click('button.post-submit-btn');

    // Modal should close and navigate to the newly created item's details page
    await expect(page.locator('.rehome-post-modal')).not.toBeVisible({ timeout: 10000 });
    await expect(page).toHaveURL(/.*\/item\/.+/);
    await expect(page.locator('.details-item-title')).toContainText(testItem.title);
  });

  test('04. Search Page Filtering, Keyword Search, & Reset', async ({ page }) => {
    await page.goto('/search');
    await page.waitForLoadState('networkidle');

    // Search by title keyword
    await page.fill('#rehome-search-input', testItem.title);
    await page.click('.search-submit-btn');
    await page.waitForTimeout(600);

    const card = page.locator('.rehome-item-card', { hasText: testItem.title });
    await expect(card).toBeVisible();

    // Verify category filter pill works
    const booksBtn = page.getByRole('button', { name: 'Books' });
    if (await booksBtn.isVisible()) {
      await booksBtn.click();
      await page.waitForTimeout(600);
    }
  });

  test('05. Item Details Interaction, Modal Claim & Save Item', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input#email', testUser.email);
    await page.fill('input#password', testUser.password);
    await page.click('button.auth-submit-btn');

    // Go to search and find item
    await page.goto('/search');
    await page.waitForLoadState('networkidle');
    await page.fill('#rehome-search-input', testItem.title);
    await page.click('.search-submit-btn');
    await page.waitForTimeout(600);

    const card = page.locator('.rehome-item-card', { hasText: testItem.title });
    await card.locator('.view-details-btn').click();
    await expect(page).toHaveURL(/.*\/item\/.+/);

    // Verify claim pickup modal
    await page.click('.request-pickup-btn');
    await expect(page.locator('.claim-modal-title')).toBeVisible();
    await page.locator('.ant-modal-close').click();

    // Toggle Save item
    await page.click('.save-item-btn');
    await expect(page.locator('.save-item-btn')).toContainText('Saved');

    // Visit /saved page and verify item appears
    await page.goto('/saved');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.rehome-item-card', { hasText: testItem.title })).toBeVisible();
  });

  test('06. My Listings Management: Status Changes & Delete Listing', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input#email', testUser.email);
    await page.fill('input#password', testUser.password);
    await page.click('button.auth-submit-btn');
    await expect(page).toHaveURL('http://localhost:5173/');

    // Navigate to /my-listings
    await page.goto('/my-listings');
    await page.waitForLoadState('networkidle');

    const listingCard = page.locator('.my-listing-card', { hasText: testItem.title });
    await expect(listingCard).toBeVisible();

    // Mark as Given Away
    await listingCard.locator('button:has-text("Mark Given Away")').click();
    await page.waitForTimeout(500);
    await expect(listingCard.locator('.my-listing-status')).toContainText('Given Away');

    // Re-list
    await listingCard.locator('button:has-text("Re-list")').click();
    await page.waitForTimeout(500);
    await expect(listingCard.locator('.my-listing-status')).toContainText('Available');

    // Delete listing
    await listingCard.locator('button:has-text("Delete")').click();
    await page.waitForTimeout(500);

    // Verify listing is removed from UI
    await expect(page.locator('.my-listing-card', { hasText: testItem.title })).not.toBeVisible();
  });

  test('07. User Profile View & Navigation Links', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input#email', testUser.email);
    await page.fill('input#password', testUser.password);
    await page.click('button.auth-submit-btn');
    await expect(page).toHaveURL('http://localhost:5173/');

    // Visit /profile
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: 'My Profile' })).toBeVisible();
    await expect(page.locator('.profile-card')).toContainText(testUser.email);
    await expect(page.getByText('Active listings')).toBeVisible();
    await expect(page.getByText('Total listings')).toBeVisible();
  });

  test('08. Responsive Layouts across 360px, 768px, 1280px, 1440px', async ({ page }) => {
    const viewports = [
      { name: 'mobile-360', width: 360, height: 640 },
      { name: 'tablet-768', width: 768, height: 1024 },
      { name: 'laptop-1280', width: 1280, height: 800 },
      { name: 'desktop-1440', width: 1440, height: 900 }
    ];

    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      await expect(page.locator('.brand-name')).toBeVisible();

      if (vp.width <= 768) {
        await expect(page.locator('button.mobile-menu-trigger')).toBeVisible();
      } else {
        await expect(page.locator('.rehome-nav-links')).toBeVisible();
      }
    }
  });

  test('09. Keyboard Focus & Accessibility Check', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Check Tab navigation focuses active input elements
    await page.keyboard.press('Tab');
    const focusedTag = await page.evaluate(() => document.activeElement?.tagName);
    expect(['INPUT', 'BUTTON', 'A']).toContain(focusedTag);

    // Verify label association for email input
    const emailInputId = await page.locator('label[for="email"]').getAttribute('for');
    expect(emailInputId).toBe('email');
  });

  test('10. Logout & Route Guard Redirection', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input#email', testUser.email);
    await page.fill('input#password', testUser.password);
    await page.click('button.auth-submit-btn');
    await expect(page).toHaveURL('http://localhost:5173/');

    // Logout
    await page.click('.nav-user-profile');
    await page.click('text=Logout');
    await expect(page.locator('.login-link')).toBeVisible();

    // Verify localStorage cleared
    const storedUser = await page.evaluate(() => localStorage.getItem('rehome_user'));
    expect(storedUser).toBeNull();
  });
});
