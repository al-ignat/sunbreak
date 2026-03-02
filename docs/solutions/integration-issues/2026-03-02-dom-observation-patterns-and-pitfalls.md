---
title: "DOM Observation Patterns and Pitfalls for Chrome Extension Content Scripts"
date: 2026-03-02
category: integration-issues
tags:
  - content-scripts
  - dom-observation
  - site-adapters
  - trusted-types
  - jsdom-testing
  - typescript-narrowing
component: "src/content/sites/, src/content/observer.ts, src/content/interceptor.ts"
severity: high
resolved: true
resolution_time: "~4 hours"
---

# DOM Observation Patterns and Pitfalls

Lessons learned building per-site DOM adapters (ChatGPT, Claude, Gemini) for the Secure BYOAI Chrome extension. These patterns apply to any content script that needs to observe and interact with third-party web app editors.

## Problems Solved

### 1. Per-Site Adapter Pattern with Fallback Selectors

**Problem:** Each AI tool uses a different editor implementation — ChatGPT and Claude use ProseMirror, Gemini uses Quill. Selectors, send buttons, and drop zones are completely different across sites. A single universal selector is impossible.

**Solution:** Unified `SiteAdapter` interface with per-site implementations. Each adapter defines ordered selector arrays tried via a shared `queryFallback()` utility.

```typescript
// src/content/sites/dom-utils.ts
export function queryFallback(selectors: readonly string[]): HTMLElement | null {
  for (const selector of selectors) {
    const el = document.querySelector<HTMLElement>(selector);
    if (el) return el;
  }
  return null;
}
```

Selector chains per site:
- **ChatGPT:** `#prompt-textarea` -> `div.ProseMirror[contenteditable="true"]`
- **Claude:** `.ProseMirror[contenteditable="true"]` -> `div[role="textbox"][contenteditable="true"]`
- **Gemini:** `.ql-editor[contenteditable="true"]` -> `rich-textarea div[contenteditable="true"]`

**Key insight:** Prefer data-testid and ARIA attributes over class names. Class names are the most brittle selector type (obfuscated, frequently changed during deploys).

### 2. Content Script Console Isolation

**Problem:** `console.log()` from a content script runs in Chrome's isolated JavaScript world. Browser automation tools (Claude-in-Chrome, Puppeteer page-level monitoring) cannot see these logs because they monitor the page's main world console.

**Solution:** For browser testing verification, execute adapter logic directly in the page context using `javascript_tool` rather than relying on content script logs. The selectors and text extraction can be tested by running the same queries in the main world.

**Prevention:** When building logging for content scripts, forward important logs to the background service worker via `chrome.runtime.sendMessage()`. This makes them accessible from the extension's DevTools panel.

### 3. Trusted Types CSP on Gemini

**Problem:** Gemini enforces Trusted Types via Content Security Policy. Direct DOM manipulation like `editor.innerHTML = '<p>text</p>'` throws: `TypeError: This document requires 'TrustedHTML' assignment`.

**Solution:** For browser testing, use the browser's native input mechanisms (click + type) instead of DOM manipulation. For the extension's `setText()` function, the content script's isolated world may not be subject to the page's Trusted Types policy — but this needs Phase 4 hardening.

**Prevention:** Prefer `document.createElement()` + `textContent` over `innerHTML` for any DOM construction. This is inherently safe against both XSS and Trusted Types CSP.

```typescript
// Safer alternative to innerHTML:
function setSafeText(input: HTMLElement, text: string): void {
  while (input.firstChild) input.removeChild(input.firstChild);
  for (const line of text.split('\n')) {
    const p = document.createElement('p');
    p.textContent = line || '\u200B'; // Zero-width space for empty lines
    input.appendChild(p);
  }
  input.dispatchEvent(new Event('input', { bubbles: true }));
}
```

### 4. jsdom Missing Browser APIs (DataTransfer, ClipboardData)

**Problem:** jsdom (used by Vitest) doesn't implement `DataTransfer` or `ClipboardData`. Tests for drag-drop and paste file detection fail with `DataTransfer is not defined`.

**Solution:** Create events via `new Event()` constructors and mock the missing properties with `Object.defineProperty()`:

```typescript
// Mock drag-drop event in Vitest
const file = new File(['data'], 'report.xlsx');
const dropEvent = new Event('drop', { bubbles: true }) as DragEvent;
Object.defineProperty(dropEvent, 'dataTransfer', {
  value: { files: [file] },
});
dropZone.dispatchEvent(dropEvent);

// Mock paste event
const pasteEvent = new Event('paste', { bubbles: true }) as ClipboardEvent;
Object.defineProperty(pasteEvent, 'clipboardData', {
  value: { files: [file] },
});
input.dispatchEvent(pasteEvent);
```

**Prevention:** Document browser API dependencies in function JSDoc. Use optional chaining (`e.dataTransfer?.files`) so code degrades gracefully if the API is unexpectedly missing.

### 5. TypeScript Narrowing in Closures

**Problem:** After `if (!maybeAdapter) return;`, TypeScript still sees `maybeAdapter` as possibly null inside nested closures and async callbacks. The type guard doesn't propagate through async boundaries.

**Solution:** Assign the narrowed value to a new `const` with explicit type annotation before entering any closure:

```typescript
const maybeAdapter = selectAdapter(window.location.hostname);
if (!maybeAdapter) return;
const adapter: SiteAdapter = maybeAdapter; // Capture narrowed type

// Safe in all callbacks — adapter is always SiteAdapter, never null
ctx.setInterval(() => {
  const input = adapter.findInput(); // No TS error
}, 5000);
```

**Prevention:** Always assign narrowed values to a fresh `const` before closures. Never rely on control flow narrowing across async boundaries.

### 6. Shared DOM Utilities Extraction

**Problem:** `queryFallback()`, text extraction from `<p>` elements, and `setParagraphText()` were copy-pasted across all three adapter files (chatgpt.ts, claude.ts, gemini.ts). The ProseMirror and Quill text extraction logic was identical.

**Solution:** Extract to `src/content/sites/dom-utils.ts` with three exported functions: `queryFallback()`, `extractParagraphText()`, `setParagraphText()`. Each adapter imports from the shared module.

**Prevention:** Before implementing a new adapter, check dom-utils.ts for existing utilities. Add new shared logic there rather than in the adapter file.

## Files Involved

| File | Role |
|------|------|
| `src/content/sites/dom-utils.ts` | Shared DOM utilities (queryFallback, text extraction) |
| `src/content/sites/chatgpt.ts` | ChatGPT adapter (ProseMirror editor) |
| `src/content/sites/claude.ts` | Claude adapter (ProseMirror editor) |
| `src/content/sites/gemini.ts` | Gemini adapter (Quill editor) |
| `src/content/observer.ts` | MutationObserver orchestrator, SPA nav, health checks |
| `src/content/interceptor.ts` | Capture-phase event listeners for submission + file detection |
| `src/entrypoints/content.ts` | WXT entrypoint wiring observer to console.log callbacks |
| `tests/unit/content/interceptor.test.ts` | Tests with jsdom DataTransfer/ClipboardData mocking |

## Key Learnings

1. **Site adapters must be independent.** Each AI tool's DOM is unique enough that a single universal selector is impossible. Per-site encapsulation reduces future maintenance when one site changes.

2. **Fallback selector chains are essential.** When a primary selector fails (class renamed, ID removed), fallbacks ensure prompt capture survives site updates without extension updates.

3. **Content script isolation blocks debugging.** Always verify DOM logic by executing in the page's main world during manual testing. Don't assume content script console.log is visible to external tools.

4. **jsdom is incomplete for file APIs.** Paste events, ClipboardData, and DataTransfer need manual mocking via `Object.defineProperty`. Consider Playwright for file-heavy integration tests.

5. **TypeScript narrowing breaks in closures.** Assign narrowed types to `const` before passing into callbacks. This is a TypeScript limitation, not a bug.

6. **DRY matters early.** Extract duplicated DOM logic immediately when building similar modules. Three adapters with identical text extraction = shared utility from day one.

## Cross-References

- `docs/research/2026-03-02-dom-research.md` — Live DOM analysis of all three sites
- `docs/plans/2026-03-02-feat-phase2-dom-observation-plan.md` — Phase 2 implementation plan
- `docs/solutions/build-errors/wxt-preact-typescript-scaffold-setup.md` — Phase 1 scaffolding patterns
- `docs/founding/founding-SPEC.md` Section 1 — Content Observer specification
- PR #2: `feat/dom-observation` — Implementation PR
