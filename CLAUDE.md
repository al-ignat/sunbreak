# Secure BYOAI — Chrome Extension

## Project

Chrome extension (Manifest V3) that detects sensitive data in prompts before
they reach AI tools (ChatGPT, Claude, Gemini). Warns the user and offers
one-click redaction. All classification is local. No data leaves the browser.

## Tech Stack

- TypeScript (strict mode)
- Chrome Extension Manifest V3
- WXT framework (wxt.dev) for building
- Preact (NOT React) for UI components
- Vitest for unit tests
- Playwright for E2E tests
- Shadow DOM for all injected UI (via WXT's createShadowRootUi)

## Project Structure

```
src/
  entrypoints/       # WXT entrypoints (auto-discovered)
    background.ts    # Service worker
    content.ts       # Content script for AI tool pages
    popup/           # Extension popup
      index.html
      App.tsx
  content/           # Content script shared code
    sites/           # Per-site adapters (chatgpt.ts, claude.ts, gemini.ts)
    observer.ts      # DOM observation and prompt capture
    interceptor.ts   # Submission interception
  classifier/        # Detection logic (pure functions)
    patterns/        # Regex detectors (email, cc, ssn, etc.)
    keywords.ts      # Custom keyword matching
    engine.ts        # Orchestrator — calls all detectors, deduplicates
  ui/                # Shared Preact components
    overlay/         # Warning overlay (Shadow DOM)
    dashboard/       # Dashboard components
  storage/           # chrome.storage.local wrapper
  types/             # Shared TypeScript types
public/
  icons/             # Extension icons (copied as-is to output)
tests/
  unit/              # Vitest tests
  e2e/               # Playwright tests
  setup.ts           # Chrome API mocks for test environment
docs/
  founding/          # Original project research and planning docs
  brainstorms/       # CE brainstorm documents
  plans/             # CE implementation plans
  solutions/         # CE learnings and solved problems
```

## WXT Notes

- Manifest is generated from `wxt.config.ts` — no hand-written manifest.json
- Build output goes to `.output/chrome-mv3/` (not dist/)
- Entrypoints in `src/entrypoints/` are auto-discovered by WXT
- Content script UI uses WXT's `createShadowRootUi()` for Shadow DOM
- Dev mode auto-reloads extension on file save

## Commands

- `npm run dev` — WXT dev mode with auto-reload
- `npm run build` — Production build to .output/chrome-mv3/
- `npm run test` — Vitest unit tests
- `npm run test:e2e` — Playwright E2E tests
- `npm run lint` — ESLint

## Code Rules

- Named exports only (except Preact components which use default)
- ES modules. Never require()
- All functions must have TypeScript return types
- No `any`. Use `unknown` and narrow.
- Prefer functions over classes
- Errors: typed `Result<T, E>` pattern, not try/catch
- Classifier detectors are pure: `(text: string) => Finding[]`

## Architecture Rules

- NEVER send prompt content to any external server
- Content scripts must not break the host page
- Shadow DOM (closed mode) for all injected UI
- Site adapters are independent. Shared logic in observer.ts
- No direct chrome.storage calls outside src/storage/
- Zero UI when nothing detected. Invisible when clean.

## Testing Rules

- Every classifier pattern: minimum 5 true positives, 5 true negatives
- E2E tests confirm extension loads on each AI tool without breakage
- Run `npm run test` before every commit

## v1 Scope

**In:** Chrome only. ChatGPT + Claude + Gemini. Regex classification.
Personal use. Warning overlay. Personal dashboard. No cloud backend.

**Out:** Other browsers. ML/SLM models. Enterprise admin. Response monitoring.
API interception. SSO/SCIM. Multi-language PII (except Danish CPR, UK NI).

## Quality Bars

- False positive rate < 2%
- Classification < 50ms
- Page load increase < 100ms
- Zero network requests from extension (production build)
- WCAG AA accessible

## Key References

- `docs/roadmap-v2/README.md` — Active roadmap (v2)
- `docs/roadmap-v2/plans/2026-03-12-roadmap-v2-implementation-plan.md` — Execution plan
- `docs/founding/founding-SPEC.md` — Full 6-section product specification
- `docs/founding/founding-PLAN.md` — Original phase checklist (v1, completed)
- `docs/founding/founding-01-product-deep-dive.md` — Market analysis

## Git Workflow

- Branch per feature: `feat/classifier-email`, `feat/overlay-ui`, etc.
- Commit messages: `type(scope): description`
- Never commit directly to main. Always PR from feature branch.
- Run tests before every commit.

## CE Workflow

This project uses Compound Engineering methodology:
- Brainstorm (WHAT) -> Plan (HOW) -> Build -> Review -> Compound (learn)
- Brainstorms go in `docs/brainstorms/`
- Plans go in `docs/plans/`
- Solved problems go in `docs/solutions/`
- One task per session. Commit after each working component.

## Current Status

V1 phases 1–5 complete. Roadmap v2 is active — next up is Epic 1 (Interaction Layer Hardening). See `docs/roadmap-v2/README.md`.
