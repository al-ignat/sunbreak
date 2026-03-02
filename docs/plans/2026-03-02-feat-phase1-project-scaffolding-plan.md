---
title: "feat: Phase 1 — Project Scaffolding with WXT + Preact"
type: feat
status: active
date: 2026-03-02
origin: docs/brainstorms/2026-03-02-secure-byoai-product-brainstorm.md
---

# Phase 1: Project Scaffolding with WXT + Preact

## Overview

Set up the Secure BYOAI Chrome extension project from scratch using WXT framework, Preact, and TypeScript. The goal: `npm run dev` builds cleanly, the extension loads in Chrome, and a minimal content script runs on all three AI tool pages (ChatGPT, Claude, Gemini).

This is the foundation everything else builds on. No product features — just the skeleton.

## Problem Statement / Motivation

The repo has comprehensive documentation but zero code. Before any product work begins, we need a working build pipeline, extension manifest, and verified injection into target AI tool pages. The WXT framework was chosen over CRXJS for better maintenance and community support (see brainstorm: `docs/brainstorms/2026-03-02-secure-byoai-product-brainstorm.md`).

**Framework decision change:** The founding docs specify Vite + CRXJS. This plan switches to **WXT** based on research showing CRXJS nearly got archived in 2025 and has a fragile maintenance team, while WXT has 9,300 stars, 216 contributors, and weekly releases.

## Proposed Solution

Initialize a WXT project with Preact integration, configure the extension manifest, create minimal entrypoints for background, content script, and popup, and verify the extension loads and runs on all three AI tool pages.

## Prerequisites (Before Any Code)

### Update CLAUDE.md for WXT

CLAUDE.md currently says "Vite + CRXJS for building." This MUST be updated before the first coding session, or Claude Code will scaffold with CRXJS.

Changes needed in `CLAUDE.md`:
- Line 14: "Vite + CRXJS for building" → "WXT framework (wxt.dev) for building"
- Project structure: adapt to WXT conventions (see Structure section below)
- Commands: update build output path references
- Add WXT-specific notes

### Update Brainstorm Document

Update `docs/brainstorms/2026-03-02-secure-byoai-product-brainstorm.md`:
- Key Decisions: change "Vite + CRXJS build" to "WXT framework"
- Add note about why WXT was chosen over CRXJS

## Project Structure (WXT Conventions)

WXT uses file-based entrypoints. The project structure adapts from the founding docs:

```
sunbreak/
├── wxt.config.ts              # WXT + Preact configuration
├── package.json
├── tsconfig.json              # strict mode, jsxImportSource: preact
├── eslint.config.js           # ESLint 9 flat config
├── vitest.config.ts           # Test configuration
├── src/
│   ├── entrypoints/           # WXT entrypoints (auto-discovered)
│   │   ├── background.ts      # Service worker
│   │   ├── content.ts         # Content script for AI tool pages
│   │   └── popup/             # Extension popup
│   │       ├── index.html
│   │       └── App.tsx
│   ├── content/               # Content script shared code (NOT entrypoints)
│   │   └── sites/             # Per-site adapters (Phase 2)
│   ├── classifier/            # Detection logic (Phase 3)
│   │   ├── patterns/
│   │   ├── keywords.ts
│   │   └── engine.ts
│   ├── ui/                    # Shared UI components
│   │   ├── overlay/           # Warning overlay (Phase 4)
│   │   └── dashboard/         # Dashboard components (Phase 5)
│   ├── storage/               # chrome.storage.local wrapper (Phase 5)
│   └── types/                 # Shared TypeScript types
├── public/
│   └── icons/                 # Extension icons
│       ├── icon-16.png
│       ├── icon-32.png
│       ├── icon-48.png
│       └── icon-128.png
├── tests/
│   ├── unit/                  # Vitest tests
│   ├── e2e/                   # Playwright tests
│   └── setup.ts               # Global test setup (chrome API mocks)
└── docs/                      # Existing documentation
```

**Key differences from founding docs:**
- `src/entrypoints/` replaces `src/background/` and `src/content/main.ts` — WXT auto-discovers these
- `manifest.json` is NOT hand-written — WXT generates it from `wxt.config.ts`
- Build output is `.output/chrome-mv3/` (not `dist/`)
- Icons go in `public/icons/` (copied as-is to output)

## Technical Considerations

### WXT + Preact Configuration

`wxt.config.ts`:
```typescript
import { defineConfig } from 'wxt';
import preact from '@preact/preset-vite';

export default defineConfig({
  srcDir: 'src',
  manifest: {
    name: 'Secure BYOAI',
    version: '0.1.0',
    description: 'Use AI tools at work — safely. Detects sensitive data before you send it.',
    permissions: ['storage'],
    host_permissions: [
      '*://chatgpt.com/*',
      '*://chat.openai.com/*',
      '*://claude.ai/*',
      '*://gemini.google.com/*',
    ],
  },
  vite: () => ({
    plugins: [preact()],
  }),
});
```

**Note:** `chat.openai.com` added alongside `chatgpt.com` — OpenAI may redirect between domains.

### TypeScript Configuration

`tsconfig.json` must include:
```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "preact",
    "strict": true
  }
}
```

WXT generates its own `.wxt/tsconfig.json` that extends the project's. Let WXT handle path aliases.

### Content Script Entrypoint

`src/entrypoints/content.ts`:
```typescript
export default defineContentScript({
  matches: [
    '*://chatgpt.com/*',
    '*://chat.openai.com/*',
    '*://claude.ai/*',
    '*://gemini.google.com/*',
  ],
  runAt: 'document_idle',
  main() {
    console.log('BYOAI loaded');
  },
});
```

**Phase 1 scope:** Just log. No Shadow DOM, no Preact rendering in content scripts. Shadow DOM foundation deferred to Phase 4 when the overlay UI is built — WXT's `createShadowRootUi()` handles this natively.

### Background Service Worker

`src/entrypoints/background.ts`:
```typescript
export default defineBackground(() => {
  chrome.runtime.onInstalled.addListener(() => {
    console.log('Secure BYOAI installed');
  });
});
```

### Popup

`src/entrypoints/popup/index.html` — minimal HTML that loads `App.tsx`.
`src/entrypoints/popup/App.tsx` — simple Preact component showing "Secure BYOAI" and version.

This validates that Preact rendering works within the extension context.

### Icons

Create simple placeholder PNG icons at 16, 32, 48, 128px in `public/icons/`. Can be solid color squares with "SB" text — just need to be valid PNGs so Chrome doesn't error.

### Vitest + Chrome API Mocks

Vitest runs in Node, not the browser. Any file importing `chrome.*` will crash tests without mocks.

`tests/setup.ts`:
```typescript
// Minimal chrome API mock for test environment
globalThis.chrome = {
  runtime: { onInstalled: { addListener: () => {} } },
  storage: { local: { get: () => {}, set: () => {} } },
} as unknown as typeof chrome;
```

`vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    setupFiles: ['./tests/setup.ts'],
  },
});
```

Phase 1 includes one placeholder test that verifies the test runner works.

### ESLint 9 Flat Config

`eslint.config.js` with:
- `@typescript-eslint/eslint-plugin`
- TypeScript parser
- No `any` rule enforced
- Preact JSX support

### Package Manager

Use `npm` to match CLAUDE.md commands (`npm run dev`, `npm run build`, etc.).

### Dependencies

**Production:**
- `preact` (10.28.x)

**Development:**
- `wxt` (0.20.x)
- `@preact/preset-vite` (2.10.x)
- `typescript` (5.x)
- `vitest` (latest)
- `eslint` (9.x)
- `@typescript-eslint/eslint-plugin`
- `@typescript-eslint/parser`

## Acceptance Criteria

### Functional Requirements

- [x] `npm run dev` builds without errors — `wxt.config.ts`
- [x] `npm run build` produces production output in `.output/chrome-mv3/` — `wxt.config.ts`
- [ ] Extension loads in Chrome via `chrome://extensions` (Load unpacked → `.output/chrome-mv3/`) with zero errors
- [ ] Console shows "BYOAI loaded" on `chatgpt.com` — `src/entrypoints/content.ts`
- [ ] Console shows "BYOAI loaded" on `chat.openai.com` — `src/entrypoints/content.ts`
- [ ] Console shows "BYOAI loaded" on `claude.ai` — `src/entrypoints/content.ts`
- [ ] Console shows "BYOAI loaded" on `gemini.google.com` — `src/entrypoints/content.ts`
- [ ] Console shows "Secure BYOAI installed" on extension install — `src/entrypoints/background.ts`
- [ ] Clicking extension icon shows popup with "Secure BYOAI" text — `src/entrypoints/popup/`
- [x] `npm run test` passes (placeholder test) — `tests/`, `vitest.config.ts`
- [x] `npm run lint` passes with no errors — `eslint.config.js`

### Non-Functional Requirements

- [ ] Extension does not break normal operation of any AI tool page (type, submit, navigate)
- [ ] Extension makes zero network requests in production build (verify in DevTools Network tab)
- [ ] WXT dev mode auto-reloads extension on file save
- [x] TypeScript strict mode enabled, no `any` types — `tsconfig.json`
- [ ] All three AI tool pages work normally with extension loaded for 5+ minutes of use

### Quality Gates

- [ ] All acceptance criteria manually verified on Chrome 120+
- [ ] Code committed on feature branch `feat/scaffold`
- [x] CLAUDE.md updated to reflect WXT (prerequisite, done before coding)

## Success Metrics

- Extension loads cleanly on all target pages
- Build time < 5 seconds (dev mode)
- Zero console errors from the extension on any AI tool page

## Dependencies & Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| WXT + Preact integration issues | High — blocks all UI work | Verify Preact renders in popup during Phase 1. If broken, fall back to vanilla TS for Phase 1 and investigate. |
| AI tool CSP blocks content script | Medium — extension silently fails | Manually verify on all 3 sites. Content scripts run in isolated world and should be CSP-exempt, but verify. |
| WXT 0.x breaking changes | Low — version pinned | Pin `wxt@0.20.x` in package.json. Don't use `latest`. |
| Chrome API mocks incomplete | Low — only affects testing | Start with minimal mock. Expand as needed in later phases. |

## Implementation Checklist

This is the ordered task list for execution:

### Step 0: Update Project Documents
- [x] Update `CLAUDE.md` — replace CRXJS references with WXT, update project structure, update build output path
- [x] Update brainstorm doc — note WXT decision

### Step 1: Initialize WXT Project
- [x] Run WXT init or manually create `wxt.config.ts`, `package.json`
- [x] Install dependencies: `wxt`, `preact`, `@preact/preset-vite`, `typescript`
- [x] Install dev dependencies: `vitest`, `eslint`, `@typescript-eslint/eslint-plugin`, `@typescript-eslint/parser`
- [x] Configure `tsconfig.json` with strict mode and Preact JSX

### Step 2: Create Extension Entrypoints
- [x] Create `src/entrypoints/background.ts` — logs on install
- [x] Create `src/entrypoints/content.ts` — logs "BYOAI loaded" on AI tool pages
- [x] Create `src/entrypoints/popup/index.html` + `App.tsx` — minimal Preact popup

### Step 3: Create Supporting Files
- [x] Create placeholder icons in `public/icons/` (16, 32, 48, 128px)
- [x] Create `eslint.config.js` — ESLint 9 flat config with TypeScript
- [x] Create `vitest.config.ts` with chrome API mock setup
- [x] Create `tests/setup.ts` with minimal chrome mock
- [x] Create `tests/unit/placeholder.test.ts` — verifies test runner works

### Step 4: Configure npm Scripts
- [x] `dev` — `wxt` (dev mode with auto-reload)
- [x] `build` — `wxt build` (production build)
- [x] `test` — `vitest run`
- [x] `test:watch` — `vitest watch`
- [x] `lint` — `eslint src/`

### Step 5: Verify Everything Works
- [x] `npm run dev` builds without errors
- [x] `npm run build` produces `.output/chrome-mv3/`
- [ ] Load extension in Chrome — no errors on `chrome://extensions`
- [ ] Visit chatgpt.com → console shows "BYOAI loaded"
- [ ] Visit chat.openai.com → console shows "BYOAI loaded"
- [ ] Visit claude.ai → console shows "BYOAI loaded"
- [ ] Visit gemini.google.com → console shows "BYOAI loaded"
- [ ] Click extension icon → popup renders with Preact
- [ ] Use each AI tool normally for 2 minutes → no breakage
- [x] `npm run test` passes
- [x] `npm run lint` passes
- [ ] Check DevTools Network tab on production build → zero extension requests

### Step 6: Commit
- [ ] Commit on branch `feat/scaffold`
- [ ] Update `docs/PLAN.md` — check off Phase 1 items

## Sources & References

### Origin

- **Brainstorm document:** [docs/brainstorms/2026-03-02-secure-byoai-product-brainstorm.md](docs/brainstorms/2026-03-02-secure-byoai-product-brainstorm.md) — Key decisions: regex-only v1, local-only classification, Preact not React, warning not blocking, zero UI when clean.

### Internal References

- Founding product spec: `docs/founding/founding-SPEC.md` (Section 5: Extension Infrastructure)
- Founding implementation guide: `docs/founding/founding-03-implementation-guide.md` (Session 1: Scaffolding)
- Founding implementation plan: `docs/founding/founding-PLAN.md` (Phase 1 checklist)

### External References

- WXT documentation: https://wxt.dev/
- WXT entrypoints guide: https://wxt.dev/guide/essentials/entrypoints
- WXT project structure: https://wxt.dev/guide/essentials/project-structure
- WXT content script UI (Shadow DOM): https://wxt.dev/guide/essentials/content-scripts
- @preact/preset-vite: https://github.com/preactjs/preset-vite
- Preact getting started: https://preactjs.com/guide/v10/getting-started/
