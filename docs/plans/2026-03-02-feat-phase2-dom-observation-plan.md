---
title: "feat: Phase 2 — DOM Observation and Prompt Capture"
type: feat
status: active
date: 2026-03-02
origin: docs/brainstorms/2026-03-02-secure-byoai-product-brainstorm.md
---

# Phase 2: DOM Observation and Prompt Capture

## Overview

Build the DOM observation layer that detects when users type and submit prompts on ChatGPT, Claude, and Gemini. This phase creates per-site adapters that find input elements, extract prompt text, intercept submission, and detect file uploads — all without breaking the host page or injecting any UI.

Phase 2 is the bridge between the Phase 1 skeleton and Phase 3's classification engine. After this phase, the extension can capture every prompt the user sends and emit it for classification. No UI is rendered (that's Phase 4). The output is a typed callback with the prompt text and site adapter reference.

## Problem Statement / Motivation

The extension loads on all three AI tool pages (verified in Phase 1), but does nothing. To classify prompts for sensitive data, we first need to reliably:

1. Find the chat input element on each site (all are SPAs — the input may not exist on page load)
2. Extract the full prompt text from different editor types (ProseMirror, Quill)
3. Intercept submission before the prompt is sent to the server
4. Detect file uploads across all three upload vectors (file input, drag-and-drop, paste)

Each AI tool uses a different frontend framework (React, Next.js, Angular) with different editor implementations, so each needs a dedicated adapter behind a shared interface.

## Proposed Solution

### Architecture

```
content.ts (entrypoint)
  └─ observer.ts (orchestrator)
       ├─ sites/chatgpt.ts (adapter)
       ├─ sites/claude.ts  (adapter)
       └─ sites/gemini.ts  (adapter)
  └─ interceptor.ts (submission interception + file upload detection)
```

**Flow:**
1. `content.ts` calls `startObserving(ctx, onPromptCaptured)` on load
2. `observer.ts` determines the correct adapter from `window.location.hostname`
3. Observer uses `MutationObserver` to wait for the editor element
4. Once found, `interceptor.ts` attaches capture-phase event listeners for submission
5. On submission: extract text via adapter, call `onPromptCaptured(text, adapterName)`
6. On SPA navigation (`wxt:locationchange`): tear down, re-find, re-attach
7. File upload detection runs independently — emits `onFileDetected(filename, adapterName)`

### Reconciled SiteAdapter Interface

The founding spec and DOM research proposed different interfaces. Reconciled version:

```typescript
// src/types/adapter.ts

type SiteName = 'chatgpt' | 'claude' | 'gemini';

interface SiteAdapter {
  readonly name: SiteName;

  /** Check if this adapter handles the given hostname */
  matches(hostname: string): boolean;

  /** Find the primary chat input element. Returns null if not yet in DOM. */
  findInput(): HTMLElement | null;

  /** Find the send/submit button. Returns null if not visible. */
  findSendButton(): HTMLElement | null;

  /** Extract full text content from the editor element */
  getText(input: HTMLElement): string;

  /** Replace text content in the editor (for redaction in Phase 4) */
  setText(input: HTMLElement, text: string): void;

  /** Find the file drop zone element, if any */
  getDropZone(): HTMLElement | null;
}
```

Key decisions:
- `matches(hostname)` takes hostname, not full URL — simpler matching, avoids subpath issues
- `findSendButton()` added — needed for reliable submission re-triggering (see Technical Considerations)
- `getDropZone()` added — site-specific drop zone selectors for file upload detection
- `onSubmit()` removed from adapter — submission interception is handled uniformly by `interceptor.ts` using capture-phase listeners, not per-adapter logic
- `setText()` kept — needed for Phase 4 redaction, stubbed/best-effort in Phase 2

### Submission Re-triggering Strategy

After intercepting submission (via `e.preventDefault()` + `e.stopPropagation()` in capture phase), the original event is consumed. To "release" a clean submission:

**Primary: Programmatic send button click** — `adapter.findSendButton()?.click()`

This is the most reliable cross-framework approach because:
- Does not depend on synthetic keyboard events being trusted (`isTrusted`)
- Works across ProseMirror, Quill, and native editors
- The send button's click handler triggers the site's own submission logic

**Fallback (if button not found):** Dispatch a synthetic Enter key event on the editor. Less reliable but covers edge cases where the button is conditionally hidden.

### Communication Pattern

**Typed callbacks, not custom DOM events.** Custom events (`byoai:prompt-ready`) are untyped, visible to the host page (leaks extension presence), and harder to test. Instead:

```typescript
// Observer accepts typed callbacks
type PromptCallback = (text: string, adapterName: SiteName) => void;
type FileCallback = (filename: string, adapterName: SiteName) => void;

function startObserving(
  ctx: ContentScriptContext,
  onPromptCaptured: PromptCallback,
  onFileDetected: FileCallback,
): void;
```

Phase 3 will wire `onPromptCaptured` to the classification engine. For now, it logs to console.

## Technical Considerations

### DOM Selectors per Site

All selectors use fallback chains — try the most stable first, fall through to less stable.

**ChatGPT (chatgpt.com, chat.openai.com):**
- Editor: `#prompt-textarea` (ProseMirror contenteditable) → `div.ProseMirror[contenteditable="true"]`
- Send button: `[data-testid="send-button"]` → `button[aria-label="Send prompt"]`
- Text extraction: Parse `<p>` elements inside ProseMirror container
- Framework: React — obfuscated class names change per deployment, avoid them
- Drop zone: `form` element wrapping the editor

**Claude (claude.ai):**
- Editor: `.ProseMirror[contenteditable="true"]` → `div[role="textbox"][contenteditable="true"]`
- Send button: `button[aria-label="Send message"]` → `button[aria-label="Send Message"]`
- Text extraction: Parse `<p>` elements inside ProseMirror container (same as ChatGPT)
- Framework: Next.js (React) — no stable ID on editor, use class + attribute selectors
- Drop zone: closest fieldset or form ancestor of editor

**Gemini (gemini.google.com):**
- Editor: `.ql-editor[contenteditable="true"]` → `rich-textarea div[contenteditable="true"]`
- Send button: `.send-button` → `button[aria-label="Send message"]`
- Text extraction: Parse `<p>` elements inside Quill container (similar structure)
- Framework: Angular — `ng-tns-*` attributes change per build, avoid them. Custom elements (`<rich-textarea>`) are NOT Shadow DOM — all accessible.
- Drop zone: `.xap-uploader-dropzone` → closest container with drop listeners

### SPA Navigation

Use WXT's built-in `wxt:locationchange` event (fires on pushState/replaceState/popstate):

```typescript
ctx.addEventListener(window, 'wxt:locationchange', () => {
  tearDown();
  reAttach();
});
```

This is preferred over history monkey-patching (which would run in MAIN world and require `injectScript()`).

### Element Lifecycle (Hybrid Approach)

1. **Initial find:** MutationObserver on `document.body` waits for editor element
2. **Found:** Attach interception listeners, store element reference
3. **Health check:** `ctx.setInterval(() => checkElementConnected(), 5000)` — verify element is still in DOM
4. **Disconnected:** Clean up listeners, go back to step 1
5. **Navigation:** `wxt:locationchange` triggers full teardown and re-find

This catches both SPA navigation and framework reconciliation (React/Angular may destroy and recreate the editor without a URL change).

### IME Composition Handling

All capture-phase keydown listeners must check `e.isComposing` to avoid intercepting CJK input method composition events:

```typescript
if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
  // This is a real submission, not IME composition
}
```

### Content Script Isolation

Content scripts share the DOM but run in Chrome's isolated JavaScript world. Key implications:
- `e.stopPropagation()` in capture phase stops propagation for ALL worlds — this will prevent the host page's handlers from firing
- After interception, we must re-trigger submission (see re-triggering strategy above)
- The host page cannot see our event listeners or variables
- Custom events dispatched on DOM elements ARE visible to the host page — another reason to use typed callbacks

### Synchronous Interception

The interception handler must be synchronous (no `await` in keydown handler). Settings that affect classification (Phase 3) will be pre-cached on content script load and updated via `chrome.storage.onChanged` listener. This keeps the hot path under 50ms.

### File Upload Detection — Three Vectors

1. **`<input type="file">` change events:** ChatGPT has hidden file inputs at page load. Gemini creates them dynamically. Use MutationObserver to watch for added `<input type="file">` elements and attach `change` listeners.

2. **Drag-and-drop:** Capture-phase `drop` event listener on the adapter's drop zone. Extract filenames from `e.dataTransfer.files`.

3. **Clipboard paste:** Capture-phase `paste` event on the editor element. Check `e.clipboardData.files` for pasted files/screenshots.

**Phase 2 does not block file uploads** — it emits a detection event only. Blocking and warning UI is Phase 4. The `onFileDetected` callback receives the filename and adapter name for logging.

### Diagnostic Tracking

When `findInput()` returns null after a timeout (10 seconds), increment a counter in `chrome.storage.local`:
```typescript
{ adapterFailures: { chatgpt: 0, claude: 0, gemini: 0 } }
```
This surfaces in the Phase 5 dashboard as a warning when selectors break after a site update.

## Acceptance Criteria

### Functional Requirements

- [ ] ChatGPT adapter finds the editor element on `chatgpt.com` — `src/content/sites/chatgpt.ts`
- [ ] ChatGPT adapter finds the editor element on `chat.openai.com` — `src/content/sites/chatgpt.ts`
- [ ] ChatGPT adapter extracts full prompt text from ProseMirror — `src/content/sites/chatgpt.ts`
- [ ] Claude adapter finds the ProseMirror editor on `claude.ai` — `src/content/sites/claude.ts`
- [ ] Claude adapter extracts full prompt text — `src/content/sites/claude.ts`
- [ ] Gemini adapter finds the Quill editor on `gemini.google.com` — `src/content/sites/gemini.ts`
- [ ] Gemini adapter extracts full prompt text — `src/content/sites/gemini.ts`
- [ ] Observer detects editor element via MutationObserver on all three sites — `src/content/observer.ts`
- [ ] Observer re-finds editor after SPA navigation on all three sites — `src/content/observer.ts`
- [ ] Observer detects when editor element is removed and re-finds it — `src/content/observer.ts`
- [ ] Interceptor captures prompt text on Enter key submission (without Shift, without IME) — `src/content/interceptor.ts`
- [ ] Interceptor captures prompt text on send button click — `src/content/interceptor.ts`
- [ ] Interceptor re-triggers submission via send button click after capture — `src/content/interceptor.ts`
- [ ] File upload detected via `<input type="file">` change event — `src/content/interceptor.ts`
- [ ] File upload detected via drag-and-drop — `src/content/interceptor.ts`
- [ ] File upload detected via clipboard paste with files — `src/content/interceptor.ts`
- [ ] `onPromptCaptured` callback fires with correct text and adapter name — `src/entrypoints/content.ts`
- [ ] `onFileDetected` callback fires with filename and adapter name — `src/entrypoints/content.ts`

### Non-Functional Requirements

- [ ] Extension does NOT break normal typing, submission, or navigation on any AI tool page
- [ ] No visible UI is rendered (Phase 2 is observation only)
- [ ] All MutationObservers and event listeners are cleaned up via `ctx.onInvalidated()` — no memory leaks
- [ ] Interception adds < 5ms to submission (text extraction + callback, no classification yet)
- [ ] Each AI tool page works normally with extension loaded for 10+ minutes of active use
- [ ] Zero console errors from extension code on any AI tool page
- [ ] Zero network requests from extension

### Testing Requirements

- [ ] Unit tests for each adapter: URL matching, text extraction from mock DOM — `tests/unit/content/sites/`
- [ ] Unit tests for observer: element finding, lifecycle (attach, detach, re-find) — `tests/unit/content/observer.test.ts`
- [ ] Unit tests for interceptor: event capture, callback invocation, file detection — `tests/unit/content/interceptor.test.ts`
- [ ] Minimum 5 true positives and 5 true negatives for each adapter's `matches()` — `tests/unit/content/sites/`
- [ ] E2E test: extension loads on each AI tool, console shows prompt capture log — `tests/e2e/`
- [ ] `npm run test` passes all unit tests
- [ ] `npm run lint` passes with no errors

## Success Metrics

- Prompt text captured on all three AI tools (verified manually and via E2E)
- File uploads detected across all three vectors (file input, drag-drop, paste)
- Host page functionality unaffected after 10 minutes of use on each site
- All unit tests pass with adapter logic covered
- Re-triggered submissions actually send the message on all three sites

## Dependencies & Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| AI tools update DOM selectors | High — adapters silently break | Fallback selector chains (2-3 selectors per element). Diagnostic counter in storage. E2E tests catch breakage. |
| `sendButton.click()` does not trigger real submission | Critical — interception flow broken | Test on all three sites during implementation. Fallback: synthetic Enter key dispatch. If both fail, rethink interception (intercept at form submit level instead of keydown). |
| Capture-phase `stopPropagation` breaks host page features | High — host page event handlers never fire | Only intercept Enter (not all keys). Only stop propagation when classification will run (Phase 3). In Phase 2, capture text but do NOT prevent submission — just log. |
| ProseMirror/Quill `setText()` does not work via DOM manipulation | Medium — blocks Phase 4 redaction | Stub `setText()` in Phase 2. Research editor-specific APIs during Phase 4 planning. Worst case: clear editor and let user re-type. |
| Gemini uses `showOpenFilePicker()` instead of `<input type="file">` | Medium — file uploads undetected on Gemini | Cannot intercept File System Access API from content script. Document as known limitation. |
| MutationObserver performance on complex pages | Low — CPU spike on heavy DOM changes | Observe smallest possible subtree. Debounce observer callback. Disconnect when not needed. |

## Implementation Checklist

### Step 0: Create Shared Types

- [x] Create `src/types/result.ts` — `Result<T, E>` union type
- [x] Create `src/types/adapter.ts` — `SiteAdapter` interface, `SiteName` type
- [x] Create `src/types/index.ts` — re-export all types
- [x] Unit test: type smoke test (type-level only, ensures compilation) — `tests/unit/types/`

### Step 1: Build ChatGPT Adapter (Reference Pattern)

- [x] Create `src/content/sites/chatgpt.ts` implementing `SiteAdapter`
- [x] `matches()`: handle both `chatgpt.com` and `chat.openai.com`
- [x] `findInput()`: fallback chain `#prompt-textarea` → `.ProseMirror[contenteditable="true"]`
- [x] `findSendButton()`: fallback chain `[data-testid="send-button"]` → `button[aria-label="Send prompt"]`
- [x] `getText()`: extract text from ProseMirror `<p>` elements
- [x] `setText()`: best-effort text replacement (stub if unreliable)
- [x] `getDropZone()`: find the form wrapping the editor
- [x] Unit tests: URL matching (5+ positives, 5+ negatives), text extraction from mock ProseMirror DOM — `tests/unit/content/sites/chatgpt.test.ts`

### Step 2: Build Claude Adapter

- [x] Create `src/content/sites/claude.ts` implementing `SiteAdapter`
- [x] `matches()`: handle `claude.ai`
- [x] `findInput()`: fallback chain `.ProseMirror[contenteditable="true"]` → `div[role="textbox"][contenteditable="true"]`
- [x] `findSendButton()`: `button[aria-label="Send message"]` (case-insensitive fallback)
- [x] `getText()`: extract text from ProseMirror `<p>` elements
- [x] `setText()`: best-effort (same ProseMirror approach as ChatGPT)
- [x] `getDropZone()`: closest fieldset/form ancestor
- [x] Unit tests — `tests/unit/content/sites/claude.test.ts`

### Step 3: Build Gemini Adapter

- [x] Create `src/content/sites/gemini.ts` implementing `SiteAdapter`
- [x] `matches()`: handle `gemini.google.com`
- [x] `findInput()`: fallback chain `.ql-editor[contenteditable="true"]` → `rich-textarea div[contenteditable="true"]`
- [x] `findSendButton()`: `.send-button` → `button[aria-label="Send message"]`
- [x] `getText()`: extract text from Quill `<p>` elements
- [x] `setText()`: best-effort Quill text replacement
- [x] `getDropZone()`: `.xap-uploader-dropzone` → closest container
- [x] Unit tests — `tests/unit/content/sites/gemini.test.ts`

### Step 4: Build Observer Module

- [x] Create `src/content/observer.ts`
- [x] `selectAdapter(hostname)`: pick correct adapter from registry
- [x] `waitForElement(selectors, ctx)`: MutationObserver-based element finder with timeout
- [x] `startObserving(ctx, onPromptCaptured, onFileDetected)`: main orchestration function
- [x] SPA navigation handling via `ctx.addEventListener(window, 'wxt:locationchange', ...)`
- [x] Element health check via `ctx.setInterval` (every 5 seconds, verify `element.isConnected`)
- [x] Diagnostic failure counter in `chrome.storage.local`
- [x] All cleanup registered via `ctx.onInvalidated()`
- [x] Unit tests: adapter selection, element lifecycle (mock DOM) — `tests/unit/content/observer.test.ts`

### Step 5: Build Interceptor Module

- [x] Create `src/content/interceptor.ts`
- [x] `attachSubmissionInterceptor(input, adapter, ctx, onCapture)`: capture-phase keydown + click listeners
- [x] Enter key handling: check `!e.shiftKey && !e.isComposing`
- [x] Send button click handling: capture-phase click, match via `closest()`
- [x] Text extraction via `adapter.getText(input)`
- [x] Submission re-triggering via `adapter.findSendButton()?.click()` (prepared for Phase 4)
- [x] `attachFileDetector(adapter, ctx, onFileDetected)`: file input, drag-drop, paste listeners
- [x] Document-level change event listener for dynamically added file inputs
- [x] All listeners use `ctx.addEventListener()` for automatic cleanup
- [x] Unit tests: event capture simulation, callback invocation, file detection — `tests/unit/content/interceptor.test.ts`

### Step 6: Wire Everything in content.ts

- [x] Update `src/entrypoints/content.ts` to call `startObserving()`
- [x] `onPromptCaptured`: log to console (`[BYOAI] Prompt captured on {adapterName}: {textLength} chars`)
- [x] `onFileDetected`: log to console (`[BYOAI] File detected on {adapterName}: {filename}`)
- [x] Remove Phase 1 placeholder `console.log('BYOAI loaded')`

### Step 7: Update Chrome API Mocks for Tests

- [x] Expand `tests/setup.ts` with any additional chrome API mocks needed (existing mocks sufficient — `chrome.storage.local` already mocked)
- [x] Add jsdom environment configuration for DOM-dependent tests (global config in `vitest.config.ts`)

### Step 8: Manual Verification on Live Sites

- [ ] Load extension on ChatGPT → type prompt → submit via Enter → console shows capture log
- [ ] Load extension on ChatGPT → submit via send button click → console shows capture log
- [ ] Load extension on Claude → type prompt → submit → console shows capture log
- [ ] Load extension on Gemini → type prompt → submit → console shows capture log
- [ ] Navigate between conversations on each site → observer re-attaches → captures work
- [ ] Upload a file on ChatGPT → console shows file detection log
- [ ] Drag-and-drop a file → console shows file detection log
- [ ] Paste a screenshot → console shows file detection log
- [ ] Use each AI tool normally for 10 minutes → no breakage, no console errors
- [ ] Verify zero network requests from extension in DevTools

### Step 9: E2E Tests

- [ ] E2E test: extension loads on ChatGPT, content script active — `tests/e2e/`
- [ ] E2E test: extension loads on Claude, content script active — `tests/e2e/`
- [ ] E2E test: extension loads on Gemini, content script active — `tests/e2e/`

### Step 10: Commit

- [x] All tests pass (`npm run test`)
- [x] Lint passes (`npm run lint`)
- [x] Commit on branch `feat/dom-observation`
- [ ] Update `docs/founding/founding-PLAN.md` — check off Phase 2 items

## Important Design Decision: Phase 2 Does NOT Block Submission

During Phase 2, the interceptor captures text but does NOT call `e.preventDefault()` or `e.stopPropagation()`. The prompt is sent normally while the extension logs the capture. This is critical because:

1. Classification engine (Phase 3) does not exist yet — there is nothing to decide on
2. Overlay UI (Phase 4) does not exist yet — there is nowhere to show warnings
3. Blocking submission without these components would break the user experience
4. It allows us to verify text extraction accuracy without risk

The interception (prevent + re-trigger) logic will be activated in Phase 4 when the full flow is wired together. Phase 2 just proves we can capture the right text at the right time.

## Sources & References

### Origin

- **Brainstorm document:** [docs/brainstorms/2026-03-02-secure-byoai-product-brainstorm.md](docs/brainstorms/2026-03-02-secure-byoai-product-brainstorm.md) — Key decisions: regex-only v1, local-only classification, warning not blocking, zero UI when clean, Shadow DOM isolation.

### Internal References

- Founding product spec: `docs/founding/founding-SPEC.md` (Section 1: Content Observer, Section 1.3: Site Adapters, Section 1.4: Submission Interception, Section 1.5: File Upload Detection)
- Founding implementation guide: `docs/founding/founding-03-implementation-guide.md` (Sessions 2-4)
- Founding implementation plan: `docs/founding/founding-PLAN.md` (Phase 2 checklist)
- Phase 1 plan (completed): `docs/plans/2026-03-02-feat-phase1-project-scaffolding-plan.md`
- Phase 1 learnings: `docs/solutions/build-errors/wxt-preact-typescript-scaffold-setup.md`
- DOM research: `docs/research/2026-03-02-dom-research.md`

### External References

- WXT content scripts: https://wxt.dev/guide/essentials/content-scripts.html
- WXT content script UI (Shadow DOM): https://wxt.dev/guide/key-concepts/content-script-ui.html
- WXT ContentScriptContext API: https://wxt.dev/api/reference/wxt/utils/content-script-context/classes/ContentScriptContext
- ProseMirror reference: https://prosemirror.net/
- Quill editor: https://quilljs.com/
