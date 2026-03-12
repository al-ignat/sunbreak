# Sunbreak Roadmap v2 — Current-State Assessment and Execution Plan

**Date:** 2026-03-12  
**Roadmap target:** [docs/roadmap-v2/README.md](/private/tmp/sunbreak-roadmap-review/docs/roadmap-v2/README.md)  
**Companion assessment:** [docs/roadmap-v2/research/2026-03-12-roadmap-review-ai-safety-companion.md](/private/tmp/sunbreak-roadmap-review/docs/roadmap-v2/research/2026-03-12-roadmap-review-ai-safety-companion.md)

---

## Executive Summary

The codebase is further along than the old roadmap suggested.

You do **not** have a blank-slate v1.
You already have:

- a working content runtime across ChatGPT, Claude, and Gemini
- a live scanner with inline findings state
- a widget, findings panel, hover card, and text overlay
- masking infrastructure with restore-on-copy
- popup and dashboard surfaces
- storage-backed settings, keywords, stats, and activity log
- a background entrypoint for defaults and pruning
- substantial unit and E2E test coverage in the repo

So the next roadmap should not be executed like:

- build each phase from scratch

It should be executed like:

- stabilize what exists
- deepen shallow implementations
- connect already-built primitives into complete user journeys

That changes the plan materially.

---

## How Far Along You Are, Phase By Phase

## Phase 1 — Finish The Core Interaction Layer

**Status:** substantial partial, close enough to count as active current work

### Already present

- widget/controller architecture exists
- send-button/input-box anchoring exists
- inline overlay exists
- hover card exists
- findings panel exists
- send toast exists
- restore toast exists
- design system/token work is present

### Evidence

- [src/ui/widget/widget-controller.ts](/private/tmp/sunbreak-roadmap-review/src/ui/widget/widget-controller.ts)
- [src/ui/widget/TextOverlay.tsx](/private/tmp/sunbreak-roadmap-review/src/ui/widget/TextOverlay.tsx)
- [src/ui/widget/HoverCard.tsx](/private/tmp/sunbreak-roadmap-review/src/ui/widget/HoverCard.tsx)
- [src/ui/widget/FindingsPanel.tsx](/private/tmp/sunbreak-roadmap-review/src/ui/widget/FindingsPanel.tsx)
- [src/ui/widget/position.ts](/private/tmp/sunbreak-roadmap-review/src/ui/widget/position.ts)

### Still missing or incomplete

- hard confidence that widget behavior is stable across all three sites
- final interaction polish and visual consistency
- stronger explicit lifecycle states
- cleaner anchor strategy selection
- likely still some overlap/flicker/edge-case instability given the recent anchor work

### Assessment

This phase is **not** a new epic. It is the tail end of current implementation.

---

## Phase 2 — Context-Aware Detection With Explanations

**Status:** mostly missing

### Already present

- regex classification engine
- keyword detector
- finding confidence values
- finding labels and placeholders

### Evidence

- [src/classifier/engine.ts](/private/tmp/sunbreak-roadmap-review/src/classifier/engine.ts)
- [src/classifier/keywords.ts](/private/tmp/sunbreak-roadmap-review/src/classifier/keywords.ts)
- [src/classifier/types.ts](/private/tmp/sunbreak-roadmap-review/src/classifier/types.ts)

### Still missing or incomplete

- context scorer
- contextual confidence boosting
- confidentiality/financial/legal/HR/security/code-context detectors
- explanation strings that describe why a finding was triggered
- explicit UI treatment of confidence/explanation

### Assessment

This is the largest **real product capability gap** in the roadmap.

---

## Phase 3 — Smart Reversible Masking

**Status:** partial, stronger than expected

### Already present

- in-memory masking map with TTL
- fix and fix-all flows populate masking state
- restore-on-copy flow
- restore toast
- masked values visible in the findings panel
- masking toggle in settings

### Evidence

- [src/content/masking-map.ts](/private/tmp/sunbreak-roadmap-review/src/content/masking-map.ts)
- [src/content/clipboard-interceptor.ts](/private/tmp/sunbreak-roadmap-review/src/content/clipboard-interceptor.ts)
- [src/ui/widget/RestoreToast.tsx](/private/tmp/sunbreak-roadmap-review/src/ui/widget/RestoreToast.tsx)
- [src/ui/widget/FindingsPanel.tsx](/private/tmp/sunbreak-roadmap-review/src/ui/widget/FindingsPanel.tsx)
- [src/ui/dashboard/SettingsPanel.tsx](/private/tmp/sunbreak-roadmap-review/src/ui/dashboard/SettingsPanel.tsx)

### Still missing or incomplete

- descriptive masked tokens are not yet the product standard everywhere
- safe rewrite quality is still basic placeholder replacement in core flow
- person-aware grouping and richer token semantics are missing
- recovery and visibility around masking are still tactical, not product-polished

### Assessment

This phase is **partially built infrastructure plus unfinished product UX**.

That is good news. You do not need to invent it. You need to finish and sharpen it.

---

## Phase 4 — Company-Specific Classification

**Status:** early partial

### Already present

- custom keyword list
- import/export for keywords
- dashboard UI for keyword management
- category toggles infrastructure

### Evidence

- [src/ui/dashboard/KeywordManager.tsx](/private/tmp/sunbreak-roadmap-review/src/ui/dashboard/KeywordManager.tsx)
- [src/storage/dashboard.ts](/private/tmp/sunbreak-roadmap-review/src/storage/dashboard.ts)

### Still missing or incomplete

- pattern template library
- custom regex creation UI
- sample-testing UI
- per-pattern labels
- per-pattern severity
- anything stronger than keywords

### Assessment

This is **conceptually started but functionally still early**.

Keywords prove the direction. They are not enough to count as the roadmap feature.

---

## Phase 5 — Recovery And Safety Guidance

**Status:** mixed; recovery infrastructure exists, guidance layer mostly missing

### Already present

- flagged event logging
- activity log
- popup/dashboard surfaces for reviewing events
- file upload detection hooks

### Evidence

- [src/storage/events.ts](/private/tmp/sunbreak-roadmap-review/src/storage/events.ts)
- [src/ui/dashboard/ActivityLog.tsx](/private/tmp/sunbreak-roadmap-review/src/ui/dashboard/ActivityLog.tsx)
- [src/content/interceptor.ts](/private/tmp/sunbreak-roadmap-review/src/content/interceptor.ts)

### Still missing or incomplete

- actual accidental-send recovery flow
- provider-specific deletion/help guidance
- provider/account setup guidance
- account/mode awareness
- explicit file-upload warning experience beyond the detection hooks

### Assessment

The **data plumbing is ahead of the user experience** here.

This is a good place to build because the storage and dashboard foundations already exist.

---

## Phase 6 — Onboarding And Trust Surfaces

**Status:** partial

### Already present

- popup exists
- dashboard exists
- report card style component exists
- settings and activity tabs exist

### Evidence

- [src/entrypoints/popup/App.tsx](/private/tmp/sunbreak-roadmap-review/src/entrypoints/popup/App.tsx)
- [src/entrypoints/dashboard/App.tsx](/private/tmp/sunbreak-roadmap-review/src/entrypoints/dashboard/App.tsx)
- [src/ui/dashboard/ReportCards.tsx](/private/tmp/sunbreak-roadmap-review/src/ui/dashboard/ReportCards.tsx)

### Still missing or incomplete

- onboarding flow
- try-it sandbox
- sharper popup aligned with v2 positioning
- trust/explanation surfaces framed around product value rather than just telemetry

### Assessment

The support surfaces exist, but the **adoption story is not yet implemented**.

---

## Phase 7 — Controlled Configurability

**Status:** partial

### Already present

- extension enable/disable
- intervention mode
- masking on/off
- detector toggles
- custom keywords

### Evidence

- [src/ui/dashboard/SettingsPanel.tsx](/private/tmp/sunbreak-roadmap-review/src/ui/dashboard/SettingsPanel.tsx)
- [src/storage/types.ts](/private/tmp/sunbreak-roadmap-review/src/storage/types.ts)

### Still missing or incomplete

- allowlists
- sensitivity controls
- richer tuning where justified
- clearer explanation of settings consequences

### Assessment

Enough exists to avoid treating this as greenfield. But it should stay behind the workflow-value work.

---

## Phase 8 — Strategic Expansion

**Status:** mostly not started, with minor foundations

### Already present

- background entrypoint exists
- storage/reporting metadata foundations exist
- codebase structure can support more detectors and surfaces

### Evidence

- [src/entrypoints/background.ts](/private/tmp/sunbreak-roadmap-review/src/entrypoints/background.ts)
- [src/storage/dashboard.ts](/private/tmp/sunbreak-roadmap-review/src/storage/dashboard.ts)

### Mostly missing

- privacy intelligence/provider profiles
- connector awareness
- account/mode awareness
- safe prompt transformation
- advanced local intelligence
- multi-browser support
- deeper reporting/compliance layer

### Assessment

These are still strategic tracks, not active build work.

---

## Current Maturity Snapshot

If forced into a blunt maturity map:

- **Built enough to stabilize:** Phase 1
- **Partially built, needs product completion:** Phases 3, 5, 6, 7
- **Started but still early:** Phase 4
- **Still mostly net-new:** Phases 2 and 8

That means your next roadmap execution should not begin with Phase 6 or Phase 7 work. It should begin by converting Phase 1 and Phase 3 from "promising implementation" into "reliable product behavior," while Phase 2 becomes the first major net-new capability build.

---

## What This Means For Build Order

The right build order is **not** the same as the roadmap phase order on paper.

The best execution order from the current codebase is:

1. finish/stabilize Phase 1
2. build Phase 2
3. finish/productize Phase 3
4. expand Phase 4
5. productize Phase 5
6. sharpen Phase 6
7. add the minimum useful Phase 7 work
8. leave Phase 8 as deliberate strategic tracks

That is the shortest path to a real product step-change.

---

## Concrete Epics

These are the epics I would actually execute from here.

## Epic 1 — Interaction Layer Hardening

**Maps to:** Phase 1  
**Type:** stabilize and finish existing work

### Scope

- finalize anchor behavior across all supported providers
- tighten widget lifecycle and degraded states
- remove remaining overlap/flicker/visibility edge cases
- harden disabled/hidden behavior
- complete visual and interaction consistency across widget, hover card, findings panel, and toasts

### Why first

Everything else sits on this interaction layer. If it feels unstable, later product improvements will be discounted by users.

### Must prove

- no obvious anchor glitches across ChatGPT, Claude, Gemini
- no widget shown when extension is disabled
- no text-overlay drift during normal typing/scrolling
- interaction surfaces feel coherent rather than stitched together

---

## Epic 2 — Context-Aware Detection Engine

**Maps to:** Phase 2  
**Type:** first major net-new capability

### Scope

- add context scorer abstraction
- implement first context-aware categories
- produce explanation data alongside findings
- expose confidence/explanation in UI where useful

### Why second

This is the highest-leverage improvement to actual detection value. It materially changes what Sunbreak can catch and how trustworthy it feels.

### Must prove

- catches categories beyond raw regex patterns
- explanation data is user-comprehensible
- no major latency regression in typical prompts
- false positives improve in ambiguous cases

---

## Epic 3 — Reversible Masking Productization

**Maps to:** Phase 3  
**Type:** finish and deepen existing infrastructure

### Scope

- upgrade placeholders into descriptive masking
- improve fix/fix-all wording and replacement semantics
- make restore-on-copy feel trustworthy and obvious
- improve visibility of masked state
- document and test expiry/conversation reset behavior

### Why third

This is the first major workflow feature that makes Sunbreak actively helpful, not just protective.

### Must prove

- masked prompts stay useful to the AI
- users understand what will be restored and when
- masked state never leaks into persistent storage
- restore flow is safe by default and easy to decline

---

## Epic 4 — Company-Specific Patterns

**Maps to:** Phase 4  
**Type:** extend a real but shallow capability

### Scope

- move from keywords-only to pattern templates plus custom regex
- add sample testing and labeling
- support severity/category assignment
- keep import/export simple

### Why fourth

This creates the bridge from individual utility to team relevance and becomes one of the strongest evaluation hooks.

### Must prove

- users can add internal patterns without confusion
- patterns are testable before activation
- labels/severity actually improve in-product usefulness
- import/export is stable and understandable

---

## Epic 5 — Recovery And Provider Guidance

**Maps to:** Phase 5  
**Type:** convert existing telemetry/data into a user journey

### Scope

- build accidental-send recovery flow
- connect flagged events to actionable next steps
- add provider-specific deletion/help/setup links
- add a first narrow provider/account safety layer

### Why fifth

The foundations exist, but the product moment does not. This epic turns logs into help.

### Must prove

- a user who already sent something sensitive knows what to do next
- provider guidance is relevant and current enough to trust
- the feature feels helpful rather than alarmist
- activity review supports action, not just record-keeping

---

## Epic 6 — Onboarding And Trust UX

**Maps to:** Phase 6  
**Type:** adoption/product communication

### Scope

- welcome/onboarding
- quick setup with minimal meaningful choices
- try-it sandbox
- simplify popup around product value, not only stats

### Why sixth

This improves activation, but it should come after the core daily loop is stronger.

### Must prove

- new users understand Sunbreak quickly
- first value is visible before a real risky moment occurs
- popup/dashboard reinforce the product story

---

## Epic 7 — Controlled Configurability

**Maps to:** Phase 7  
**Type:** targeted tuning

### Scope

- add allowlists
- add limited sensitivity controls only where clearly beneficial
- resist large preference matrices

### Why seventh

The code already has settings infrastructure, but too much tuning too early will dilute the product.

### Must prove

- power users can reduce friction
- average users do not need to understand the settings model to succeed
- settings do not create contradictory or confusing behavior

---

## Strategic Tracks, Not Near-Term Epics

Keep these as tracked themes, not active build commitments:

- privacy intelligence expansion
- connector awareness
- safe prompt transformation
- screenshot / transcript / agent workflow safety
- advanced local models
- multi-browser support
- compliance/reporting expansion

---

## Recommended Execution Sequence

Here is the concrete order I would use:

1. **Epic 1 — Interaction Layer Hardening**
2. **Epic 2 — Context-Aware Detection Engine**
3. **Epic 3 — Reversible Masking Productization**
4. **Epic 4 — Company-Specific Patterns**
5. **Epic 5 — Recovery And Provider Guidance**
6. **Epic 6 — Onboarding And Trust UX**
7. **Epic 7 — Controlled Configurability**

This preserves the v2 product direction while respecting the current codebase reality.

---

## Repo Health Notes

- The repository contains broad unit and E2E tests under `tests/`
- I did **not** fully revalidate test status in this isolated worktree because dependencies are not installed here, so `npm test` cannot run as-is
- This assessment is based on code and existing tests, not on a fresh green test run in the `roadmap-review` worktree

That means the feature maturity judgment is reliable, but current branch health should still be rechecked in a dependency-equipped workspace before execution planning becomes commit-level tasking.

---

## Final Judgment

You are not at the beginning of the roadmap.

You are at:

- late Phase 1
- pre-Phase 2
- mid-Phase 3 infrastructure
- early Phase 4
- pre-productized Phase 5/6/7

That is a strong position.

The roadmap should now be executed as **finish + deepen + connect**, not **start from zero**.
