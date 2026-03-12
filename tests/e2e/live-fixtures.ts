/**
 * Playwright fixtures for live AI tool testing.
 * Uses a persistent profile with saved login sessions.
 * Run setup-profile.ts first to create the profile.
 */
import { test as base, chromium, type BrowserContext, type Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const EXTENSION_PATH = path.join(import.meta.dirname, '..', '..', '.output', 'chrome-mv3');
const PROFILE_PATH = path.join(import.meta.dirname, '..', '..', '.e2e-profile');

export const test = base.extend<{
  context: BrowserContext;
  extensionId: string;
}>({
  context: async ({}, use) => {
    if (!fs.existsSync(PROFILE_PATH)) {
      throw new Error(
        'E2E profile not found. Run setup first:\n  npx tsx tests/e2e/setup-profile.ts',
      );
    }

    const context = await chromium.launchPersistentContext(PROFILE_PATH, {
      headless: false,
      channel: 'chromium',
      args: [
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
      ],
      viewport: { width: 1280, height: 800 },
    });

    await use(context);
    await context.close();
  },

  extensionId: async ({ context }, use) => {
    let [serviceWorker] = context.serviceWorkers();
    if (!serviceWorker) {
      serviceWorker = await context.waitForEvent('serviceworker');
    }
    const extensionId = serviceWorker.url().split('/')[2];
    if (!extensionId) throw new Error('Could not determine extension ID');
    await use(extensionId);
  },
});

export const expect = test.expect;

/** Navigate to a site and wait for the editor to be ready */
export async function navigateAndWaitForEditor(
  page: Page,
  url: string,
  editorSelector: string,
  timeoutMs = 15_000,
): Promise<void> {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector(editorSelector, { timeout: timeoutMs });
}
