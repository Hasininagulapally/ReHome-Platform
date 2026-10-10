import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  expect: {
    timeout: 5000
  },
  use: {
    baseURL: 'http://localhost:5173',
    browserName: 'chromium',
    channel: 'chrome',
    headless: true,
    viewport: { width: 1280, height: 720 },
    actionTimeout: 10000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      use: { channel: 'chrome' }
    }
  ]
});
