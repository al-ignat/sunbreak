---
title: "feat: Phase 6 integration, polish, and Chrome Web Store submission"
type: feat
status: active
date: 2026-03-03
origin: docs/brainstorms/2026-03-02-secure-byoai-product-brainstorm.md
---

# feat: Phase 6 — Integration, Polish & Chrome Web Store Submission

## Overview

Phase 6 is the final phase before shipping. It connects everything built in Phases 1–5 into a verified, polished product and prepares for Chrome Web Store submission. The work splits into three sessions:

1. **Live integration testing** — validate the full flow on real AI tools, fix any broken interactions
2. **Chrome Web Store readiness** — icons, privacy policy, manifest polish, performance verification, accessibility fixes
3. **Landing page + final submission** — simple HTML landing page, CWS listing, final manual test pass

All five building blocks exist (scaffolding, DOM observation, classification engine, overlay UI, dashboard). Phase 6 proves they work together in production and ships them.

(see brainstorm: `docs/brainstorms/2026-03-02-secure-byoai-product-brainstorm.md` — "Warning, not blocking", "Zero UI when clean", "Zero network requests from extension")

## Problem Statement / Motivation

Phases 1–5 were built and tested in isolation. 355 unit tests pass. The build is 84KB. But:

- **No E2E tests exist.** Playwright is not installed. The `test:e2e` script has nothing to run.
- **No live validation.** setText() uses `innerHTML` replacement which may not sync with ProseMirror/Quill internal state. Synthetic keyboard re-submission (`isTrusted: false`) may be ignored by AI tools. These are the two highest-risk integration points.
- **Placeholder icons** (69 bytes each). CWS will reject immediately.
- **No privacy policy.** Required for CWS submission even though the extension is fully local.
- **No landing page.** Required by the founding plan.
- **No performance benchmarks.** The <50ms classification and <100ms page load claims are unverified formally.
- **WCAG AA contrast issue.** White text on `#FF9800` (primary button) is ~3.0:1 — fails AA.

## Proposed Solution

### Session 13: Live Integration Testing

**Goal:** Prove the end-to-end flow works on all three AI tools.

**Step 1: Live DOM research**

Open ChatGPT, Claude, and Gemini in Chrome. For each tool:
- Verify current selectors still match (input element, send button)
- Test whether `setParagraphText()` (innerHTML + input event) causes the editor framework to recognize the new text when submitting
- Test whether `sendButton.click()` triggers actual submission
- Test whether synthetic `KeyboardEvent('keydown', { key: 'Enter' })` is accepted
- Document any Gemini shadow DOM issues (the spec warned about web components)

Record results. Update adapters if selectors changed.

**Step 2: Fix setText if broken**

If innerHTML replacement doesn't sync with ProseMirror/Quill:
- **Preferred fix:** Use `document.execCommand('selectAll')` + `document.execCommand('insertText', false, redactedText)` — this goes through the editor's input handling pipeline and updates internal state. Deprecated but still functional in all browsers and the most reliable way to programmatically set contenteditable text.
- **Fallback:** Use the Clipboard API — `navigator.clipboard.writeText(redactedText)` then simulate Ctrl+A, Ctrl+V via keyboard events.
- **Last resort:** Keep innerHTML but add a per-adapter `triggerEditorSync()` that dispatches framework-specific events.

Update `setParagraphText()` in `src/content/sites/dom-utils.ts` or add per-adapter `setText()` overrides.

**Step 3: Fix re-submission if broken**

If synthetic KeyboardEvent fails (`isTrusted: false`):
- Always use `sendButton.click()` as the primary re-submission method (button clicks via `.click()` are more reliably accepted)
- Keep keyboard re-submission as fallback only
- Update `triggerKeyboardSubmit` / `triggerButtonSubmit` in `src/content/interceptor.ts`

**Step 4: Manual E2E validation**

Test on each tool (ChatGPT, Claude, Gemini):
1. Type prompt with email address → overlay appears → "Redact & Send" → `[EMAIL_1]` is sent
2. Type prompt with API key → overlay appears → "Send Anyway" → original text sent
3. Type prompt with no PII → no overlay, prompt sends immediately
4. Type prompt with PII → overlay → "Edit" → focus returns to input → user fixes → re-submit → clean
5. Type prompt with PII → overlay → "Cancel" → nothing sent
6. Navigate to new chat → extension re-attaches → repeat test 1
7. Use extension for 10+ minutes → no breakage, no memory leak

### Session 14: CWS Readiness + Performance + Accessibility

**Step 1: Install Playwright and write E2E tests**

```bash
npm install -D @playwright/test
npx playwright install chromium
```

Create E2E test infrastructure:
- `tests/e2e/fixtures.ts` — Playwright fixtures with `launchPersistentContext` + `--load-extension`
- `playwright.config.ts` — `workers: 1`, `testDir: 'tests/e2e'`, build-before-test
- Update `package.json` scripts: `"test:e2e": "wxt build && playwright test"`

Write E2E tests for extension pages (these use `chrome-extension://<id>/` URLs and don't require live AI tool access):
- `tests/e2e/popup.spec.ts` — popup loads, shows stats, toggles work, dashboard link works
- `tests/e2e/dashboard.spec.ts` — dashboard loads, all 5 tabs render, settings persist

Content script E2E tests against live sites are fragile and auth-gated. Instead, document a **manual test protocol** (checklist from Session 13 Step 4) as the official cross-tool verification.

**Step 2: Performance benchmarks**

Add to `tests/unit/classifier/engine.test.ts`:
- Benchmark: classify 100-char prompt → assert `durationMs < 50`
- Benchmark: classify 1,000-char prompt with 5+ findings → assert `durationMs < 50`
- Benchmark: classify 10,000-char prompt → assert `durationMs < 50`
- Benchmark: classify 50,000-char prompt (at truncation limit) → assert `durationMs < 50`
- Investigate the existing 2617ms truncation test — is that classify time or test setup?

Add to E2E tests:
- Measure extension popup open-to-render time → assert < 100ms
- Measure dashboard page load → assert < 200ms

**Step 3: Create extension icons**

Design real icons for all four sizes (16, 32, 48, 128 PNG). Style: shield or lock motif — clean, recognizable at small sizes. Use the extension's amber/orange color palette (#FF9800).

Add `icons` field to `wxt.config.ts` manifest:
```typescript
icons: {
  '16': 'icons/icon-16.png',
  '32': 'icons/icon-32.png',
  '48': 'icons/icon-48.png',
  '128': 'icons/icon-128.png',
},
```

Also add `action.default_icon` for toolbar display.

**Step 4: Fix WCAG AA contrast**

The "Redact & Send" button uses white (#FFF) text on amber (#FF9800) — contrast ratio ~3.0:1, fails AA (requires 4.5:1).

Fix: Change button background to `#E65100` (deep orange) with white text — contrast ratio ~4.6:1, passes AA. Or use dark text on amber background.

Update in `src/ui/overlay/WarningBanner.tsx` and `src/ui/overlay/WarningBanner.css`.

**Step 5: Privacy policy**

Create a simple HTML privacy policy page (`landing/privacy.html` or include in the landing page):

Key points to cover:
1. What data is read (prompt text on ChatGPT/Claude/Gemini — scanned locally)
2. What data is stored (aggregate stats and settings in `chrome.storage.local` — no raw text)
3. What data is shared (nothing — zero network requests)
4. How to delete data (uninstall extension or clear extension storage)
5. Limited Use compliance statement

**Step 6: Verify zero network requests**

After building (`npm run build`), load the extension in a fresh Chrome profile with DevTools Network tab open. Use the extension normally on all three AI tools for 5 minutes. Filter network panel to extension requests. Must be zero.

Document this as a manual verification step in the test protocol.

### Session 15: Landing Page + Final Polish + Submission

**Step 1: Landing page**

Create a single-page static HTML landing page in a `landing/` directory:

- **Content:** Product name, tagline ("Use AI tools at work — safely"), 3-4 feature bullets, screenshot of the overlay in action, "Install from Chrome Web Store" button (links to CWS listing), link to privacy policy
- **Design:** Clean, minimal. Use the extension's color palette (amber/orange accents, dark text, white background)
- **Hosting:** GitHub Pages from the `landing/` directory, or a `docs/` folder
- **No dependencies:** Plain HTML + CSS, no build step

**Step 2: Chrome Web Store listing**

Prepare CWS Developer Dashboard submission:

- **Store description:** Expand on the manifest description — what it detects, how it works, privacy emphasis
- **Category:** Productivity
- **Screenshots:** 3-5 at 1280x800 (overlay warning, popup stats, dashboard overview, redaction flow)
- **Small promo tile:** 440x280
- **Permission justifications:**
  - `storage`: "Stores user preferences and aggregate detection statistics locally"
  - Host permissions: "Content script must run on [tool] pages to detect sensitive data in prompts before submission"
- **Data handling disclosure:** Mark "Personally identifiable information" and "Website content" as read (not collected/shared). Certify Limited Use compliance.
- **Privacy policy URL:** Link to the hosted privacy policy page
- **Single purpose:** "Detects and warns users about sensitive personal data in AI tool prompts"

**Step 3: Final polish**

- Update `founding-PLAN.md` — check off all Phase 4 items (code was complete but checkboxes weren't updated) and Phase 6 items
- Bump version to `1.0.0` in `wxt.config.ts`
- Run full test suite (`npm run test` + `npm run test:e2e`)
- Run ESLint (`npm run lint`)
- Final manual test pass on all three AI tools
- Verify build output: `npm run build`, check `.output/chrome-mv3/manifest.json` for correctness

## Technical Considerations

### Critical Risk: setText() + ProseMirror/Quill

`setParagraphText()` in `src/content/sites/dom-utils.ts:23-34` sets `innerHTML` directly and dispatches an `input` event. ProseMirror and Quill maintain internal document models that may not sync from raw DOM mutations. If the framework's internal state still holds the original text, "Redact & Send" would visually show redacted text but actually send the sensitive original.

**Must be validated on live tools in Session 13.** The `execCommand('insertText')` approach is the safest alternative.

### Critical Risk: Synthetic Event Re-submission

`triggerKeyboardSubmit()` in `src/content/interceptor.ts:116-129` dispatches a synthetic `KeyboardEvent` with `isTrusted: false`. Some sites reject untrusted events. `triggerButtonSubmit()` (line 131-140) uses `.click()` which is more reliable.

**Must be tested on live tools.** Button click should be the primary strategy.

### Gemini Shadow DOM

The Gemini adapter uses `document.querySelector()` which cannot pierce shadow DOM boundaries. If Gemini wraps its editor in web components with shadow roots, the adapter will silently fail.

**Must be verified during live DOM research.** If needed, implement deep shadow DOM traversal in the adapter.

### Playwright + Chrome Extensions

Per WXT docs and Playwright docs:
- Use `chromium.launchPersistentContext()` with `--load-extension` flag
- Point to `.output/chrome-mv3/` build output
- Wait for service worker: `context.waitForEvent('serviceworker')`
- Extract extension ID from service worker URL
- Navigate to `chrome-extension://<id>/popup.html` for popup tests
- `workers: 1` for CI stability
- Worker-scoped fixtures for performance

### File Upload Warning (Deferred vs. Implemented)

The orchestrator's `onFileDetected` (line 250-256) only does `console.log`. The spec says to show a warning. This is a minor scope decision for Phase 6:
- **Minimal:** Keep console.log — file content analysis is out of v1 scope
- **Better:** Show a simple toast notification using the existing Shadow DOM container — "File detected. Ensure it doesn't contain sensitive data."

Recommend the minimal approach — file upload warning adds UI complexity and the spec explicitly says "no content analysis" for v1.

## Acceptance Criteria

### E2E Flow — All Three Tools

- [ ] Extension loads on ChatGPT without console errors — `src/content/sites/chatgpt.ts`
- [ ] Extension loads on Claude without console errors — `src/content/sites/claude.ts`
- [ ] Extension loads on Gemini without console errors — `src/content/sites/gemini.ts`
- [ ] Full flow works: type PII → overlay appears → Redact & Send → redacted text sent
- [ ] Full flow works: type PII → overlay → Send Anyway → original sent
- [ ] Full flow works: type PII → overlay → Edit → focus returns → user edits → re-submit
- [ ] Full flow works: type PII → overlay → Cancel → nothing sent
- [ ] Clean prompts pass through with zero visible delay
- [ ] SPA navigation (new chat) → extension re-attaches → continues working
- [ ] 10+ minutes of continuous use → no breakage, no memory leak

### E2E Test Infrastructure

- [ ] Playwright installed and configured — `playwright.config.ts`, `tests/e2e/fixtures.ts`
- [ ] `npm run test:e2e` script works (builds extension, runs Playwright tests)
- [ ] Popup E2E test: loads, renders stats, toggles work — `tests/e2e/popup.spec.ts`
- [ ] Dashboard E2E test: loads, all 5 tabs render — `tests/e2e/dashboard.spec.ts`
- [ ] Manual test protocol documented for cross-tool validation

### Performance

- [x] Classification < 50ms for prompts up to 50K chars (benchmark test)
- [ ] Popup render < 100ms (manual measurement or E2E assertion)
- [ ] Dashboard page load < 200ms (manual measurement or E2E assertion)
- [ ] Zero network requests from production build (manual DevTools verification)

### Chrome Web Store Readiness

- [ ] Real icons: 16, 32, 48, 128 PNG in `public/icons/` — replace placeholders
- [ ] `icons` field added to `wxt.config.ts` manifest
- [ ] `action.default_icon` set in manifest
- [ ] Privacy policy page created and hosted
- [ ] Version bumped to `1.0.0`
- [ ] CWS listing description, category, screenshots, promo tile prepared
- [ ] Permission justifications written (storage + host_permissions)
- [ ] Data handling disclosure completed
- [ ] No `eval()`, no remote code, no obfuscation in build output

### Accessibility

- [x] Primary button contrast ≥ 4.5:1 (WCAG AA) — fix `#FF9800` background
- [ ] All overlay buttons keyboard-navigable with visible focus indicators
- [ ] `role="alertdialog"` on overlay (already implemented — verify)

### Landing Page

- [ ] Single-page HTML in `landing/` directory
- [ ] Product name, tagline, feature bullets, install link, privacy policy link
- [ ] No external dependencies (plain HTML + CSS)
- [ ] Deployable to GitHub Pages

### Housekeeping

- [ ] `founding-PLAN.md` updated — Phase 4 and Phase 6 items checked off
- [ ] All unit tests still pass (`npm run test`)
- [ ] ESLint clean (`npm run lint`)

## Success Metrics

- Full E2E flow verified manually on ChatGPT, Claude, and Gemini
- Playwright E2E tests pass for popup and dashboard
- Classification benchmarks pass at < 50ms for all input sizes
- Extension loads for 30+ minutes without breakage on any tool
- Chrome Web Store submission accepted (no rejection on first review)
- Landing page live and accessible

## Dependencies & Risks

### Dependencies

- Phases 1–5 complete (all code exists, 355 tests pass)
- Chrome Developer account ($5 one-time fee) for CWS submission
- Domain or GitHub Pages for hosting privacy policy + landing page
- Access to ChatGPT, Claude, and Gemini for live testing (login required)

### Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| `setText()` doesn't sync with ProseMirror/Quill | **CRITICAL** — "Redact & Send" is broken | Test on live tools first. Use `execCommand('insertText')` as alternative. |
| Synthetic events rejected (`isTrusted: false`) | **HIGH** — re-submission fails silently | Default to `sendButton.click()`. Keep keyboard as fallback. |
| Gemini input inside shadow DOM | **HIGH** — extension non-functional on Gemini | Research live DOM. Implement deep traversal if needed. |
| AI tools changed their DOM since Phase 2 | **MEDIUM** — selectors fail silently | Verify all selectors on live tools. Update adapters. |
| CWS review rejects submission | **MEDIUM** — delays launch by 1-2 weeks | Follow all guidelines. Narrow permissions. Clear privacy policy. |
| Icon design takes too long | **LOW** — cosmetic but blocks CWS | Use simple geometric design (shield icon). Can iterate post-launch. |

## Sources & References

### Origin

- **Brainstorm document:** [docs/brainstorms/2026-03-02-secure-byoai-product-brainstorm.md](docs/brainstorms/2026-03-02-secure-byoai-product-brainstorm.md) — Key decisions: "Zero network requests", "Warning not blocking", "Chrome only for v1"

### Internal References

- Phase plan checklist: `docs/founding/founding-PLAN.md` Phase 6 (lines 51-57)
- Phase 4 plan (overlay): `docs/plans/2026-03-03-feat-phase4-overlay-ui-plan.md`
- Phase 5 plan (dashboard): `docs/plans/2026-03-03-feat-phase5-dashboard-plan.md`
- Interceptor (setText + re-submission): `src/content/interceptor.ts:116-140`
- DOM utils (setParagraphText): `src/content/sites/dom-utils.ts:23-34`
- Orchestrator: `src/content/orchestrator.ts`
- Overlay controller: `src/ui/overlay/overlay-controller.ts`
- Warning banner styles: `src/ui/overlay/WarningBanner.tsx`
- WXT config: `wxt.config.ts`
- Placeholder icons: `public/icons/`
- Learnings — DOM pitfalls: `docs/solutions/integration-issues/2026-03-02-dom-observation-patterns-and-pitfalls.md`
- Learnings — overlay pitfalls: `docs/solutions/ui-bugs/preact-hooks-shadow-dom-overlay-pitfalls.md`
- Learnings — WXT scaffold: `docs/solutions/build-errors/wxt-preact-typescript-scaffold-setup.md`

### External References

- WXT E2E testing: https://wxt.dev/guide/essentials/e2e-testing
- Playwright Chrome extensions: https://playwright.dev/docs/chrome-extensions
- WXT Playwright example: https://github.com/wxt-dev/examples/tree/main/examples/playwright-e2e-testing
- Chrome Web Store publishing: https://developer.chrome.com/docs/webstore/cws-dashboard-listing
- CWS privacy requirements: https://developer.chrome.com/docs/webstore/cws-dashboard-privacy
- CWS image requirements: https://developer.chrome.com/docs/webstore/images

### Related Work

- Phase 1 PR: scaffolding
- Phase 2 PR: #2 (DOM observation)
- Phase 3 PR: #3 (classification engine)
- Phase 4: overlay UI
- Phase 5: dashboard
