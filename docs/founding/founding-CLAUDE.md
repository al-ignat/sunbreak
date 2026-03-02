# Secure BYOAI — Chrome Extension

## What This Is
A Chrome extension (Manifest V3) that detects sensitive data in user
prompts before they are sent to AI tools (ChatGPT, Claude, Gemini).
It warns the user and offers one-click redaction. All classification
happens locally in the browser. No data is ever sent to any server.

## Tech Stack
- TypeScript (strict mode)
- Chrome Extension Manifest V3
- Vite + CRXJS for building
- Preact for UI components (NOT React — too heavy for extensions)
- Vitest for unit tests
- Playwright for E2E tests against real AI tool pages

## Project Structure
src/
  background/      # Service worker (Manifest V3 requirement)
  content/          # Content scripts injected into AI tool pages
    sites/          # Per-site adapters (chatgpt.ts, claude.ts, gemini.ts)
    observer.ts     # DOM observation and prompt capture
    interceptor.ts  # Submission interception
  classifier/       # All detection logic
    patterns/       # Regex patterns (email, cc, ssn, etc.)
    keywords.ts     # Custom keyword list matching
    engine.ts       # Orchestrates all classifiers, returns findings
  ui/               # Preact components for overlay and dashboard
    overlay/        # Warning overlay shown in AI tool pages
    dashboard/      # Extension popup and full dashboard
  storage/          # chrome.storage.local wrapper
  types/            # Shared TypeScript types
tests/
  unit/             # Vitest tests for classifiers and logic
  e2e/              # Playwright tests against AI tool pages

## Commands
- `npm run dev`       — Start dev build with HMR
- `npm run build`     — Production build to dist/
- `npm run test`      — Run Vitest unit tests
- `npm run test:e2e`  — Run Playwright E2E tests
- `npm run lint`      — ESLint check

## Code Style
- Use named exports, not default exports (except Preact components)
- Use ES modules (import/export), never require()
- All functions must have TypeScript return types
- No `any` types. Use `unknown` and narrow.
- Prefer functions over classes
- Errors: use typed Result<T, E> pattern, not try/catch

## Architecture Rules
- NEVER send prompt content to any external server. Everything local.
- Content scripts must not break the host page (AI tool).
- Use Shadow DOM for all injected UI to isolate styles.
- Each AI tool site adapter is independent. Shared logic in observer.ts.
- Classifier engine is pure functions. No side effects. Easy to test.
- Storage layer abstracts chrome.storage.local. No direct chrome API
  calls outside storage/ directory.

## Key Decisions
- v1 is regex-only classification. No ML models. Ship fast.
- v1 is personal use only. No cloud backend. No admin console.
- Warning overlay, not block screen. User can always Send Anyway.
- Zero UI when nothing detected. Extension is invisible when clean.

## Testing Requirements
- Every classifier pattern needs: 5 true positives, 5 true negatives.
- E2E tests confirm extension loads on each AI tool without breaking it.
- Run `npm run test` before every commit.

## Current Status
Track progress in docs/PLAN.md. Update after each session.

## Git Workflow
- Branch per feature: feat/classifier-email, feat/overlay-ui, etc.
- Commit after each working component. Messages: type(scope): description
- Never commit directly to main. Always PR from feature branch.
