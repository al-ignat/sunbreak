import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  workers: 1,
  retries: 0,
  timeout: 30_000,
  use: {
    // No default baseURL — tests navigate to chrome-extension:// URLs
  },
});
