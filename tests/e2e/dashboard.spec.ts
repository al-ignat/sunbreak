import { test, expect } from './fixtures';

test.describe('Dashboard', () => {
  test('renders header', async ({ page, extensionId }) => {
    await page.goto(`chrome-extension://${extensionId}/dashboard.html`);
    await expect(page.getByRole('heading', { name: 'Secure BYOAI' })).toBeVisible();
    await expect(page.getByText('Personal Dashboard')).toBeVisible();
  });

  test('renders all 5 tab buttons', async ({ page, extensionId }) => {
    await page.goto(`chrome-extension://${extensionId}/dashboard.html`);
    const tabs = page.getByRole('tab');
    await expect(tabs).toHaveCount(5);
    await expect(page.getByRole('tab', { name: 'Overview' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Activity Log' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Settings' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Keywords' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Report Cards' })).toBeVisible();
  });

  test('defaults to Overview tab', async ({ page, extensionId }) => {
    await page.goto(`chrome-extension://${extensionId}/dashboard.html`);
    const overviewTab = page.getByRole('tab', { name: 'Overview' });
    await expect(overviewTab).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#panel-overview')).toBeVisible();
  });

  test('switches to Activity Log tab', async ({ page, extensionId }) => {
    await page.goto(`chrome-extension://${extensionId}/dashboard.html`);
    await page.getByRole('tab', { name: 'Activity Log' }).click();
    await expect(page.locator('#panel-activity')).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Activity Log' })).toHaveAttribute('aria-selected', 'true');
  });

  test('switches to Settings tab', async ({ page, extensionId }) => {
    await page.goto(`chrome-extension://${extensionId}/dashboard.html`);
    await page.getByRole('tab', { name: 'Settings' }).click();
    await expect(page.locator('#panel-settings')).toBeVisible();
  });

  test('switches to Keywords tab', async ({ page, extensionId }) => {
    await page.goto(`chrome-extension://${extensionId}/dashboard.html`);
    await page.getByRole('tab', { name: 'Keywords' }).click();
    await expect(page.locator('#panel-keywords')).toBeVisible();
  });

  test('switches to Report Cards tab', async ({ page, extensionId }) => {
    await page.goto(`chrome-extension://${extensionId}/dashboard.html`);
    await page.getByRole('tab', { name: 'Report Cards' }).click();
    await expect(page.locator('#panel-reports')).toBeVisible();
  });

  test('navigates to tab from URL hash', async ({ page, extensionId }) => {
    await page.goto(`chrome-extension://${extensionId}/dashboard.html#settings`);
    await expect(page.getByRole('tab', { name: 'Settings' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#panel-settings')).toBeVisible();
  });

  test('Settings tab has detection toggles', async ({ page, extensionId }) => {
    await page.goto(`chrome-extension://${extensionId}/dashboard.html#settings`);
    const checkboxes = page.getByRole('checkbox');
    await expect(checkboxes.first()).toBeVisible();
  });
});
