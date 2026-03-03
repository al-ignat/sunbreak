# Secure BYOAI

Use AI tools at work — safely. Detects sensitive data before you send it.

Secure BYOAI is a Chrome extension that scans prompts in ChatGPT, Claude, and Gemini for personally identifiable information, credentials, and other sensitive data. When something is detected, it warns you and offers one-click redaction — all before the prompt leaves your browser.

Everything runs locally. No data is sent anywhere.

## Supported Sites

- [ChatGPT](https://chatgpt.com) (chatgpt.com, chat.openai.com)
- [Claude](https://claude.ai) (claude.ai)
- [Gemini](https://gemini.google.com) (gemini.google.com)

## What It Detects

| Category | Examples |
|----------|----------|
| Email addresses | Personal and work emails |
| Phone numbers | US, international formats |
| Credit card numbers | Visa, Mastercard, Amex, Discover (Luhn-validated) |
| National IDs | US SSN, Danish CPR, UK National Insurance |
| API keys & secrets | AWS, GitHub, Slack, Stripe, generic high-entropy keys |
| IP addresses | IPv4, IPv6 |
| Custom keywords | User-defined sensitive terms |

## Privacy

- Zero network requests from the extension
- All classification runs locally in the browser
- No telemetry, no analytics, no cloud backend
- Prompt content never leaves your machine

## Install (Development)

```bash
git clone https://github.com/your-username/sunbreak.git
cd sunbreak
npm install
npm run build
```

Then load the unpacked extension in Chrome:

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the `.output/chrome-mv3/` folder

## Development

```bash
npm run dev        # WXT dev mode with auto-reload
npm run build      # Production build to .output/chrome-mv3/
npm run test       # Vitest unit tests
npm run test:e2e   # Build + Playwright E2E tests
npm run lint       # ESLint
```

## Project Structure

```
src/
  entrypoints/       # WXT auto-discovered entrypoints
    background.ts    # Service worker
    content.ts       # Content script for AI tool pages
    popup/           # Extension popup
  content/           # Content script shared code
    sites/           # Per-site adapters (chatgpt, claude, gemini)
    observer.ts      # DOM observation and prompt capture
    interceptor.ts   # Submission interception
  classifier/        # Detection logic (pure functions)
    patterns/        # Regex detectors (email, cc, ssn, etc.)
    keywords.ts      # Custom keyword matching
    engine.ts        # Orchestrator — calls all detectors, deduplicates
  ui/                # Preact components
    overlay/         # Warning overlay (Shadow DOM)
    dashboard/       # Personal dashboard
  storage/           # chrome.storage.local wrapper
  types/             # Shared TypeScript types
tests/
  unit/              # Vitest tests
  e2e/               # Playwright tests
```

## Tech Stack

- **TypeScript** (strict mode)
- **WXT** — Manifest V3 extension framework
- **Preact** — UI components
- **Vitest** — Unit tests
- **Playwright** — E2E tests
- **Shadow DOM** — Injected UI isolation (closed mode)
