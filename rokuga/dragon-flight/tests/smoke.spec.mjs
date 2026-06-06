// smoke.spec.mjs — the e2e gate for every worker.
//
// Asserts the integrated page boots with the worker's module active:
//   - no console errors, no uncaught page errors
//   - window.__gameReady === true within 10s (set by main.js after all modules init)
//   - a WebGL canvas exists with non-zero size
// Then screenshots to tests/__screenshots__/smoke.png as visual proof.
//
// Allowed-noise filter: external CDN/network hiccups (unpkg) are not the worker's fault.

import { test, expect } from '@playwright/test';

const IGNORE = [
  /unpkg\.com/i,
  /Failed to load resource/i,
  /net::ERR/i,
  /favicon/i,
  /AudioContext was not allowed to start/i, // autoplay policy, harmless in headless
];

function ignorable(text) {
  return IGNORE.some((re) => re.test(text));
}

test('game boots clean and reaches __gameReady', async ({ page }) => {
  const consoleErrors = [];
  const pageErrors = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const t = msg.text();
      if (!ignorable(t)) consoleErrors.push(t);
    }
  });
  page.on('pageerror', (err) => {
    const t = String(err);
    if (!ignorable(t)) pageErrors.push(t);
  });

  await page.goto('/', { waitUntil: 'load' });

  // main.js sets window.__gameReady after every module's init() runs.
  await page.waitForFunction(() => window.__gameReady === true, null, { timeout: 10_000 });

  // Surface a fatal boot error if main.js caught one.
  const bootError = await page.evaluate(() => window.__bootError || null);
  expect(bootError, `fatal boot error: ${bootError}`).toBeNull();

  // Canvas should be present and sized.
  const size = await page.evaluate(() => {
    const c = document.getElementById('game-canvas');
    return c ? { w: c.width, h: c.height } : null;
  });
  expect(size, 'game-canvas missing').not.toBeNull();
  expect(size.w).toBeGreaterThan(0);
  expect(size.h).toBeGreaterThan(0);

  // Let a few frames render so module update() loops exercise once.
  await page.waitForTimeout(1500);

  await page.screenshot({ path: 'tests/__screenshots__/smoke.png', fullPage: false });

  expect(pageErrors, `page errors:\n${pageErrors.join('\n')}`).toHaveLength(0);
  expect(consoleErrors, `console errors:\n${consoleErrors.join('\n')}`).toHaveLength(0);
});
