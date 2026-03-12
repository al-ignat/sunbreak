# Sunbreak Roadmap

## Completed

### Phases 1–5 (done)

Scaffolding, DOM observation, classification engine, overlay UI, dashboard. 681 unit tests passing. All core features shipped and merged to `main`.

### Post-phase refinements (done, merged to main)

- Inline detection UX
- Smart descriptive tokens
- Reversible masking (clipboard restore)
- Pixel-perfect UI redesign
- Extended widget
- Design system refactor (three-layer tokens, data-severity, adoptedStyleSheets)

---

## In Progress

### Send-button anchor (`feat/send-button-anchor`)

Widget anchors to the send button's left edge, vertically centered, expanding leftward. Falls back to input-box positioning when send button unavailable. Per-provider `gapX` offsets via `widgetAnchor` on adapters.

Plan: `docs/plans/2026-03-11-send-button-anchor-plan.md`

---

## Next: Finish Phase 6

Phase 6 has two unchecked items that are the real gate to v1 readiness. The Grammarly extension review (`docs/research/2026-03-12-grammarly-final-review.md`) confirmed these are the right priorities and identified structural work that makes them achievable.

### 6a. Adapter capability flags

Add explicit capability metadata to `SiteAdapter` so the orchestrator can branch behavior per host instead of hoping the generic path works everywhere.

Flags to add:
- `supportsReliableSetText` — can the adapter safely write redacted text back? This is Phase 6's highest-risk item: innerHTML replacement may not sync with ProseMirror/Quill internal state.
- `supportsSendButtonAnchor` — can the adapter reliably locate a send button?
- `supportsComposerActionAnchor` — is there a stable action-bar area to fall back to?
- `requiresPageContextBridge` — does the adapter need page-world script injection?

When `supportsReliableSetText` is false, the system disables masking actions for that host state rather than silently corrupting text.

Origin: Grammarly review Priority 1, widget model plan Step 1.

### 6b. Cross-tool live testing

Validate the full flow on all three AI tools (founding-PLAN.md unchecked item). With capability flags in place, this becomes a structured exercise:

- For each host: verify selectors, test setText sync, test send-button click, test 10+ minute stability
- Record which capabilities pass/fail per host
- Update adapter flags to match reality
- Fix or disable broken paths

See Phase 6 plan for full test protocol: `docs/plans/2026-03-03-feat-phase6-integration-polish-plan.md`

### 6c. 30-minute stability test

Founding-PLAN.md unchecked item. Verifying this properly requires knowing *what state* the extension is in when something breaks. The capability flags and send-button anchor work give the widget enough structure to make this test meaningful.

---

## After v1: Structural Improvements

These are worth doing but not blocking ship. Implement when evidence justifies the effort.

### Structured local logging

Named loggers per subsystem (`scanner`, `widget-controller`, `observer`, `orchestrator`). Prerequisite for any diagnostics work. Add when debugging real-user breakage gets painful enough.

Pattern reference: Grammarly uses `{ level: "ERROR", logger: "gDocsEarlyInjector.failInitialization" }` — structured events with subsystem names.

### Editor lifecycle states

Explicit state machine: `searching → attached → observing → degraded → detached`. Separates editor lifecycle from widget rendering. Makes failure modes visible and recoverable.

Full model: `docs/plans/2026-03-12-grammarly-style-widget-model-for-sunbreak.md`

### Local diagnostics

Attach/anchor/write-back failure counts per host. Build after structured logging is in place. Developer-facing first.

### Cached rect tracking

Maintain `lastMeasuredRect` per anchor, compare before repositioning, skip if unchanged. Minor efficiency gain. Only worth doing if profiling shows `getBoundingClientRect()` as a bottleneck.

---

## Known Issues

- **E4:** Widget still visible when extension is disabled (should hide or show disabled indicator)
- **T3.3:** Site "Copy" button bypasses clipboard interceptor (`navigator.clipboard.writeText`)
- **Untested:** E5 (tab suspension/wake), A2 (screen reader), A3 (reduced motion)

---

## Explicitly Out of Scope (v1)

These were evaluated during the Grammarly review and confirmed as unnecessary for Sunbreak's current scope:

- Service worker / background script
- Port-based messaging (`chrome.runtime.connect`)
- RxJS or reactive stream library
- Iframe sandbox for isolated computation
- `document_start` early injection
- Multiple content-script entrypoints
- Side panel
- Remote telemetry
- Enterprise features (managed schema, DLP)
- Page-world script bridge (CustomEvent)
- Remote font loading
- Broader host permissions beyond ChatGPT, Claude, Gemini

Each has a "when to reconsider" note in `docs/research/2026-03-12-grammarly-final-review.md`.

---

## Reference Documents

| Document | Purpose |
|----------|---------|
| `docs/founding/founding-PLAN.md` | Original phase checklist |
| `docs/founding/founding-SPEC.md` | Full product specification |
| `docs/plans/2026-03-03-feat-phase6-integration-polish-plan.md` | Phase 6 detailed plan |
| `docs/plans/2026-03-11-send-button-anchor-plan.md` | Current feature work |
| `docs/plans/2026-03-12-grammarly-style-widget-model-for-sunbreak.md` | Widget lifecycle north star |
| `docs/research/2026-03-12-grammarly-final-review.md` | Grammarly patterns: steal / doing right / skip |
| `docs/research/2026-03-12-grammarly-architecture-diff.md` | Grammarly vs Sunbreak structural comparison |
