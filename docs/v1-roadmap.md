# Sunbreak v1 Roadmap

**Goal:** Ship a meaningful v1 that covers ~35% of enterprise-relevant sensitive data
(up from ~10% with regex-only), is configurable per user needs, and handles key user
journeys beyond just detection.

**Target audience:** Security-conscious individuals using AI at work AND security teams
evaluating tools for their org.

**Gate:** Do not ship until Milestones 1–6 are complete.

---

## Milestone 1: Finish Current Branch

Complete in-progress design system work and fix known UX issues.

- [ ] Complete design system refactor (CSS tokens, data-severity, adoptedStyleSheets)
- [ ] Widget positioning fix — badge below textarea, never overlaps text
- [ ] Fix E4 — widget visible when extension is disabled (should hide)

**Origin:** [design-system-refactor-plan](plans/2026-03-11-design-system-refactor-plan.md), [fix-widget-positioning-plan](plans/2026-03-11-fix-widget-positioning-plan.md)

---

## Milestone 2: Context-Aware Detection

The big coverage jump. Extends existing `engine.ts` with a `ContextScorer` module —
no new paradigm. Keyword proximity within 250 chars raises confidence
(65% pattern-only → 75% +1 keyword → 85% +2 keywords).

New detectors:

| Detector | What it catches | Example |
|----------|----------------|---------|
| Confidentiality markers | Document classification labels | "CONFIDENTIAL", "INTERNAL ONLY", "DRAFT — NOT FOR DISTRIBUTION" |
| Financial indicators | Revenue/forecast figures + temporal context | "$4.2M projected Q3 revenue" |
| Legal privilege | Attorney-client, work product markers | "privileged and confidential", "attorney work product" |
| HR / compensation | Salary, comp data + context keywords | "base salary $185k", "performance review" |
| Code structure | Functions, imports, connection strings, env vars | `DATABASE_URL=postgres://...`, `export function processPayroll` |
| Security infrastructure | Internal hostnames, certs, private keys | `admin.corp.internal:8443`, `-----BEGIN RSA PRIVATE KEY-----` |

**Origin:** [sensitive-data-roadmap-brainstorm](brainstorms/2026-03-06-sensitive-data-roadmap-brainstorm.md) (Phase 2, Tier 1)

---

## Milestone 3: Company-Specific Classification

The customization story for security teams. "Can I add our patterns?" — yes.

- [ ] Pattern template library (Jira IDs, internal URLs, project codenames, AWS account IDs)
- [ ] Custom regex builder with test-against-sample UI
- [ ] Category labels and severity assignment per pattern
- [ ] Import/export config as JSON

**Origin:** [v02-ai-safety-companion-brainstorm](brainstorms/2026-03-04-v02-ai-safety-companion-brainstorm.md) (Feature 2)

---

## Milestone 4: Configurability

Detection controls and behavior preferences so users can tune Sunbreak to their workflow.

### Detection controls
- [ ] Toggle detector categories on/off (e.g. disable phone detection if not relevant)
- [ ] Sensitivity threshold per category (low/medium/high or confidence cutoff)
- [ ] Allowlist — patterns to always ignore (e.g. "my own email is fine")

### Behavior preferences
- [ ] Action on detection: warn (default), auto-mask, or silent log
- [ ] Notification style: inline widget (default), subtle badge-only, or toast
- [ ] Scan triggers: on-type (default), on-paste-only, or on-submit-only

---

## Milestone 5: User Journeys

Key flows beyond core detection.

### First-time onboarding
- [ ] Welcome screen on install explaining what Sunbreak does
- [ ] Quick setup wizard: choose sensitivity level, add personal allowlist items
- [ ] "Try it" sandbox — paste sample text to see detection in action

### Recovery flow
- [ ] "I accidentally sent something sensitive" — guidance on what to do next
- [ ] Link to provider-specific data deletion instructions (ChatGPT, Claude, Gemini)
- [ ] Activity log highlights recently sent flagged items for review

### File upload warning
- [ ] Toast when user attaches a file: "File contents are not scanned — review before sending"
- [ ] Non-blocking, dismissible, shown once per file attachment

---

## Milestone 6: Ship Prep

- [ ] Cross-tool E2E tests on all 3 sites (ChatGPT, Claude, Gemini)
- [ ] 30-minute soak test (extended use without memory leaks or performance degradation)
- [ ] Performance validation — classification still < 50ms with context-aware detectors
- [ ] Accessibility pass — WCAG AA (E5 tab suspension, A2 screen reader, A3 reduced motion)
- [ ] Chrome Web Store listing (description, screenshots, privacy policy)

---

## Post-v1 (prioritize when we get closer)

- Privacy intelligence — provider risk profiles, setup guides
- Glanceable popup redesign
- Multi-browser support (Edge, Firefox, Arc)
- Config sharing / corporate config distribution
- AI adoption hub — micro-tips, prompt templates
- NER phase (DistilBERT — names, orgs, locations, medical terms)
- Compliance reporting foundation
- Full file content scanning

---

## Source Documents

This roadmap consolidates thinking from:

| Document | What it covers |
|----------|---------------|
| [founding-SPEC.md](founding/founding-SPEC.md) | Full product specification (6 sections) |
| [founding-PLAN.md](founding/founding-PLAN.md) | Original phase-based implementation checklist |
| [secure-byoai-product-brainstorm](brainstorms/2026-03-02-secure-byoai-product-brainstorm.md) | v1 positioning and technical decisions |
| [v02-ai-safety-companion-brainstorm](brainstorms/2026-03-04-v02-ai-safety-companion-brainstorm.md) | 8 features across 3 pillars for v0.2+ |
| [sensitive-data-roadmap-brainstorm](brainstorms/2026-03-06-sensitive-data-roadmap-brainstorm.md) | Detection capability progression (regex → NER → SLM) |
| [design-system-refactor-plan](plans/2026-03-11-design-system-refactor-plan.md) | CSS tokens and architecture cleanup |
| [fix-widget-positioning-plan](plans/2026-03-11-fix-widget-positioning-plan.md) | Badge below textarea |
