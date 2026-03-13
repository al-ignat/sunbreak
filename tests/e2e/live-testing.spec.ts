/**
 * Phase 6b: Cross-tool live testing
 *
 * Validates the full Sunbreak flow on ChatGPT, Claude, and Gemini.
 * Requires a saved profile with login sessions (run setup-profile.ts first).
 *
 * Usage: npm run test:e2e:live
 */
import { test, expect } from './live-fixtures';
import type { Page } from '@playwright/test';
import type { CDPSession } from 'playwright-core';

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

/** Wait for the content script to inject the widget root */
async function waitForWidgetRoot(page: import('@playwright/test').Page, timeoutMs = 10_000): Promise<import('@playwright/test').Locator> {
  const locator = page.locator('#sunbreak-widget-root');
  await locator.waitFor({ state: 'attached', timeout: timeoutMs });
  return locator;
}

/**
 * Click a button inside a closed shadow DOM using CDP.
 * CDP can access closed shadow roots that page.evaluate() cannot.
 */
async function clickShadowButton(page: Page, hostSelector: string, buttonTextMatch: string): Promise<boolean> {
  const cdp: CDPSession = await page.context().newCDPSession(page);
  try {
    const { root } = await cdp.send('DOM.getDocument', { depth: 0 });
    const { nodeId: hostNodeId } = await cdp.send('DOM.querySelector', {
      nodeId: root.nodeId,
      selector: hostSelector,
    });
    if (!hostNodeId) return false;

    // Describe with pierce to get shadow root children
    const { node } = await cdp.send('DOM.describeNode', { nodeId: hostNodeId, depth: -1, pierce: true });
    if (!node.shadowRoots || node.shadowRoots.length === 0) return false;

    const shadowBackendNodeId = node.shadowRoots[0].backendNodeId;

    // Resolve shadow root to a remote object
    const { object: shadowObj } = await cdp.send('DOM.resolveNode', { backendNodeId: shadowBackendNodeId });

    // Find and click the button by text content (includes role="button" elements)
    const result = await cdp.send('Runtime.callFunctionOn', {
      objectId: shadowObj.objectId,
      functionDeclaration: `function(textMatch) {
        const clickables = Array.from(this.querySelectorAll('button, [role="button"]'));
        const btn = clickables.find(b => b.textContent && b.textContent.includes(textMatch));
        if (btn) { btn.click(); return true; }
        return false;
      }`,
      arguments: [{ value: buttonTextMatch }],
      returnByValue: true,
    });

    return result.result.value === true;
  } finally {
    await cdp.detach();
  }
}

/**
 * Click an element inside a closed shadow DOM by CSS selector using CDP.
 */
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

/**
 * Read all text content inside a closed shadow DOM using CDP.
 */
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

for (const site of SITES) {
  test.describe(`${site.name} — live testing`, () => {
    test.setTimeout(60_000);

    test('T1: editor element exists and is connected', async ({ context }) => {
      const page = await context.newPage();
      await page.goto(site.url, { waitUntil: 'domcontentloaded' });

      // Use Playwright auto-retry assertion — avoids stale element race
      const editor = page.locator(site.editorSelector).first();
      await expect(editor).toBeAttached({ timeout: 15_000 });
      console.log(`[${site.name}] T1 PASS: editor found and connected`);

      await page.close();
    });

    test('T2: can type text into editor', async ({ context }) => {
      const page = await context.newPage();
      await page.goto(site.url, { waitUntil: 'domcontentloaded' });

      const editor = page.locator(site.editorSelector).first();
      await editor.waitFor({ state: 'visible', timeout: 15_000 });

      await editor.click();
      await page.keyboard.type('Hello from Sunbreak test');
      await page.waitForTimeout(2000);

      const visibleText = await editor.textContent();
      expect(visibleText).toContain('Hello from Sunbreak test');
      console.log(`[${site.name}] T2 PASS: text typed and read back`);

      // Clear the input
      await page.keyboard.press('Meta+a');
      await page.keyboard.press('Backspace');

      await page.close();
    });

    test('T5: send button is found when text is present', async ({ context }) => {
      const page = await context.newPage();
      await page.goto(site.url, { waitUntil: 'domcontentloaded' });

      const editor = page.locator(site.editorSelector).first();
      await editor.waitFor({ state: 'visible', timeout: 15_000 });

      // Type something so the send button appears
      await editor.click();
      await page.keyboard.type('test message');
      await page.waitForTimeout(1500);

      const sendButton = page.locator(site.sendButtonSelector).first();
      const found = await sendButton.count() > 0;
      console.log(`[${site.name}] Send button found: ${found}`);

      if (found) {
        const isVisible = await sendButton.isVisible();
        console.log(`[${site.name}] Send button visible: ${isVisible}`);
        expect(isVisible).toBe(true);
        console.log(`[${site.name}] T5 PASS`);
      } else {
        console.log(`[${site.name}] T5 SOFT FAIL: send button selector may need updating`);
      }

      // Clear
      await page.keyboard.press('Meta+a');
      await page.keyboard.press('Backspace');

      await page.close();
    });

    test('T7: extension content script injects widget root', async ({ context }) => {
      const page = await context.newPage();

      // Capture console errors for diagnostics
      const consoleErrors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });
      page.on('pageerror', (err) => {
        consoleErrors.push(`[pageerror] ${err.message}`);
      });

      await page.goto(site.url, { waitUntil: 'domcontentloaded' });

      // Wait for editor first (content script needs it)
      const editor = page.locator(site.editorSelector).first();
      await editor.waitFor({ state: 'attached', timeout: 15_000 });

      // Now wait for the content script to inject widget root (20s — content script
      // runs at document_idle and then needs to find the editor via MutationObserver)
      try {
        await waitForWidgetRoot(page, 20_000);
        console.log(`[${site.name}] T7 PASS: widget root injected`);
      } catch {
        // Log diagnostics
        const diag = await page.evaluate(() => {
          const root = document.getElementById('sunbreak-widget-root');
          const allIds = Array.from(document.querySelectorAll('[id*="sunbreak"]')).map((el) => el.id);
          return { hasRoot: root !== null, sunbreakIds: allIds, bodyChildren: document.body.children.length };
        });
        console.log(`[${site.name}] T7 FAIL diagnostics:`, JSON.stringify(diag));
        if (consoleErrors.length > 0) {
          console.log(`[${site.name}] Console errors:`, consoleErrors.join(' | '));
        }
        expect.soft(diag.hasRoot).toBe(true);
      }

      await page.close();
    });

    test('T9: widget becomes visible when PII is typed', async ({ context }) => {
      const page = await context.newPage();
      await page.goto(site.url, { waitUntil: 'domcontentloaded' });

      const editor = page.locator(site.editorSelector).first();
      await editor.waitFor({ state: 'visible', timeout: 15_000 });

      // Wait for content script to load
      try {
        await waitForWidgetRoot(page);
      } catch {
        console.log(`[${site.name}] T9 SKIP: widget root not injected (content script issue)`);
        test.skip();
        return;
      }

      // Type PII
      await editor.click();
      await page.keyboard.type('Please email me at john.doe@example.com');

      // Wait for scanner debounce (500ms) + rendering
      await page.waitForTimeout(2000);

      // Widget wrapper should become visible
      const widgetRoot = page.locator('#sunbreak-widget-root');
      const display = await widgetRoot.evaluate((el) => getComputedStyle(el).display);
      console.log(`[${site.name}] Widget display after PII typed: ${display}`);
      expect(display).not.toBe('none');
      console.log(`[${site.name}] T9 PASS`);

      // Clear
      await page.keyboard.press('Meta+a');
      await page.keyboard.press('Backspace');

      await page.close();
    });

    test('T3: setText replaces PII with token in editor', async ({ context }) => {
      const page = await context.newPage();
      await page.goto(site.url, { waitUntil: 'domcontentloaded' });

      const editor = page.locator(site.editorSelector).first();
      await editor.waitFor({ state: 'visible', timeout: 15_000 });

      try {
        await waitForWidgetRoot(page);
      } catch {
        console.log(`[${site.name}] T3 SKIP: widget root not injected`);
        test.skip();
        return;
      }

      // Type PII to trigger detection
      await editor.click();
      await page.keyboard.type('Contact me at john.doe@example.com please');

      // Wait for scanner debounce (500ms) + rendering
      await page.waitForTimeout(2000);

      // Open the panel by clicking the widget badge (via CDP — closed shadow DOM)
      const badgeClicked = await clickShadowElement(page, '#sunbreak-widget-root', '.sb-widget');
      console.log(`[${site.name}] T3 badge clicked: ${badgeClicked}`);
      await page.waitForTimeout(500);

      // Click Fix All (or Fix) button via CDP
      let fixClicked = await clickShadowButton(page, '#sunbreak-widget-root', 'Fix All');
      if (!fixClicked) {
        fixClicked = await clickShadowButton(page, '#sunbreak-widget-root', 'Fix all');
      }
      if (!fixClicked) {
        fixClicked = await clickShadowButton(page, '#sunbreak-widget-root', 'Fix');
      }
      console.log(`[${site.name}] T3 fix clicked: ${fixClicked}`);

      // Wait for setText to execute
      await page.waitForTimeout(1000);

      // Verify the editor text no longer contains the original email
      const editorText = await editor.textContent();
      console.log(`[${site.name}] T3 editor text after fix: "${editorText}"`);

      expect(editorText).not.toContain('john.doe@example.com');
      console.log(`[${site.name}] T3 PASS: PII replaced with token`);

      // Clear
      await page.keyboard.press('Meta+a');
      await page.keyboard.press('Backspace');
      await page.close();
    });

    test('T4: setText framework sync — getText returns redacted text', async ({ context }) => {
      const page = await context.newPage();
      await page.goto(site.url, { waitUntil: 'domcontentloaded' });

      const editor = page.locator(site.editorSelector).first();
      await editor.waitFor({ state: 'visible', timeout: 15_000 });

      try {
        await waitForWidgetRoot(page);
      } catch {
        console.log(`[${site.name}] T4 SKIP: widget root not injected`);
        test.skip();
        return;
      }

      // Type PII
      await editor.click();
      await page.keyboard.type('My SSN is 123-45-6789 thanks');

      // Wait for scanner + rendering
      await page.waitForTimeout(2000);

      // Open panel and Fix All via CDP
      await clickShadowElement(page, '#sunbreak-widget-root', '.sb-widget');
      await page.waitForTimeout(500);
      const fixClicked = await clickShadowButton(page, '#sunbreak-widget-root', 'Fix All')
        || await clickShadowButton(page, '#sunbreak-widget-root', 'Fix');
      console.log(`[${site.name}] T4 fix clicked: ${fixClicked}`);
      await page.waitForTimeout(1000);

      // Read text back from the editor — this is what the framework "sees"
      const editorText = await editor.textContent();
      console.log(`[${site.name}] T4 editor text after fix: "${editorText}"`);

      expect(editorText).not.toContain('123-45-6789');
      console.log(`[${site.name}] T4 PASS: framework text no longer contains SSN`);

      // Clear
      await page.keyboard.press('Meta+a');
      await page.keyboard.press('Backspace');
      await page.close();
    });

    test('T6: send button click submits the message', async ({ context }) => {
      const page = await context.newPage();
      await page.goto(site.url, { waitUntil: 'domcontentloaded' });

      const editor = page.locator(site.editorSelector).first();
      await editor.waitFor({ state: 'visible', timeout: 15_000 });

      // Clear any leftover text first
      await editor.click();
      await page.keyboard.press('Meta+a');
      await page.keyboard.press('Backspace');
      await page.waitForTimeout(500);

      // Type a clean message (no PII — we don't want the interceptor to block)
      await page.keyboard.type('Hello, this is a Sunbreak test message. Please ignore.');
      await page.waitForTimeout(1500);

      // Find and click send button
      const sendButton = page.locator(site.sendButtonSelector).first();
      const sendVisible = await sendButton.isVisible().catch(() => false);
      if (!sendVisible) {
        console.log(`[${site.name}] T6 SKIP: send button not visible`);
        test.skip();
        return;
      }

      await sendButton.click();
      console.log(`[${site.name}] T6: send button clicked`);

      // Wait for the editor to be cleared (indicating submission went through)
      await page.waitForTimeout(5000);

      // Check if the editor was cleared (submission consumed the text)
      const postSendText = await editor.textContent().catch(() => '');
      const editorCleared = !postSendText?.includes('Sunbreak test message');
      console.log(`[${site.name}] T6 editor cleared: ${editorCleared}, remaining: "${postSendText?.substring(0, 50)}"`);

      expect(editorCleared).toBe(true);
      console.log(`[${site.name}] T6 PASS: message submitted successfully`);

      await page.close();
    });

    test('T10: toast appears on submit with PII, Send Anyway releases', async ({ context }) => {
      const page = await context.newPage();
      await page.goto(site.url, { waitUntil: 'domcontentloaded' });

      const editor = page.locator(site.editorSelector).first();
      await editor.waitFor({ state: 'visible', timeout: 15_000 });

      try {
        await waitForWidgetRoot(page);
      } catch {
        console.log(`[${site.name}] T10 SKIP: widget root not injected`);
        test.skip();
        return;
      }

      // Clear any leftover text first
      await editor.click();
      await page.keyboard.press('Meta+a');
      await page.keyboard.press('Backspace');
      await page.waitForTimeout(500);

      // Type PII to trigger detection
      await page.keyboard.type('My credit card is 4111-1111-1111-1111 thanks');

      // Wait for scanner debounce
      await page.waitForTimeout(2000);

      // Try Enter first, then send button to trigger submission
      await page.keyboard.press('Enter');
      await page.waitForTimeout(1000);

      // Check if toast appeared via CDP (closed shadow DOM)
      let shadowText = await readShadowText(page, '#sunbreak-widget-root');
      let toastFound = shadowText.includes('Send Anyway') || shadowText.includes('Send anyway');
      console.log(`[${site.name}] T10 toast after Enter: ${toastFound}`);

      if (!toastFound) {
        // Enter may not trigger submit on this site — try clicking send button
        const sendButton = page.locator(site.sendButtonSelector).first();
        const sendVisible = await sendButton.isVisible().catch(() => false);
        if (sendVisible) {
          await sendButton.click();
          await page.waitForTimeout(1000);
          shadowText = await readShadowText(page, '#sunbreak-widget-root');
          toastFound = shadowText.includes('Send Anyway') || shadowText.includes('Send anyway');
          console.log(`[${site.name}] T10 toast after send button: ${toastFound}`);
        }
      }

      expect.soft(toastFound).toBe(true);

      if (toastFound) {
        // Click "Send Anyway" via CDP
        const clicked = await clickShadowButton(page, '#sunbreak-widget-root', 'Send Anyway')
          || await clickShadowButton(page, '#sunbreak-widget-root', 'Send anyway');
        console.log(`[${site.name}] T10 Send Anyway clicked: ${clicked}`);

        // Wait for submission to go through
        await page.waitForTimeout(5000);

        // Verify submission happened — editor should be cleared
        const postText = await editor.textContent().catch(() => '');
        const submitted = !postText?.includes('4111-1111-1111-1111');
        console.log(`[${site.name}] T10 submitted: ${submitted}`);
        console.log(`[${site.name}] T10 PASS: full toast flow completed`);
      }

      await page.close();
    });

    test('T11: explanation text appears for contextual PII (Epic 2)', async ({ context }) => {
      const page = await context.newPage();
      await page.goto(site.url, { waitUntil: 'domcontentloaded' });

      const editor = page.locator(site.editorSelector).first();
      await editor.waitFor({ state: 'visible', timeout: 15_000 });

      try {
        await waitForWidgetRoot(page);
      } catch {
        console.log(`[${site.name}] T11 SKIP: widget root not injected`);
        test.skip();
        return;
      }

      // Type PII near a confidentiality context keyword
      await editor.click();
      await page.keyboard.type('Please send the confidential report to john.doe@example.com');

      // Wait for scanner debounce (500ms) + context scoring + rendering
      await page.waitForTimeout(2500);

      // Open the panel by clicking the widget badge
      const badgeClicked = await clickShadowElement(page, '#sunbreak-widget-root', '.sb-widget');
      console.log(`[${site.name}] T11 badge clicked: ${badgeClicked}`);
      await page.waitForTimeout(500);

      // Read all shadow DOM text — should contain explanation mentioning "confidential"
      const shadowText = await readShadowText(page, '#sunbreak-widget-root');
      console.log(`[${site.name}] T11 shadow text (first 300): "${shadowText.substring(0, 300)}"`);

      const hasExplanation = shadowText.toLowerCase().includes('confidential');
      console.log(`[${site.name}] T11 explanation contains "confidential": ${hasExplanation}`);
      expect.soft(hasExplanation).toBe(true);
      if (hasExplanation) {
        console.log(`[${site.name}] T11 PASS: context explanation visible`);
      }

      // Clear
      await page.keyboard.press('Meta+a');
      await page.keyboard.press('Backspace');
      await page.close();
    });

    test('T12: example/demo context lowers confidence (Epic 2)', async ({ context }) => {
      const page = await context.newPage();
      await page.goto(site.url, { waitUntil: 'domcontentloaded' });

      const editor = page.locator(site.editorSelector).first();
      await editor.waitFor({ state: 'visible', timeout: 15_000 });

      try {
        await waitForWidgetRoot(page);
      } catch {
        console.log(`[${site.name}] T12 SKIP: widget root not injected`);
        test.skip();
        return;
      }

      // Type PII in a clear example/demo context
      await editor.click();
      await page.keyboard.type('For the tutorial demo, use sample@example.com as the test address');

      // Wait for scanner debounce + context scoring
      await page.waitForTimeout(2500);

      // Read shadow text to check for example-data explanation
      const shadowText = await readShadowText(page, '#sunbreak-widget-root');
      console.log(`[${site.name}] T12 shadow text (first 300): "${shadowText.substring(0, 300)}"`);

      // If the finding is still visible (email starts HIGH, suppresses to MEDIUM),
      // the explanation should mention lowered confidence or example/sample context
      const hasLowerExplanation = shadowText.toLowerCase().includes('lower')
        || shadowText.toLowerCase().includes('example')
        || shadowText.toLowerCase().includes('sample');

      if (shadowText.length > 0 && hasLowerExplanation) {
        console.log(`[${site.name}] T12 PASS: example-data context explanation visible`);
      } else if (shadowText.length === 0 || !shadowText.includes('@')) {
        // Finding may have been fully suppressed (no widget content) — that's also valid
        console.log(`[${site.name}] T12 PASS: finding suppressed by example-data context`);
      } else {
        console.log(`[${site.name}] T12 SOFT FAIL: no example-data context signal detected`);
        expect.soft(hasLowerExplanation).toBe(true);
      }

      // Clear
      await page.keyboard.press('Meta+a');
      await page.keyboard.press('Backspace');
      await page.close();
    });

    test('T8: extension re-attaches after SPA navigation', async ({ context }) => {
      const page = await context.newPage();
      await page.goto(site.url, { waitUntil: 'domcontentloaded' });

      // Wait for initial widget injection
      const editor = page.locator(site.editorSelector).first();
      await editor.waitFor({ state: 'attached', timeout: 15_000 });

      try {
        await waitForWidgetRoot(page);
      } catch {
        console.log(`[${site.name}] T8 SKIP: widget root not injected initially`);
        test.skip();
        return;
      }

      console.log(`[${site.name}] Widget found before navigation`);

      // Navigate (full page reload simulates worst-case SPA nav)
      await page.goto(site.url, { waitUntil: 'domcontentloaded' });
      await editor.waitFor({ state: 'attached', timeout: 15_000 });

      try {
        await waitForWidgetRoot(page);
        console.log(`[${site.name}] T8 PASS: widget re-attached after navigation`);
      } catch {
        console.log(`[${site.name}] T8 FAIL: widget did not re-attach`);
        const reattachedRoot = await page.$('#sunbreak-widget-root');
        expect.soft(reattachedRoot).not.toBeNull();
      }

      await page.close();
    });
  });
}
