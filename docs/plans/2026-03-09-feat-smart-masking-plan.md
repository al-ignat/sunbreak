---
title: "feat: Smart Masking — Descriptive Placeholder Tokens"
type: feat
status: completed
date: 2026-03-09
origin: docs/brainstorms/2026-03-04-v02-ai-safety-companion-brainstorm.md
---

# Smart Masking — Descriptive Placeholder Tokens

## Overview

Replace generic indexed placeholders (`[EMAIL_1]`, `[PHONE_1]`) with human-readable descriptive tokens (`[John S. email]`, `[card ending 4242]`) that preserve context for the AI response while protecting sensitive data. This is the first half of the v0.2 "Smart Reversible Masking" feature (see brainstorm: Feature 1).

**Why this matters:** When the AI receives `[EMAIL_1]`, it has zero context about what was redacted. When it receives `[John S. email]`, it can generate a coherent response like "I'll forward this to John S." instead of "I'll forward this to [EMAIL_1]." This directly improves AI response quality while keeping data safe.

## Problem Statement

Current `assignPlaceholders()` in `src/classifier/engine.ts:97-118` generates tokens using the pattern `[TYPE_N]` where TYPE is the uppercased finding type and N is a per-type counter. This format:
- Gives the AI no semantic context about what was redacted
- Makes AI responses awkward and hard to read
- Doesn't indicate the sensitivity level or provider
- Leaves the user unable to mentally correlate tokens to original values

## Proposed Solution

Create a `generateDescriptiveToken()` function that produces context-rich tokens per finding type:

| Type | Current | Descriptive | Generation Logic |
|------|---------|------------|-----------------|
| Email | `[EMAIL_1]` | `[John S. email]` | Parse email local part for name |
| Phone | `[PHONE_1]` | `[phone ending 78]` | Last 2 digits of the number |
| Credit card | `[CC_1]` | `[card ending 4242]` | Last 4 digits (non-sensitive) |
| SSN | `[SSN_1]` | `[SSN redacted]` | No partial info |
| CPR | `[CPR_1]` | `[CPR redacted]` | No partial info |
| NI Number | `[NI_NUMBER_1]` | `[NI number redacted]` | No partial info |
| API key | `[API_KEY_1]` | `[OpenAI API key]` | Use existing provider-specific `finding.label` |
| IP address | `[IP_1]` | `[internal IP]` | Classify RFC 1918 ranges |
| Keyword | `[KEYWORD_1]` | `[custom keyword]` | Generic fallback (per-keyword labels deferred) |

(see brainstorm: docs/brainstorms/2026-03-04-v02-ai-safety-companion-brainstorm.md, lines 29-37)

### Scoping Decisions

**Multi-person correlation: DEFERRED.** The brainstorm specifies `[Person 1 email]`, `[Person 1 phone]` grouping when multiple findings relate to the same person. Without NER (Phase 3 on the roadmap), there is no reliable way to determine which findings belong to the same person. A fragile proximity heuristic would produce wrong groupings that are worse than no grouping. Each finding gets its own independent descriptive token.

**Per-keyword labels: DEFERRED.** The brainstorm specifies user-configurable labels per keyword. This requires storage schema migration (`string[]` -> `{ value: string, label?: string }[]`) and KeywordManager UI changes. For now, all keywords use `[custom keyword]` as placeholder. Per-keyword labels are a follow-up feature.

**Phone-to-name association: DEFERRED.** The brainstorm specifies associating phones with nearby names. Without NER, the only name source is email local parts — too fragile. Phones use `[phone ending XX]` format only.

## Technical Approach

### Architecture

The change is concentrated in the classifier layer. `buildRedactedText()` in `interceptor.ts` is format-agnostic — it consumes `finding.placeholder` regardless of content. The widget UI (HoverCard, FindingsPanel) already displays `finding.placeholder` in previews. No downstream changes needed.

**Primary change:** Replace `assignPlaceholders()` in `engine.ts` with a new implementation that calls per-type token generators.

**Prerequisite:** Solve the keyword detector re-detection problem. After fix, the scanner re-fires on the masked text. Descriptive tokens like `[John S. email]` could match keyword patterns (e.g., user has keyword "email"). The classifier needs to skip replaced ranges.

### Implementation Phases

#### Phase 1: Token Safety — Masked Range Exclusion

**Problem:** After a "Fix" action replaces `john@acme.com` with `[John S. email]`, the scanner re-classifies the text. If the user has "email" as a custom keyword, the keyword detector matches `email` inside the token. This creates an infinite fix loop.

**Solution:** Add an optional `excludeRanges` parameter to `classify()` that skips text inside specified character ranges. The widget-controller tracks which ranges have been replaced and passes them to the scanner.

**Files to modify:**
- `src/classifier/engine.ts` — add `excludeRanges?: ReadonlyArray<{ start: number; end: number }>` to `ClassifyOptions`
- `src/classifier/engine.ts` — in `classify()`, filter out findings whose `startIndex`-`endIndex` overlaps any excluded range
- `src/content/scanner.ts` — pass excluded ranges from widget-controller state
- `src/ui/widget/widget-controller.ts` — track replaced ranges after each fix

**Tests:**
- `tests/unit/classifier/engine-exclude-ranges.test.ts` — new file
  - Keyword inside excluded range is not detected
  - Finding partially overlapping excluded range is not detected
  - Finding fully outside excluded range is detected normally
  - Multiple excluded ranges work correctly
  - Empty excludeRanges behaves identically to no parameter

**Acceptance criteria:**
- [x] `classify()` accepts `excludeRanges` option
- [x] Findings overlapping excluded ranges are filtered out
- [x] Existing tests pass unchanged (no excludeRanges = no filtering)

---

#### Phase 2: Email Name Extraction

**Problem:** Current email detector always emits `label: "Email Address"` and `placeholder: ""`. Need to extract a human name from the email local part.

**Name extraction algorithm:**

```
Input: local part of email (before @)
1. Strip plus-addressing: "john+tag" -> "john"
2. Split on ".", "_", or "-": ["john", "smith"]
3. Filter out numeric-only parts: ["john", "smith"] (but "john123" -> ["john123"])
4. If exactly 2 alphabetic parts:
   - Capitalize first, abbreviate second: "John S."
   - Return "[John S. email]"
5. If exactly 1 alphabetic part AND it's a known role name
   (admin, support, info, sales, billing, marketing, team, hello,
    contact, help, noreply, no-reply, git, postmaster, webmaster,
    office, hr, careers, press, media, abuse, security):
   - Return "[email N]" (generic with counter)
6. If exactly 1 alphabetic part (not role):
   - Capitalize: "John"
   - Return "[John's email]"
7. If 3+ parts: use first + last initial: "John S."
8. If no alphabetic parts (all digits): "[email N]"
9. Strip trailing digits from parts: "john123" -> "john"
```

**Disambiguation:** If two different email values produce the same descriptive name (e.g., `john.s@a.com` and `john.s@b.com` both -> `[John S. email]`), append a counter to the second: `[John S. email 2]`.

**Files to create:**
- `src/classifier/smart-tokens.ts` — `generateDescriptiveToken(finding, counter, existingTokens)` and `extractNameFromEmail(localPart)`

**Files to modify:**
- `src/classifier/engine.ts` — call `generateDescriptiveToken()` in place of indexed placeholder logic

**Tests:**
- `tests/unit/classifier/smart-tokens.test.ts` — new file
  - `john.smith@` -> `[John S. email]`
  - `jsmith@` -> `[Jsmith's email]` (single part, not a role)
  - `j.smith@` -> `[J. Smith email]` (single char first name = initial + full last)
  - `john_smith_jr@` -> `[John S. email]` (3 parts: first + last initial)
  - `john123@` -> `[John's email]` (strip digits)
  - `support@` -> `[email 1]` (role name)
  - `admin@` -> `[email 1]` (role name)
  - `123@` -> `[email 1]` (all digits)
  - `a.b.c.d@` -> `[A. D email]` (4 parts: first + last initial)
  - `john+newsletter@` -> `[John's email]` (plus-addressing stripped)
  - Same name collision: two values producing `[John S. email]` -> second becomes `[John S. email 2]`

**Acceptance criteria:**
- [x] `extractNameFromEmail()` handles all 10+ local part formats in the test suite
- [x] Role-name emails produce generic tokens, not fake names
- [x] Disambiguation counter prevents duplicate tokens for different values

---

#### Phase 3: Remaining Type Generators

Implement descriptive token generators for all other finding types.

**Phone:** Extract last 2 digits from the matched phone number.
- `+1-555-123-4567` -> `[phone ending 67]`
- `(555) 123-4567` -> `[phone ending 67]`
- Strip all non-digits, take last 2.

**Credit Card:** Extract last 4 digits (already non-sensitive, shown on receipts).
- `4111 1111 1111 1111` -> `[card ending 1111]`
- `4111111111111111` -> `[card ending 1111]`
- Strip all non-digits, take last 4.

**National IDs:**
- SSN: `[SSN redacted]` (no partial info)
- CPR: `[CPR redacted]` (no partial info)
- NI Number: `[NI number redacted]` (no partial info)

**API Keys:** Use the existing provider-specific `finding.label`, lowercased and simplified:
- `label: "OpenAI API Key"` -> `[OpenAI API key]`
- `label: "AWS Access Key"` -> `[AWS access key]`
- `label: "GitHub Token"` -> `[GitHub token]`
- `label: "Possible API Key"` -> `[API key]`
- `label: "Azure Connection String"` -> `[Azure connection string]`

**IP Addresses:** Classify by RFC 1918 private ranges:
- `10.x.x.x` -> `[internal IP]`
- `172.16-31.x.x` -> `[internal IP]`
- `192.168.x.x` -> `[internal IP]`
- `fd00::/8` (IPv6 ULA) -> `[internal IP]`
- Everything else -> `[IP address]`

**Keywords:** `[custom keyword]` for all (per-keyword labels deferred).

**Files to modify:**
- `src/classifier/smart-tokens.ts` — add generator functions per type

**Tests:**
- `tests/unit/classifier/smart-tokens.test.ts` — extend with cases for each type
  - Phone: 5 formats, all extract correct last 2 digits
  - Credit card: 5 formats, all extract correct last 4 digits
  - National IDs: one test each for SSN, CPR, NI
  - API keys: all 7 provider labels map correctly, plus generic fallback
  - IP addresses: 3 private ranges, 1 IPv6 ULA, 2 public IPs, 1 IPv6 public

**Acceptance criteria:**
- [x] All 9 finding types produce descriptive tokens
- [x] No descriptive token leaks the full sensitive value
- [x] All tokens use consistent `[lowercase description]` format inside brackets

---

#### Phase 4: Integration — Replace assignPlaceholders()

Wire the new token generators into the classification pipeline.

**Files to modify:**
- `src/classifier/engine.ts` — replace body of `assignPlaceholders()` to call `generateDescriptiveToken()` per finding, handle disambiguation counters, maintain same-value-same-token guarantee
- `src/classifier/types.ts` — no changes needed (Finding.placeholder field stays the same, just holds different content)

**Same-value guarantee:** Two occurrences of `john@acme.com` must produce the same token `[John S. email]`. The existing keying by `type:value` in `assignPlaceholders()` already ensures this — just need to generate the descriptive token on first occurrence and reuse it for subsequent same-value findings.

**Tests:**
- `tests/unit/classifier/engine.test.ts` — update existing placeholder tests
  - Existing tests that assert `[EMAIL_1]` format will break — update to assert descriptive format
  - Same-value deduplication still works with descriptive tokens
  - Mixed finding types produce correct tokens per type

**Acceptance criteria:**
- [x] `classify()` returns findings with descriptive placeholders
- [x] Same value -> same placeholder (dedup guarantee preserved)
- [x] `buildRedactedText()` works correctly with descriptive tokens (no changes needed — format-agnostic)
- [x] HoverCard preview shows descriptive token in the masked value preview
- [x] All 468 existing tests pass (after updating placeholder assertions)

---

#### Phase 5: Token Re-Detection Safety Tests

Dedicated test suite verifying that no descriptive token triggers any detector.

**Files to create:**
- `tests/unit/classifier/token-safety.test.ts` — new file

**Test strategy:** For every possible descriptive token format, run `classify()` on a string containing only that token. Assert zero findings.

Token formats to test:
- `[John S. email]`, `[email 1]`, `[Jsmith's email]`
- `[phone ending 67]`
- `[card ending 4242]`
- `[SSN redacted]`, `[CPR redacted]`, `[NI number redacted]`
- `[OpenAI API key]`, `[AWS access key]`, `[GitHub token]`, `[API key]`
- `[internal IP]`, `[IP address]`
- `[custom keyword]`

Also test with keywords: set keywords to `["email", "phone", "card", "key", "IP", "SSN"]` and verify that tokens containing these words are NOT detected (relies on Phase 1 exclude-ranges, but also tests the token format itself).

**Acceptance criteria:**
- [x] Zero detectors match any descriptive token format
- [x] With common keywords enabled, tokens are not re-detected
- [x] Test suite explicitly lists every token format (no generated patterns)

## System-Wide Impact

### Interaction Graph

`classify()` -> `assignPlaceholders()` -> `generateDescriptiveToken()` (new) -> `Finding.placeholder` -> `buildRedactedText()` -> `adapter.setText()`. The HoverCard reads `finding.placeholder` for preview. No other components consume the placeholder field directly.

### State Lifecycle Risks

- `FindingsState` diffs by `type + value` (not by placeholder). Changing placeholder format does not affect finding identity or dedup. No state lifecycle risk.
- After fix, scanner re-fires. The descriptive token in the text is different from the original value, so the finding is not re-detected (same behavior as current `[EMAIL_1]`). The Phase 1 exclude-ranges mechanism provides additional safety.

### API Surface Parity

- `Finding.placeholder` field: same type (`string`), different content. All consumers are format-agnostic.
- `classify()` function: same signature, adds optional `excludeRanges` to `ClassifyOptions`.
- `buildRedactedText()`: no changes.
- Widget UI: no changes (already displays `finding.placeholder` verbatim).

### Integration Test Scenarios

1. **Full fix flow on ChatGPT:** Type prompt with email + phone -> scanner detects both -> click Fix All -> text shows descriptive tokens -> scanner re-fires -> zero new findings
2. **Keyword collision:** Add "email" as keyword -> type `john@acme.com` -> fix -> `[John S. email]` appears -> scanner re-fires -> "email" keyword NOT detected inside token
3. **Same-value dedup:** Type same email twice in prompt -> both get identical descriptive token -> Fix All replaces both identically

## Acceptance Criteria

### Functional Requirements

- [x] All 9 finding types produce descriptive tokens per the table above
- [x] Email name extraction handles 10+ local part formats correctly
- [x] Same-value findings get identical descriptive tokens
- [x] Descriptive tokens do not trigger any detector (keyword or otherwise)
- [x] HoverCard preview shows original value -> descriptive token
- [x] Fix and Fix All produce correct redacted text with descriptive tokens

### Non-Functional Requirements

- [x] Classification stays under 50ms (token generation adds <1ms)
- [x] No new dependencies (pure string processing)
- [x] All existing tests updated and passing

### Quality Gates

- [x] Dedicated token safety test suite covers every token format
- [x] Email name extraction test covers 10+ local part formats
- [x] Each finding type has minimum 5 token generation test cases

## Dependencies & Prerequisites

- None. This is a self-contained classifier-layer change.
- No new browser permissions needed.
- No storage schema changes needed.

## Risk Analysis & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Email name extraction produces garbage for unusual local parts | Medium | Medium | Conservative algorithm with generic fallback (`[email N]`) |
| Descriptive token matches a detector regex | Low | High | Dedicated safety test suite (Phase 5), exclude-ranges mechanism (Phase 1) |
| Existing test suite breaks due to placeholder format change | Certain | Low | Update assertions — the behavior is the same, only the format changes |
| Token format collision between different values | Low | Medium | Disambiguation counter (`[John S. email 2]`) |

## Sources & References

### Origin

- **Brainstorm document:** [docs/brainstorms/2026-03-04-v02-ai-safety-companion-brainstorm.md](docs/brainstorms/2026-03-04-v02-ai-safety-companion-brainstorm.md) — Feature 1: Smart Reversible Masking, lines 29-37 (masking rules table)

### Internal References

- `src/classifier/engine.ts:97-118` — current `assignPlaceholders()` (primary change target)
- `src/classifier/patterns/email.ts` — email detector with `EXCLUDED_PREFIXES`
- `src/classifier/patterns/api-key.ts` — provider-specific labels already exist
- `src/classifier/patterns/ip-address.ts` — IP detector (needs range classification)
- `src/content/interceptor.ts:194-211` — `buildRedactedText()` (format-agnostic, no changes)
- `src/ui/widget/HoverCard.tsx:143-147` — placeholder preview display
- `src/ui/widget/widget-controller.ts:135-168` — `handleFix()` and `handleFixAll()`
- `docs/solutions/logic-errors/2026-03-03-pii-classifier-pitfalls.md` — classifier edge cases

### Key File Paths

**Create:**
- `src/classifier/smart-tokens.ts` — token generation functions
- `tests/unit/classifier/smart-tokens.test.ts` — token generation tests
- `tests/unit/classifier/token-safety.test.ts` — re-detection safety tests

**Modify (major):**
- `src/classifier/engine.ts` — replace `assignPlaceholders()`, add `excludeRanges` support

**Modify (minor):**
- `src/content/scanner.ts` — pass excluded ranges
- `src/ui/widget/widget-controller.ts` — track replaced ranges
- `tests/unit/classifier/engine.test.ts` — update placeholder assertions
