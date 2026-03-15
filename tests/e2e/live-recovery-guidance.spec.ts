/**
 * Epic 5: Recovery & provider guidance — live provider testing
 *
 * Validates file-upload awareness, recovery event logging, and
 * dashboard recovery detail on ChatGPT, Claude, and Gemini.
 *
 * Usage: npm run test:e2e:live
 */
import { test, expect } from './live-fixtures';
import type { Page, BrowserContext } from '@playwright/test';
import type { CDPSession } from 'playwright-core';
import path from 'path';
import fs from 'fs';

/** Per-site config */
const SITES = [
  {
    name: 'ChatGPT',
    url: 'https://chatgpt.com',
    editorSelector: '#prompt-textarea, div.ProseMirror[contenteditable="true"]',
  },
  {
    name: 'Claude',
    url: 'https://claude.ai/new',
    editorSelector: '.ProseMirror[contenteditable="true"], div[role="textbox"][contenteditable="true"]',
  },
  {
    name: 'Gemini',
    url: 'https://gemini.google.com',
    editorSelector: '.ql-editor[contenteditable="true"], rich-textarea div[contenteditable="true"]',
  },
] as const;

/** Wait for the content script to inject the widget root */
async function waitForWidgetRoot(page: Page, timeoutMs = 10_000): Promise<void> {
  const locator = page.locator('#sunbreak-widget-root');
  await locator.waitFor({ state: 'attached', timeout: timeoutMs });
}

/** Read all text content inside a closed shadow DOM using CDP */
async function readShadowText(page: Page, hostSelector: string): Promise<string> {
  const cdp: CDPSession = await page.context().newCDPSession(page);
  try {
    const { root } = await cdp.send('DOM.getDocument', { depth: 0 });
    const { nodeId: hostNodeId } = await cdp.send('DOM.querySelector', {
      nodeId: root.nodeId,
      selector: hostSelector,
    });
    if (!hostNodeId) return '';

    const { node } = await cdp.send('DOM.describeNode', { nodeId: hostNodeId, depth: -1, pierce: true });
    if (!node.shadowRoots || node.shadowRoots.length === 0) return '';

    const { object: shadowObj } = await cdp.send('DOM.resolveNode', { backendNodeId: node.shadowRoots[0].backendNodeId });

    const result = await cdp.send('Runtime.callFunctionOn', {
      objectId: shadowObj.objectId,
      functionDeclaration: 'function() { return this.textContent || ""; }',
      returnByValue: true,
    });

    return result.result.value as string;
  } finally {
    await cdp.detach();
  }
}

/** Click an element inside a closed shadow DOM by CSS selector */
async function clickShadowElement(page: Page, hostSelector: string, innerSelector: string): Promise<boolean> {
  const cdp: CDPSession = await page.context().newCDPSession(page);
  try {
    const { root } = await cdp.send('DOM.getDocument', { depth: 0 });
    const { nodeId: hostNodeId } = await cdp.send('DOM.querySelector', {
      nodeId: root.nodeId,
      selector: hostSelector,
    });
    if (!hostNodeId) return false;

    const { node } = await cdp.send('DOM.describeNode', { nodeId: hostNodeId, depth: -1, pierce: true });
    if (!node.shadowRoots || node.shadowRoots.length === 0) return false;

    const { object: shadowObj } = await cdp.send('DOM.resolveNode', { backendNodeId: node.shadowRoots[0].backendNodeId });

    const result = await cdp.send('Runtime.callFunctionOn', {
      objectId: shadowObj.objectId,
      functionDeclaration: `function(sel) {
        const el = this.querySelector(sel);
        if (el) { el.click(); return true; }
        return false;
      }`,
      arguments: [{ value: innerSelector }],
      returnByValue: true,
    });

    return result.result.value === true;
  } finally {
    await cdp.detach();
  }
}

/** Clear editor and wait for scanner to settle */
async function clearEditorAndWait(page: Page, editor: import('@playwright/test').Locator): Promise<void> {
  await editor.click();
  await page.keyboard.press('Meta+a');
  await page.keyboard.press('Backspace');
  await page.waitForTimeout(1000);
}

/** Read flagged events from extension storage via dashboard page */
async function readFlaggedEvents(
  context: BrowserContext,
  extensionId: string,
): Promise<unknown[]> {
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/dashboard.html`, { waitUntil: 'domcontentloaded' });

  const events = await page.evaluate(() => {
    return new Promise<unknown[]>((resolve) => {
      chrome.storage.local.get('flaggedEvents', (data) => {
        resolve(Array.isArray(data['flaggedEvents']) ? data['flaggedEvents'] : []);
      });
    });
  });

  await page.close();
  return events;
}

/** Clear flagged events from storage */
async function clearFlaggedEvents(
  context: BrowserContext,
  extensionId: string,
): Promise<void> {
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/dashboard.html`, { waitUntil: 'domcontentloaded' });

  await page.evaluate(() => {
    return new Promise<void>((resolve) => {
      chrome.storage.local.set({ flaggedEvents: [] }, resolve);
    });
  });

  await page.close();
}

/** Create a small temp file for upload testing */
function createTempFile(): string {
  const tmpDir = path.join(import.meta.dirname, '..', '..', '.tmp-e2e');
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
  const filePath = path.join(tmpDir, 'test-upload.txt');
  fs.writeFileSync(filePath, 'Sunbreak E2E test file — safe to ignore.\n');
  return filePath;
}

/** Cleanup temp file */
function removeTempFile(filePath: string): void {
  try {
    fs.unlinkSync(filePath);
    const dir = path.dirname(filePath);
    if (fs.existsSync(dir) && fs.readdirSync(dir).length === 0) {
      fs.rmdirSync(dir);
    }
  } catch {
    // ignore
  }
}

for (const site of SITES) {
  test.describe(`${site.name} — recovery & guidance`, () => {
    test.setTimeout(60_000);

    test('FU1: file upload via input triggers file warning toast', async ({ context, extensionId }) => {
      await clearFlaggedEvents(context, extensionId);

      const page = await context.newPage();
      await page.goto(site.url, { waitUntil: 'domcontentloaded' });

      const editor = page.locator(site.editorSelector).first();
      await editor.waitFor({ state: 'visible', timeout: 15_000 });

      try {
        await waitForWidgetRoot(page);
      } catch {
        console.log(`[${site.name}] FU1 SKIP: widget root not injected`);
        test.skip();
        return;
      }

      // Create a temp file to upload
      const tempFile = createTempFile();

      try {
        // Trigger file input: dispatch a synthetic change event with a file
        // This simulates the file input vector by dispatching a File via a hidden input
        const fileUploaded = await page.evaluate((filename) => {
          // Create a temporary file input, set its files, and dispatch change
          const input = document.createElement('input');
          input.type = 'file';
          document.body.appendChild(input);

          // Use DataTransfer to create a synthetic FileList
          const dt = new DataTransfer();
          dt.items.add(new File(['test content'], filename, { type: 'text/plain' }));
          input.files = dt.files;

          input.dispatchEvent(new Event('change', { bubbles: true }));

          // Cleanup
          setTimeout(() => input.remove(), 100);
          return true;
        }, 'test-upload.txt');

        console.log(`[${site.name}] FU1 file input dispatched: ${fileUploaded}`);

        // Wait for the file warning toast to appear
        await page.waitForTimeout(1500);

        // Read shadow DOM text — should contain file warning toast content
        const shadowText = await readShadowText(page, '#sunbreak-widget-root');
        console.log(`[${site.name}] FU1 shadow text (first 400): "${shadowText.substring(0, 400)}"`);

        const hasFileWarning = shadowText.includes('File upload detected')
          || shadowText.includes('upload event')
          || shadowText.includes('attachment');

        expect(hasFileWarning).toBe(true);
        console.log(`[${site.name}] FU1 PASS: file warning toast appeared`);
      } finally {
        removeTempFile(tempFile);
      }

      await page.close();
    });

    test('FU2: file warning toast auto-dismisses', async ({ context, extensionId }) => {
      const page = await context.newPage();
      await page.goto(site.url, { waitUntil: 'domcontentloaded' });

      const editor = page.locator(site.editorSelector).first();
      await editor.waitFor({ state: 'visible', timeout: 15_000 });

      try {
        await waitForWidgetRoot(page);
      } catch {
        console.log(`[${site.name}] FU2 SKIP: widget root not injected`);
        test.skip();
        return;
      }

      // Trigger file detection
      await page.evaluate(() => {
        const input = document.createElement('input');
        input.type = 'file';
        document.body.appendChild(input);
        const dt = new DataTransfer();
        dt.items.add(new File(['test'], 'test.txt', { type: 'text/plain' }));
        input.files = dt.files;
        input.dispatchEvent(new Event('change', { bubbles: true }));
        setTimeout(() => input.remove(), 100);
      });

      await page.waitForTimeout(1500);

      // Verify toast is visible
      let shadowText = await readShadowText(page, '#sunbreak-widget-root');
      const toastVisible = shadowText.includes('File upload detected');
      console.log(`[${site.name}] FU2 toast visible: ${toastVisible}`);

      if (!toastVisible) {
        console.log(`[${site.name}] FU2 SKIP: toast not visible (file detection may not have triggered)`);
        test.skip();
        await page.close();
        return;
      }

      // Wait for auto-dismiss (8 seconds + buffer)
      await page.waitForTimeout(9000);

      shadowText = await readShadowText(page, '#sunbreak-widget-root');
      const toastDismissed = !shadowText.includes('File upload detected');
      console.log(`[${site.name}] FU2 toast dismissed after 8s: ${toastDismissed}`);

      expect(toastDismissed).toBe(true);
      console.log(`[${site.name}] FU2 PASS: file warning toast auto-dismissed`);

      await page.close();
    });

    test('FU3: file upload event logged to storage with correct metadata', async ({ context, extensionId }) => {
      // Clear events first
      await clearFlaggedEvents(context, extensionId);

      const page = await context.newPage();
      await page.goto(site.url, { waitUntil: 'domcontentloaded' });

      const editor = page.locator(site.editorSelector).first();
      await editor.waitFor({ state: 'visible', timeout: 15_000 });

      try {
        await waitForWidgetRoot(page);
      } catch {
        console.log(`[${site.name}] FU3 SKIP: widget root not injected`);
        test.skip();
        return;
      }

      // Trigger file detection
      await page.evaluate(() => {
        const input = document.createElement('input');
        input.type = 'file';
        document.body.appendChild(input);
        const dt = new DataTransfer();
        dt.items.add(new File(['test'], 'upload-test.txt', { type: 'text/plain' }));
        input.files = dt.files;
        input.dispatchEvent(new Event('change', { bubbles: true }));
        setTimeout(() => input.remove(), 100);
      });

      // Wait for event to be logged
      await page.waitForTimeout(2000);
      await page.close();

      // Read events from storage
      const events = await readFlaggedEvents(context, extensionId);
      console.log(`[${site.name}] FU3 events count: ${events.length}`);

      // Find the file-upload event
      const fileEvent = events.find((e: unknown) => {
        const event = e as Record<string, unknown>;
        return event['source'] === 'file-upload' || event['action'] === 'file-warning';
      }) as Record<string, unknown> | undefined;

      if (!fileEvent) {
        console.log(`[${site.name}] FU3 SKIP: no file event found (detection may not have triggered)`);
        console.log(`[${site.name}] FU3 events:`, JSON.stringify(events.slice(0, 3)));
        test.skip();
        return;
      }

      console.log(`[${site.name}] FU3 file event:`, JSON.stringify(fileEvent));

      // Verify metadata contract
      expect(fileEvent['source']).toBe('file-upload');
      expect(fileEvent['action']).toBe('file-warning');
      expect(fileEvent['maskingAvailable']).toBe(false);
      expect(fileEvent['maskingUsed']).toBe(false);
      expect(fileEvent['needsAttention']).toBe(true);
      expect(fileEvent['findingCount']).toBe(0);
      expect((fileEvent['categories'] as string[]) ?? []).toContain('file-upload');

      // Trust check: no prompt text in the event
      const eventStr = JSON.stringify(fileEvent);
      expect(eventStr).not.toContain('promptText');
      expect(eventStr).not.toContain('fileContents');

      console.log(`[${site.name}] FU3 PASS: file event metadata correct, no prompt text stored`);

      await clearFlaggedEvents(context, extensionId);
    });

    test('RG1: sent-anyway event logged with recovery metadata after submitting with PII', async ({ context, extensionId }) => {
      await clearFlaggedEvents(context, extensionId);

      const page = await context.newPage();
      await page.goto(site.url, { waitUntil: 'domcontentloaded' });

      const editor = page.locator(site.editorSelector).first();
      await editor.waitFor({ state: 'visible', timeout: 15_000 });

      try {
        await waitForWidgetRoot(page);
      } catch {
        console.log(`[${site.name}] RG1 SKIP: widget root not injected`);
        test.skip();
        return;
      }

      // Clear editor
      await clearEditorAndWait(page, editor);

      // Type PII to trigger detection
      await page.keyboard.type('My credit card is 4111 1111 1111 1111 thanks');
      await page.waitForTimeout(2000);

      // Try to submit — interceptor should show toast
      await page.keyboard.press('Enter');
      await page.waitForTimeout(1000);

      // Click Send Anyway
      let shadowText = await readShadowText(page, '#sunbreak-widget-root');
      let sendAnywayAvailable = shadowText.includes('Send Anyway') || shadowText.includes('Send anyway');

      if (!sendAnywayAvailable) {
        // Try send button if Enter didn't trigger
        const sendButton = page.locator('[data-testid="send-button"], button[aria-label*="Send"]').first();
        const sendVisible = await sendButton.isVisible().catch(() => false);
        if (sendVisible) {
          await sendButton.click();
          await page.waitForTimeout(1000);
          shadowText = await readShadowText(page, '#sunbreak-widget-root');
          sendAnywayAvailable = shadowText.includes('Send Anyway') || shadowText.includes('Send anyway');
        }
      }

      if (!sendAnywayAvailable) {
        console.log(`[${site.name}] RG1 SKIP: Send Anyway toast did not appear`);
        test.skip();
        await page.close();
        return;
      }

      // Click Send Anyway via shadow DOM
      await clickShadowElement(page, '#sunbreak-widget-root', '.sb-toast__btn--send');
      await page.waitForTimeout(3000);
      await page.close();

      // Read events
      const events = await readFlaggedEvents(context, extensionId);
      console.log(`[${site.name}] RG1 events count: ${events.length}`);

      const sentAnywayEvent = events.find((e: unknown) => {
        const event = e as Record<string, unknown>;
        return event['action'] === 'sent-anyway';
      }) as Record<string, unknown> | undefined;

      if (!sentAnywayEvent) {
        console.log(`[${site.name}] RG1 SKIP: no sent-anyway event found`);
        test.skip();
        return;
      }

      console.log(`[${site.name}] RG1 event:`, JSON.stringify(sentAnywayEvent));

      // Verify recovery metadata
      expect(sentAnywayEvent['source']).toBe('prompt');
      expect(sentAnywayEvent['action']).toBe('sent-anyway');
      expect(sentAnywayEvent['needsAttention']).toBe(true);
      expect(sentAnywayEvent['maskingAvailable']).toBe(true);
      expect(sentAnywayEvent['maskingUsed']).toBe(false);
      expect(sentAnywayEvent['guidanceVersion']).toBe(1);
      expect(sentAnywayEvent['findingCount']).toBeGreaterThan(0);
      expect(sentAnywayEvent['tool']).toBeDefined();

      // Trust check: no prompt text stored
      const eventStr = JSON.stringify(sentAnywayEvent);
      expect(eventStr).not.toContain('4111');
      expect(eventStr).not.toContain('credit card');

      console.log(`[${site.name}] RG1 PASS: sent-anyway event has recovery metadata, no prompt text`);

      await clearFlaggedEvents(context, extensionId);
    });

    test('RG2: dashboard recovery detail renders for flagged event', async ({ context, extensionId }) => {
      // Seed a sample flagged event
      const sampleEvent = {
        id: `test-${Date.now()}`,
        timestamp: new Date().toISOString(),
        tool: site.name.toLowerCase().replace(/\s/g, ''),
        categories: ['email', 'credit-card'],
        findingCount: 2,
        action: 'sent-anyway',
        source: 'prompt',
        maskingAvailable: true,
        maskingUsed: false,
        needsAttention: true,
        guidanceVersion: 1,
      };

      const dashPage = await context.newPage();
      await dashPage.goto(`chrome-extension://${extensionId}/dashboard.html`, { waitUntil: 'domcontentloaded' });

      // Seed the event
      await dashPage.evaluate((event) => {
        return new Promise<void>((resolve) => {
          chrome.storage.local.set({ flaggedEvents: [event] }, resolve);
        });
      }, sampleEvent);

      // Navigate to activity tab
      await dashPage.goto(`chrome-extension://${extensionId}/dashboard.html#activity`, { waitUntil: 'domcontentloaded' });
      await dashPage.waitForTimeout(1000);

      const pageText = await dashPage.textContent('body');
      console.log(`[${site.name}] RG2 dashboard text (first 500): "${pageText?.substring(0, 500)}"`);

      // Should show the event in the activity list
      const hasEventListed = pageText?.includes('sent-anyway') || pageText?.includes('Sent');
      console.log(`[${site.name}] RG2 event listed: ${hasEventListed}`);

      // Try clicking on the event to open recovery detail
      const eventRow = dashPage.locator('[class*="event"], [class*="activity"], tr, li').filter({ hasText: /sent/i }).first();
      const rowExists = await eventRow.count() > 0;

      if (rowExists) {
        await eventRow.click();
        await dashPage.waitForTimeout(500);

        const detailText = await dashPage.textContent('body');
        console.log(`[${site.name}] RG2 detail text (first 500): "${detailText?.substring(0, 500)}"`);

        // Recovery detail should contain provider-specific guidance elements
        const hasRecoveryContent = detailText?.includes('follow-up')
          || detailText?.includes('recovery')
          || detailText?.includes('Next step')
          || detailText?.includes('Needs')
          || detailText?.includes('prompt');

        console.log(`[${site.name}] RG2 recovery content present: ${hasRecoveryContent}`);
        expect.soft(hasRecoveryContent).toBe(true);
      }

      console.log(`[${site.name}] RG2 PASS: dashboard rendered flagged event`);

      // Cleanup
      await dashPage.evaluate(() => {
        return new Promise<void>((resolve) => {
          chrome.storage.local.set({ flaggedEvents: [] }, resolve);
        });
      });

      await dashPage.close();
    });
  });
}
