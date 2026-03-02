# Secure BYOAI — Product Specification v1

## Overview

Secure BYOAI is a Chrome browser extension that detects sensitive data in user prompts before they are sent to AI tools. It warns the user and offers one-click redaction. All classification happens locally in the browser. No data is ever sent to any external server.

**v1 philosophy:** Ship fast, ship narrow. Regex-only classification. Personal use only. No cloud backend. No enterprise admin console. Those come in v2+.

**Design philosophy:** Helpful, not hostile. Think Grammarly, not CrowdStrike. The extension is invisible when everything is clean. It only surfaces when it has something useful to say. The user can always override — they are an adult.

---

## Section 1: Content Observer

The Content Observer captures user prompts before they are submitted to AI tools. It consists of a shared observer module and per-site adapters.

### 1.1 Supported AI Tools (v1)

| Tool | URL Pattern | Input Type | Notes |
|------|------------|------------|-------|
| ChatGPT | `*://chatgpt.com/*` | contenteditable div (`#prompt-textarea` or similar) | OpenAI changes DOM frequently. Use resilient selectors with fallbacks. |
| Claude | `*://claude.ai/*` | ProseMirror editor (`.ProseMirror` contenteditable) | Anthropic's editor has specific structure. Text lives in `<p>` elements inside the ProseMirror container. |
| Gemini | `*://gemini.google.com/*` | Rich text input (contenteditable div, `rich-textarea` or similar) | Google uses web components. May need to pierce shadow DOM to find the actual input. |

**Important:** AI tools change their DOM frequently. The exact selectors above are starting points. Document actual working selectors in `docs/DOM-RESEARCH.md` after Session 2 research. Build the adapter pattern so that when selectors break, only the site-specific adapter file needs updating.

### 1.2 Observer Module (`src/content/observer.ts`)

Responsibilities:

- Use `MutationObserver` to watch for the presence of the chat input element on the page. AI tools are SPAs — the input may not exist on initial page load.
- Once the input element is found, attach listeners for text changes and submission events.
- Delegate to the appropriate site adapter based on the current URL.
- Emit a `byoai:prompt-ready` custom event when submission is detected, containing the full prompt text.

Key constraints:

- Must not modify the host page's DOM (except inside our own Shadow DOM container for UI).
- Must not interfere with the AI tool's own event listeners or keyboard shortcuts.
- Must handle page navigation within SPAs (ChatGPT and Claude use client-side routing).
- Must clean up observers and listeners when the page changes or extension is disabled.

### 1.3 Site Adapters (`src/content/sites/`)

Each adapter exports a consistent interface:

```typescript
interface SiteAdapter {
  /** Human-readable name */
  name: string;
  /** Check if this adapter should handle the current page */
  matches(url: string): boolean;
  /** Find the chat input element. Returns null if not found yet. */
  findInput(): HTMLElement | null;
  /** Extract the full text content from the input element */
  getText(input: HTMLElement): string;
  /** Set text content in the input element (for redaction) */
  setText(input: HTMLElement, text: string): void;
  /** Detect submission: returns a cleanup function */
  onSubmit(input: HTMLElement, callback: (text: string) => void): () => void;
}
```

Each adapter must handle:

- Finding the input element with fallback selectors (try selector A, then B, then C).
- Extracting text from the specific input type (plain textarea, contenteditable, ProseMirror).
- Detecting submission via both Enter key (without Shift) and send button click.
- Setting text back into the input for redaction (replacing sensitive items with placeholders).

### 1.4 Submission Interception

When a submission is detected:

1. Prevent the default submission (temporarily hold it).
2. Extract the full prompt text.
3. Pass the text to the Classification Engine (Section 2).
4. If no findings: release the submission immediately. Zero delay. Zero UI.
5. If findings exist: show the Overlay UI (Section 3) and wait for user action.
6. Based on user action: release original, release redacted version, or cancel.

**Critical performance requirement:** Steps 1-4 must complete in under 50ms total. The user must not perceive any delay when their prompt is clean.

### 1.5 File Upload Detection

v1 does not analyse file contents. But it does detect file upload attempts:

- Monitor `<input type="file">` elements and drag-and-drop events on AI tool pages.
- When a file upload is detected, show a generic warning: "You're about to upload a file. Make sure it doesn't contain sensitive data."
- Log the event (file name and AI tool, not file contents) to the dashboard stats.
- User can dismiss and proceed.

---

## Section 2: Classification Engine

The Classification Engine analyses prompt text and returns a list of findings. It is a collection of pure functions with no side effects. Everything runs synchronously and locally.

### 2.1 Architecture

```
src/classifier/
  engine.ts          — Orchestrator. Calls all detectors, deduplicates, scores.
  types.ts           — Shared types (Finding, DetectorResult, Confidence).
  patterns/
    email.ts         — Email address detection
    phone.ts         — Phone number detection
    credit-card.ts   — Credit card number detection (with Luhn)
    national-id.ts   — SSN, Danish CPR, UK NI number detection
    ip-address.ts    — IPv4 and IPv6 detection
    api-key.ts       — API key and token detection
  keywords.ts        — Custom keyword list matching
```

### 2.2 Common Types

```typescript
type Confidence = 'HIGH' | 'MEDIUM' | 'LOW';

interface Finding {
  /** What type of sensitive data was found */
  type: 'email' | 'phone' | 'credit-card' | 'ssn' | 'cpr' | 'ni-number' |
        'ip-address' | 'api-key' | 'keyword';
  /** The matched text */
  value: string;
  /** Start index in the original string */
  startIndex: number;
  /** End index in the original string (exclusive) */
  endIndex: number;
  /** How confident we are this is a real match */
  confidence: Confidence;
  /** Human-readable label for the UI */
  label: string;
  /** Redaction placeholder, e.g. [EMAIL_1], [PHONE_2] */
  placeholder: string;
}

interface ClassificationResult {
  /** All findings, sorted by startIndex */
  findings: Finding[];
  /** Time taken in milliseconds */
  durationMs: number;
  /** Whether any HIGH confidence findings exist */
  hasHighConfidence: boolean;
}
```

### 2.3 Pattern Detectors

Each pattern detector is a function: `(text: string) => Finding[]`

#### Email Addresses (`patterns/email.ts`)

- **Approach:** Regex-based. Use a practical pattern that catches 95%+ of real-world emails, not RFC 5322 compliant (too many false positives).
- **Pattern guidance:** `[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}` as a starting point. Refine based on testing.
- **Confidence:** HIGH — emails are unambiguous.
- **Test cases must include:** emails with dots, plus signs, subdomains, long TLDs (.museum), and hyphens. Must NOT match: `user@`, `@domain.com`, incomplete patterns, `@` in code contexts like decorators.

#### Phone Numbers (`patterns/phone.ts`)

- **Approach:** Regex-based. Detect international formats.
- **Patterns to match:** `+1-555-123-4567`, `(555) 123-4567`, `555.123.4567`, `+45 12 34 56 78` (Danish), `+44 7911 123456` (UK), and common variations.
- **Confidence:** MEDIUM — phone-like numbers appear in many non-sensitive contexts (order numbers, reference codes).
- **Important:** Require at least 7 digits to avoid matching short numbers. Use word boundary detection.

#### Credit Card Numbers (`patterns/credit-card.ts`)

- **Approach:** Regex to find 13-19 digit sequences (with optional spaces/dashes), then Luhn algorithm validation.
- **Luhn validation is mandatory.** Without it, any 16-digit number triggers false positives.
- **Patterns:** Match sequences like `4111 1111 1111 1111`, `4111-1111-1111-1111`, `4111111111111111`.
- **Confidence:** HIGH when Luhn passes. Do not report if Luhn fails.
- **Must NOT match:** UUIDs, timestamps, or other long number sequences that fail Luhn.

#### National ID Numbers (`patterns/national-id.ts`)

- **SSN (US):** Pattern `XXX-XX-XXXX` where X is a digit. Also match without dashes: `XXXXXXXXX` (9 digits). Validate: first group 001-899 (not 000 or 900+), middle group 01-99 (not 00), last group 0001-9999 (not 0000). Confidence: HIGH.
- **CPR (Danish):** Pattern `DDMMYY-XXXX` (6 digits, dash, 4 digits). Validate: first 6 digits form a plausible date. Confidence: HIGH.
- **NI Number (UK):** Pattern `XX 99 99 99 X` where X is a letter, 9 is a digit. Two prefix letters, 6 digits in pairs, one suffix letter. Confidence: HIGH.

#### IP Addresses (`patterns/ip-address.ts`)

- **IPv4:** Standard dotted decimal. Validate each octet is 0-255. Use word boundaries to avoid matching version numbers like `2.0.0.1` when part of a larger string.
- **IPv6:** Full and compressed forms. This is complex — match the common patterns and don't try to be exhaustive.
- **Confidence:** MEDIUM — IP addresses appear in many non-sensitive contexts (documentation, examples, localhost).
- **Exception:** Skip `127.0.0.1`, `0.0.0.0`, `::1`, and `localhost` — these are never sensitive.

#### API Keys and Tokens (`patterns/api-key.ts`)

- **Approach:** Pattern-match known key formats from major providers.
- **Patterns:**
  - AWS: `AKIA[0-9A-Z]{16}`
  - GitHub: `gh[ps]_[A-Za-z0-9_]{36,}` (personal/secret tokens)
  - Stripe: `sk_live_[A-Za-z0-9]{24,}` and `pk_live_...`
  - Azure: various patterns including connection strings with `DefaultEndpointsProtocol`
  - OpenAI: `sk-[A-Za-z0-9]{32,}`
  - Generic: long base64-like strings preceded by keywords like `api_key`, `token`, `secret`, `password`, `apikey`, `access_token`
- **Confidence:** HIGH for provider-specific patterns. MEDIUM for generic patterns.
- **Critical:** This is the highest-value detector for developers. Get this right.

### 2.4 Custom Keyword Matcher (`keywords.ts`)

- Reads a list of user-configured keywords from `chrome.storage.local`.
- Matches keywords case-insensitively with word boundary detection.
- Word boundary means the keyword must be a standalone word or phrase, not a substring. "project" should not match "projector".
- **Confidence:** MEDIUM for all keyword matches.
- Default keyword list is empty. User adds their own via the Settings panel.
- Keywords can be multi-word phrases (e.g., "Project Neptune", "customer_id").

### 2.5 Engine Orchestrator (`engine.ts`)

The orchestrator:

1. Runs all pattern detectors and the keyword matcher against the input text.
2. Collects all findings.
3. Deduplicates: if two detectors find the same text span, keep the one with higher confidence.
4. Sorts findings by `startIndex`.
5. Assigns placeholders: `[EMAIL_1]`, `[EMAIL_2]`, `[PHONE_1]`, etc. Numbered per type.
6. Measures total classification time in milliseconds.
7. Returns a `ClassificationResult`.

**v1 filtering rule:** Only surface HIGH and MEDIUM confidence findings to the user. LOW confidence findings are logged to stats but not shown in the overlay.

### 2.6 Quality Bars

- **False positive rate < 2%.** No more than 1 in 50 prompts flagged incorrectly. Measure against a test set of 500 real-world prompts (gathered from beta users with consent).
- **Classification latency < 50ms.** Measured end-to-end from text input to findings returned. Test on a mid-range laptop.
- **Zero data exfiltration.** No prompt content, findings, or user text ever leaves the browser. Verify with a network audit of all extension traffic.

---

## Section 3: Overlay UI

The Overlay UI appears inside the AI tool's page when the Classification Engine finds something. It must be visually helpful, non-intrusive, and completely isolated from the host page's styles.

### 3.1 Shadow DOM Container

All injected UI lives inside a Shadow DOM attached to a minimal container element appended to the page body.

- Container element: `<div id="byoai-root">` appended to `document.body`.
- Shadow DOM: `byoaiRoot.attachShadow({ mode: 'closed' })` — closed mode prevents the host page from accessing our UI.
- All styles are defined inside the Shadow DOM. No external CSS imports.
- The container has `position: fixed; z-index: 2147483647` (max) to ensure it renders above everything.

### 3.2 Warning Banner Component

The warning banner appears as a bar near the bottom of the viewport, above the AI tool's chat input area.

**Visual design:**

- Background: soft amber/yellow (`#FFF8E1`) with a subtle left border accent in orange (`#FF9800`).
- Text: dark gray (`#333333`), 14px, system font stack.
- Rounded corners (8px), subtle drop shadow.
- Animates in: 200ms slide-up + fade-in. Animates out: 150ms slide-down + fade-out.
- Max width: 600px, centered horizontally.

**Content structure:**

- **Summary line:** Icon + text like "2 email addresses and 1 API key detected" — plain language, no jargon.
- **Detail section** (expandable): Shows each finding with the detected text highlighted. Truncate long values (show first/last 4 characters for things like API keys).
- **Action buttons:** Four buttons in a row:
  1. **"Redact & Send"** (primary, filled amber button) — replaces all findings with placeholders and submits.
  2. **"Edit"** (secondary, outlined button) — closes the overlay and returns focus to the input field so the user can manually edit.
  3. **"Send Anyway"** (tertiary, text-only button) — proceeds with original text. Logs an acknowledgment event to stats.
  4. **"Cancel"** (tertiary, text-only button) — cancels submission entirely. Clears the pending send.

**Keyboard shortcuts:**

- `Escape` — same as Cancel.
- `Enter` — same as Redact & Send (the safe default).

### 3.3 Text Highlighting

When the overlay appears, the detected items in the input field should be visually highlighted:

- Add a subtle background highlight (light amber) behind each detected span in the input.
- This helps the user see exactly what was flagged and where.
- Implementation note: this is tricky in contenteditable/ProseMirror inputs. If highlighting is too complex or risks breaking the input, skip it in v1 and just show the findings in the overlay detail section.

### 3.4 Redaction Logic

When the user clicks "Redact & Send":

1. For each finding, replace `finding.value` with `finding.placeholder` in the prompt text.
2. Set the modified text back into the input field using the site adapter's `setText` method.
3. Trigger the submission.
4. Log the event to stats: timestamp, AI tool, number and types of redactions, "redacted" action.

Placeholder format: `[TYPE_N]` where TYPE is the category and N is the occurrence number. Examples: `[EMAIL_1]`, `[EMAIL_2]`, `[PHONE_1]`, `[API_KEY_1]`.

### 3.5 Zero-Interference Mode

When the Classification Engine returns zero findings (or only LOW confidence findings):

- The extension does absolutely nothing. No banner, no badge change, no icon change, no notification, no console log visible to the user.
- The submission proceeds with zero delay.
- A silent stat is logged: timestamp, AI tool, "clean" status.

This is critical. If the extension creates any friction for clean prompts, users will disable it.

---

## Section 4: Personal Dashboard

The dashboard gives the user visibility into their AI usage and compliance status.

### 4.1 Extension Popup (Quick View)

Clicking the extension icon in Chrome's toolbar opens a small popup (400px wide, up to 500px tall).

**Content:**

- **Header:** "Secure BYOAI" logo/wordmark + settings gear icon.
- **Stats summary:** "This week: 47 AI interactions, 2 flagged, 0 blocked. Compliance rate: 95.7%"
- **Recent activity:** Last 5 flagged events (date, AI tool, what was detected, action taken). Metadata only — never show the actual prompt text.
- **Quick settings:** Toggles for each detection category (email, phone, credit card, etc.). All ON by default.
- **Link:** "View full dashboard" opens the dashboard page.

### 4.2 Full Dashboard Page

A full-page view accessible from the popup or by clicking the extension icon in the toolbar and selecting "Dashboard."

Implemented as an extension page (`chrome-extension://[id]/dashboard.html`).

**Sections:**

1. **Overview stats:** Weekly and monthly charts showing interaction count, flag count, redaction count, compliance rate. Use simple bar or line charts. No heavy charting library — keep the extension lightweight. Consider a minimal SVG-based chart or a tiny library.

2. **Activity log:** Scrollable table of all flagged events. Columns: Date/time, AI tool (ChatGPT/Claude/Gemini), Categories detected, Action taken (Redacted / Sent Anyway / Cancelled / Edited). Filterable by date range and AI tool. Never shows prompt content.

3. **Detection settings:** Full management of detection categories. Each category (email, phone, credit card, SSN, CPR, NI number, IP address, API keys, custom keywords) has an ON/OFF toggle and a sensitivity description.

4. **Custom keywords:** CRUD interface for the user's custom keyword list. Add a keyword, remove a keyword, see the full list. Each keyword shows when it was added. Import/export as a text file (one keyword per line).

5. **AI Tool Report Cards:** Static information page showing:
   - ChatGPT: data retention policy, training data usage, privacy mode availability, enterprise vs personal account differences.
   - Claude: data retention policy, training opt-out, privacy commitments.
   - Gemini: data retention policy, Google's AI data usage terms.
   - This is manually curated content in v1. Updated by the developer, not dynamically fetched.

### 4.3 Storage Layer (`src/storage/`)

All data is stored in `chrome.storage.local`. The storage layer provides a typed wrapper.

**Stored data:**

```typescript
interface StoredData {
  /** Interaction stats: keyed by YYYY-MM-DD */
  dailyStats: Record<string, DailyStats>;
  /** Flagged event log (most recent 1000) */
  flaggedEvents: FlaggedEvent[];
  /** User's custom keyword list */
  keywords: string[];
  /** Detection category toggles */
  detectionSettings: Record<string, boolean>;
  /** Extension-level settings */
  settings: ExtensionSettings;
}

interface DailyStats {
  totalInteractions: number;
  flaggedCount: number;
  redactedCount: number;
  sentAnywayCount: number;
  cancelledCount: number;
  editedCount: number;
  byTool: Record<string, number>;  // e.g. { "chatgpt": 23, "claude": 15 }
}

interface FlaggedEvent {
  id: string;               // UUID
  timestamp: string;        // ISO 8601
  tool: string;             // "chatgpt" | "claude" | "gemini"
  categories: string[];     // ["email", "api-key"]
  findingCount: number;
  action: 'redacted' | 'sent-anyway' | 'cancelled' | 'edited';
  // NEVER store prompt text or finding values
}

interface ExtensionSettings {
  enabled: boolean;
  interventionMode: 'warn' | 'log-only';  // 'warn' shows overlay, 'log-only' just records
}
```

**Storage constraints:**

- Keep flagged events log to 1000 entries max. FIFO: oldest removed when new ones are added.
- Daily stats are kept for 90 days. Older entries automatically pruned.
- No prompt content, finding values, or user text is ever stored. Only metadata.
- All chrome.storage.local calls go through the storage wrapper. No direct `chrome.storage` calls elsewhere.

---

## Section 5: Extension Infrastructure

### 5.1 Manifest V3 Configuration

```json
{
  "manifest_version": 3,
  "name": "Secure BYOAI",
  "version": "0.1.0",
  "description": "Use AI tools at work — safely. Detects sensitive data before you send it.",
  "permissions": [
    "storage",
    "activeTab"
  ],
  "host_permissions": [
    "*://chatgpt.com/*",
    "*://claude.ai/*",
    "*://gemini.google.com/*"
  ],
  "background": {
    "service_worker": "src/background/service-worker.ts"
  },
  "content_scripts": [
    {
      "matches": [
        "*://chatgpt.com/*",
        "*://claude.ai/*",
        "*://gemini.google.com/*"
      ],
      "js": ["src/content/main.ts"],
      "run_at": "document_idle"
    }
  ],
  "action": {
    "default_popup": "src/ui/dashboard/popup.html",
    "default_icon": {
      "16": "icons/icon-16.png",
      "32": "icons/icon-32.png",
      "48": "icons/icon-48.png",
      "128": "icons/icon-128.png"
    }
  },
  "icons": {
    "16": "icons/icon-16.png",
    "48": "icons/icon-48.png",
    "128": "icons/icon-128.png"
  }
}
```

### 5.2 Service Worker (`src/background/service-worker.ts`)

Minimal in v1. Responsibilities:

- Listen for extension install/update events. Set default storage values on install.
- Handle messages between content scripts and the popup/dashboard if needed.
- No persistent state. Service workers are ephemeral in Manifest V3.

### 5.3 Content Script Entry Point (`src/content/main.ts`)

The main content script that runs on AI tool pages:

1. Determine which site adapter to use based on `window.location.hostname`.
2. Initialize the observer with the selected adapter.
3. Initialize the Shadow DOM container for the overlay UI.
4. Listen for `byoai:prompt-ready` events.
5. On prompt ready: run classification engine → show overlay if needed → handle user action.

### 5.4 Extension Icon States

The extension icon should have two states:

- **Default:** Normal icon. Extension is active but has nothing to report.
- **Disabled:** Grayed out icon. Extension is turned off (via settings toggle).

Do NOT use the icon to indicate "findings detected" or "last prompt was clean" — this would be distracting and create anxiety. The icon is not a status indicator.

---

## Section 6: Non-Functional Requirements

### 6.1 Performance

- Classification must complete in < 50ms for prompts up to 10,000 characters.
- Extension must not increase page load time by more than 100ms.
- Extension must not cause visible jank or layout shifts on AI tool pages.
- Memory usage: extension should not increase page memory by more than 10MB.

### 6.2 Privacy

- No prompt content is ever sent to any external server.
- No prompt content is ever stored on disk (not even in chrome.storage).
- Only metadata (counts, categories, timestamps, actions) is stored.
- The extension makes zero network requests in v1 (no analytics, no telemetry, no update checks beyond Chrome's built-in extension update mechanism).
- Verify with: Chrome DevTools Network tab should show zero requests from the extension.

### 6.3 Compatibility

- Chrome 120+ (Manifest V3 baseline).
- Works on macOS, Windows, Linux, ChromeOS.
- Works in Chrome's normal and Incognito modes (if user permits).
- Must not break when AI tools update their UI (graceful degradation: if selectors break, the extension becomes invisible rather than crashing the page).

### 6.4 Accessibility

- Overlay UI is keyboard navigable.
- All buttons have appropriate ARIA labels.
- Color contrast meets WCAG AA standards.
- Screen reader compatible: findings are announced in plain language.

---

## Appendix: What v1 Does NOT Include

These are explicitly deferred to v2+:

- Firefox, Safari, Edge, Arc support
- On-device SLM (small language model) for contextual classification
- Cloud backend or control plane
- Enterprise admin console
- Team or enterprise tier features
- API-level interception (only browser UI)
- Response/output monitoring (only input/prompt monitoring)
- Mobile or desktop app
- Auto-redaction with semantic preservation
- Provider risk scoring engine
- SIEM/SOAR integration
- SSO/SCIM
- Compliance reporting
- Multi-language PII detection (v1 is English-focused with Danish CPR and UK NI as exceptions)
