import { test, expect } from './fixtures';

test.describe('Popup', () => {
  test('renders header with extension name', async ({ page, extensionId }) => {
    await page.goto(`chrome-extension://${extensionId}/popup.html`);
    await expect(page.getByRole('heading', { name: 'Secure BYOAI' })).toBeVisible();
  });

  test('renders stats card after loading', async ({ page, extensionId }) => {
    await page.goto(`chrome-extension://${extensionId}/popup.html`);
    // Loading should finish quickly — wait for the "Loading..." to disappear
    await expect(page.getByText('Loading...')).toBeHidden({ timeout: 3000 });
    // The app container should have content
    await expect(page.locator('#app')).not.toBeEmpty();
  });

  test('renders detection category toggles', async ({ page, extensionId }) => {
    await page.goto(`chrome-extension://${extensionId}/popup.html`);
    await expect(page.getByText('Loading...')).toBeHidden({ timeout: 3000 });
    await expect(page.getByText('Detection Categories')).toBeVisible();
    // Should have checkboxes for detection toggles
    const checkboxes = page.getByRole('checkbox');
    await expect(checkboxes.first()).toBeVisible();
  });

  test('has settings gear button', async ({ page, extensionId }) => {
    await page.goto(`chrome-extension://${extensionId}/popup.html`);
    await expect(page.getByText('Loading...')).toBeHidden({ timeout: 3000 });
    await expect(page.getByRole('button', { name: 'Open settings' })).toBeVisible();
  });

  test('has dashboard link', async ({ page, extensionId }) => {
    await page.goto(`chrome-extension://${extensionId}/popup.html`);
    await expect(page.getByText('Loading...')).toBeHidden({ timeout: 3000 });
    await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible();
  });

  test('toggles detection category on and off', async ({ page, extensionId }) => {
    await page.goto(`chrome-extension://${extensionId}/popup.html`);
    await expect(page.getByText('Loading...')).toBeHidden({ timeout: 3000 });

    const firstCheckbox = page.getByRole('checkbox').first();
    const wasChecked = await firstCheckbox.isChecked();

    await firstCheckbox.click();
    expect(await firstCheckbox.isChecked()).toBe(!wasChecked);

    await firstCheckbox.click();
    expect(await firstCheckbox.isChecked()).toBe(wasChecked);
  });
});
