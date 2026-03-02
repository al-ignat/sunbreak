---
title: "feat: Build classification engine with PII pattern detectors"
type: feat
status: completed
date: 2026-03-02
origin: docs/brainstorms/2026-03-02-secure-byoai-product-brainstorm.md
---

# feat: Build Classification Engine with PII Pattern Detectors

## Overview

Build the entire PII/sensitive data detection pipeline as pure TypeScript functions. Phase 3 produces a self-contained classification library: 7 regex-based pattern detectors, a custom keyword matcher, and an orchestrator engine that runs them all, deduplicates findings, assigns redaction placeholders, and returns a typed result.

No UI. No wiring to content scripts. No network calls. Pure functions with comprehensive tests. Phase 4 (Overlay UI) consumes this output.

(see brainstorm: `docs/brainstorms/2026-03-02-secure-byoai-product-brainstorm.md` — "v1 is regex-only classification: No ML/SLM. Ship fast, prove the concept.")

## Problem Statement / Motivation

Phase 2 captures prompt text and file uploads but does nothing with them — it logs to console. The extension needs a classification layer that analyses prompt text locally and identifies sensitive data before it reaches AI providers. This is the core value proposition: warn users about PII leaks without any data leaving the browser.

## Proposed Solution

A synchronous, pure-function classification engine with this architecture:

```
src/classifier/
  types.ts           — FindingType, Confidence, Finding, ClassificationResult, Detector
  patterns/
    email.ts         — Email address detection (HIGH)
    phone.ts         — Phone number detection (MEDIUM)
    credit-card.ts   — Credit card + Luhn validation (HIGH)
    national-id.ts   — US SSN, Danish CPR, UK NI (HIGH)
    ip-address.ts    — IPv4 + IPv6 (MEDIUM)
    api-key.ts       — Provider-specific + generic patterns (HIGH/MEDIUM)
  keywords.ts        — Custom keyword matching (MEDIUM)
  engine.ts          — Orchestrator: run all, deduplicate, sort, assign placeholders
```

Each detector: `(text: string) => Finding[]` — pure, no side effects, no imports from `chrome.*`.

The keyword matcher: `(text: string, keywords: string[]) => Finding[]` — keywords pre-fetched by the caller and passed as an argument. This keeps the engine synchronous and pure (see Design Decisions below).

The orchestrator: `classify(text: string, options: ClassifyOptions) => ClassificationResult`.

Full spec: `docs/founding/founding-SPEC.md` Section 2 (lines 96-228).

## Design Decisions

These decisions were made during planning based on SpecFlow gap analysis:

### D1: Overlap deduplication — winner takes all

When two detectors match overlapping character spans (e.g., `admin@192.168.1.1` as both email and IP), the higher-confidence finding wins. Ties broken by: longer span first, then fixed detector priority order. **Output guarantees zero overlapping findings.** This simplifies Phase 4 redaction — replacing spans from right to left with no index-shifting conflicts.

Detector priority (tiebreaker only): `api-key > credit-card > ssn > cpr > ni-number > email > phone > ip-address > keyword`.

### D2: Keyword matcher receives pre-fetched keywords

The content script reads keywords from `chrome.storage.local` and passes `string[]` to `classify()`. The engine never touches `chrome.*` APIs. This preserves the spec's "everything runs synchronously and locally" contract and keeps all classifier functions pure.

### D3: Dashless SSN requires context clues

- Dashed format `XXX-XX-XXXX`: HIGH confidence (with range validation).
- Dashless 9-digit `XXXXXXXXX`: MEDIUM confidence, **only** when preceded by context keywords (`SSN`, `social security`, `tax id`, `social`). Without context, dashless 9-digit sequences are not matched — too many false positives (order IDs, phone numbers, zip combos).

### D4: Same value → same placeholder number

If `john@example.com` appears 3 times, all three findings get `[EMAIL_1]`. Different email values get incrementing numbers. This preserves entity identity after redaction.

### D5: Email detector excludes common non-personal patterns

Exclude: addresses preceded by `://` (URL authority context), and well-known prefixes like `git@`, `noreply@`, `no-reply@`. Developer prompts paste git URLs constantly — flagging `git@github.com` would breach the 2% false-positive budget.

### D6: Generic API key minimum length

Generic pattern matches (after keywords like `api_key`, `token`, `secret`) require the value to be at least 16 characters. Shorter values like `api_key=test` are not flagged. Provider-specific patterns have their own built-in length requirements.

### D7: Finding.label includes provider context

API key findings use provider-specific labels: "AWS Access Key", "GitHub Token", "Stripe Secret Key", "OpenAI API Key". Generic matches use "Possible API Key". Other detectors use descriptive labels: "Email Address", "Phone Number", "Credit Card Number", "US Social Security Number", "Danish CPR Number", "UK National Insurance Number", "IP Address", "Custom Keyword".

### D8: Engine returns all confidence levels

The engine returns findings at all confidence levels (HIGH, MEDIUM, LOW). Filtering for the overlay (only HIGH + MEDIUM) happens in the content script / Phase 4 integration. This allows the dashboard to log LOW-confidence findings for stats.

## Technical Considerations

### Architecture impacts

- New `src/classifier/types.ts` exports shared types consumed by the engine, all detectors, and eventually by Phase 4 (overlay) and Phase 5 (dashboard).
- The `classify()` function signature becomes the public API between the content script and the classification layer. Must be stable.
- No changes to existing Phase 2 code. Phase 3 is additive — new files only.

### Performance

- 7 detectors + 1 keyword matcher run sequentially on prompt text.
- Budget: < 50ms for prompts up to 10,000 characters (spec Section 2.6).
- Regex patterns must avoid catastrophic backtracking. Use possessive quantifiers where possible, keep patterns simple.
- Early-return for empty/whitespace-only input.
- Input cap: 50,000 characters. Beyond that, truncate and include a warning in the result. (Spec baseline is 10K; 50K provides headroom for pasted documents.)

### Security

- Zero network requests. No `fetch()`, no `XMLHttpRequest`, no external imports.
- No `eval()` or `new Function()` — keyword patterns built with `new RegExp()` from escaped user input.
- Regex metacharacters in user keywords must be escaped before RegExp construction. Utility: `escapeRegExp(str: string): string`.

### Testing strategy

- Every detector: minimum 5 true positives + 5 true negatives (spec requirement).
- Edge cases per detector (URLs containing emails, version numbers resembling IPs, test credit card numbers, code snippets with `@` decorators, etc.).
- Shared test fixture file: `tests/fixtures/classification-inputs.ts` with realistic prompt samples.
- Engine tests: verify deduplication, placeholder numbering, empty input, performance benchmark on 10K character input.
- Post-condition assertion in tests: no two findings in the output overlap.

## Implementation Phases

### Session 5: Foundation + Email + Phone

**Branch:** `feat/classifier-email-phone`

**Files to create:**

1. `src/classifier/types.ts` — All shared types:
   - `FindingType` union: `'email' | 'phone' | 'credit-card' | 'ssn' | 'cpr' | 'ni-number' | 'ip-address' | 'api-key' | 'keyword'`
   - `Confidence`: `'HIGH' | 'MEDIUM' | 'LOW'`
   - `Finding` interface (type, value, startIndex, endIndex, confidence, label, placeholder)
   - `ClassificationResult` interface (findings, durationMs, hasHighConfidence)
   - `Detector` type alias: `(text: string) => Finding[]`
   - `ClassifyOptions`: `{ keywords: string[]; enabledDetectors?: Set<FindingType> }`

2. `src/classifier/patterns/email.ts` — Email detector
   - Practical regex (not RFC 5322): `[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}` as base, refined with exclusions.
   - Exclude: preceded by `://`, prefixes `git@`, `noreply@`, `no-reply@`.
   - Confidence: HIGH.
   - Label: "Email Address".
   - Spec: `docs/founding/founding-SPEC.md` lines 152-157.

3. `src/classifier/patterns/phone.ts` — Phone detector
   - International formats: `+1-555-123-4567`, `(555) 123-4567`, `555.123.4567`, `+45 12 34 56 78`, `+44 7911 123456`.
   - Require 7+ digits. Use word boundaries.
   - Confidence: MEDIUM.
   - Label: "Phone Number".
   - Spec: lines 159-164.

4. `tests/unit/classifier/patterns/email.test.ts`
5. `tests/unit/classifier/patterns/phone.test.ts`

**Acceptance criteria:**
- [x] `FindingType`, `Confidence`, `Finding`, `ClassificationResult`, `Detector`, `ClassifyOptions` types exported from `src/classifier/types.ts`
- [x] Email detector: 5+ true positives (standard emails, plus signs, subdomains, long TLDs, hyphens)
- [x] Email detector: 5+ true negatives (`user@`, `@domain.com`, `@Component`, `git@github.com`, URL authorities)
- [x] Phone detector: 5+ true positives (US, Danish, UK formats, with parens, dots, dashes)
- [x] Phone detector: 5+ true negatives (short numbers < 7 digits, dates, version numbers, order IDs)
- [x] Both detectors return correctly typed `Finding[]` with accurate `startIndex`/`endIndex`
- [x] `npm run test` passes
- [x] `npm run lint` passes

### Session 6: Credit Card + National IDs

**Branch:** `feat/classifier-cc-national-id`

**Files to create:**

1. `src/classifier/patterns/credit-card.ts` — Credit card detector
   - Match 13-19 digit sequences with optional spaces/dashes.
   - **Luhn validation mandatory.** Only report if Luhn passes.
   - Confidence: HIGH.
   - Label: "Credit Card Number".
   - Spec: lines 166-172.

2. `src/classifier/patterns/national-id.ts` — SSN + CPR + NI detector
   - **US SSN:** Dashed `XXX-XX-XXXX` → HIGH (validate: first 001-899, middle 01-99, last 0001-9999). Dashless 9-digit → MEDIUM only with preceding context keywords (`SSN`, `social security`, `tax id`).
   - **Danish CPR:** `DDMMYY-XXXX` → HIGH. Validate first 6 digits as plausible date (month 01-12, day 01-31 for that month). Two-digit year: accept any as potentially valid.
   - **UK NI:** `XX 99 99 99 X` → HIGH. Suffix restricted to A-D. Exclude invalid prefixes (BG, GB, NK, KN, TN, NT, ZZ) and first letters D, F, I, Q, U, V.
   - Spec: lines 174-178.

3. `tests/unit/classifier/patterns/credit-card.test.ts`
4. `tests/unit/classifier/patterns/national-id.test.ts`

**Acceptance criteria:**
- [x] Credit card: 5+ true positives (Visa, Mastercard, Amex lengths; spaced, dashed, no-separator)
- [x] Credit card: 5+ true negatives (random 16-digit numbers failing Luhn, UUIDs, timestamps)
- [x] Luhn validation correct for known test card numbers (4111111111111111, 5500000000000004, etc.)
- [x] SSN dashed: matches `123-45-6789` at HIGH, rejects `000-12-3456` (invalid area), `123-00-4567` (invalid group)
- [x] SSN dashless: only matches with context clues at MEDIUM; bare `123456789` does NOT match
- [x] CPR: matches `010190-1234` at HIGH, rejects `320190-1234` (day 32), `011390-1234` (month 13)
- [x] NI: matches `AB 12 34 56 C` at HIGH, rejects `BG 12 34 56 A` (invalid prefix), `AB 12 34 56 E` (invalid suffix)
- [x] `npm run test` passes
- [x] `npm run lint` passes

### Session 7: API Keys + IP + Keywords + Engine

**Branch:** `feat/classifier-engine`

**Files to create:**

1. `src/classifier/patterns/ip-address.ts` — IP detector
   - IPv4: dotted decimal, validate 0-255 octets, word boundaries. Skip `127.0.0.1`, `0.0.0.0`.
   - IPv6: full and compressed common forms. Skip `::1`.
   - Confidence: MEDIUM.
   - Label: "IP Address".
   - Spec: lines 180-185.

2. `src/classifier/patterns/api-key.ts` — API key detector
   - AWS: `AKIA[0-9A-Z]{16}` → HIGH, label "AWS Access Key".
   - GitHub: `gh[ps]_[A-Za-z0-9_]{36,}` → HIGH, label "GitHub Token".
   - Stripe: `sk_live_[A-Za-z0-9]{24,}` / `pk_live_...` → HIGH, label "Stripe Secret Key" / "Stripe Publishable Key".
   - OpenAI: `sk-[A-Za-z0-9]{32,}` → HIGH, label "OpenAI API Key".
   - Azure: `DefaultEndpointsProtocol=...AccountKey=...` → HIGH, label "Azure Connection String". Match the `AccountKey=<base64>` portion as the value.
   - Generic: keyword (`api_key`, `token`, `secret`, `password`, `apikey`, `access_token`) followed by `=` or `:` then a value of 16+ characters → MEDIUM, label "Possible API Key".
   - Spec: lines 187-198.

3. `src/classifier/keywords.ts` — Keyword matcher
   - Signature: `(text: string, keywords: string[]) => Finding[]`
   - Case-insensitive with `\b` word boundaries.
   - Escape regex metacharacters in user keywords before building `RegExp`.
   - Multi-word phrases supported.
   - Confidence: MEDIUM.
   - Label: `"Custom Keyword: <keyword>"`.
   - Include `escapeRegExp()` utility.
   - Spec: lines 200-207.

4. `src/classifier/engine.ts` — Orchestrator
   - Signature: `classify(text: string, options: ClassifyOptions): ClassificationResult`
   - Steps: run enabled detectors → run keyword matcher → collect all findings → deduplicate overlapping spans (winner-takes-all per D1) → sort by startIndex → assign placeholders (same value = same number per D4) → measure durationMs → return result.
   - Early-return for empty/whitespace-only input.
   - Input cap: 50,000 characters.
   - Spec: lines 209-221.

5. `src/classifier/patterns/index.ts` — Re-export all detectors for clean imports.

6. `tests/unit/classifier/patterns/ip-address.test.ts`
7. `tests/unit/classifier/patterns/api-key.test.ts`
8. `tests/unit/classifier/keywords.test.ts`
9. `tests/unit/classifier/engine.test.ts`
10. `tests/fixtures/classification-inputs.ts` — Shared realistic prompt samples.

**Acceptance criteria:**
- [x] IP: 5+ true positives (standard IPv4, private ranges, IPv6 full/compressed)
- [x] IP: 5+ true negatives (localhost/loopback, version numbers like `v2.0.0.1`, out-of-range octets)
- [x] API keys: 5+ true positives (one per provider + generic)
- [x] API keys: 5+ true negatives (`api_key=test`, short values, non-key strings starting with `sk-`)
- [x] Keywords: matches case-insensitively with word boundaries; does NOT match substrings ("project" ≠ "projector")
- [x] Keywords: handles regex metacharacters in user input (`C++`, `price ($100)`)
- [x] Engine: deduplicates overlapping spans correctly (higher confidence wins)
- [x] Engine: placeholder numbering correct — same value = same number, different values = incrementing
- [x] Engine: returns `findings: []` and `hasHighConfidence: false` for empty input
- [x] Engine: classification < 50ms on 10,000-character input (benchmark test)
- [x] Engine: respects `enabledDetectors` — skips disabled detectors
- [x] Zero overlapping findings in output (post-condition assertion)
- [x] `npm run test` passes
- [x] `npm run lint` passes

## Acceptance Criteria (Phase-Level)

- [x] All 7 pattern detectors implemented and exported
- [x] Keyword matcher implemented with pre-fetched keyword argument
- [x] Engine orchestrator wires all detectors with deduplication and placeholder assignment
- [x] Every detector has 5+ true positives and 5+ true negatives
- [x] Classification latency < 50ms on 10K character input
- [x] No `any` types — strict TypeScript throughout
- [x] All functions are pure: no side effects, no `chrome.*` calls, no network requests
- [x] No overlapping findings in engine output (invariant)
- [x] `npm run test` — all tests pass
- [x] `npm run lint` — no errors

## Success Metrics

- **False positive rate:** Measure against test fixture with realistic prompts. Target < 2%.
- **Detection accuracy:** 100% of known PII patterns in the test fixture are caught.
- **Performance:** `classify()` on 10K chars completes in < 50ms consistently.
- **Code quality:** Zero `any`, all return types annotated, pure functions only.

## Dependencies & Risks

| Risk | Mitigation |
|------|------------|
| Regex catastrophic backtracking on adversarial input | Keep patterns simple. Avoid nested quantifiers. Benchmark with 50K char input. |
| High false positive rate on developer prompts (code snippets) | Build a "developer prompts" test fixture. Tune exclusions. Email URL-context exclusion (D5). |
| Phone number detector too aggressive | Require formatting (at least some separators or `+` prefix for 7-digit sequences). MEDIUM confidence only. |
| Credit card test numbers always flag (4111...) | This is by design — can't distinguish test from real. Document as known behavior. |
| IPv4 matching version numbers | Word boundary helps but isn't perfect. MEDIUM confidence acknowledges ambiguity. |
| `\b` word boundary doesn't work well with Unicode | v1 is English-focused (spec scope). Document as known limitation for keyword matcher. |

## Sources & References

- **Origin brainstorm:** [docs/brainstorms/2026-03-02-secure-byoai-product-brainstorm.md](docs/brainstorms/2026-03-02-secure-byoai-product-brainstorm.md) — Key decisions: regex-only v1, pure function classifiers, conservative detection philosophy.
- **Full spec:** [docs/founding/founding-SPEC.md](docs/founding/founding-SPEC.md) Section 2 (lines 96-228) — Complete type definitions, pattern requirements, and quality bars.
- **Implementation guide:** [docs/founding/founding-03-implementation-guide.md](docs/founding/founding-03-implementation-guide.md) Sessions 5-7 (lines 488-504) — Session breakdown and prompts.
- **Phase plan:** [docs/founding/founding-PLAN.md](docs/founding/founding-PLAN.md) lines 20-29 — Phase 3 checklist.
- **Existing types:** `src/types/result.ts` — `Result<T, E>` pattern used throughout project.
- **Phase 2 solution:** [docs/solutions/integration-issues/2026-03-02-dom-observation-patterns-and-pitfalls.md](docs/solutions/integration-issues/2026-03-02-dom-observation-patterns-and-pitfalls.md) — Learnings from DOM work.
