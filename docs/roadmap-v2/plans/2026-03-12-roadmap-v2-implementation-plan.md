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

**Maps to roadmap phase:** Phase 1 — Finish The Core Interaction Layer

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

### Detailed execution plan

This epic should be executed as a stabilization phase, not a feature expansion phase.

The goal is to make the current interaction layer boringly reliable before any Phase 2 detection work starts.

### Execution principles

- prefer explicit lifecycle and anchor states over inferred UI behavior
- keep provider-specific logic inside site adapters, not widget internals
- fix state ownership before polishing visuals
- only ship polish that survives disabled/degraded/reattach edge cases
- every behavior change must be covered by either unit tests or a manual provider matrix

### Workstream 1 — Baseline and failure inventory

**Objective:** document the current behavior and identify where instability actually comes from.

**Primary modules**

- [src/ui/widget/widget-controller.ts](/private/tmp/sunbreak-roadmap-review/src/ui/widget/widget-controller.ts)
- [src/ui/widget/position.ts](/private/tmp/sunbreak-roadmap-review/src/ui/widget/position.ts)
- [src/content/orchestrator.ts](/private/tmp/sunbreak-roadmap-review/src/content/orchestrator.ts)
- [src/content/observer.ts](/private/tmp/sunbreak-roadmap-review/src/content/observer.ts)
- provider adapters under `src/content/sites/`

**Tasks**

1. Audit the current widget lifecycle from adapter attach -> scanner updates -> widget mount -> overlay updates -> submit/reset.
2. Enumerate all current anchor states already present in code:
   - send button found
   - input fallback
   - hidden because no floating UI is needed
   - disabled because extension settings are off
   - invalidated/unmounted because the content context is gone
3. Identify where state is implicit today:
   - `anchorReady`
   - `currentSendButton`
   - `panelOpen`
   - toast visibility
   - extension enabled state
4. Build a concrete issue list from existing tests and manual provider checks:
   - attach late after SPA navigation
   - send button replaced by provider rerender
   - input grows/shrinks while typing
   - scroll or resize causes drift
   - widget remains visible after findings clear
   - disabled state still leaves stale UI mounted
5. Convert that issue list into an acceptance checklist stored in this doc or a linked follow-up checklist.

**Exit criteria**

- a single agreed list of Phase 1 failure modes exists
- ownership of each failure mode is mapped to widget controller, observer/orchestrator, positioning, or provider adapter

### Workstream 2 — Explicit anchor and lifecycle state model

**Objective:** make widget positioning and visibility decisions deterministic.

**Primary modules**

- [src/ui/widget/widget-controller.ts](/private/tmp/sunbreak-roadmap-review/src/ui/widget/widget-controller.ts)
- [src/ui/widget/position.ts](/private/tmp/sunbreak-roadmap-review/src/ui/widget/position.ts)
- [src/content/sites/chatgpt.ts](/private/tmp/sunbreak-roadmap-review/src/content/sites/chatgpt.ts)
- [src/content/sites/claude.ts](/private/tmp/sunbreak-roadmap-review/src/content/sites/claude.ts)
- [src/content/sites/gemini.ts](/private/tmp/sunbreak-roadmap-review/src/content/sites/gemini.ts)

**Tasks**

1. Replace ad hoc anchor bookkeeping with an explicit state model, for example:
   - `send-button`
   - `input-box-fallback`
   - `hidden`
   - `disabled`
   - `degraded`
2. Separate two decisions that are currently easy to conflate:
   - whether the UI should exist
   - where the UI should anchor
3. Ensure provider adapters expose the minimum stable contract needed for anchor selection:
   - `findInput`
   - `findSendButton`
   - any adapter capability flags that justify fallback behavior
4. Standardize what happens when the send button disappears or is replaced mid-session:
   - unobserve old node
   - observe replacement
   - fall back to input-box anchor without flicker
5. Make invalidation and unmount behavior idempotent so repeated attach/detach cycles do not leak observers or stale wrappers.

**Implementation notes**

- do not encode provider names inside `widget-controller.ts` if an adapter capability or DOM contract can express the same rule
- keep `computeWidgetPosition()` pure; state transitions belong in controller/orchestrator code
- prefer returning structured anchor diagnostics over boolean flags where possible

**Exit criteria**

- every visible widget state maps to a named lifecycle/anchor state
- send-button loss no longer causes orphaned UI or undefined behavior
- remount after SPA rerender behaves the same way across all providers

### Workstream 3 — Disabled, hidden, and degraded behavior hardening

**Objective:** make non-happy-path behavior feel intentional instead of broken.

**Primary modules**

- [src/content/orchestrator.ts](/private/tmp/sunbreak-roadmap-review/src/content/orchestrator.ts)
- [src/ui/widget/widget-controller.ts](/private/tmp/sunbreak-roadmap-review/src/ui/widget/widget-controller.ts)
- [src/content/findings-state.ts](/private/tmp/sunbreak-roadmap-review/src/content/findings-state.ts)

**Tasks**

1. Verify that extension disabled state suppresses all visible runtime UI:
   - widget trigger
   - panel
   - hover card
   - send toast
   - restore toast
   - overlay decorations
2. Distinguish hidden because there is nothing to show from degraded because the widget cannot anchor confidently.
3. Decide and implement degraded behavior explicitly:
   - remain attached to input fallback
   - suppress only the unstable surface
   - expose local diagnostics for developers
4. Ensure state clears consistently after:
   - findings are resolved
   - prompt is submitted
   - input DOM node is replaced
   - extension is toggled off and back on
5. Verify log-only and masking-disabled modes do not accidentally leave stale widget state behind.

**Exit criteria**

- disabled mode produces no lingering visible UI
- degraded mode is predictable and testable
- state reset behavior is consistent after submit, clear, detach, and settings changes

### Workstream 4 — Overlay, hover, and panel interaction stabilization

**Objective:** remove the fragile feeling from inline findings interactions.

**Primary modules**

- [src/ui/widget/TextOverlay.tsx](/private/tmp/sunbreak-roadmap-review/src/ui/widget/TextOverlay.tsx)
- [src/ui/widget/text-overlay-utils.ts](/private/tmp/sunbreak-roadmap-review/src/ui/widget/text-overlay-utils.ts)
- [src/ui/widget/HoverCard.tsx](/private/tmp/sunbreak-roadmap-review/src/ui/widget/HoverCard.tsx)
- [src/ui/widget/FindingsPanel.tsx](/private/tmp/sunbreak-roadmap-review/src/ui/widget/FindingsPanel.tsx)

**Tasks**

1. Stabilize overlay measurement against normal text-entry changes:
   - multiline growth
   - scroll offsets
   - zoom and resize
   - provider-specific input padding differences
2. Reduce hover-card edge cases:
   - hover target mismatch
   - card clipping near viewport edges
   - hover leaving overlay causing flicker
   - stale hover state after findings update
3. Align findings panel behavior with current findings state:
   - no stale counts
   - correct empty state after fixes
   - correct masked/unmasked presentation
4. Ensure toast and restore-toast interactions do not overlap awkwardly with panel or hover card positioning.
5. Treat CSS consistency as the last step in this workstream, after positioning and lifecycle bugs are resolved.

**Exit criteria**

- overlay markers remain aligned during ordinary typing and scrolling
- hover card does not flicker or render off-screen in common cases
- panel state matches findings state after fix, fix-all, send-anyway, and clear flows

### Workstream 5 — Diagnostics and observability

**Objective:** make anchor and attach failures debuggable without remote telemetry.

**Primary modules**

- [src/ui/widget/widget-controller.ts](/private/tmp/sunbreak-roadmap-review/src/ui/widget/widget-controller.ts)
- [src/content/orchestrator.ts](/private/tmp/sunbreak-roadmap-review/src/content/orchestrator.ts)
- [src/content/observer.ts](/private/tmp/sunbreak-roadmap-review/src/content/observer.ts)

**Tasks**

1. Add developer-facing diagnostics for:
   - attach success/failure
   - chosen anchor mode
   - fallback transitions
   - invalidation/unmount reasons
   - write-back or set-text failures where relevant
2. Keep diagnostics local-only and easy to disable.
3. Standardize event names so manual debugging across providers uses the same vocabulary.
4. Ensure diagnostics are descriptive enough to support Phase 1 bug reports and future adapter work.

**Exit criteria**

- a developer can tell why the widget is hidden, degraded, or re-anchored without stepping through all runtime state manually

### Workstream 6 — Test expansion and manual verification

**Objective:** lock down cross-provider stability before moving on to Phase 2.

**Primary automated tests**

- [tests/unit/ui/widget/widget-controller.test.ts](/private/tmp/sunbreak-roadmap-review/tests/unit/ui/widget/widget-controller.test.ts)
- [tests/unit/ui/widget/position.test.ts](/private/tmp/sunbreak-roadmap-review/tests/unit/ui/widget/position.test.ts)
- [tests/unit/ui/widget/TextOverlay.test.tsx](/private/tmp/sunbreak-roadmap-review/tests/unit/ui/widget/TextOverlay.test.tsx)
- [tests/unit/ui/widget/HoverCard.test.tsx](/private/tmp/sunbreak-roadmap-review/tests/unit/ui/widget/HoverCard.test.tsx)
- [tests/unit/ui/widget/FindingsPanel.test.tsx](/private/tmp/sunbreak-roadmap-review/tests/unit/ui/widget/FindingsPanel.test.tsx)
- [tests/unit/content/orchestrator.test.ts](/private/tmp/sunbreak-roadmap-review/tests/unit/content/orchestrator.test.ts)
- [tests/unit/content/observer.test.ts](/private/tmp/sunbreak-roadmap-review/tests/unit/content/observer.test.ts)
- [tests/unit/content/sites/chatgpt.test.ts](/private/tmp/sunbreak-roadmap-review/tests/unit/content/sites/chatgpt.test.ts)
- [tests/unit/content/sites/claude.test.ts](/private/tmp/sunbreak-roadmap-review/tests/unit/content/sites/claude.test.ts)
- [tests/unit/content/sites/gemini.test.ts](/private/tmp/sunbreak-roadmap-review/tests/unit/content/sites/gemini.test.ts)

**Test additions required**

1. Anchor-state transition coverage:
   - send button present -> missing
   - input fallback -> send button recovered
   - findings clear -> hidden
   - enabled -> disabled -> enabled
2. Observer/orchestrator lifecycle coverage:
   - SPA rerender detaches current input
   - reattach does not duplicate observers or UI
   - settings updates propagate to visible UI correctly
3. Overlay interaction coverage:
   - findings update while hover card is open
   - scrolling or resizing recomputes overlay positions
   - fix/fix-all clears visual markers correctly
4. Provider adapter coverage:
   - current selectors for ChatGPT, Claude, Gemini still resolve the intended nodes
   - fallback behavior is exercised when provider DOM assumptions break

**Manual verification matrix**

Run the same checks on ChatGPT, Claude, and Gemini:

1. Clean prompt: no widget, no overlay, no hover artifacts.
2. Flagged prompt while typing: widget anchors correctly and stays aligned.
3. Input grows to multiple lines: widget and overlay stay stable.
4. Scroll or resize during a flagged prompt: positions recompute without drift.
5. Fix one finding and fix all findings: panel, overlay, and counts stay consistent.
6. Send anyway: toast behavior resolves cleanly and state resets.
7. Disable extension while UI is visible: all runtime UI disappears.
8. Re-enable extension: widget returns only when findings justify it.
9. Provider rerender/navigation: widget reattaches without duplication or stale UI.

**Exit criteria**

- automated coverage exists for the main anchor/lifecycle regressions
- manual matrix passes on all three supported providers

### Suggested implementation order inside the epic

1. Baseline and inventory.
2. Explicit anchor/lifecycle state model.
3. Disabled/hidden/degraded hardening.
4. Overlay and hover stabilization.
5. Diagnostics.
6. Test expansion and provider matrix pass.

### Phase 1 completion gate

Phase 1 should be considered complete only when all of the following are true:

- widget anchor behavior is reliable on ChatGPT, Claude, and Gemini
- visible UI is fully suppressed when the extension is disabled
- degraded and fallback states are explicit rather than accidental
- overlay, hover card, panel, and toast behavior feel coherent in normal use
- the team has enough local diagnostics to debug provider-specific failures quickly
- Phase 1 bugs are no longer dominating the perceived product quality of the extension

### Implementation outcome — 2026-03-13

**Status:** completed for code and verification scope, pending PR packaging only

**Implemented in this execution pass**

- widget anchor modes are now explicit in runtime state:
  - `send-button`
  - `input-box-fallback`
  - `hidden`
  - `disabled`
  - `degraded`
- widget remounts no longer stack stale subscriptions during re-attach cycles
- disabling the extension now clears visible runtime UI instead of only hiding the host element
- re-enabling the extension re-anchors from current findings rather than reviving stale toast/panel state
- overlay recalculation now responds to editor DOM mutation in addition to scroll and resize
- hover card positioning is clamped within the viewport rather than relying on a one-way flip state
- local diagnostics now capture:
  - observer attach success/failure
  - health-check reattach
  - location change and conversation clearing
  - widget anchor-state transitions
  - enable/disable transitions
  - write-back failures
- cross-provider adapter coverage was extended for hidden/zero-size action-button edge cases

**Verification completed**

- `npm test` -> **43/43 test files passed, 726/726 tests passed**
- `npm run build` -> **passed**
- `npm run lint` -> **passed with 8 pre-existing warnings in older test files, no errors**
- Playwright live-provider run -> **30/30 passed**
  - ChatGPT: **10/10**
  - Claude: **10/10**
  - Gemini: **10/10**

**Verification not completed yet**

- none required for Epic 1 beyond normal PR review sanity checks

**Current Epic 1 assessment**

- the codebase now has a much clearer anchor/lifecycle model
- disabled/degraded behavior is materially safer than before
- overlay and hover positioning are more robust under normal DOM movement
- local debugging support is now strong enough to investigate provider-specific failures faster
- the remaining Epic 1 risk is ordinary future provider drift, not current verification coverage

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

### Detailed execution plan

This epic should be executed as the first real classifier capability jump, not as a vague heuristics pass.

The goal is to preserve the current regex engine as the fast span-extraction layer, then add a context-scoring layer that can:

- suppress weak matches in clearly harmless contexts
- boost otherwise-ambiguous matches in sensitive contexts
- explain those decisions in language a normal user can understand

### Execution principles

- keep regex detectors responsible for span extraction, not for full contextual reasoning
- keep context scoring deterministic and local-only
- attach explanation data as product-facing metadata, not debug-only metadata
- start with a small number of context categories that are easy to explain
- measure latency on every major classifier change

### Workstream 1 — Classifier data model extension

**Objective:** extend the current `Finding` model so context scoring and explanation data have a stable home.

**Primary modules**

- [src/classifier/types.ts](/private/tmp/sunbreak-roadmap-review/src/classifier/types.ts)
- [src/classifier/engine.ts](/private/tmp/sunbreak-roadmap-review/src/classifier/engine.ts)
- [src/content/findings-state.ts](/private/tmp/sunbreak-roadmap-review/src/content/findings-state.ts)

**Tasks**

1. Introduce explicit context metadata on findings, for example:
   - context score or confidence adjustment
   - explanation summary
   - explanation reasons list
   - optional context category tags
2. Keep the existing core `Finding` fields stable so masking, findings-state diffing, and widget flows do not break.
3. Decide whether explanation metadata belongs directly on `Finding` or on a nested `explanation` object.
4. Ensure the result model can represent both:
   - raw detector confidence
   - final post-context confidence
5. Keep the shape serializable and small enough for frequent scanner updates.

**Recommended type additions**

- `ContextSignal`
- `FindingExplanation`
- `ContextCategory`
- possibly `rawConfidence` or `baseConfidence` if needed to preserve pre-context scoring

**Exit criteria**

- finding data can carry context explanations without breaking current scanner/widget/masking behavior
- type changes are backward-compatible enough to roll out incrementally

### Workstream 2 — Context scorer foundation

**Objective:** insert a scoring layer between raw detection and final finding output.

**Primary modules**

- [src/classifier/engine.ts](/private/tmp/sunbreak-roadmap-review/src/classifier/engine.ts)
- likely new modules under `src/classifier/` such as:
  - `context-scorer.ts`
  - `context-signals.ts`
  - `explanations.ts`

**Tasks**

1. Refactor `classify()` into distinct stages:
   - raw detection
   - deduplication
   - context scoring
   - confidence/explanation finalization
   - placeholder assignment
2. Create a `ContextScorer` abstraction that accepts:
   - full input text
   - current candidate finding
   - nearby text window
   - optional sibling findings
3. Define a bounded signal vocabulary instead of open-ended heuristics, for example:
   - nearby marker words
   - structural syntax cues
   - financial/time-period cues
   - role/identity cues
   - code/configuration cues
4. Keep scoring deterministic:
   - no ML dependency
   - no network dependency
   - no hidden provider-specific rules
5. Establish simple score-to-confidence rules:
   - promote `LOW -> MEDIUM`
   - promote `MEDIUM -> HIGH`
   - suppress weak findings when negative context dominates

**Implementation notes**

- avoid rewriting regex detectors to do context work internally
- preserve today’s performance profile by using substring windows and simple token checks, not repeated full-text rescans
- explanation generation should reuse the same signals that changed the score

**Exit criteria**

- the engine has a clear post-detection scoring stage
- scoring behavior is testable in isolation from regex extraction

### Workstream 3 — Initial contextual categories

**Objective:** deliver the first small set of context-aware categories named in the roadmap.

**Primary modules**

- new classifier modules under `src/classifier/`
- [src/classifier/engine.ts](/private/tmp/sunbreak-roadmap-review/src/classifier/engine.ts)

**Category rollout order**

1. confidentiality markers
2. legal privilege markers
3. HR / compensation indicators
4. financial indicators with temporal/context clues
5. code structure and connection-string context
6. security infrastructure indicators

**Tasks**

1. Define the concrete signal dictionaries and phrase families for each category.
2. Decide which existing finding types each category can influence:
   - `keyword`
   - `email`
   - `phone`
   - `credit-card`
   - `api-key`
   - `ip-address`
3. Add category-specific scoring rules, for example:
   - compensation words near a number or email boosts HR sensitivity
   - privileged/legal language around names, emails, or attachments boosts legal sensitivity
   - connection-string or environment-variable syntax around secrets boosts code/security sensitivity
   - infrastructure words around internal IP-like values boosts `ip-address`
4. Add negative-context rules where needed so the engine improves precision rather than only boosting more findings.
5. Keep category logic readable and data-driven enough that future company-pattern work can build on it.

**Important boundary**

This phase should not attempt full semantic understanding.
It should target high-value, high-explainability contextual wins.

**Exit criteria**

- each roadmap category has at least one meaningful scoring path
- ambiguous samples show measurable improvement over regex-only behavior

### Workstream 4 — Explanation generation

**Objective:** turn context scoring into concise user-visible explanations.

**Primary modules**

- [src/classifier/types.ts](/private/tmp/sunbreak-roadmap-review/src/classifier/types.ts)
- likely new explanation helper modules under `src/classifier/`
- [src/ui/widget/HoverCard.tsx](/private/tmp/sunbreak-roadmap-review/src/ui/widget/HoverCard.tsx)
- [src/ui/widget/FindingsPanel.tsx](/private/tmp/sunbreak-roadmap-review/src/ui/widget/FindingsPanel.tsx)

**Tasks**

1. Generate one short primary explanation per finding, for example:
   - "Flagged because this looks like compensation information."
   - "Flagged because this appears inside a connection string."
   - "Flagged because nearby wording suggests confidential internal content."
2. Optionally retain a short list of secondary reasons for richer UI later.
3. Keep explanations product-facing:
   - no regex jargon
   - no score dumps
   - no implementation detail leakage
4. Ensure explanations are stable enough that similar prompts produce similar language.
5. Define fallback language for findings that remain regex-only without useful contextual enrichment.

**Exit criteria**

- every context-boosted finding has understandable explanation text
- explanation copy is short enough to fit hover-card and panel surfaces

### Workstream 5 — Scanner and findings-state integration

**Objective:** thread the richer finding model through the live scanner pipeline without destabilizing the interaction layer.

**Primary modules**

- [src/content/scanner.ts](/private/tmp/sunbreak-roadmap-review/src/content/scanner.ts)
- [src/content/findings-state.ts](/private/tmp/sunbreak-roadmap-review/src/content/findings-state.ts)
- [src/content/orchestrator.ts](/private/tmp/sunbreak-roadmap-review/src/content/orchestrator.ts)

**Tasks**

1. Update scanner filtering rules to use final post-context confidence.
2. Confirm findings-state diffing still behaves well when explanation text or context metadata changes but the underlying finding is the same.
3. Decide whether findings-state identity should remain `type + value` for this phase or whether certain categories require stronger identity keys.
4. Preserve the current no-jank scanning behavior:
   - same debounce shape
   - same clean-state behavior
   - no visible UI churn from unstable explanations
5. If needed, add lightweight diagnostics for classifier latency and score-stage duration.

**Exit criteria**

- scanner uses context-scored results without UI churn or tracking regressions
- findings-state remains stable during normal typing

### Workstream 6 — UI explanation surfaces

**Objective:** expose "why flagged" where it adds clarity without making the UI verbose.

**Primary modules**

- [src/ui/widget/HoverCard.tsx](/private/tmp/sunbreak-roadmap-review/src/ui/widget/HoverCard.tsx)
- [src/ui/widget/FindingsPanel.tsx](/private/tmp/sunbreak-roadmap-review/src/ui/widget/FindingsPanel.tsx)

**Tasks**

1. Add a primary explanation line to the hover card.
2. Add a compact explanation affordance in the findings panel:
   - inline explanation under the finding label
   - or expandable "Why flagged" copy if density becomes a problem
3. Decide whether confidence should be shown directly in Epic 2 or left implicit through explanation/severity.
4. Preserve the Phase 1 interaction quality:
   - no hover-card size explosion
   - no panel layout instability
   - no visual overload when multiple findings exist
5. Verify explanations still work when masking is on and when `Fix` is unavailable.

**Exit criteria**

- users can understand why a finding was flagged from the existing widget surfaces
- the UI remains compact enough for the in-page workflow

### Workstream 7 — Test and evaluation matrix

**Objective:** prove that Epic 2 creates real detection value, not just more logic.

**Primary automated tests**

- [tests/unit/classifier/engine.test.ts](/private/tmp/sunbreak-roadmap-review/tests/unit/classifier/engine.test.ts)
- [tests/unit/content/scanner.test.ts](/private/tmp/sunbreak-roadmap-review/tests/unit/content/scanner.test.ts)
- [tests/unit/content/findings-state.test.ts](/private/tmp/sunbreak-roadmap-review/tests/unit/content/findings-state.test.ts)
- [tests/unit/ui/widget/HoverCard.test.tsx](/private/tmp/sunbreak-roadmap-review/tests/unit/ui/widget/HoverCard.test.tsx)
- [tests/unit/ui/widget/FindingsPanel.test.tsx](/private/tmp/sunbreak-roadmap-review/tests/unit/ui/widget/FindingsPanel.test.tsx)
- likely new context-scoring test modules under `tests/unit/classifier/`

**Test additions required**

1. Context scorer unit coverage:
   - positive signal boosts
   - negative signal suppression
   - competing signals
   - deterministic explanation output
2. Category coverage:
   - confidentiality
   - legal privilege
   - HR/compensation
   - financial
   - code/connection string
   - security infrastructure
3. Engine integration coverage:
   - regex-only finding stays intact when no useful context exists
   - context changes confidence without breaking placeholder assignment
   - deduplication still behaves correctly after scoring
4. UI coverage:
   - hover card renders explanation text
   - findings panel renders explanation text without layout breakage
   - explanation fallback text behaves sensibly

**Evaluation set required**

Build and maintain a small prompt corpus with:

- obvious true positives
- ambiguous false-positive-prone cases
- internal/confidential wording cases
- legal and HR wording cases
- code/configuration snippets
- benign prompts that should remain quiet

Use that corpus to compare:

- regex-only behavior
- Epic 2 behavior

**Performance gate**

- measure classifier duration before and after Epic 2
- keep typical prompt classification comfortably interactive
- any noticeable regression must be documented and justified

### Suggested implementation order inside the epic

1. Data model extension.
2. Context scorer foundation.
3. First category rollout.
4. Explanation generation.
5. Scanner and findings-state integration.
6. UI explanation surfaces.
7. Evaluation and performance pass.

### Epic 2 completion gate

Epic 2 should be considered complete only when all of the following are true:

- the classifier has a real post-regex context scoring stage
- at least the roadmap’s first contextual categories are implemented in a meaningful way
- explanation text is attached to findings and visible in the widget UI
- ambiguous examples show better precision than the regex-only baseline
- latency remains acceptable in normal prompt entry
- the team has a reusable evaluation corpus for future classifier work

### Implementation outcome — 2026-03-13

**Status:** completed for code and verification scope, pending PR packaging only

**Implemented in this execution pass**

- extended the classifier finding model with context metadata:
  - base confidence
  - score delta
  - context categories
  - structured signals
  - explanation object
- inserted a dedicated post-regex context-scoring stage into the classifier pipeline
- added the first contextual category rules for:
  - confidentiality markers
  - legal privilege markers
  - HR / compensation indicators
  - financial indicators
  - code structure / connection-string context
  - security infrastructure context
- added a bounded example/demo-data suppressor to reduce visibility of weaker example-style findings
- added deterministic explanation generation from context signals
- preserved findings-state stability by keeping tracked finding identity on `type + value`
- verified scanner behavior against final post-context confidence
- surfaced explanation summaries in:
  - hover card
  - findings panel

**Verification completed**

- `npm test` -> **45/45 test files passed, 743/743 tests passed**
- `npm run build` -> **passed**
- `npm run lint` -> **passed with 8 pre-existing warnings in older test files, no errors**
- Playwright live-provider verification -> **passed**

**Verification still recommended**

- a prompt-corpus comparison pass to quantify precision improvements against a fixed baseline set

**Current Epic 2 assessment**

- Sunbreak now has a real context-aware scoring stage rather than regex-only classification
- explanation metadata is now product-facing, not just internal classifier state
- the implementation is intentionally conservative and deterministic: simple local rules, bounded categories, no model dependency
- the largest remaining gap is evaluation rigor, not missing implementation or browser-surface verification

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

### Detailed execution plan

This epic should be executed as workflow productization work, not as token-format cleanup.

The goal is to make masking feel like a trustworthy assistive action:

- the prompt still works for the AI
- the user understands what changed
- restore behavior feels explicit and local
- masking quality is better than generic `[EMAIL_1]` redaction

### Execution principles

- preserve in-memory-only guarantees as a hard constraint
- optimize masking for continued usefulness, not just minimum disclosure
- keep token generation deterministic within a prompt/session
- prefer transparent restore behavior over clever hidden automation
- every masking improvement must be tested against re-detection and restore edge cases

### Workstream 1 — Token model and masking taxonomy

**Objective:** define the product-standard token scheme for all current finding types.

**Primary modules**

- [src/classifier/smart-tokens.ts](/private/tmp/sunbreak-roadmap-review/src/classifier/smart-tokens.ts)
- [src/classifier/types.ts](/private/tmp/sunbreak-roadmap-review/src/classifier/types.ts)
- masking classifier tests

**Tasks**

1. Audit current descriptive-token behavior by finding type:
   - email
   - phone
   - credit card
   - national IDs
   - API keys
   - IP addresses
   - keywords
2. Define the allowed disclosure level for each type:
   - safe to include role or person hint
   - safe to include ending digits
   - safe to include internal/public qualifier
   - must stay fully generic
3. Standardize token style so the product does not mix multiple placeholder dialects.
4. Decide which tokens must remain generic even if more context is available.
5. Document the safety rules that token generation must obey.

**Key product question**

The right token is not the most descriptive token.
It is the most descriptive token that still preserves trust.

**Exit criteria**

- every supported finding type has an explicit token policy
- token generation rules are deterministic and reviewable

### Workstream 2 — Fix and fix-all replacement semantics

**Objective:** make masking actions semantically better than raw substring replacement.

**Primary modules**

- [src/content/interceptor.ts](/private/tmp/sunbreak-roadmap-review/src/content/interceptor.ts)
- [src/content/findings-state.ts](/private/tmp/sunbreak-roadmap-review/src/content/findings-state.ts)
- [src/classifier/smart-tokens.ts](/private/tmp/sunbreak-roadmap-review/src/classifier/smart-tokens.ts)

**Tasks**

1. Review current `buildRedactedText()` behavior for single-finding and multi-finding replacement.
2. Ensure replacement logic is stable when:
   - multiple findings of the same type exist
   - identical values repeat
   - multiple different values collapse toward similar token bases
3. Decide whether `Fix All` should preserve reading flow differently from repeated `Fix`.
4. Make sure masked text does not immediately trigger noisy re-detection in the scanner.
5. Verify fix/fix-all semantics remain compatible with `FindingsState` status transitions.

**Important boundary**

Do not let masking semantics become dependent on DOM positions or widget state.
The rewrite path should remain a pure text transform plus in-memory map update.

**Exit criteria**

- fix and fix-all replacements are deterministic and human-readable
- masked text stays stable after scanner re-runs

### Workstream 3 — People-related masking quality

**Objective:** improve token usefulness in prompts that involve multiple people or identities.

**Primary modules**

- [src/classifier/smart-tokens.ts](/private/tmp/sunbreak-roadmap-review/src/classifier/smart-tokens.ts)
- [src/ui/widget/HoverCard.tsx](/private/tmp/sunbreak-roadmap-review/src/ui/widget/HoverCard.tsx)
- [src/ui/widget/FindingsPanel.tsx](/private/tmp/sunbreak-roadmap-review/src/ui/widget/FindingsPanel.tsx)

**Tasks**

1. Define how personal emails and role-based emails should differ.
2. Decide how much identity hint is acceptable:
   - first name only
   - first name + last initial
   - role mailbox only
   - generic fallback
3. Handle collisions cleanly when multiple people would otherwise receive the same token.
4. Review how names, phones, and emails coexist in the same prompt so masking does not become confusing.
5. Add prompt examples where token clarity matters for the AI response, not just for UI presentation.

**Exit criteria**

- people-related tokens feel helpful rather than arbitrary
- multi-person prompts remain understandable after masking

### Workstream 4 — Restore-on-copy UX and trust model

**Objective:** make restoration behavior intentional, legible, and easy to decline.

**Primary modules**

- [src/content/clipboard-interceptor.ts](/private/tmp/sunbreak-roadmap-review/src/content/clipboard-interceptor.ts)
- [src/content/masking-map.ts](/private/tmp/sunbreak-roadmap-review/src/content/masking-map.ts)
- [src/ui/widget/RestoreToast.tsx](/private/tmp/sunbreak-roadmap-review/src/ui/widget/RestoreToast.tsx)

**Tasks**

1. Clarify the restore decision flow:
   - safe masked text lands first
   - user is asked whether to restore originals
   - restore only happens on explicit acceptance
2. Make the restore toast copy explain what is happening without sounding alarming.
3. Decide whether restore messaging should mention:
   - local-only behavior
   - expiry
   - count of values
4. Review timeout behavior so auto-dismiss feels safe, not surprising.
5. Verify programmatic clipboard writes and manual copy flows behave consistently.

**Exit criteria**

- a user can predict what copied text will contain
- restore feels opt-in and trustworthy

### Workstream 5 — Masked-state visibility in the widget

**Objective:** make the product clearly communicate that masking is active and local state exists.

**Primary modules**

- [src/ui/widget/FindingsPanel.tsx](/private/tmp/sunbreak-roadmap-review/src/ui/widget/FindingsPanel.tsx)
- [src/ui/widget/HoverCard.tsx](/private/tmp/sunbreak-roadmap-review/src/ui/widget/HoverCard.tsx)
- [src/ui/widget/Widget.tsx](/private/tmp/sunbreak-roadmap-review/src/ui/widget/Widget.tsx)

**Tasks**

1. Review whether the current masked-count badge is sufficient as the primary signal.
2. Improve masked-state framing in the panel:
   - what is masked
   - how long it lasts
   - how to clear it
3. Decide whether hover-card copy should reference the exact replacement token or the broader masked state.
4. Ensure masked-state UI does not compete with active findings UI.
5. Preserve the clean state when there are no findings and no masked values.

**Exit criteria**

- a masked prompt state is obvious without becoming noisy
- the widget communicates masked-state lifecycle clearly

### Workstream 6 — Memory-only guarantees and expiry hardening

**Objective:** make the local-only trust story defensible in code, not just in copy.

**Primary modules**

- [src/content/masking-map.ts](/private/tmp/sunbreak-roadmap-review/src/content/masking-map.ts)
- [src/content/orchestrator.ts](/private/tmp/sunbreak-roadmap-review/src/content/orchestrator.ts)
- [src/content/clipboard-interceptor.ts](/private/tmp/sunbreak-roadmap-review/src/content/clipboard-interceptor.ts)

**Tasks**

1. Audit every path where original values exist after masking:
   - in-memory map
   - widget rendering props
   - clipboard restore flow
2. Confirm originals do not enter:
   - persistent storage
   - event logging
   - dashboard/reporting paths
3. Re-check expiry behavior:
   - timer expiry
   - conversation switch
   - extension invalidation
   - explicit clear
4. Ensure destroy/unmount paths clean up timers and listeners correctly.
5. Consider whether diagnostics should record masking events without exposing original values.

**Exit criteria**

- the memory-only guarantee is supported by concrete code-path review
- expiry and reset behavior is deterministic and test-backed

### Workstream 7 — Test and prompt-evaluation matrix

**Objective:** prove that masking is useful, safe, and resistant to regressions.

**Primary automated tests**

- masking classifier tests
- [tests/unit/content/interceptor.test.ts](/private/tmp/sunbreak-roadmap-review/tests/unit/content/interceptor.test.ts)
- [tests/unit/content/masking-map.test.ts](/private/tmp/sunbreak-roadmap-review/tests/unit/content/masking-map.test.ts)
- [tests/unit/content/clipboard-interceptor.test.ts](/private/tmp/sunbreak-roadmap-review/tests/unit/content/clipboard-interceptor.test.ts)
- [tests/unit/ui/widget/RestoreToast.test.tsx](/private/tmp/sunbreak-roadmap-review/tests/unit/ui/widget/RestoreToast.test.tsx)
- [tests/unit/ui/widget/FindingsPanel.test.tsx](/private/tmp/sunbreak-roadmap-review/tests/unit/ui/widget/FindingsPanel.test.tsx)

**Test additions required**

1. Token-generation coverage:
   - same value -> same token
   - collisions -> deterministic disambiguation
   - role mailboxes stay generic
   - person-like values stay useful but bounded
2. Rewrite coverage:
   - fix one
   - fix all
   - repeated values
   - mixed finding types
   - masked prompt does not re-trigger the same finding unnecessarily
3. Restore coverage:
   - copy with tokens
   - decline restore
   - accept restore
   - timeout decline
   - programmatic clipboard writes
4. Memory/expiry coverage:
   - TTL expiry
   - conversation change clear
   - manual clear
   - destroy cleanup

**Prompt-evaluation set required**

Maintain a small prompt set with:

- multi-person coordination prompts
- code/configuration prompts with secrets
- finance and HR prompts
- prompts where masking should preserve usefulness to the AI
- prompts where descriptive tokens would reveal too much if overdone

Use that set to evaluate:

- usefulness after masking
- clarity of token naming
- trustworthiness of restore behavior

### Suggested implementation order inside the epic

1. Token model and masking taxonomy.
2. Fix/fix-all replacement semantics.
3. People-related masking quality.
4. Restore-on-copy UX.
5. Masked-state visibility.
6. Memory-only and expiry hardening.
7. Test and prompt-evaluation pass.

### Epic 3 completion gate

Epic 3 should be considered complete only when all of the following are true:

- masking tokens are descriptively useful without overexposing originals
- fix and fix-all semantics are stable across repeated and mixed findings
- restore-on-copy is clearly opt-in and locally trustworthy
- masked-state visibility in the widget is clear and low-friction
- originals remain memory-only with test-backed expiry and reset behavior
- the team has prompt examples demonstrating that masking preserves AI usefulness

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
