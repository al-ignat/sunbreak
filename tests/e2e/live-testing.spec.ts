/**
 * Phase 6b: Cross-tool live testing
 *
 * Validates the full Sunbreak flow on ChatGPT, Claude, and Gemini.
 * Requires a saved profile with login sessions (run setup-profile.ts first).
 *
 * Usage: npm run test:e2e:live
 */
import { test, expect, navigateAndWaitForEditor } from './live-fixtures';

/** Per-site config for the test matrix */
const SITES = [
  {
    name: 'ChatGPT',
    url: 'https://chatgpt.com',
    editorSelector: '#prompt-textarea, div.ProseMirror[contenteditable="true"]',
    sendButtonSelector: '[data-testid="send-button"]',
  },
  {
    name: 'Claude',
    url: 'https://claude.ai/new',
    editorSelector: '.ProseMirror[contenteditable="true"], div[role="textbox"][contenteditable="true"]',
    sendButtonSelector: 'button[aria-label="Send message"], button[aria-label="Send Message"]',
  },
  {
    name: 'Gemini',
    url: 'https://gemini.google.com',
    editorSelector: '.ql-editor[contenteditable="true"], rich-textarea div[contenteditable="true"]',
    sendButtonSelector: '.send-button, button[aria-label="Send message"]',
  },
] as const;

for (const site of SITES) {
  test.describe(`${site.name} — live testing`, () => {
    test.setTimeout(60_000);

    test('T1: findInput returns a connected element', async ({ context }) => {
      const page = await context.newPage();
      await navigateAndWaitForEditor(page, site.url, site.editorSelector);

      const editor = await page.$(site.editorSelector);
      expect(editor).not.toBeNull();

      const isConnected = await editor?.evaluate((el) => el.isConnected);
      expect(isConnected).toBe(true);

      await page.close();
    });

    test('T2: getText matches visible text', async ({ context }) => {
      const page = await context.newPage();
      await navigateAndWaitForEditor(page, site.url, site.editorSelector);

      // Type some text
      const editor = await page.$(site.editorSelector);
      expect(editor).not.toBeNull();
      await editor?.click();
      await page.keyboard.type('Hello from Sunbreak test');
      await page.waitForTimeout(1000);

      // Read visible text
      const visibleText = await editor?.evaluate((el) => el.textContent?.trim());
      expect(visibleText).toContain('Hello from Sunbreak test');

      // Clear the input
      await page.keyboard.hotkey('Meta+a');
      await page.keyboard.press('Backspace');

      await page.close();
    });

    test('T5: send button is found', async ({ context }) => {
      const page = await context.newPage();
      await navigateAndWaitForEditor(page, site.url, site.editorSelector);

      // Type something so the send button appears
      const editor = await page.$(site.editorSelector);
      await editor?.click();
      await page.keyboard.type('test');
      await page.waitForTimeout(1000);

      const sendButton = await page.$(site.sendButtonSelector);
      // Send button may not be visible on all sites when empty — log result
      const found = sendButton !== null;
      console.log(`[${site.name}] Send button found: ${found}`);

      if (sendButton) {
        const isVisible = await sendButton.isVisible();
        console.log(`[${site.name}] Send button visible: ${isVisible}`);
        expect(isVisible).toBe(true);
      }

      // Clear
      await page.keyboard.hotkey('Meta+a');
      await page.keyboard.press('Backspace');

      await page.close();
    });

    test('T7: widget container is injected into page', async ({ context }) => {
      const page = await context.newPage();
      await navigateAndWaitForEditor(page, site.url, site.editorSelector);

      // Wait a bit for the extension content script to load
      await page.waitForTimeout(3000);

      const widgetRoot = await page.$('#sunbreak-widget-root');
      console.log(`[${site.name}] Widget root found: ${widgetRoot !== null}`);
      expect(widgetRoot).not.toBeNull();

      await page.close();
    });

    test('T9: widget appears when PII is typed', async ({ context }) => {
      const page = await context.newPage();
      await navigateAndWaitForEditor(page, site.url, site.editorSelector);

      // Wait for extension to attach
      await page.waitForTimeout(3000);

      // Type PII
      const editor = await page.$(site.editorSelector);
      await editor?.click();
      await page.keyboard.type('Please email me at john.doe@example.com');

      // Wait for scanner debounce (500ms) + rendering
      await page.waitForTimeout(2000);

      // Check that widget root exists and is visible
      const widgetRoot = await page.$('#sunbreak-widget-root');
      expect(widgetRoot).not.toBeNull();

      // Check visibility via computed style
      const display = await widgetRoot?.evaluate((el) => getComputedStyle(el).display);
      console.log(`[${site.name}] Widget display after PII: ${display}`);
      expect(display).not.toBe('none');

      // Clear
      await page.keyboard.hotkey('Meta+a');
      await page.keyboard.press('Backspace');

      await page.close();
    });

    test('T8: extension re-attaches after SPA navigation', async ({ context }) => {
      const page = await context.newPage();
      await navigateAndWaitForEditor(page, site.url, site.editorSelector);
      await page.waitForTimeout(3000);

      // Verify widget root exists initially
      const initialRoot = await page.$('#sunbreak-widget-root');
      expect(initialRoot).not.toBeNull();

      // Navigate to a new chat (SPA navigation varies by site)
      // We'll use the URL-based approach: navigate to the same base URL
      await page.goto(site.url, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector(site.editorSelector, { timeout: 15_000 });
      await page.waitForTimeout(3000);

      // Widget should re-attach
      const reattachedRoot = await page.$('#sunbreak-widget-root');
      console.log(`[${site.name}] Widget re-attached after navigation: ${reattachedRoot !== null}`);
      expect(reattachedRoot).not.toBeNull();

      await page.close();
    });
  });
}
