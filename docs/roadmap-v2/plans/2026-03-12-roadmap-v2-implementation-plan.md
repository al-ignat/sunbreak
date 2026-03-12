# Sunbreak Roadmap v2 — Implementation Plan

**Date:** 2026-03-12  
**Primary roadmap:** [docs/roadmap-v2/README.md](/private/tmp/sunbreak-roadmap-review/docs/roadmap-v2/README.md)  
**Gap analysis:** [docs/roadmap-v2/research/2026-03-12-roadmap-v2-gap-analysis-and-execution-plan.md](/private/tmp/sunbreak-roadmap-review/docs/roadmap-v2/research/2026-03-12-roadmap-v2-gap-analysis-and-execution-plan.md)

---

## Planning Standard

This plan is intentionally opinionated.

It optimizes for:

- finishing what already exists before layering more product on top
- shipping one meaningful improvement at a time
- keeping commits and branches reviewable
- proving product value with each epic, not just increasing code volume

The order below is the recommended execution order, not just a thematic grouping.

---

## Epic 1 — Interaction Layer Hardening

**Purpose:** make the current in-page experience feel stable and production-ready.

### Deliverables

- finalized anchor behavior across ChatGPT, Claude, and Gemini
- explicit anchor mode handling:
  - send-button
  - input-box fallback
  - hidden/degraded state
- reduced overlay drift and hover-card edge cases
- disabled-state behavior is correct everywhere
- consistent widget, findings panel, hover card, toast, and restore toast behavior
- local diagnostics for attach/anchor/write-back failures at least in developer-facing form

### Likely files/modules

- [src/ui/widget/widget-controller.ts](/private/tmp/sunbreak-roadmap-review/src/ui/widget/widget-controller.ts)
- [src/ui/widget/position.ts](/private/tmp/sunbreak-roadmap-review/src/ui/widget/position.ts)
- [src/ui/widget/TextOverlay.tsx](/private/tmp/sunbreak-roadmap-review/src/ui/widget/TextOverlay.tsx)
- [src/ui/widget/HoverCard.tsx](/private/tmp/sunbreak-roadmap-review/src/ui/widget/HoverCard.tsx)
- [src/content/observer.ts](/private/tmp/sunbreak-roadmap-review/src/content/observer.ts)
- [src/content/orchestrator.ts](/private/tmp/sunbreak-roadmap-review/src/content/orchestrator.ts)
- [src/content/sites/chatgpt.ts](/private/tmp/sunbreak-roadmap-review/src/content/sites/chatgpt.ts)
- [src/content/sites/claude.ts](/private/tmp/sunbreak-roadmap-review/src/content/sites/claude.ts)
- [src/content/sites/gemini.ts](/private/tmp/sunbreak-roadmap-review/src/content/sites/gemini.ts)
- related widget/content tests

### Risks

- anchor logic becomes over-specialized too early
- fixing one provider causes regressions in another
- visual polish work masks lifecycle bugs instead of solving them

### Must prove

- widget reliably anchors on all supported providers
- extension disabled state suppresses visible runtime UI
- overlay and hover interactions do not feel fragile
- no obvious regressions in fix/ignore/send-anyway flows

### Recommended commit sequence

1. `refactor(widget): make anchor modes explicit`
2. `fix(widget): harden degraded and hidden anchor states`
3. `fix(overlay): stabilize hover and underline positioning`
4. `feat(debug): add local widget lifecycle diagnostics`
5. `test(widget): extend cross-provider interaction coverage`

---

## Epic 2 — Context-Aware Detection Engine

**Purpose:** create the first real detection step-change beyond regex.

### Deliverables

- `ContextScorer` or equivalent scoring layer
- context-aware confidence model on top of existing findings
- first contextual categories:
  - confidentiality markers
  - financial indicators
  - legal privilege markers
  - HR/compensation indicators
  - code structure and connection-string context
  - security infrastructure context
- explanation metadata attached to findings
- UI surface for "why flagged" where it fits naturally

### Likely files/modules

- [src/classifier/engine.ts](/private/tmp/sunbreak-roadmap-review/src/classifier/engine.ts)
- [src/classifier/types.ts](/private/tmp/sunbreak-roadmap-review/src/classifier/types.ts)
- likely new modules under `src/classifier/`
- [src/content/scanner.ts](/private/tmp/sunbreak-roadmap-review/src/content/scanner.ts)
- [src/content/findings-state.ts](/private/tmp/sunbreak-roadmap-review/src/content/findings-state.ts)
- [src/ui/widget/HoverCard.tsx](/private/tmp/sunbreak-roadmap-review/src/ui/widget/HoverCard.tsx)
- [src/ui/widget/FindingsPanel.tsx](/private/tmp/sunbreak-roadmap-review/src/ui/widget/FindingsPanel.tsx)
- classifier and widget tests

### Risks

- explanation data becomes too technical or too noisy
- confidence heuristics create false confidence rather than real confidence
- latency creeps upward without clear value

### Must prove

- catches meaningful non-trivial cases that regex-only misses
- explanation language is understandable
- performance remains comfortably interactive
- false positive profile improves on ambiguous examples

### Recommended commit sequence

1. `feat(classifier): add context scoring foundation`
2. `feat(classifier): add contextual enterprise-sensitive categories`
3. `feat(classifier): attach explanation metadata to findings`
4. `feat(widget): surface why-flagged explanations`
5. `test(classifier): add context scoring and explanation coverage`

---

## Epic 3 — Reversible Masking Productization

**Purpose:** turn the existing masking mechanics into a differentiated workflow feature.

### Deliverables

- descriptive masking tokens by finding type
- better masking semantics for people-related findings
- improved fix/fix-all wording and preview behavior
- clearer masked state in the widget/panel
- restore-on-copy flow feels intentional and trustworthy
- strong guarantees around in-memory-only behavior and expiry

### Likely files/modules

- [src/classifier/smart-tokens.ts](/private/tmp/sunbreak-roadmap-review/src/classifier/smart-tokens.ts)
- [src/content/interceptor.ts](/private/tmp/sunbreak-roadmap-review/src/content/interceptor.ts)
- [src/content/masking-map.ts](/private/tmp/sunbreak-roadmap-review/src/content/masking-map.ts)
- [src/content/clipboard-interceptor.ts](/private/tmp/sunbreak-roadmap-review/src/content/clipboard-interceptor.ts)
- [src/ui/widget/FindingsPanel.tsx](/private/tmp/sunbreak-roadmap-review/src/ui/widget/FindingsPanel.tsx)
- [src/ui/widget/RestoreToast.tsx](/private/tmp/sunbreak-roadmap-review/src/ui/widget/RestoreToast.tsx)
- [src/ui/widget/HoverCard.tsx](/private/tmp/sunbreak-roadmap-review/src/ui/widget/HoverCard.tsx)
- masking and widget tests

### Risks

- descriptive tokens accidentally leak too much context
- masking logic becomes inconsistent across finding types
- restore flow feels spooky if not explained clearly

### Must prove

- masked prompts remain useful to the AI
- users understand the restore model
- originals never persist to storage
- masking feels like help, not a degraded fallback

### Recommended commit sequence

1. `feat(masking): upgrade placeholders to descriptive smart tokens`
2. `feat(masking): improve fix and fix-all replacement semantics`
3. `feat(clipboard): refine restore-on-copy UX`
4. `feat(widget): expose masked state more clearly`
5. `test(masking): harden memory-only and expiry guarantees`

---

## Epic 4 — Company-Specific Patterns

**Purpose:** move from generic detection toward company-aware relevance.

### Deliverables

- pattern template library
- custom regex builder/editor
- test-against-sample flow
- per-pattern label
- per-pattern severity/category assignment
- import/export format for company-specific patterns

### Likely files/modules

- [src/storage/types.ts](/private/tmp/sunbreak-roadmap-review/src/storage/types.ts)
- [src/storage/dashboard.ts](/private/tmp/sunbreak-roadmap-review/src/storage/dashboard.ts)
- new classifier/config modules for custom patterns
- [src/ui/dashboard/KeywordManager.tsx](/private/tmp/sunbreak-roadmap-review/src/ui/dashboard/KeywordManager.tsx) or a successor component
- [src/ui/dashboard/SettingsPanel.tsx](/private/tmp/sunbreak-roadmap-review/src/ui/dashboard/SettingsPanel.tsx)
- dashboard and classifier tests

### Risks

- custom pattern UX becomes too technical for normal users
- malformed regex and performance traps
- configuration model becomes messy if keywords and patterns overlap badly

### Must prove

- custom patterns are understandable and testable
- users can model real company identifiers without friction
- badly configured patterns do not tank performance

### Recommended commit sequence

1. `feat(patterns): add storage model for custom company patterns`
2. `feat(patterns): add template library and sample testing`
3. `feat(dashboard): add custom pattern management UI`
4. `feat(classifier): run custom patterns with labels and severity`
5. `test(patterns): add validation and performance coverage`

---

## Epic 5 — Recovery And Provider Guidance

**Purpose:** convert event logging and activity data into a real user help flow.

### Deliverables

- accidental-send recovery UI
- event detail view or recovery panel
- provider-specific deletion/help/setup guidance
- narrow provider/account guidance layer
- file upload warning upgraded from plumbing to real product behavior

### Likely files/modules

- [src/storage/events.ts](/private/tmp/sunbreak-roadmap-review/src/storage/events.ts)
- [src/storage/dashboard.ts](/private/tmp/sunbreak-roadmap-review/src/storage/dashboard.ts)
- [src/ui/dashboard/ActivityLog.tsx](/private/tmp/sunbreak-roadmap-review/src/ui/dashboard/ActivityLog.tsx)
- [src/ui/dashboard/ReportCards.tsx](/private/tmp/sunbreak-roadmap-review/src/ui/dashboard/ReportCards.tsx)
- [src/entrypoints/dashboard/App.tsx](/private/tmp/sunbreak-roadmap-review/src/entrypoints/dashboard/App.tsx)
- [src/content/interceptor.ts](/private/tmp/sunbreak-roadmap-review/src/content/interceptor.ts)
- possibly new provider data modules under `src/`

### Risks

- provider guidance becomes stale if it is too detailed and not maintained
- recovery flow becomes moralizing instead of helpful
- account-mode inference becomes brittle if attempted too early

### Must prove

- after sending something risky, a user knows what to do next
- provider guidance is concise and clearly useful
- file upload warning creates awareness without becoming annoying

### Recommended commit sequence

1. `feat(recovery): add flagged-event recovery model`
2. `feat(dashboard): add recovery-focused activity detail view`
3. `feat(provider): add provider guidance data and report card improvements`
4. `feat(content): surface file upload warning and next-step guidance`
5. `test(recovery): cover event-to-guidance flows`

---

## Epic 6 — Onboarding And Trust UX

**Purpose:** improve activation and make the product self-explanatory.

### Deliverables

- first-run onboarding flow
- quick setup
- try-it sandbox
- popup simplified around trust/status/next action
- dashboard framing updated to support the companion story

### Likely files/modules

- [src/entrypoints/popup/App.tsx](/private/tmp/sunbreak-roadmap-review/src/entrypoints/popup/App.tsx)
- [src/entrypoints/dashboard/App.tsx](/private/tmp/sunbreak-roadmap-review/src/entrypoints/dashboard/App.tsx)
- [src/ui/popup/ComplianceGauge.tsx](/private/tmp/sunbreak-roadmap-review/src/ui/popup/ComplianceGauge.tsx)
- new onboarding/sandbox components
- storage for onboarding completion state

### Risks

- onboarding adds ceremony without delivering value
- popup becomes marketing copy instead of a useful control surface
- sandbox becomes a detour rather than a fast trust-builder

### Must prove

- new users understand the product quickly
- first value is visible before first real detection event
- popup feels lighter and more aligned with the product thesis

### Recommended commit sequence

1. `feat(onboarding): add first-run state and welcome flow`
2. `feat(sandbox): add try-it detection playground`
3. `refactor(popup): simplify popup around status and next action`
4. `refactor(dashboard): align support surfaces with companion positioning`
5. `test(onboarding): cover activation and first-run flows`

---

## Epic 7 — Controlled Configurability

**Purpose:** add useful tuning without turning Sunbreak into a settings product.

### Deliverables

- allowlist support
- limited sensitivity controls
- simplified settings language around behavior and tradeoffs
- settings model remains coherent with masking and context-aware detection

### Likely files/modules

- [src/storage/types.ts](/private/tmp/sunbreak-roadmap-review/src/storage/types.ts)
- [src/storage/dashboard.ts](/private/tmp/sunbreak-roadmap-review/src/storage/dashboard.ts)
- [src/ui/dashboard/SettingsPanel.tsx](/private/tmp/sunbreak-roadmap-review/src/ui/dashboard/SettingsPanel.tsx)
- classifier and scanner integration points

### Risks

- settings multiply faster than product value
- sensitivity controls become hard to explain
- allowlists interact badly with custom patterns

### Must prove

- users can reduce friction when needed
- settings remain understandable
- defaults still carry most of the product value

### Recommended commit sequence

1. `feat(settings): add allowlist storage and matching`
2. `feat(settings): add limited sensitivity controls`
3. `refactor(settings): simplify copy and behavior explanations`
4. `test(settings): cover settings interactions with scanner/classifier`

---

## Cross-Epic Engineering Constraints

These should be applied throughout the roadmap:

- preserve local-only data handling
- keep original prompt content out of persistent storage
- prefer small composable extensions of current architecture over new frameworks
- treat site-specific behavior as adapter-level logic, not scattered conditionals
- avoid broadening permissions unless the feature absolutely requires it
- keep latency visible and measured for detection-heavy epics

---

## Branching Guidance

Recommended branch strategy:

- one branch per epic
- smaller feature branches under the epic only if the epic is too large to review
- keep docs and code in the same branch when they are tightly coupled

Suggested branch names:

- `epic/interaction-hardening`
- `epic/context-aware-detection`
- `epic/reversible-masking`
- `epic/company-patterns`
- `epic/recovery-provider-guidance`
- `epic/onboarding-trust-ux`
- `epic/controlled-configurability`

---

## Review Gates

Before starting the next epic, verify:

- the previous epic’s main UX is manually tested on all three providers
- the relevant test suite is updated, not only passing by accident
- the roadmap still reflects the product shape after new learnings
- no "temporary" fallback became a permanent default without being named explicitly

---

## Recommended Immediate Next Step

Start with **Epic 1 — Interaction Layer Hardening** only until the widget/overlay/send-anchor behavior feels boringly reliable.

Then move directly into **Epic 2 — Context-Aware Detection Engine**.

That sequence gives the product its first real qualitative jump while standing on a stable interaction foundation.
