# Sunbreak Roadmap v2

**Status:** active working roadmap  
**Date:** 2026-03-12  
**Supersedes:** [docs/v1-roadmap.md](/private/tmp/sunbreak-roadmap-review/docs/v1-roadmap.md) as the primary planning document  
**Companion review:** [docs/roadmap-v2/research/2026-03-12-roadmap-review-ai-safety-companion.md](/private/tmp/sunbreak-roadmap-review/docs/roadmap-v2/research/2026-03-12-roadmap-review-ai-safety-companion.md)

## Package Map

- **This file:** the active roadmap
- **Assessment:** [docs/roadmap-v2/research/2026-03-12-roadmap-review-ai-safety-companion.md](/private/tmp/sunbreak-roadmap-review/docs/roadmap-v2/research/2026-03-12-roadmap-review-ai-safety-companion.md)
- **Current-state gap analysis:** [docs/roadmap-v2/research/2026-03-12-roadmap-v2-gap-analysis-and-execution-plan.md](/private/tmp/sunbreak-roadmap-review/docs/roadmap-v2/research/2026-03-12-roadmap-v2-gap-analysis-and-execution-plan.md)
- **Execution plan:** [docs/roadmap-v2/plans/2026-03-12-roadmap-v2-implementation-plan.md](/private/tmp/sunbreak-roadmap-review/docs/roadmap-v2/plans/2026-03-12-roadmap-v2-implementation-plan.md)

---

## Product Direction

Sunbreak should evolve toward:

**The in-browser AI safety companion for work.**

Not just a prompt scanner. Not just a warning layer. A tool that helps people use AI safely without feeling blocked, watched, or slowed down.

That means the roadmap should optimize for:

1. in-context usefulness
2. employee trust
3. safety without interruption
4. company-specific relevance
5. future enterprise value without enterprise-first UX

---

## Core Principles

- **Enable, never punish.** Sunbreak can warn, guide, suggest, and help recover. It should not feel like a hostile compliance gate.
- **Invisible when clean.** If nothing is risky, the extension should stay quiet.
- **Helpful when risky.** When something is risky, Sunbreak should help the user keep working, not just tell them no.
- **Local by default.** Local classification and minimal storage remain part of the product trust story.
- **Better defaults before more settings.** Trust comes from good behavior first, customization second.
- **Daily loop before platform expansion.** Nail the core loop before broadening channels, browsers, or reporting surfaces.

---

## The Core User Loop

This is the loop the roadmap should strengthen above all else:

1. user writes or pastes a prompt
2. Sunbreak detects risky content inline
3. Sunbreak explains what is risky and why
4. user fixes, masks, or safely reframes the prompt in one step
5. user continues working
6. if something still goes wrong, Sunbreak helps them recover

If this loop is strong, the rest of the roadmap compounds.

---

## What Must Be True After This Roadmap

By the end of this roadmap, Sunbreak should feel like:

- a polished in-page assistant, not a prototype widget
- meaningfully better than regex-only prompt scanning
- useful even when the user does not trigger a finding every session
- adaptable to company-specific risk patterns
- trustworthy enough that a security-conscious user would leave it on daily

---

## Priority Buckets

### Bucket A — Product Truth

These define whether Sunbreak feels like the right product.

- stable inline prompt safety UX
- context-aware detection
- smart reversible masking
- company-specific patterns
- accidental-send recovery
- provider/account safety guidance

### Bucket B — Trust And Adoption

- first-run onboarding
- try-it sandbox
- explanation and confidence cues
- lightweight popup/dashboard support surfaces

### Bucket C — Operational Tuning

- detector toggles
- allowlists
- sensitivity controls
- notification preferences

### Bucket D — Strategic Expansion

- compliance data foundation
- multi-browser support
- advanced local models
- connector awareness
- agent / browser / screenshot safety

---

## Phase 1 — Finish The Core Interaction Layer

**Goal:** make Sunbreak feel stable, quiet, and trustworthy during normal use.

### Outcomes

- widget placement and anchoring are reliable across ChatGPT, Claude, and Gemini
- extension disabled state is visually and behaviorally correct
- inline findings experience feels intentional, not bolted on
- no overlap, flicker, or "why is this here?" moments

### Must ship

- finish design system refactor and visual consistency work
- finalize widget positioning and anchor reliability
- ensure hidden/disabled behavior is correct
- tighten inline findings UX and supporting states
- preserve zero-friction clean state

### Success criteria

- users trust the widget placement
- clean prompts create no distracting UI
- flagged prompts feel understandable, not jarring

---

## Phase 2 — Context-Aware Detection With Explanations

**Goal:** improve detection quality in the categories that matter most, without adding model complexity yet.

### Outcomes

- better precision and confidence than regex-only matching
- more useful enterprise-relevant categories
- clearer explanation of why something was flagged

### Must ship

- context scorer layered onto existing engine
- confidentiality markers
- financial indicators with temporal/context clues
- legal privilege markers
- HR / compensation context detection
- code structure and secret-adjacent context detection
- security infrastructure indicators
- explanation strings for findings

### Nice to have

- confidence display in UI
- user-visible "why this was flagged" affordance

### Success criteria

- false positives drop in ambiguous cases
- users understand why high-value content is being flagged
- Sunbreak starts catching more than just obvious PII

---

## Phase 3 — Smart Reversible Masking

**Goal:** help users keep working safely instead of forcing low-quality redaction.

### Outcomes

- masking preserves enough context for useful AI responses
- users can safely send and later restore information when needed
- Sunbreak becomes an active workflow aid, not only a warning mechanism

### Must ship

- descriptive masked tokens by finding type
- safe fallback logic for ambiguous multi-person prompts
- in-memory mapping only, per conversation
- restore-on-copy flow
- visible masked-state indicator near the input
- clear expiry and clear-state behavior

### Nice to have

- per-finding preview of replacement before apply
- restore count and session state in dashboard/activity view

### Success criteria

- masked prompts remain useful to the AI
- restore behavior is understandable and trustworthy
- users prefer masking over "send anyway"

---

## Phase 4 — Company-Specific Classification

**Goal:** make Sunbreak feel relevant to real company environments, not just generic privacy scanning.

### Outcomes

- users can teach Sunbreak what matters in their org
- company-specific identifiers become first-class findings
- Sunbreak becomes more compelling for team evaluation

### Must ship

- pattern template library for common internal/company data
- custom regex creation flow
- test-against-sample UI
- per-pattern label and severity
- JSON import/export

### Nice to have

- starter packs by function, e.g. developer, finance, ops
- recommended template presets on onboarding

### Success criteria

- users can add internal codenames, URLs, IDs, and account formats without friction
- findings become meaningfully more relevant than generic PII scanners

---

## Phase 5 — Recovery And Safety Guidance

**Goal:** turn the anxious "I already sent it" moment into a trust-building workflow.

### Outcomes

- Sunbreak helps after mistakes, not just before them
- users understand what to do next for each provider
- provider/account setup becomes part of safe AI behavior

### Must ship

- accidental-send recovery flow
- flagged activity review focused on recent risky sends
- provider-specific deletion/help links
- narrow provider safety guidance for ChatGPT, Claude, Gemini
- setup checklist for key privacy controls where applicable

### Add in this phase if feasible

- account/mode awareness:
  - personal vs work account if inferable
  - temporary/private chat modes if inferable
  - visible memory/history/training-related cues if inferable

### Success criteria

- users feel helped rather than blamed after risky sends
- Sunbreak has ongoing value even when no prompt is actively flagged

---

## Phase 6 — Onboarding And Trust Surfaces

**Goal:** make the product self-explanatory and easier to adopt daily.

### Outcomes

- new users understand what Sunbreak does within minutes
- users can experience value before encountering a real risky prompt
- support surfaces stay lightweight

### Must ship

- welcome/onboarding flow
- quick setup with a few meaningful defaults
- try-it sandbox
- concise popup focused on status and one next action

### Nice to have

- first useful tip based on early behavior
- explainability helpers like "why flagged" and "how to rephrase safely"

### Success criteria

- users reach first value quickly
- popup/dashboard support the in-page product instead of competing with it

---

## Phase 7 — Controlled Configurability

**Goal:** add tuning without turning Sunbreak into a settings-heavy product.

### Outcomes

- advanced users can shape behavior
- most users still rely on sensible defaults

### Must ship

- detector category toggles
- allowlist/ignore patterns
- limited sensitivity controls where they clearly help

### Explicitly defer unless demanded by evidence

- large notification mode matrix
- many scan trigger combinations
- complex per-category behavioral permutations

### Success criteria

- users can reduce friction without having to "operate" the product

---

## Phase 8 — Strategic Expansion Tracks

These should be developed only after the daily loop is strong.

### Track A — Privacy Intelligence Expansion

- richer provider profiles
- mode/account-specific guidance
- change alerts when provider policies shift

### Track B — Safe Prompt Transformation

- safer rewrite suggestions beyond masking
- static transformation templates for common risky workflows

### Track C — Connector And Workspace Awareness

- understand when providers are operating with connected internal sources
- warn when connected data changes the risk profile

### Track D — Agent / Browser / Screenshot Safety

- screenshots and pasted image workflows
- file upload and transcript risk handling
- longer-term support for tool-using / computer-using AI workflows

### Track E — Advanced Local Intelligence

- local NER / SLM experiments when justified
- monitor Chrome built-in AI capabilities and on-device model maturity

### Track F — Distribution And Enterprise Foundations

- multi-browser support
- compliance metadata/reporting foundation
- team distribution mechanisms later, if product pull appears

---

## Features To Pull Forward

These are the features the old roadmap underweighted and this roadmap moves up.

- smart reversible masking
- provider/account safety guidance
- stronger recovery flow
- explanation and confidence cues
- company-specific patterns as a core pillar, not a side feature

---

## Features To Narrow Or Push Down

- broad settings and preference matrices
- large AI learning hub/content program
- multi-browser support as a near-term priority
- compliance reporting as a user-facing deliverable
- model-heavy classification before the context-aware layer proves out

---

## User Journeys This Roadmap Optimizes For

### 1. The Careful Professional

- uses AI constantly
- wants speed with low anxiety
- needs one-click safe fixes that preserve workflow

### 2. The "I Already Sent It" User

- needs immediate next-step help
- values recovery more than blame

### 3. The Security-Conscious Team Evaluator

- wants to prove Sunbreak can handle company-specific patterns
- cares that everything stays local

### 4. The Provider-Confused User

- does not fully understand retention, memory, training, or account-mode differences
- benefits from subtle setup and context guidance

### 5. The Developer With Real Secrets Nearby

- pastes code, logs, env vars, hostnames, stack traces
- needs safe debugging workflows, not generic PII warnings

---

## Explicit Non-Goals For This Version

- enterprise admin console
- remote telemetry backend
- blocking-by-default product behavior
- broad reporting surface
- rich content hub as a major product surface
- full file content inspection
- general agent security platform
- server-side LLM classification

---

## Suggested Execution Order

If work must be sequenced aggressively, do it in this order:

1. Phase 1 — finish the core interaction layer
2. Phase 2 — context-aware detection with explanations
3. Phase 3 — smart reversible masking
4. Phase 4 — company-specific classification
5. Phase 5 — recovery and safety guidance
6. Phase 6 — onboarding and trust surfaces
7. Phase 7 — controlled configurability
8. Phase 8 — strategic expansion tracks

---

## Final Standard

This roadmap is working if, after using Sunbreak for a week, a user would say:

> "It helps me use AI at work without second-guessing myself."

Not:

> "It catches stuff sometimes."

That is the standard the next version should be built against.
