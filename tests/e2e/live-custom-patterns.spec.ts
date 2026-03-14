/**
 * Epic 4: Company-specific patterns — live provider testing
 *
 * Validates custom-pattern detection, widget rendering, and detection-only
 * behavior on ChatGPT, Claude, and Gemini.
 *
 * Seeds custom patterns into chrome.storage.local via the extension's
 * service worker page, then verifies the scanner picks them up on each site.
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

/** Test custom patterns seeded into storage */
const TEST_PATTERNS = [
  {
    id: 'test-emp-id',
    label: 'Employee ID',
    description: 'Matches EMP-NNNNN format',
    enabled: true,
    severity: 'concern',
    category: 'internal-identifier',
    sourceMode: 'template',
    templateId: 'employee-id',
    pattern: 'EMP-\\d{5}',
    flags: 'gi',
    samples: { positive: ['EMP-12345'], negative: ['EMP-1234'] },
    createdAt: '2026-03-14T00:00:00Z',
    updatedAt: '2026-03-14T00:00:00Z',
  },
  {
    id: 'test-inv-num',
    label: 'Invoice Number',
    description: 'Matches INV-NNNNNN format',
    enabled: true,
    severity: 'warning',
    category: 'finance',
    sourceMode: 'template',
    templateId: 'invoice-number',
    pattern: 'INV-\\d{6}',
    flags: 'gi',
    samples: { positive: ['INV-123456'], negative: ['INV-12345'] },
    createdAt: '2026-03-14T00:00:00Z',
    updatedAt: '2026-03-14T00:00:00Z',
  },
];

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

/** Click a button inside a closed shadow DOM by text match */
async function clickShadowButton(page: Page, hostSelector: string, buttonTextMatch: string): Promise<boolean> {
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

/**
 * Count elements matching a CSS selector inside a closed shadow DOM.
 */
async function countShadowElements(page: Page, hostSelector: string, innerSelector: string): Promise<number> {
  const cdp: CDPSession = await page.context().newCDPSession(page);
  try {
    const { root } = await cdp.send('DOM.getDocument', { depth: 0 });
    const { nodeId: hostNodeId } = await cdp.send('DOM.querySelector', {
      nodeId: root.nodeId,
      selector: hostSelector,
    });
    if (!hostNodeId) return 0;

    const { node } = await cdp.send('DOM.describeNode', { nodeId: hostNodeId, depth: -1, pierce: true });
    if (!node.shadowRoots || node.shadowRoots.length === 0) return 0;

    const { object: shadowObj } = await cdp.send('DOM.resolveNode', { backendNodeId: node.shadowRoots[0].backendNodeId });

    const result = await cdp.send('Runtime.callFunctionOn', {
      objectId: shadowObj.objectId,
      functionDeclaration: `function(sel) {
        return this.querySelectorAll(sel).length;
      }`,
      arguments: [{ value: innerSelector }],
      returnByValue: true,
    });

    return result.result.value as number;
  } finally {
    await cdp.detach();
  }
}

/** Clear the editor and wait for scanner to settle */
async function clearEditorAndWait(page: Page, editor: import('@playwright/test').Locator): Promise<void> {
  await editor.click();
  await page.keyboard.press('Meta+a');
  await page.keyboard.press('Backspace');
  await page.waitForTimeout(1000);
}

/**
 * Seed custom patterns into the extension's chrome.storage.local
 * by navigating to the service worker page and evaluating there.
 */
async function seedCustomPatterns(
  context: import('@playwright/test').BrowserContext,
  extensionId: string,
  patterns: typeof TEST_PATTERNS,
): Promise<void> {
  const swPage = await context.newPage();
  await swPage.goto(`chrome-extension://${extensionId}/dashboard.html`, { waitUntil: 'domcontentloaded' });

  await swPage.evaluate((pats) => {
    return new Promise<void>((resolve) => {
      chrome.storage.local.set({ customPatterns: pats }, resolve);
    });
  }, patterns);

  // Wait briefly for storage.onChanged to propagate to content scripts
  await swPage.waitForTimeout(500);
  await swPage.close();
}

/**
 * Clear custom patterns from storage after tests.
 */
async function clearCustomPatterns(
  context: import('@playwright/test').BrowserContext,
  extensionId: string,
): Promise<void> {
  const swPage = await context.newPage();
  await swPage.goto(`chrome-extension://${extensionId}/dashboard.html`, { waitUntil: 'domcontentloaded' });

  await swPage.evaluate(() => {
    return new Promise<void>((resolve) => {
      chrome.storage.local.set({ customPatterns: [] }, resolve);
    });
  });

  await swPage.close();
}

for (const site of SITES) {
  test.describe(`${site.name} — custom patterns`, () => {
    test.setTimeout(60_000);

    test('CP1: custom pattern detected and shown in widget', async ({ context, extensionId }) => {
      // Seed patterns into storage
      await seedCustomPatterns(context, extensionId, TEST_PATTERNS);

      const page = await context.newPage();
      await page.goto(site.url, { waitUntil: 'domcontentloaded' });

      const editor = page.locator(site.editorSelector).first();
      await editor.waitFor({ state: 'visible', timeout: 15_000 });

      try {
        await waitForWidgetRoot(page);
      } catch {
        console.log(`[${site.name}] CP1 SKIP: widget root not injected`);
        test.skip();
        return;
      }

      // Clear any leftover content from previous tests
      await clearEditorAndWait(page, editor);

      // Type text containing an employee ID pattern
      await page.keyboard.type('Please check the record for EMP-12345 in the HR system');

      // Wait for scanner debounce (500ms) + rendering
      await page.waitForTimeout(2000);

      // Widget should be visible
      const widgetRoot = page.locator('#sunbreak-widget-root');
      const display = await widgetRoot.evaluate((el) => getComputedStyle(el).display);
      expect(display).not.toBe('none');

      // Open the panel
      const badgeClicked = await clickShadowElement(page, '#sunbreak-widget-root', '.sb-widget');
      console.log(`[${site.name}] CP1 badge clicked: ${badgeClicked}`);
      await page.waitForTimeout(500);

      // Read shadow text — should contain the pattern label
      const shadowText = await readShadowText(page, '#sunbreak-widget-root');
      console.log(`[${site.name}] CP1 shadow text (first 300): "${shadowText.substring(0, 300)}"`);

      expect(shadowText).toContain('Employee ID');
      expect(shadowText).toContain('EMP-12345');
      console.log(`[${site.name}] CP1 PASS: custom pattern detected and shown`);

      // Clear
      await page.keyboard.press('Meta+a');
      await page.keyboard.press('Backspace');
      await page.close();
      await clearCustomPatterns(context, extensionId);
    });

    test('CP2: custom pattern findings are detection-only (no Fix button)', async ({ context, extensionId }) => {
      await seedCustomPatterns(context, extensionId, TEST_PATTERNS);

      const page = await context.newPage();
      await page.goto(site.url, { waitUntil: 'domcontentloaded' });

      const editor = page.locator(site.editorSelector).first();
      await editor.waitFor({ state: 'visible', timeout: 15_000 });

      try {
        await waitForWidgetRoot(page);
      } catch {
        console.log(`[${site.name}] CP2 SKIP: widget root not injected`);
        test.skip();
        return;
      }

      // Clear any leftover content from previous tests
      await clearEditorAndWait(page, editor);

      // Type ONLY a custom pattern (no built-in PII)
      await page.keyboard.type('Check invoice INV-123456 for the client');

      await page.waitForTimeout(2000);

      // Open panel
      await clickShadowElement(page, '#sunbreak-widget-root', '.sb-widget');
      await page.waitForTimeout(500);

      const shadowText = await readShadowText(page, '#sunbreak-widget-root');
      console.log(`[${site.name}] CP2 shadow text (first 400): "${shadowText.substring(0, 400)}"`);

      // Should show the finding
      expect(shadowText).toContain('Invoice Number');

      // Fix buttons use CSS class .sb-panel__btn--fix; Ignore buttons use .sb-panel__btn--ignore (icon only, no text)
      const fixCount = await countShadowElements(page, '#sunbreak-widget-root', '.sb-panel__btn--fix');
      const ignoreCount = await countShadowElements(page, '#sunbreak-widget-root', '.sb-panel__btn--ignore');

      console.log(`[${site.name}] CP2 Fix buttons: ${fixCount}, Ignore buttons: ${ignoreCount}`);

      expect(fixCount).toBe(0);
      expect(ignoreCount).toBeGreaterThan(0);

      // Footer should show detection-only message
      expect(shadowText).toContain('company identifiers');
      console.log(`[${site.name}] CP2 PASS: detection-only, no Fix button`);

      await page.keyboard.press('Meta+a');
      await page.keyboard.press('Backspace');
      await page.close();
      await clearCustomPatterns(context, extensionId);
    });

    test('CP3: mixed findings — Fix only on built-in PII, not on custom pattern', async ({ context, extensionId }) => {
      await seedCustomPatterns(context, extensionId, TEST_PATTERNS);

      const page = await context.newPage();
      await page.goto(site.url, { waitUntil: 'domcontentloaded' });

      const editor = page.locator(site.editorSelector).first();
      await editor.waitFor({ state: 'visible', timeout: 15_000 });

      try {
        await waitForWidgetRoot(page);
      } catch {
        console.log(`[${site.name}] CP3 SKIP: widget root not injected`);
        test.skip();
        return;
      }

      // Clear any leftover content from previous tests
      await clearEditorAndWait(page, editor);

      // Type text with both a custom pattern AND built-in PII
      await page.keyboard.type('Employee EMP-12345 email is john.doe@example.com');

      await page.waitForTimeout(2000);

      // Open panel
      await clickShadowElement(page, '#sunbreak-widget-root', '.sb-widget');
      await page.waitForTimeout(500);

      const shadowText = await readShadowText(page, '#sunbreak-widget-root');
      console.log(`[${site.name}] CP3 shadow text (first 400): "${shadowText.substring(0, 400)}"`);

      // Should contain both findings
      expect(shadowText).toContain('Employee ID');
      expect(shadowText).toContain('john.doe@example.com');

      // Fix buttons should only appear for built-in PII (email), not for custom pattern
      const fixCount = await countShadowElements(page, '#sunbreak-widget-root', '.sb-panel__btn--fix');
      const ignoreCount = await countShadowElements(page, '#sunbreak-widget-root', '.sb-panel__btn--ignore');
      console.log(`[${site.name}] CP3 Fix buttons: ${fixCount}, Ignore buttons: ${ignoreCount}`);
      // 1 Fix for email, 0 for custom pattern. Ignore on both.
      expect(fixCount).toBe(1);
      expect(ignoreCount).toBe(2);

      // Click Fix — only the email should be masked, custom pattern stays
      const fixClicked = await clickShadowButton(page, '#sunbreak-widget-root', 'Fix');
      console.log(`[${site.name}] CP3 fix clicked: ${fixClicked}`);
      await page.waitForTimeout(1000);

      const editorText = await editor.textContent();
      console.log(`[${site.name}] CP3 editor text after fix: "${editorText}"`);

      // Email should be replaced with token
      expect(editorText).not.toContain('john.doe@example.com');
      // Employee ID should remain (not masked — detection-only)
      expect(editorText).toContain('EMP-12345');
      console.log(`[${site.name}] CP3 PASS: Fix only masked built-in PII, custom pattern untouched`);

      await page.keyboard.press('Meta+a');
      await page.keyboard.press('Backspace');
      await page.close();
      await clearCustomPatterns(context, extensionId);
    });

    test('CP4: Ignore dismisses custom pattern finding', async ({ context, extensionId }) => {
      await seedCustomPatterns(context, extensionId, TEST_PATTERNS);

      const page = await context.newPage();
      await page.goto(site.url, { waitUntil: 'domcontentloaded' });

      const editor = page.locator(site.editorSelector).first();
      await editor.waitFor({ state: 'visible', timeout: 15_000 });

      try {
        await waitForWidgetRoot(page);
      } catch {
        console.log(`[${site.name}] CP4 SKIP: widget root not injected`);
        test.skip();
        return;
      }

      // Clear any leftover content from previous tests
      await clearEditorAndWait(page, editor);

      // Type a custom pattern
      await page.keyboard.type('Check EMP-12345 status');

      await page.waitForTimeout(2000);

      // Open panel and click Ignore (icon-only button, use CSS selector)
      await clickShadowElement(page, '#sunbreak-widget-root', '.sb-widget');
      await page.waitForTimeout(500);

      const ignoreClicked = await clickShadowElement(page, '#sunbreak-widget-root', '.sb-panel__btn--ignore');
      console.log(`[${site.name}] CP4 Ignore clicked: ${ignoreClicked}`);
      await page.waitForTimeout(500);

      // After ignoring, the finding count in the widget should decrease
      const shadowText = await readShadowText(page, '#sunbreak-widget-root');
      const stillShowsEmployeeId = shadowText.includes('Employee ID') && shadowText.includes('EMP-12345');
      console.log(`[${site.name}] CP4 still shows Employee ID after ignore: ${stillShowsEmployeeId}`);

      // The finding should be dismissed (not shown as active)
      expect(stillShowsEmployeeId).toBe(false);
      console.log(`[${site.name}] CP4 PASS: Ignore dismissed the custom pattern finding`);

      await page.keyboard.press('Meta+a');
      await page.keyboard.press('Backspace');
      await page.close();
      await clearCustomPatterns(context, extensionId);
    });
  });
}
