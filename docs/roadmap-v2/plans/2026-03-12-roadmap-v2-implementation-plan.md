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

### Implementation outcome — 2026-03-13

**Status:** completed — all completion gates verified

**Implemented in this execution pass**

- formalized the masking token taxonomy in code with explicit per-type disclosure policy
- hardened email/person token generation so shared mailboxes stay generic and trailing role qualifiers do not distort person-like tokens
- improved multi-person readability by surfacing the exact mask token preview in the findings panel and contextual rationale in the hover card
- replaced naive substring rewriting with validated redaction planning:
  - invalid or stale spans are skipped instead of corrupting text
  - `Fix All` now marks only successfully applied replacements as fixed
- hardened clipboard restore flow so stale or detached restore approvals cannot overwrite a newer clipboard state
- rewrote restore toast copy to make the trust model explicit:
  - masked text lands first
  - restore is local and opt-in
  - timeout declines safely by default
- clarified masked-state UI and accessibility language around local-only state:
  - widget aria-label now says `masked locally`
  - panel copy now explains originals stay in memory only
  - masked-state section explains clipboard restore remains explicit
- fixed a masking-map restore bug where shorter tokens could corrupt longer token restores when placeholders shared prefixes
- added expiry-state hardening so empty `setAll()` calls do not arm masking TTL state

**Verification completed**

- `npm test` -> **46/46 test files passed, 779/779 tests passed** (includes 17 new prompt-usability evaluation tests)
- `npm run build` -> **passed**
- `npm run lint` -> **passed with 8 pre-existing warnings in older test files, no errors**
- `npm run test:e2e:live` -> **36/36 live tests passed** on ChatGPT, Claude, and Gemini

**Live-provider validation — 2026-03-13**

Playwright live E2E tests confirmed on all three providers:

- T3: Fix / Fix All replaces PII with descriptive tokens (e.g. `[John D. email]`, `[SSN redacted]`) — editor text updated correctly
- T4: framework sync confirms the AI sees only the masked text after fix
- T9: widget becomes visible immediately when PII is typed
- T10: submit interception toast appears and Send Anyway releases the message end-to-end
- T11: context explanations (confidentiality flagging) render in the findings panel
- T12: example/demo context properly suppresses findings

**Prompt-usability evaluation — 2026-03-13**

Created `tests/unit/classifier/prompt-usability.test.ts` with 17 tests covering the required prompt categories:

- **multi-person coordination**: three-person email prompt produces distinguishable name-based tokens (`[John S. email]`, `[Jane D. email]`, `[Bob W. email]`); same-person duplicates collapse; role vs personal emails differentiated
- **code/configuration with secrets**: API keys get provider-labeled tokens (`[OpenAI API key]`, `[AWS access key]`, `[GitHub token]`); internal IPs get `[internal IP]`; code context (retry logic, CI config) preserved after masking
- **finance**: credit cards show trailing digits for disambiguation (`[card ending 1111]` vs `[card ending 0004]`); phone numbers show last 2 digits; financial question context survives masking
- **HR**: SSNs are fully opaque (`[SSN redacted]`) with no digits leaked; CPR likewise (`[CPR redacted]`); payroll/W-2 task context preserved; multiple SSNs get sequential disambiguation
- **overdisclosure checks**: email tokens never contain full last names; phone tokens show only last 2 digits; credit card tokens show only last 4; national IDs are fully opaque
- **AI usefulness**: masked prompts preserve task instructions, structural markers, and question clarity; classification stays under 50ms performance budget

**Epic 3 final assessment**

- masking behaves as a product workflow: descriptive tokens, provider-specific labels, person-aware naming, safe disambiguation
- the restore path is materially safer against stale state and more legible to the user
- masked-state lifecycle is communicated clearly in UI text and accessibility labels
- all completion gates verified: token quality, rewrite semantics, restore-on-copy, masked-state visibility, memory-only expiry, and prompt-usability demonstration
- no remaining Epic 3 gaps

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

### Detailed execution plan

This epic should be executed as a configuration-product epic, not just as “let users type regex.”

The goal is to let a team model company-specific identifiers safely and repeatedly:

- start from understandable templates where possible
- allow custom patterns when needed
- make every pattern testable against sample text before it affects live scanning
- keep pattern execution bounded so bad configuration cannot degrade the extension

### Execution principles

- treat custom patterns as managed detector definitions, not free-form raw strings floating through storage
- prefer structured inputs and templates over regex-first UX
- make validation and sample testing mandatory product surfaces, not hidden implementation details
- keep execution local, deterministic, and performance-bounded
- avoid mixing company-specific patterns into the existing keyword model; they need their own storage and runtime path

### Workstream 1 — Storage model and detector contract

**Objective:** define the persistent model for company-specific patterns and the runtime contract the classifier will consume.

**Primary modules**

- [src/storage/types.ts](/Users/ignataleinikov/02_Projects/sunbreak/src/storage/types.ts)
- [src/storage/dashboard.ts](/Users/ignataleinikov/02_Projects/sunbreak/src/storage/dashboard.ts)
- likely new pattern modules under `src/classifier/`

**Tasks**

1. Introduce a dedicated `CustomPattern` model with fields for:
   - stable id
   - label
   - description
   - enabled flag
   - severity or finding-class mapping
   - pattern source
   - sample strings
   - optional template origin
2. Define a normalized runtime shape separate from the stored editable shape.
3. Decide how custom pattern matches map into the existing finding model:
   - reuse `keyword`
   - add a new finding type
   - or add metadata on top of a custom-pattern execution path
4. Add storage helpers for CRUD, import/export, and normalization.
5. Define migration behavior for future schema changes up front.

**Important boundary**

Do not overload `keywords` storage with richer pattern metadata.
Epic 4 needs a first-class model or the dashboard and runtime logic will stay brittle.

**Exit criteria**

- custom patterns have a stable storage schema
- runtime loading and normalization are explicit and testable

### Workstream 2 — Template library and guided creation model

**Objective:** give users practical starting points before they ever touch regex syntax.

**Primary modules**

- new dashboard/template modules under `src/ui/dashboard/`
- [src/ui/dashboard/KeywordManager.tsx](/Users/ignataleinikov/02_Projects/sunbreak/src/ui/dashboard/KeywordManager.tsx) or its replacement

**Tasks**

1. Define the first template categories:
   - employee IDs
   - customer IDs
   - invoice / PO numbers
   - project codes
   - internal ticket / case references
   - contract or matter references
2. For each template, define:
   - human-readable purpose
   - editable placeholders
   - generated regex
   - examples that should and should not match
3. Decide which patterns can be represented with structured fields instead of raw regex.
4. Provide a fallback “advanced custom pattern” mode only when template coverage is insufficient.
5. Make template-derived patterns editable after creation without losing provenance.

**Exit criteria**

- users can create useful company-specific patterns without regex knowledge for the common cases
- templates and advanced mode share the same downstream storage model

### Workstream 3 — Validation and sample-testing engine

**Objective:** prevent malformed or dangerous patterns from reaching live prompt scanning.

**Primary modules**

- new validation/execution modules under `src/classifier/` or `src/utils/`
- [src/storage/dashboard.ts](/Users/ignataleinikov/02_Projects/sunbreak/src/storage/dashboard.ts)

**Tasks**

1. Add validation for:
   - invalid regex syntax
   - empty or trivial expressions
   - catastrophic backtracking risk heuristics
   - patterns that are too broad
2. Build a test-against-sample flow that returns:
   - matches
   - capture spans
   - failure or warning states
3. Decide whether samples are single-string only or support positive/negative cases separately.
4. Bound sample execution time and pattern length.
5. Surface warnings for patterns that match nearly everything or nothing.

**Important boundary**

Validation should happen before save and again before runtime compilation.
Do not trust stored pattern text blindly.

**Exit criteria**

- malformed or obviously dangerous patterns are blocked or heavily warned
- users can test patterns against representative company samples before enabling them

### Workstream 4 — Dashboard management UX

**Objective:** ship a pattern-management surface that is understandable to non-regex users and scalable for teams.

**Primary modules**

- [src/ui/dashboard/KeywordManager.tsx](/Users/ignataleinikov/02_Projects/sunbreak/src/ui/dashboard/KeywordManager.tsx) or successor component
- [src/ui/dashboard/SettingsPanel.tsx](/Users/ignataleinikov/02_Projects/sunbreak/src/ui/dashboard/SettingsPanel.tsx)
- [src/entrypoints/dashboard/App.tsx](/Users/ignataleinikov/02_Projects/sunbreak/src/entrypoints/dashboard/App.tsx)

**Tasks**

1. Decide whether custom patterns live:
   - beside keywords in the current manager area
   - or in a dedicated company-pattern card / tab
2. Add list and editing views with:
   - enable/disable
   - label
   - severity/category
   - template badge
   - sample-test status
3. Support add, edit, duplicate, delete, import, and export.
4. Make advanced regex editing visually secondary to guided creation.
5. Keep empty-state copy focused on concrete company identifier examples.

**Exit criteria**

- the dashboard makes custom pattern management feel like configuration, not developer tooling
- import/export and editing workflows are low-friction

### Workstream 5 — Classifier execution and findings integration

**Objective:** run company-specific patterns during classification without destabilizing the existing detector pipeline.

**Primary modules**

- [src/classifier/engine.ts](/Users/ignataleinikov/02_Projects/sunbreak/src/classifier/engine.ts)
- [src/classifier/types.ts](/Users/ignataleinikov/02_Projects/sunbreak/src/classifier/types.ts)
- [src/content/scanner.ts](/Users/ignataleinikov/02_Projects/sunbreak/src/content/scanner.ts)
- [src/content/findings-state.ts](/Users/ignataleinikov/02_Projects/sunbreak/src/content/findings-state.ts)

**Tasks**

1. Compile enabled custom patterns into a bounded detector set.
2. Decide execution order relative to:
   - built-in detectors
   - keyword matching
   - context scoring
3. Attach custom labels and severity/category metadata to resulting findings.
4. Ensure overlap resolution between custom patterns and built-in findings is deterministic.
5. Verify scanner updates when patterns are added, edited, or toggled in settings.

**Key product question**

If a company pattern and a built-in detector overlap, which one should define the user-facing label?
That needs to be explicit, not incidental.

**Exit criteria**

- company-specific patterns participate in live scanning predictably
- classifier output remains stable and explainable when overlaps happen

### Workstream 6 — Import/export format and team portability

**Objective:** make company-specific configuration shareable without creating an opaque blob format.

**Primary modules**

- [src/storage/dashboard.ts](/Users/ignataleinikov/02_Projects/sunbreak/src/storage/dashboard.ts)
- dashboard import/export UI modules

**Tasks**

1. Define a human-readable import/export format:
   - JSON preferred over ad hoc text blobs
   - include schema version
   - include template provenance and sample metadata when present
2. Validate imports before merge.
3. Decide merge semantics:
   - replace all
   - append unique
   - interactive collision handling later
4. Add export naming and provenance markers so teams know what they are sharing.
5. Keep imports local-only and never tied to backend dependency.

**Exit criteria**

- patterns can be moved between teammates or workspaces cleanly
- import errors are understandable and non-destructive

### Workstream 7 — Test and performance matrix

**Objective:** prove that custom patterns are safe, understandable, and fast enough for live prompt scanning.

**Primary automated tests**

- storage model and migration tests
- dashboard validation / import-export tests
- classifier execution tests for custom patterns
- scanner integration tests when settings change live

**Test additions required**

1. Storage and validation:
   - invalid regex rejected
   - empty pattern rejected
   - duplicate ids or labels handled cleanly
   - import schema version checks
2. Template flow:
   - template creates expected regex
   - editing preserves label/severity semantics
   - generated examples match as intended
3. Runtime behavior:
   - custom match appears with correct label and severity
   - overlap with built-in detector resolves deterministically
   - disabled patterns do not execute
4. Performance:
   - bounded pattern count still keeps classification interactive
   - obviously risky expressions are blocked before runtime

**Manual verification matrix**

1. Create a company pattern from a template and verify sample testing before save.
2. Create an advanced regex pattern and verify warnings / validation behavior.
3. Enable, disable, edit, and delete patterns and confirm live scanning updates.
4. Import and export a pattern bundle and confirm round-trip integrity.
5. Verify overlapping company-specific and built-in findings render predictably in the widget.

### Suggested implementation order inside the epic

1. Storage model and detector contract.
2. Template library and guided creation.
3. Validation and sample-testing engine.
4. Dashboard management UX.
5. Classifier execution and findings integration.
6. Import/export format.
7. Test and performance pass.

### Epic 4 completion gate

Epic 4 should be considered complete only when all of the following are true:

- company-specific patterns have a first-class storage and runtime model
- guided templates cover the most common internal identifier use cases
- advanced custom patterns are validated and sample-tested before live use
- dashboard management UX is understandable without regex expertise
- company-specific findings surface with clear labels and predictable severity/category behavior
- import/export is portable and non-destructive
- performance remains comfortably interactive under realistic pattern counts

### Implementation outcome — 2026-03-14

**Status:** completed — implementation and live validation verified

**Implemented in this execution pass**

- added a first-class `custom-pattern` detector path instead of overloading keywords:
  - dedicated storage schema, runtime compilation contract, and detector metadata
  - detection settings now include a distinct `Company Patterns` category
- completed dashboard-to-runtime wiring so enabled custom patterns now flow from storage into live scanner execution without reload
- integrated custom pattern execution into the classifier pipeline with deterministic overlap handling and stable post-dedup sorting
- surfaced company-pattern metadata on findings:
  - stable pattern id
  - severity
  - category
  - template provenance
- updated findings-state identity so two different company patterns can match the same literal value without collapsing into one tracked item
- made company-pattern findings explicitly detection-only in the widget layer:
  - per-row `Fix` is hidden
  - `Fix All` only appears when there are multiple maskable built-in findings
  - hover cards explain that company-pattern matches require manual editing
- updated severity rendering so company-pattern findings honor their configured warning / concern / critical level
- updated event categorization so logged company findings retain their company bucket (for example `custom-pattern:hr`)
- extended regression coverage across:
  - classifier execution
  - scanner integration
  - findings-state identity
  - orchestrator event logging
  - widget severity and action semantics

**Important product decision captured in code**

- custom patterns are currently **detect-only**, not automatic masking targets
- this is deliberate:
  - arbitrary user regexes cannot be safely rewritten with the same guarantees as built-in detectors
  - allowing automatic masking for broad custom regexes would risk self-retrigger loops and misleading replacement behavior

**Verification completed**

- `npm test` -> **50/50 test files passed, 820/820 tests passed**
- `npm run build` -> **passed**
- `npm run lint` -> **passed with 8 pre-existing warnings in older test files, no errors**

**Live-provider validation — 2026-03-14**

- `48/48` live test paths passed across supported providers
- validation included `12` new company-pattern live paths covering `CP1`, `CP2`, `CP3`, and `CP4`
- dashboard-to-scanner propagation, widget rendering, and company-pattern execution all held under live provider conditions

**Epic 4 final assessment**

- Epic 4 now has the required product backbone: schema, templates, validation, dashboard management, runtime execution, portability, and regression coverage
- the runtime path is explicit rather than incidental: storage -> compilation -> scanner -> classifier -> findings -> widget/logging
- company-specific identifiers now surface with predictable labels and configured severity while preserving safe masking boundaries
- all Epic 4 workstreams are now executed and verified end-to-end

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

- [src/storage/events.ts](/Users/ignataleinikov/02_Projects/sunbreak/src/storage/events.ts)
- [src/storage/dashboard.ts](/Users/ignataleinikov/02_Projects/sunbreak/src/storage/dashboard.ts)
- [src/storage/types.ts](/Users/ignataleinikov/02_Projects/sunbreak/src/storage/types.ts)
- [src/ui/dashboard/ActivityLog.tsx](/Users/ignataleinikov/02_Projects/sunbreak/src/ui/dashboard/ActivityLog.tsx)
- [src/ui/dashboard/ReportCards.tsx](/Users/ignataleinikov/02_Projects/sunbreak/src/ui/dashboard/ReportCards.tsx)
- [src/entrypoints/dashboard/App.tsx](/Users/ignataleinikov/02_Projects/sunbreak/src/entrypoints/dashboard/App.tsx)
- [src/content/interceptor.ts](/Users/ignataleinikov/02_Projects/sunbreak/src/content/interceptor.ts)
- [src/content/orchestrator.ts](/Users/ignataleinikov/02_Projects/sunbreak/src/content/orchestrator.ts)
- possibly new provider data modules under `src/`

### Risks

- provider guidance becomes stale if it is too detailed and not maintained
- recovery flow becomes moralizing instead of helpful
- account-mode inference becomes brittle if attempted too early

### Must prove

- after sending something risky, a user knows what to do next
- provider guidance is concise and clearly useful
- file upload warning creates awareness without becoming annoying

### Detailed execution plan

Epic 5 should be executed as a response-and-guidance epic, not as a generic analytics improvement.

The product job here is very specific:

- when Sunbreak flags or misses something important, the user needs immediate next-step help
- the dashboard should explain recent risky events in human terms, not only counts and categories
- provider-specific advice must be actionable without pretending Sunbreak can fully infer account or retention state
- file upload detection needs to move from silent plumbing into visible companion guidance

### Execution principles

- keep all recovery flows metadata-only; never store prompt bodies or uploaded file contents
- prefer next-step guidance over retrospective blame
- make provider guidance structured and auditable so stale facts are easy to replace
- keep account-mode guidance narrow and confidence-bounded; do not over-infer enterprise vs consumer state
- treat recovery as a time-sensitive help surface, not a permanent compliance log

### Workstream 1 — Recovery event model and storage contract

**Objective:** evolve the event model from simple counters into a recovery-ready metadata record without storing sensitive content.

**Primary modules**

- [src/storage/types.ts](/Users/ignataleinikov/02_Projects/sunbreak/src/storage/types.ts)
- [src/storage/events.ts](/Users/ignataleinikov/02_Projects/sunbreak/src/storage/events.ts)
- [src/storage/dashboard.ts](/Users/ignataleinikov/02_Projects/sunbreak/src/storage/dashboard.ts)

**Tasks**

1. Extend `FlaggedEvent` with the metadata needed to drive recovery details:
   - provider/tool
   - action taken
   - categories
   - finding count
   - whether masking was available or used
   - whether the event involved file upload or prompt text only
   - stable recovery state fields such as `needsAttention`, `guidanceVersion`, or equivalent
2. Define which event details are computed at read time versus persisted at write time.
3. Add migration-safe defaults for older stored events.
4. Preserve FIFO trimming and write serialization guarantees in `events.ts`.
5. Add read helpers that support event detail retrieval without coupling UI directly to raw storage.

**Important boundary**

Recovery detail must stay metadata-only.
Do not add prompt excerpts, masked values, filenames beyond the minimum already surfaced, or any original content payloads to persistent storage.

**Exit criteria**

- event records can power a recovery detail view without storing prompt content
- older events remain readable after schema expansion

### Workstream 2 — Activity detail and accidental-send recovery UX

**Objective:** turn the activity log from a flat table into a place where a user can understand what happened and what to do next.

**Primary modules**

- [src/ui/dashboard/ActivityLog.tsx](/Users/ignataleinikov/02_Projects/sunbreak/src/ui/dashboard/ActivityLog.tsx)
- [src/entrypoints/dashboard/App.tsx](/Users/ignataleinikov/02_Projects/sunbreak/src/entrypoints/dashboard/App.tsx)
- likely new recovery detail components under `src/ui/dashboard/`

**Tasks**

1. Add row selection and a focused event detail surface:
   - drawer, side panel, or in-place expansion
2. Show event context in product language:
   - what Sunbreak detected
   - what action the user took
   - whether follow-up is recommended
3. Provide clear next-step CTA blocks such as:
   - review the sent conversation
   - delete or edit the message if the provider supports it
   - rotate exposed credential if the category implies secret exposure
   - notify an internal owner if the event maps to company-specific identifiers
4. Distinguish between events that are informational and events that need urgent follow-up.
5. Keep the empty state and list filtering simple; do not let the detail view become a generic admin console.

**Exit criteria**

- a flagged event can be opened and understood as a recovery story, not just a row in a table
- next steps are visible without requiring the user to infer them from category labels

### Workstream 3 — Provider guidance data model and maintenance boundary

**Objective:** replace static report-card text with a structured provider guidance layer that can power both reports and recovery detail.

**Primary modules**

- [src/ui/dashboard/ReportCards.tsx](/Users/ignataleinikov/02_Projects/sunbreak/src/ui/dashboard/ReportCards.tsx)
- likely new provider metadata modules under `src/`
- [src/ui/format.ts](/Users/ignataleinikov/02_Projects/sunbreak/src/ui/format.ts)

**Tasks**

1. Define a provider metadata schema with sections for:
   - deletion/edit availability
   - retention framing
   - training/privacy guidance
   - admin or workspace caveats
   - source/update provenance
2. Split evergreen provider descriptions from recovery-time instructions.
3. Decide which provider facts are safe to render as strong statements versus hedged guidance.
4. Move `ReportCards` off hard-coded inline copy onto the new metadata source.
5. Make guidance blocks reusable from both the reports tab and the event detail view.

**Important boundary**

Provider guidance must stay concise and maintainable.
Do not ship brittle long-form policy summaries that will go stale immediately.

**Exit criteria**

- provider guidance exists as structured data, not scattered dashboard copy
- the same source powers both overview/report surfaces and recovery detail

### Workstream 4 — Narrow provider/account guidance layer

**Objective:** give users the right provider help without pretending Sunbreak knows more than it actually does about their account state.

**Primary modules**

- likely new provider resolution helpers under `src/`
- [src/storage/types.ts](/Users/ignataleinikov/02_Projects/sunbreak/src/storage/types.ts)
- [src/ui/dashboard/ReportCards.tsx](/Users/ignataleinikov/02_Projects/sunbreak/src/ui/dashboard/ReportCards.tsx)

**Tasks**

1. Define the supported guidance states:
   - provider-known only
   - provider plus limited user-selected plan/account context
   - unknown/ambiguous fallback
2. Decide whether any account context is inferred automatically or selected manually in settings.
3. Keep the first implementation intentionally narrow:
   - consumer/general guidance by provider
   - optional stronger notes for API, workspace, or enterprise modes only if the user explicitly configures them
4. Ensure all ambiguous cases degrade to safe generic guidance instead of false certainty.
5. Add copy rules so the UI distinguishes:
   - “this provider usually allows...”
   - vs “your configured mode suggests...”

**Exit criteria**

- provider guidance feels relevant without overclaiming account awareness
- ambiguous account state does not produce misleading advice

### Workstream 5 — File upload warning productization

**Objective:** upgrade file upload detection from background plumbing into a user-facing warning and recovery signal.

**Primary modules**

- [src/content/interceptor.ts](/Users/ignataleinikov/02_Projects/sunbreak/src/content/interceptor.ts)
- [src/content/orchestrator.ts](/Users/ignataleinikov/02_Projects/sunbreak/src/content/orchestrator.ts)
- widget/toast modules under `src/ui/widget/`
- dashboard recovery/detail modules

**Tasks**

1. Define a first-class event type or event metadata path for file-related detections.
2. Decide where file warnings appear:
   - immediate in-content notice
   - dashboard recovery feed
   - both
3. Differentiate file-upload awareness from text-detection awareness:
   - “you attached a file”
   - “Sunbreak cannot inspect its contents”
   - “review whether the file itself is appropriate to share”
4. Ensure drag-and-drop, file input, and clipboard-file paths all feed the same recovery model.
5. Keep warnings non-blocking but visible enough to change behavior.

**Exit criteria**

- file uploads are surfaced as a real product signal
- users understand the limit: Sunbreak can detect the attachment event, not inspect the file body

### Workstream 6 — Dashboard report and recovery surface integration

**Objective:** make the reports tab and recovery surfaces support each other instead of duplicating disconnected content.

**Primary modules**

- [src/ui/dashboard/ReportCards.tsx](/Users/ignataleinikov/02_Projects/sunbreak/src/ui/dashboard/ReportCards.tsx)
- [src/ui/dashboard/ActivityLog.tsx](/Users/ignataleinikov/02_Projects/sunbreak/src/ui/dashboard/ActivityLog.tsx)
- [src/entrypoints/dashboard/App.tsx](/Users/ignataleinikov/02_Projects/sunbreak/src/entrypoints/dashboard/App.tsx)

**Tasks**

1. Decide how reports and activity link together:
   - report cards as evergreen guidance
   - activity detail as event-specific action center
2. Add affordances from flagged events into relevant provider guidance.
3. Clarify the reports tab so it feels like companion help, not policy wallpaper.
4. Revisit export/share surfaces so they do not suggest sensitive event data portability unless explicitly intended.
5. Make sure the dashboard hierarchy still feels lightweight after adding detail views.

**Exit criteria**

- recovery guidance and provider guidance reinforce each other
- the dashboard remains comprehensible and task-oriented

### Workstream 7 — Test and verification matrix

**Objective:** prove that recovery and guidance flows are trustworthy, actionable, and low-noise.

**Primary automated tests**

- event model migration and storage tests
- activity detail rendering tests
- provider guidance selection tests
- file-upload warning tests
- event-to-guidance integration tests

**Test additions required**

1. Event model:
   - older events still read after schema expansion
   - queue serialization still prevents clobber
   - recovery metadata never stores prompt bodies
2. Recovery detail:
   - event opens with the right severity and next-step blocks
   - provider-specific CTAs render for ChatGPT, Claude, and Gemini
   - generic fallback renders when provider/account state is ambiguous
3. File uploads:
   - drag/drop, file input, and clipboard-file paths all create the same warning semantics
   - warning copy is visible but non-blocking
4. Trust:
   - no recovery surface implies Sunbreak can inspect or undo provider-side state automatically

**Manual verification matrix**

1. Trigger a flagged prompt event and confirm the dashboard explains what happened and what to do next.
2. Open recovery detail for ChatGPT, Claude, and Gemini and confirm the provider guidance is concise and plausible.
3. Trigger a file upload on each supported provider and confirm awareness messaging appears without blocking normal workflow.
4. Verify ambiguous account state falls back to generic provider guidance rather than confident enterprise-specific advice.
5. Confirm no stored event payload includes prompt text, tokens, or file contents.

### Suggested implementation order inside the epic

1. Recovery event model and storage contract.
2. Activity detail and accidental-send recovery UX.
3. Provider guidance data model.
4. Narrow provider/account guidance layer.
5. File upload warning productization.
6. Dashboard report and recovery integration.
7. Test and verification pass.

### Epic 5 completion gate

Epic 5 should be considered complete only when all of the following are true:

- flagged events can power a useful recovery detail flow without storing prompt content
- activity history helps the user decide what to do next after a risky send
- provider guidance is structured, concise, and reusable across reports and recovery detail
- account-mode guidance stays narrow and does not overclaim certainty
- file upload detection is visible as a real product warning with clear scope limits
- automated and manual verification show the recovery flow is actionable rather than noisy

### Recommended commit sequence

1. `feat(recovery): add flagged-event recovery model`
2. `feat(dashboard): add recovery-focused activity detail view`
3. `feat(provider): add provider guidance data model`
4. `feat(content): surface file upload warning and recovery signal`
5. `refactor(dashboard): connect reports and recovery guidance`
6. `test(recovery): cover event-to-guidance flows`

### Implementation outcome — 2026-03-14

**Status:** completed for implementation and local verification scope; live provider validation still pending

**Implemented in this execution pass**

- expanded `FlaggedEvent` into a recovery-ready metadata contract:
  - source (`prompt` vs `file-upload`)
  - masking availability and usage
  - attention state
  - guidance versioning
  - backward-compatible normalization for older stored events
- added dashboard-side recovery detail with event selection, next-step guidance, masking context, and provider-specific recovery instructions
- replaced hard-coded provider copy with structured provider guidance data:
  - verified sources
  - recovery steps
  - caveats
  - reusable overview sections
- added explicit provider guidance modes in settings for narrow account-context selection:
  - general
  - consumer
  - business
  - enterprise
  - api
  - workspace
- kept account awareness intentionally bounded:
  - no automatic enterprise inference
  - ambiguous cases degrade to generic provider guidance
- productized file upload awareness:
  - visible widget toast
  - recovery-log event path
  - explicit copy that Sunbreak can detect the attachment event but cannot inspect file contents
- connected recovery and reports surfaces so they reinforce each other:
  - recovery detail links back to provider guidance
  - report cards summarize recent provider-specific flagged activity
  - report cards deep-link into filtered activity history
- extended regression coverage for:
  - event normalization and metadata-only guarantees
  - recovery detail rendering
  - provider guidance selection
  - guidance-mode settings updates
  - report/activity integration behavior

**Post-validation product adjustment**

- live validation showed that the recovery-assistance surface is still too noisy and cognitively heavy for general release
- Epic 5 is therefore now **implemented but gated off by default** behind a dedicated `recoveryAssistanceEnabled` setting
- the dashboard surfaces for:
  - recovery detail
  - provider-guidance reports
  - provider-guidance settings
  are intentionally dormant in the current product build
- the only Epic 5 user-facing behavior kept active by default is the file upload warning toast, because it is immediate, local, and low-noise
- file-upload recovery events are no longer logged while the gate is off
- this keeps the implementation available for future refinement without overloading current users

**Important product decisions captured in code**

- recovery storage remains metadata-only:
  - no prompt text
  - no token payloads
  - no file contents
- provider guidance is source-backed but intentionally concise rather than a long-lived policy encyclopedia
- account-mode specificity is only enabled through explicit user configuration, not guesswork
- file upload detection remains non-blocking by design; the warning is an awareness and recovery aid, not a content scanner

**Verification completed**

- `npm test` -> **53/53 test files passed, 840/840 tests passed**
- `npm run build` -> **passed**
- `npm run lint` -> **passed with 8 pre-existing warnings in older test files, no errors**

**Verification not completed yet**

- the Epic 5 manual/live matrix in this plan was not run by me in this environment yet:
  - live risky-send recovery checks on ChatGPT, Claude, and Gemini
  - live file-upload warning behavior across supported providers
  - end-to-end review of ambiguous account-mode fallback behavior in real product flows

**Epic 5 final assessment**

- Epic 5 now has the full product backbone required by the plan:
  - recovery-ready event metadata
  - user-facing activity detail
  - reusable provider guidance
  - bounded account-mode controls
  - file-upload warning productization
  - report/recovery integration
- the dashboard now explains flagged events as actionable recovery stories instead of static audit rows
- provider guidance is now auditable and reusable from one structured source rather than scattered copy
- the remaining gap is external live verification, not missing implementation work

---
---

## Epic 6 — Onboarding And Trust UX

**Purpose:** improve activation and make the product self-explanatory.

Epic 6 should be executed as an activation-and-trust epic, not as a generic marketing pass.
The goal is to make Sunbreak understandable in the first minute without turning the popup into a brochure or the dashboard into a setup wizard.

### Execution principles

- optimize for first clarity, not feature exposure
- keep the first-run experience short enough to complete in one sitting
- show local, concrete examples before asking users to trust abstract claims
- treat the popup as a status and next-action surface, not a mini dashboard
- avoid introducing any onboarding step that blocks core protection from starting
- make the trust story explicit:
  - Sunbreak runs locally
  - Sunbreak can warn, mask, and log metadata
  - Sunbreak cannot inspect uploaded file contents
- keep onboarding state simple and recoverable so the user can dismiss, revisit, or reset it safely

### Workstream 1 — Onboarding state model and lifecycle

**Objective:** add the minimum state needed to know whether a user is new, partially onboarded, or has completed trust setup.

**Likely modules**

- [src/storage/types.ts](/Users/ignataleinikov/02_Projects/sunbreak/src/storage/types.ts)
- [src/storage/dashboard.ts](/Users/ignataleinikov/02_Projects/sunbreak/src/storage/dashboard.ts)
- popup and dashboard entrypoints that need to branch on first-run state

**Tasks**

1. Define a compact onboarding state model:
   - not-started
   - in-progress
   - completed
   - dismissed or skipped if needed
2. Decide whether state is pure boolean or stage-based; prefer stage-based if sandbox and quick setup are distinct moments.
3. Add storage helpers for:
   - read current onboarding state
   - mark step complete
   - reset onboarding for future testing
4. Ensure default state is backward-compatible for existing users.
5. Decide whether onboarding auto-completes when the user has already:
   - experienced a real detection event
   - opened dashboard/settings before

**Exit criteria**

- onboarding state is durable, resettable, and backward-compatible
- existing users do not get trapped in a first-run flow unexpectedly

### Workstream 2 — First-run welcome flow and quick setup

**Objective:** create a short, useful onboarding flow that explains what Sunbreak does and gets the user to a confident default setup.

**Likely modules**

- [src/entrypoints/popup/App.tsx](/Users/ignataleinikov/02_Projects/sunbreak/src/entrypoints/popup/App.tsx)
- new popup onboarding components under `src/ui/popup/`
- dashboard settings surface if setup needs one explicit confirmation step

**Tasks**

1. Define the welcome flow shape:
   - one screen
   - two-step carousel
   - welcome + trust + next action
2. Keep the setup scope tight:
   - confirm extension is active
   - explain warn vs mask in plain language
   - direct the user to try a safe example
3. Add concise trust copy around:
   - local-only processing
   - no prompt-body persistence
   - uploaded-file limitation
4. Avoid forcing configuration during first run unless it clearly improves trust.
5. Add a skip/dismiss path that still leaves protection enabled.

**Exit criteria**

- first-run users can understand the product in under a minute
- setup does not require visiting the dashboard to become useful

### Workstream 3 — Try-it sandbox and guided first value

**Objective:** let users experience a safe detection/masking workflow before relying on Sunbreak in a real conversation.

**Likely modules**

- popup onboarding components
- possible lightweight sandbox route or panel in popup/dashboard
- classifier integration reused locally with static example text

**Tasks**

1. Decide where the sandbox lives:
   - popup inline panel
   - dashboard card
   - dedicated onboarding step
2. Use prebuilt sample prompts that demonstrate:
   - email or phone detection
   - token masking
   - file-upload limitation messaging
3. Keep the sandbox strictly local and synthetic; never mix with real provider tabs.
4. Show what Sunbreak would do:
   - warn
   - fix with smart masking
   - restore on copy
5. Make the sandbox optional and fast; it should build trust, not become homework.

**Exit criteria**

- users can see first value without sending a real risky prompt
- sandbox behavior mirrors the real product closely enough to build trust

### Workstream 4 — Popup simplification around status and next action

**Objective:** refactor the popup from a compact dashboard into a clearer control surface centered on current protection state and the next useful action.

**Likely modules**

- [src/entrypoints/popup/App.tsx](/Users/ignataleinikov/02_Projects/sunbreak/src/entrypoints/popup/App.tsx)
- [src/entrypoints/popup/popup.css](/Users/ignataleinikov/02_Projects/sunbreak/src/entrypoints/popup/popup.css)
- [src/ui/popup/ComplianceGauge.tsx](/Users/ignataleinikov/02_Projects/sunbreak/src/ui/popup/ComplianceGauge.tsx)

**Tasks**

1. Reframe popup sections around:
   - current protection status
   - what Sunbreak does
   - next action
2. Decide what to remove or demote:
   - over-dense recent activity rows
   - metrics that mean little for a new user
   - any charting that feels too compliance-heavy
3. Add clearer action paths:
   - open dashboard
   - open settings
   - try a safe example
4. Ensure the popup still works for experienced users after onboarding is complete.
5. Keep visual density low enough that the popup reads in one glance.

**Exit criteria**

- popup feels like a trustworthy companion, not a noisy miniature dashboard
- new users can tell whether Sunbreak is active and what to do next

### Workstream 5 — Dashboard framing and companion positioning

**Objective:** align dashboard framing so it reinforces the companion story established by onboarding and popup.

**Likely modules**

- [src/entrypoints/dashboard/App.tsx](/Users/ignataleinikov/02_Projects/sunbreak/src/entrypoints/dashboard/App.tsx)
- [src/ui/dashboard/BarChart.tsx](/Users/ignataleinikov/02_Projects/sunbreak/src/ui/dashboard/BarChart.tsx)
- [src/ui/dashboard/SettingsPanel.tsx](/Users/ignataleinikov/02_Projects/sunbreak/src/ui/dashboard/SettingsPanel.tsx)
- dashboard CSS and copy

**Tasks**

1. Revisit overview copy and section titles so they explain the product more clearly.
2. Add onboarding-aware empty states:
   - no events yet
   - no keywords yet
   - no company patterns yet
3. Decide whether the dashboard should surface:
   - quick-start checklist
   - trust notes
   - links back to sandbox or onboarding reset
4. Reduce enterprise/compliance framing if it confuses the companion story for new users.
5. Make sure the dashboard still serves experienced users without feeling infantilizing.

**Exit criteria**

- empty states help users understand what Sunbreak is waiting for
- dashboard framing matches the popup and onboarding narrative

### Workstream 6 — Trust copy and product language system

**Objective:** establish a consistent trust language set so popup, onboarding, dashboard, and toasts all describe Sunbreak in the same way.

**Likely modules**

- popup and dashboard copy surfaces
- toasts and warning strings
- any helper modules for static copy if needed

**Tasks**

1. Standardize how Sunbreak describes:
   - local processing
   - masking
   - logging
   - uploaded-file limitations
2. Remove copy that sounds:
   - moralizing
   - vague
   - compliance-brochure-like
3. Decide where trust notes belong:
   - onboarding only
   - popup footer
   - dashboard empty state
4. Make sure the same concept is not described three different ways across surfaces.
5. Review whether any current wording overstates certainty or capability.

**Exit criteria**

- the product uses one coherent trust vocabulary
- new users are less likely to infer capabilities Sunbreak does not actually have

### Workstream 7 — Validation and activation measurement

**Objective:** prove that the new onboarding and trust UX improve comprehension without adding friction.

**Automated coverage**

- onboarding state storage tests
- popup first-run and returning-user rendering tests
- sandbox interaction tests
- dashboard empty-state and first-run view tests
- regression tests for settings/dashboard/popup navigation from onboarding

**Manual validation**

1. Install the extension in a clean browser profile and verify:
   - first-run state appears once
   - setup can be skipped
   - setup can be completed without confusion
2. Use the try-it flow and confirm:
   - value is visible before any real prompt is sent
   - sample masking/detection behavior is understandable
3. Open the popup after onboarding and verify:
   - status is obvious
   - the next action is obvious
   - the popup is readable in under 10 seconds
4. Open the dashboard with no real events and verify:
   - empty states teach instead of dead-ending
   - trust copy is consistent with popup/onboarding

**Success signals**

- first-run users can explain what Sunbreak does after one pass
- users can see value before a real risky prompt
- popup and dashboard feel lighter, clearer, and less compliance-heavy

### Likely files/modules

- [src/entrypoints/popup/App.tsx](/Users/ignataleinikov/02_Projects/sunbreak/src/entrypoints/popup/App.tsx)
- [src/entrypoints/popup/popup.css](/Users/ignataleinikov/02_Projects/sunbreak/src/entrypoints/popup/popup.css)
- [src/ui/popup/ComplianceGauge.tsx](/Users/ignataleinikov/02_Projects/sunbreak/src/ui/popup/ComplianceGauge.tsx)
- [src/entrypoints/dashboard/App.tsx](/Users/ignataleinikov/02_Projects/sunbreak/src/entrypoints/dashboard/App.tsx)
- [src/ui/dashboard/BarChart.tsx](/Users/ignataleinikov/02_Projects/sunbreak/src/ui/dashboard/BarChart.tsx)
- [src/ui/dashboard/SettingsPanel.tsx](/Users/ignataleinikov/02_Projects/sunbreak/src/ui/dashboard/SettingsPanel.tsx)
- [src/storage/types.ts](/Users/ignataleinikov/02_Projects/sunbreak/src/storage/types.ts)
- [src/storage/dashboard.ts](/Users/ignataleinikov/02_Projects/sunbreak/src/storage/dashboard.ts)
- new onboarding/sandbox components under `src/ui/popup/` or `src/ui/dashboard/`

### Risks

- onboarding adds ceremony without delivering value
- popup becomes marketing copy instead of a useful control surface
- sandbox becomes a detour rather than a fast trust-builder
- trust copy overpromises capabilities or makes uploaded-file limitations more confusing
- experienced users feel slowed down by a flow that should mainly help new users

### Must prove

- new users understand the product quickly
- first value is visible before first real detection event
- popup feels lighter and more aligned with the companion thesis
- dashboard empty states help rather than overwhelm
- trust copy is concrete, consistent, and capability-bounded

### Recommended implementation order

1. onboarding state model and lifecycle
2. first-run welcome flow and quick setup
3. try-it sandbox and guided first value
4. popup simplification around status and next action
5. dashboard framing and companion positioning
6. trust copy and product language pass
7. validation and activation measurement

### Epic 6 completion gate

Epic 6 is complete only when:

- first-run and returning-user states are both handled intentionally
- onboarding can be completed or skipped without breaking protection
- a safe try-it path exists and demonstrates real product value
- the popup is materially simpler and clearer than the current stats-heavy version
- dashboard empty states and framing reinforce the same trust story
- automated coverage protects onboarding state and popup/dashboard branching
- manual clean-profile verification confirms that Sunbreak is understandable before first real use

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
