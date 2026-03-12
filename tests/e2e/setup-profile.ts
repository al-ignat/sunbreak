/**
 * One-time setup: launches a Chromium browser with the extension loaded
 * and a persistent profile directory. Log into ChatGPT, Claude, and Gemini
 * manually, then close the browser. The profile is saved to .e2e-profile/
 * and reused by live E2E tests.
 *
 * Usage: npx tsx tests/e2e/setup-profile.ts
 */
import { chromium } from '@playwright/test';
import path from 'path';

const EXTENSION_PATH = path.join(import.meta.dirname, '..', '..', '.output', 'chrome-mv3');
const PROFILE_PATH = path.join(import.meta.dirname, '..', '..', '.e2e-profile');

async function main(): Promise<void> {
  console.log('Building extension...');
  const { execSync } = await import('child_process');
  execSync('npm run build', { stdio: 'inherit', cwd: path.join(import.meta.dirname, '..', '..') });

  console.log(`\nLaunching browser with profile at: ${PROFILE_PATH}`);
  console.log('Extension loaded from:', EXTENSION_PATH);
  console.log('\n--- Log into these sites, then close the browser: ---');
  console.log('  1. https://chatgpt.com');
  console.log('  2. https://claude.ai');
  console.log('  3. https://gemini.google.com');
  console.log('------------------------------------------------------\n');

  const context = await chromium.launchPersistentContext(PROFILE_PATH, {
    headless: false,
    channel: 'chromium',
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
    ],
    viewport: { width: 1280, height: 800 },
  });

  // Open the three AI tool tabs for convenience
  const chatgpt = await context.newPage();
  await chatgpt.goto('https://chatgpt.com');

  const claude = await context.newPage();
  await claude.goto('https://claude.ai');

  const gemini = await context.newPage();
  await gemini.goto('https://gemini.google.com');

  // Wait for the user to close the browser
  await new Promise<void>((resolve) => {
    context.on('close', () => resolve());
  });

  console.log('\nProfile saved. You can now run live E2E tests:');
  console.log('  npm run test:e2e:live');
}

main().catch(console.error);
