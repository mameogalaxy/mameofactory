import { defineConfig, devices } from '@playwright/test';

// The smoke test reads BASE_URL (set by the worker's e2e recipe to the random-port
// static server). Falls back to :8123 for the `npm run serve` convenience case.
const baseURL = process.env.BASE_URL || 'http://localhost:8123';

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  fullyParallel: false,
  reporter: [['list']],
  use: {
    baseURL,
    headless: true,
    viewport: { width: 1280, height: 800 },
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
