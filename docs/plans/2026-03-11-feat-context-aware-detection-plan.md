---
title: "feat: Context-Aware Detection — Keyword Proximity Scoring + New Detectors"
type: feat
status: active
date: 2026-03-11
origin: docs/brainstorms/2026-03-06-sensitive-data-roadmap-brainstorm.md
---

# Context-Aware Detection

## Overview

Extend Sunbreak's classification engine with keyword proximity scoring and 6 new
detectors to boost enterprise-relevant data coverage from ~10% to ~35%. No model
downloads, no GPU, runs in <5ms additional latency. This is "Tier 1: Dictionary +
Keyword Context Windows" from the roadmap brainstorm — the highest-ROI next step.

The approach follows Microsoft Purview's Sensitive Information Types (SITs) pattern:
a primary element (regex match) plus supporting elements (keywords within a character
window) that adjust confidence scoring.

## Problem Statement

Current regex-only detection catches PII basics (email, phone, CC, SSN, API keys)
but misses the categories enterprises actually worry about: confidential documents,
financial projections, legal privilege, HR data, code/infrastructure secrets. These
categories have higher business value but aren't detectable by pattern matching alone —
they need keyword context to distinguish sensitive data from benign text.

Examples of what we miss today:
- "CONFIDENTIAL — projected Q3 revenue: $4.2M" → nothing detected
- "attorney-client privileged communication" → nothing detected
- "base salary $185,000, RSU grant 500 shares" → nothing detected
- `DATABASE_URL=postgres://admin:secret@db.corp.internal:5432/prod` → nothing detected
- "-----BEGIN RSA PRIVATE KEY-----" → nothing detected

## Proposed Solution

Two complementary additions to the classifier:

1. **ContextScorer module** — a post-detection pass that scans a 250-char window
   around each finding for context keywords, adjusting confidence up. This benefits
   ALL detectors (existing + new).

2. **6 new standalone detectors** — each follows the existing pure-function pattern
   `(text: string) => Finding[]` and slots into `DETECTOR_REGISTRY`.

Both integrate into the existing `classify()` pipeline in `engine.ts` with zero
architectural changes to the scanner, FindingsState, or UI layers.

## Technical Approach

### Architecture

```
Text input
    │
    ▼
┌──────────────────────┐
│  Existing detectors   │  email, phone, CC, national-id, IP, API key, keyword
│  + 6 new detectors    │  confidentiality, financial, legal, HR, code, security
└──────────┬───────────┘
           │ all findings (raw confidence)
           ▼
┌──────────────────────┐
│  ContextScorer        │  scan 250-char window around each finding
│  (new module)         │  adjust confidence based on keyword proximity
└──────────┬───────────┘
           │ findings (adjusted confidence)
           ▼
┌──────────────────────┐
│  deduplicate()        │  existing sweep-line, confidence-based priority
│  excludeRanges()      │  existing exclude filter
│  assignPlaceholders() │  existing smart tokens
└──────────────────────┘
```

**ContextScorer placement:** After detectors run, BEFORE dedup. This ensures
context-boosted findings win overlap resolution against non-boosted ones.

### Key Design Decisions

1. **Centralized context rules** — keyword dictionaries live in a single
   `src/classifier/context-rules.ts`, not scattered across detectors. Each rule
   maps finding types to keywords + window size + confidence adjustments. Easy to
   tune without touching detector code.

2. **Confidence mapping** — the brainstorm defines 65%/75%/85% numeric confidence.
   We map to the existing string type: no keywords → keep original confidence,
   1 keyword → promote to MEDIUM (if LOW) or keep MEDIUM, 2+ keywords → promote
   to HIGH. New detectors emit LOW for pattern-only matches that need context.

3. **Detector interface unchanged** — all 6 new detectors conform to the existing
   `Detector = (text: string) => Finding[]`. No interface changes needed.

4. **Scanner filter preserved** — scanner already filters to HIGH+MEDIUM
   (`scanner.ts:74-76`). LOW-confidence findings from new detectors that lack
   context support are automatically excluded from the UI. This is the mechanism
   that prevents false positives.

5. **Existing SSN precedent** — `national-id.ts:9-10` already does context-aware
   detection inline (SSN_CONTEXT regex). We keep this as-is. The ContextScorer
   is an additional layer — if both produce findings, dedup picks the winner.

### Implementation Phases

#### Phase 1: Foundation — Types + ContextScorer Module

Extend types and build the scoring engine.

**Files to create:**
- `src/classifier/context-scorer.ts` — the ContextScorer pure function
- `src/classifier/context-rules.ts` — keyword dictionaries and rule definitions
- `tests/unit/classifier/context-scorer.test.ts`

**Files to modify:**
- `src/classifier/types.ts` — extend `FindingType` union, `DETECTOR_PRIORITY`
- `src/classifier/engine.ts` — insert ContextScorer call after detector loop
- `src/storage/types.ts` — extend `DETECTION_CATEGORIES`, `DEFAULT_DETECTION_SETTINGS`

**New types in `types.ts`:**

```typescript
export type FindingType =
  | 'email'
  | 'phone'
  | 'credit-card'
  | 'ssn'
  | 'cpr'
  | 'ni-number'
  | 'ip-address'
  | 'api-key'
  | 'keyword'
  // New context-aware types
  | 'confidentiality-marker'
  | 'financial-data'
  | 'legal-privilege'
  | 'hr-data'
  | 'code-secret'
  | 'security-infra';
```

**ContextScorer interface in `context-scorer.ts`:**

```typescript
/** A rule defining how context keywords affect confidence for a finding type */
export interface ContextRule {
  /** Finding types this rule applies to */
  readonly types: ReadonlyArray<FindingType>;
  /** Keywords to search for near the finding */
  readonly keywords: ReadonlyArray<string>;
  /** Character window to search before and after the finding (default 250) */
  readonly windowSize: number;
  /** Confidence when no context keywords found */
  readonly baseConfidence: Confidence;
  /** Confidence with 1 keyword nearby */
  readonly oneKeywordConfidence: Confidence;
  /** Confidence with 2+ keywords nearby */
  readonly twoKeywordConfidence: Confidence;
}

/**
 * Adjust finding confidence based on keyword proximity.
 * Pure function: findings + text + rules in, adjusted findings out.
 */
export function scoreContext(
  findings: ReadonlyArray<Finding>,
  text: string,
  rules: ReadonlyArray<ContextRule>,
): Finding[];
```

**Engine integration in `engine.ts`:**

```typescript
// After: allFindings.push(...) from all detectors
// Before: const deduped = deduplicate(allFindings);

// NEW: Apply context scoring
const contextScored = scoreContext(allFindings, input, CONTEXT_RULES);
const deduped = deduplicate(contextScored);
```

**ContextScorer implementation notes:**
- For each finding, extract `text.slice(finding.startIndex - windowSize, finding.endIndex + windowSize)`
- Search window for each keyword (case-insensitive, word boundary)
- Count distinct keyword matches
- Build new Finding with adjusted confidence (spread + override)
- Cache keyword regexes (same pattern as `keywords.ts:9` regex cache)

**Tests:**
- Finding with 0 context keywords → confidence unchanged
- Finding with 1 keyword within window → promoted to oneKeywordConfidence
- Finding with 2+ keywords → promoted to twoKeywordConfidence
- Keyword just outside window → no boost
- Keyword at text boundary (start/end) → still works
- Multiple findings near same keyword → each boosted independently
- Performance: scoring 20 findings in 50K text < 2ms

#### Phase 2: New Detectors — Standalone Markers

Detectors that catch explicit markers without needing much context.

**`src/classifier/patterns/confidentiality-marker.ts`:**
- Detects: "CONFIDENTIAL", "STRICTLY CONFIDENTIAL", "INTERNAL ONLY",
  "INTERNAL USE ONLY", "DO NOT DISTRIBUTE", "NOT FOR DISTRIBUTION",
  "DRAFT — NOT FOR DISTRIBUTION", "RESTRICTED", "TOP SECRET",
  "BOARD CONFIDENTIAL", "PRIVILEGED AND CONFIDENTIAL",
  "FOR INTERNAL USE ONLY", "COMPANY CONFIDENTIAL"
- Multi-word markers → HIGH confidence (explicit classification label)
- Single-word "CONFIDENTIAL" or "RESTRICTED" alone → MEDIUM
  (could be a discussion about confidentiality)
- Case-insensitive matching but require either:
  - ALL CAPS version, OR
  - Sentence/line start position, OR
  - Preceded by marker punctuation (—, :, -)
- This prevents matching "confidential" in "we need to keep this confidential"
  (conversational use) while catching "CONFIDENTIAL:" (document header)
- FindingType: `'confidentiality-marker'`
- Label: `'Confidentiality Marker'`

**`src/classifier/patterns/legal-privilege.ts`:**
- Detects: "attorney-client privilege", "attorney client privilege",
  "attorney-client privileged", "work product doctrine", "work product",
  "privileged and confidential", "without prejudice",
  "subject to legal privilege", "legally privileged",
  "protected by attorney", "solicitor-client privilege"
- Multi-word legal phrases → HIGH confidence
- Context keywords (for ContextScorer): "litigation", "counsel", "subpoena",
  "deposition", "settlement", "indemnify", "jurisdiction", "arbitration"
- FindingType: `'legal-privilege'`
- Label: `'Legal Privilege Marker'`

**Tests per detector:** minimum 5 true positives, 5 true negatives.

True negative examples for confidentiality-marker:
- "we need to keep this confidential" (conversational)
- "confidentiality agreement" (describing a document type)
- "your information is kept confidential" (privacy policy language)
- "the confidential nature of the project" (adjective use)
- "restricted access to the building" (physical access, not data label)

True negative examples for legal-privilege:
- "what a privilege to work here" (common speech)
- "this product is a work in progress" (not "work product")
- "without prejudice to the foregoing" inside sample legal text clearly marked as example
- "the attorney arrived at 3pm" (mentions attorney without privilege context)
- "client privilege level: gold" (software access level)

#### Phase 3: New Detectors — Context-Dependent Patterns

Detectors that rely heavily on context keywords for confidence.

**`src/classifier/patterns/financial-indicator.ts`:**
- Primary patterns (regex):
  - Currency with magnitude: `$X.XM`, `$X.XB`, `€X.XK`, `£X.X million`
  - Percentage with financial context: `XX.X% margin`, `XX.X% growth`
  - Quarter/fiscal year references with numbers: `Q[1-4] 20XX`, `FY20XX`
- Emitted confidence: LOW (pattern alone — currency amounts are everywhere)
- Context keywords (promote via ContextScorer):
  - Temporal: "projected", "forecast", "estimated", "preliminary", "unaudited"
  - Financial: "revenue", "EBITDA", "net income", "gross margin", "operating profit"
  - Forward-looking: "guidance", "outlook", "target", "expect", "anticipate"
  - Sensitive markers: "pre-announcement", "MNPI", "material non-public",
    "earnings", "not yet released", "embargoed"
- With 1 keyword → MEDIUM, with 2+ → HIGH
- FindingType: `'financial-data'`
- Label: `'Financial Data'`

**`src/classifier/patterns/hr-compensation.ts`:**
- Primary patterns:
  - Salary patterns: `$XXX,XXX`, `$XXXK`, `$XXX,XXX/year`, `XXX,XXX salary`
  - Compensation keywords + amount: "base salary", "total comp", "equity grant"
  - Performance rating patterns: "rating: X/5", "performance score"
- Emitted confidence: LOW (dollar amounts are common)
- Context keywords:
  - HR: "salary", "compensation", "base pay", "bonus", "RSU", "equity grant",
    "stock options", "vesting", "performance review", "PIP",
    "performance improvement plan", "termination", "severance"
  - Employee: "employee ID", "hire date", "annual review", "comp band",
    "pay grade", "offer letter", "employment agreement"
- FindingType: `'hr-data'`
- Label: `'HR / Compensation Data'`

**Overlap handling:**
- financial-indicator may detect the same `$4.2M` that hr-compensation catches
- Both emit as LOW, context scoring boosts one based on surrounding keywords
- Dedup resolves: financial keywords → `financial-data` type wins;
  HR keywords → `hr-data` type wins; both → higher priority type wins
- DETECTOR_PRIORITY must put these at appropriate levels

#### Phase 4: New Detectors — Technical Patterns

**`src/classifier/patterns/code-secret.ts`:**

(Named `code-secret` not `code-structure` — we're detecting secrets in code,
not code itself. Detecting all code would be too noisy for v1.)

- Primary patterns:
  - Connection strings: `postgres://`, `mongodb://`, `mysql://`, `redis://`,
    `amqp://` with credentials in URL (`user:pass@host`)
  - Environment variable blocks: `KEY=value` patterns with sensitive key names
    (`DATABASE_URL`, `SECRET_KEY`, `PRIVATE_KEY`, `PASSWORD`, `TOKEN`,
    `API_SECRET`, `AUTH_TOKEN`)
  - Docker/K8s secrets: `--password`, `--secret`, `-p password`
- Emitted confidence:
  - Connection strings with credentials → HIGH (always sensitive)
  - Env vars with sensitive names → HIGH
  - Generic `KEY=value` without sensitive name → skip (too noisy)
- Context keywords (for additional boost, but most patterns are HIGH already):
  - "production", "prod", "staging", "deploy", "infrastructure",
    ".env", "docker-compose", "kubernetes", "helm"
- FindingType: `'code-secret'`
- Label: `'Code Secret'`

**Note:** This detector has overlap with the existing `api-key` detector which
already catches `key=value` patterns at MEDIUM. The `code-secret` detector focuses
on connection strings and env var blocks that api-key doesn't cover. Dedup handles
any overlap — `api-key` has higher DETECTOR_PRIORITY for shared matches.

**`src/classifier/patterns/security-infra.ts`:**
- Primary patterns:
  - PEM headers: `-----BEGIN (RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----`
    and `-----BEGIN CERTIFICATE-----`
  - Internal hostnames: words ending in `.internal`, `.corp`, `.local`,
    `.intranet`, `.lan` (with at least one subdomain: `x.y.internal`)
  - CVE identifiers: `CVE-\d{4}-\d{4,7}`
  - Internal IP ranges with port: `10.X.X.X:XXXX`, `172.(16-31).X.X:XXXX`,
    `192.168.X.X:XXXX` (differentiated from existing IP detector by requiring
    port number for private ranges — plain private IPs are too common)
- Emitted confidence:
  - PEM private key headers → HIGH (always sensitive)
  - PEM certificate headers → MEDIUM (certificates are less sensitive than keys)
  - Internal hostnames → MEDIUM
  - CVE IDs → LOW (reference is benign, but context matters)
  - Private IP+port → MEDIUM
- Context keywords for CVE IDs:
  - "vulnerability", "exploit", "patch", "unpatched", "zero-day",
    "our infrastructure", "affected systems", "remediation"
  - With 2+ keywords → HIGH (discussing real vulnerabilities in own infra)
- FindingType: `'security-infra'`
- Label: `'Security Infrastructure'`

**Overlap with existing IP detector:**
- The existing `ip-address` detector catches ALL IPs (public + private) at MEDIUM
- `security-infra` catches private IPs WITH ports at MEDIUM
- Different FindingType values → dedup resolves based on span length (IP+port
  is longer span → `security-infra` wins when port present)
- ContextScorer can also boost existing `ip-address` findings for private ranges
  via context rules (e.g., "internal", "server", "infrastructure" nearby)

#### Phase 5: Context Rules for Existing Detectors

Reduce false positives and boost confidence for existing detectors through context.

**Context rules to add in `context-rules.ts`:**

```typescript
// Email: boost when near customer/employee context
{
  types: ['email'],
  keywords: ['customer', 'employee', 'client', 'patient', 'user',
             'contact', 'personal', 'private', 'recipient'],
  windowSize: 250,
  baseConfidence: 'HIGH',        // emails are already HIGH — no change without context
  oneKeywordConfidence: 'HIGH',  // stays HIGH
  twoKeywordConfidence: 'HIGH',  // stays HIGH
}
// Note: emails stay HIGH regardless — they're always PII.
// This rule exists for potential future use with LOW email patterns.

// Phone: boost when near contact context
{
  types: ['phone'],
  keywords: ['phone', 'mobile', 'cell', 'fax', 'tel', 'contact',
             'call', 'reach', 'emergency contact'],
  windowSize: 250,
  baseConfidence: 'MEDIUM',
  oneKeywordConfidence: 'HIGH',
  twoKeywordConfidence: 'HIGH',
}

// IP address: boost private ranges when near infra context
{
  types: ['ip-address'],
  keywords: ['server', 'internal', 'infrastructure', 'network',
             'firewall', 'subnet', 'gateway', 'production', 'staging',
             'cluster', 'node', 'endpoint'],
  windowSize: 250,
  baseConfidence: 'MEDIUM',
  oneKeywordConfidence: 'MEDIUM',
  twoKeywordConfidence: 'HIGH',
}
```

**Performance validation:**
- Run existing engine performance tests with new detectors + context scoring
- Must stay within 50ms total for 50K char input
- Expected: ~3ms for 6 new detectors + ~2ms for context scoring = ~5ms additional
- Add explicit benchmark test: 50K chars with mixed context-aware content

**False positive validation:**
- Must maintain <2% FPR overall
- Add dedicated FPR test: run classifier against corpus of benign text (meeting
  notes, code reviews, casual conversation) and measure false positive rate
- Key concern: financial-indicator detecting casual dollar amounts
  ("lunch was $15") — without context keywords, these emit LOW and are
  auto-filtered by scanner

#### Phase 6: Settings + UI Integration

Wire new detectors into the settings and dashboard UI.

**Files to modify:**
- `src/storage/types.ts` — already updated in Phase 1
- `src/storage/dashboard.ts` — `getDetectionSettings()` and
  `setDetectionSettings()` already handle `Record<FindingType, boolean>`
  dynamically, so new types are auto-supported after DEFAULT_DETECTION_SETTINGS
  is updated. Verify `toEnabledDetectors()` works correctly.
- Dashboard UI (if category list is rendered from `DETECTION_CATEGORIES`) —
  should auto-populate new categories
- Popup UI — verify new categories appear in detection settings

**New DETECTION_CATEGORIES entries:**

```typescript
{ type: 'confidentiality-marker', label: 'Confidentiality Markers',
  description: 'Detects document classification labels (CONFIDENTIAL, INTERNAL ONLY)' },
{ type: 'financial-data', label: 'Financial Data',
  description: 'Detects financial projections and MNPI with contextual keywords' },
{ type: 'legal-privilege', label: 'Legal Privilege',
  description: 'Detects attorney-client privilege markers and legal terminology' },
{ type: 'hr-data', label: 'HR / Compensation',
  description: 'Detects salary, compensation, and HR performance data' },
{ type: 'code-secret', label: 'Code Secrets',
  description: 'Detects connection strings, env vars, and embedded credentials' },
{ type: 'security-infra', label: 'Security Infrastructure',
  description: 'Detects private keys, internal hostnames, and CVE references' },
```

**DETECTOR_PRIORITY additions** (new detectors at lower priority than api-key
since they're context-dependent and existing detectors should win overlaps):

```typescript
'confidentiality-marker': 9,
'legal-privilege': 10,
'financial-data': 11,
'hr-data': 12,
'code-secret': 13,
'security-infra': 14,
```

Wait — actually, `code-secret` and `security-infra` detect high-value secrets
that should have HIGH priority in dedup (connection strings with credentials
should beat a generic IP match). Revised priority:

```typescript
// Existing
keyword: 0,
'ip-address': 1,
phone: 2,
email: 3,
'ni-number': 4,
cpr: 5,
ssn: 6,
'credit-card': 7,
'api-key': 8,
// New — lower than api-key except security/code which are high-value secrets
'confidentiality-marker': 9,
'financial-data': 10,
'hr-data': 11,
'legal-privilege': 12,
'code-secret': 13,
'security-infra': 14,
```

**Smart tokens** — `smart-tokens.ts` may need updates to generate descriptive
tokens for new finding types. Check `generateDescriptiveToken()` for a
`switch` on `finding.type` — add cases for new types.

## System-Wide Impact

### Interaction Graph

1. New detectors added to `DETECTOR_REGISTRY` → `classify()` calls them →
   findings flow to `scoreContext()` → then existing pipeline (dedup,
   placeholders, scanner filter, FindingsState, widget UI)
2. New `FindingType` values ripple to: `DETECTOR_PRIORITY`, `DetectionSettings`,
   `DEFAULT_DETECTION_SETTINGS`, `DETECTION_CATEGORIES`, `toEnabledDetectors()`,
   smart-tokens, dashboard rendering
3. `chrome.storage.local` schema for detection settings adds new keys —
   `getDetectionSettings()` merges with defaults, so existing users get new
   categories enabled automatically

### Error Propagation

- All new code is pure functions — no async, no error propagation paths
- Invalid regex in context-rules would crash at module load — caught by tests
- No new storage writes, no new chrome.* API calls

### State Lifecycle Risks

- **Existing user upgrade:** `DEFAULT_DETECTION_SETTINGS` adds new keys. When
  `getDetectionSettings()` reads from storage, it merges with defaults
  (`dashboard.ts`). Missing keys get default `true`. No migration needed.
- **FindingsState:** diffs by `type + value`. New finding types have unique type
  strings → no collision with existing findings.

### API Surface Parity

- `classify()` API unchanged — same input/output contract
- `ClassifyOptions` unchanged — no new options needed
- Scanner unchanged — calls `classify()` the same way
- Widget/overlay unchanged — renders findings regardless of type

### Integration Test Scenarios

1. Type "CONFIDENTIAL: customer email john@example.com" → both
   `confidentiality-marker` and `email` detected, deduped (no overlap),
   both shown in widget
2. Type "$4.2M projected Q3 revenue" → `financial-data` detected at LOW,
   context scorer boosts to HIGH (2 keywords: "projected", "Q3")
3. Toggle `financial-data` off in settings → financial findings disappear,
   other detectors unaffected
4. Existing user upgrades → new categories auto-enabled, settings page shows
   new toggles
5. 50K char input with mixed PII + context patterns → classification < 50ms

## Acceptance Criteria

### Functional Requirements

- [ ] ContextScorer adjusts confidence based on keyword proximity within configurable window
- [ ] 6 new detectors registered and producing findings
- [ ] New findings appear in widget with correct labels
- [ ] New finding types have descriptive smart tokens for masking
- [ ] User can toggle each new category on/off in detection settings
- [ ] Existing detector findings get context-based confidence adjustment
- [ ] Deduplication resolves overlaps between new and existing detectors correctly

### Non-Functional Requirements

- [ ] Total classification time < 50ms for 50K char input (including context scoring)
- [ ] False positive rate < 2% on benign text corpus
- [ ] No new network requests
- [ ] No breaking changes to existing detector behavior
- [ ] Works on all 3 sites (ChatGPT, Claude, Gemini)

### Quality Gates

- [ ] Every new detector: minimum 5 true positives, 5 true negatives
- [ ] ContextScorer: tests for 0/1/2+ keyword matches, window boundaries, performance
- [ ] Engine integration test: new + existing detectors combined
- [ ] Performance benchmark test: explicit 50ms assertion
- [ ] All existing 659 tests continue to pass

## Success Metrics

- Detection coverage increases from ~10% to ~35% of enterprise-relevant data
- False positive rate stays below 2%
- Classification latency stays under 50ms
- Zero regressions on existing detectors

## Dependencies & Prerequisites

- **Milestone 1 (design system refactor)** should be complete first — current
  branch has uncommitted work that would conflict
- No external dependencies — all new code is pure TypeScript, no npm packages
- No model downloads — dictionary-based, all bundled in extension

## Risk Analysis & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Financial indicator false positives (casual dollar amounts) | Medium | Medium | LOW confidence + context scoring = auto-filtered without keywords |
| Confidentiality marker catches conversational "confidential" | Medium | Low | Require ALL CAPS or marker punctuation position |
| Performance regression with 6 new detectors | Low | High | Each detector is simple regex ~0.5ms; benchmark tests enforce 50ms |
| Dedup priority ordering causes unexpected winners | Medium | Medium | Explicit priority ordering with integration tests |
| Existing tests break from FindingType expansion | Low | Low | New types are additive; existing type values unchanged |
| Context window at text boundaries | Low | Low | Clamp slice to [0, text.length]; unit tests for boundary cases |

## Implementation Order

1. **Phase 1** — Types + ContextScorer (foundation, everything builds on this)
2. **Phase 2** — Confidentiality marker + legal privilege (standalone, simplest)
3. **Phase 3** — Financial indicator + HR compensation (context-dependent, tests ContextScorer)
4. **Phase 4** — Code secret + security infra (technical patterns)
5. **Phase 5** — Context rules for existing detectors (false positive reduction)
6. **Phase 6** — Settings + UI integration (wiring)

Each phase is independently committable and testable. Run `npm run test` after
each phase to verify no regressions.

## Sources & References

### Origin

- **Brainstorm document:** [sensitive-data-roadmap-brainstorm](../brainstorms/2026-03-06-sensitive-data-roadmap-brainstorm.md)
  — Phase 2 (Tier 1: Dictionary + Keyword Context Windows), lines 160-186 for
  proximity scoring, lines 320-338 for new detectors, lines 448-453 for
  architecture decisions.
- **Roadmap:** [v1-roadmap.md](../v1-roadmap.md) — Milestone 2

### Internal References

- Classifier engine: `src/classifier/engine.ts` — `classify()`, `DETECTOR_REGISTRY`, `deduplicate()`
- Type definitions: `src/classifier/types.ts` — `FindingType`, `Confidence`, `Detector`, `Finding`
- SSN context precedent: `src/classifier/patterns/national-id.ts:9-10` — `SSN_CONTEXT` regex
- Keyword regex cache: `src/classifier/keywords.ts:9` — `Map<string, RegExp>` pattern
- Scanner confidence filter: `src/content/scanner.ts:74-76` — HIGH+MEDIUM only
- Settings pipeline: `src/storage/dashboard.ts` → `src/content/orchestrator.ts` → `src/content/scanner.ts`
- Smart tokens: `src/classifier/smart-tokens.ts` — `generateDescriptiveToken()`

### Learnings Applied

- Regex alternation pitfall: use independent optionals, not mutually exclusive alternation (`docs/solutions/logic-errors/2026-03-03-pii-classifier-pitfalls.md`)
- Build test keys dynamically to avoid GitHub push protection (`docs/solutions/logic-errors/2026-03-03-pii-classifier-pitfalls.md`)
- Right-to-left replacement for multi-position findings (`docs/solutions/ui-bugs/preact-hooks-shadow-dom-overlay-pitfalls.md`)
- Orchestrator settings caching pattern (`docs/solutions/code-quality/phase-5-dashboard-code-review-fixes.md`)
