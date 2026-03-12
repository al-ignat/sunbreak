# Grammarly Chrome Extension Architecture Diff vs Sunbreak

## Scope

This document compares the locally installed Grammarly Chrome extension package at:

- `~/Library/Application Support/Google/Chrome/Default/Extensions/kbfnbcaeplbcioakkpcpgfkobkghlhen/14.1276.0_0`

against the current `sunbreak` extension architecture.

The goal is to learn from product and technical patterns without copying proprietary logic or relying on deobfuscated internals. Findings below are split into:

- **Observed**: directly verified from the shipped package structure, manifest, filenames, and string-level inspection.
- **Inferred**: high-confidence conclusions drawn from those observed artifacts.

## High-Level Summary

Grammarly is architected as a broad, multi-surface extension platform:

- global host coverage
- multiple specialized content-script entrypoints
- service-worker coordination
- popup and side panel surfaces
- many site-specific or editor-specific integrations
- dynamic chunk loading for feature families

`sunbreak` is currently a narrow, single-purpose extension:

- only AI chat hosts
- one primary content entrypoint
- no background permissions or service-worker behavior in the manifest
- popup and dashboard surfaces
- site adapters centered on prompt interception and local classification

That difference is appropriate. The useful lesson is not to match Grammarly's breadth, but to adopt the structural patterns that preserve resilience as host complexity grows.

## Verified Observations: Grammarly

### Manifest and runtime surfaces

Observed from `manifest.json`:

- MV3 extension with a service worker: `sw.js`
- toolbar popup: `src/popup.html`
- side panel: `src/sidePanel.html`
- very broad host permissions: `http://*/*`, `https://*/*`
- broad content-script coverage including `"<all_urls>"`
- multiple content-script definitions rather than one universal script
- separate scripts for:
  - general web editing
  - "check" mode
  - Google Docs
  - Google Docs early injection
  - Google Docs iframe handling
  - Overleaf start-time injection
- `all_frames: true` is used heavily
- `match_about_blank: true` is used for several scripts
- `web_accessible_resources` exposes JS, CSS, fonts, icons, sandbox, and Inkwell assets
- significant remote connectivity in extension pages CSP and `externally_connectable` for `*.grammarly.com`

### Bundle and feature organization

Observed from `src/js` filenames:

- large code-split bundle graph with many `*.common.chunk.js` and `*.vendors.chunk.js`
- dedicated main surfaces:
  - `Grammarly.js`
  - `Grammarly-check.js`
  - `Grammarly-bg.js`
  - `Grammarly-popup.js`
  - `Grammarly-sidePanel.js`
- dedicated editor integrations:
  - `Grammarly-gDocs.js`
  - `Grammarly-gDocsEarlyInjector.js`
  - `Grammarly-gDocsIframeCs.js`
  - `Grammarly-quillJSInjectedScript.js`
  - `Grammarly-gMailInjectedCs.js`
  - `Grammarly-overleafInjectedScript.js`
- dedicated AI-oriented chunks exist:
  - `aiChatInterceptIntegration.common.chunk.js`
  - `aiChatInterceptPageIntegration.common.chunk.js`
  - `aiChatInterceptPageRule.common.chunk.js`
- rule/integration chunks exist per host or product area:
  - `airtableRule.common.chunk.js`
  - `awsConsoleRule.common.chunk.js`
  - `canvaRule.common.chunk.js`
  - `clickUpRule.common.chunk.js`
  - `codaRule.common.chunk.js`
  - `confluenceRule.common.chunk.js`
  - many more
- there are "Agents" chunks for content-script, page-group, document-group, and side-panel integrations

### Injection and UI isolation signals

Observed from string-level inspection:

- runtime assets are resolved with `chrome.runtime.getURL(...)`
- bundle loader dynamically imports chunks at runtime
- styles are injected separately
- there are explicit injected-script files for host-page execution contexts

### Product routing signals

Observed from filenames and manifest:

- Grammarly treats several environments as special cases rather than forcing everything through one generic editor adapter
- Google Docs and Overleaf get early/start-time handling
- Gmail and Quill-based editors get dedicated integrations
- AI chat appears to be an additional product surface, not the central one

## Verified Observations: Sunbreak

Observed from current codebase:

- manifest is intentionally narrow in [wxt.config.ts](/Users/ignataleinikov/02_Projects/sunbreak/wxt.config.ts)
- host permissions only cover ChatGPT, Claude, Gemini
- permissions are currently only `storage`
- one content entrypoint in [src/entrypoints/content.ts](/Users/ignataleinikov/02_Projects/sunbreak/src/entrypoints/content.ts)
- site-specific DOM handling lives behind adapters in `src/content/sites/`
- orchestration is centralized in [src/content/orchestrator.ts](/Users/ignataleinikov/02_Projects/sunbreak/src/content/orchestrator.ts)
- observation and re-attachment logic is centralized in [src/content/observer.ts](/Users/ignataleinikov/02_Projects/sunbreak/src/content/observer.ts)
- injected UI is isolated with a closed shadow root in [src/ui/widget/widget-controller.ts](/Users/ignataleinikov/02_Projects/sunbreak/src/ui/widget/widget-controller.ts)
- classification is synchronous and local-only
- product surfaces are:
  - content script widget
  - popup
  - dashboard

## Architecture Diff

### 1. Coverage model

**Grammarly**

- global-first architecture
- broad host permissions
- many explicit exceptions and special-case scripts

**Sunbreak**

- narrow host allowlist
- one content-script entrypoint for supported AI tools
- adapters differentiate only supported AI hosts

**Implication**

Sunbreak should keep the narrow coverage model. The lesson to borrow is not broader permissions, but earlier separation of "generic path" vs "special case path" as soon as one host becomes difficult enough.

### 2. Entry-point strategy

**Grammarly**

- multiple content-script entrypoints for different runtime constraints
- document start injection where timing matters
- iframe-specific scripts where host embedding requires it

**Sunbreak**

- single content-script lifecycle with one orchestration path
- all supported hosts run at `document_idle`

**Implication**

This is the clearest structural gap. Sunbreak should probably stay with one entrypoint for now, but introduce the concept of escalation paths:

- normal adapter path
- early-injection path for hosts that mutate the editor before `document_idle`
- iframe/shadow-host path for editors nested in unusual containers

That can be done without broadening permissions.

### 3. Host specialization

**Grammarly**

- dedicated host/editor integrations are first-class
- filenames suggest rule-based dispatch by site/editor family

**Sunbreak**

- adapters exist, which is the right primitive
- current architecture still assumes one shared observer/interceptor pattern can serve all supported AI sites

**Implication**

Sunbreak should preserve adapters, but likely needs a stronger distinction between:

- editor discovery
- submission interception
- send-button anchoring
- masking/write-back behavior

Right now these are coordinated centrally. That is efficient, but it will get brittle as AI products diverge.

### 4. UI surfaces

**Grammarly**

- popup and side panel are both present
- content-script UI appears to be only one of several product surfaces

**Sunbreak**

- popup and dashboard exist
- no side panel surface

**Implication**

No immediate need to add a side panel. The transferable idea is surface separation:

- transient in-editor UI for decision moments
- persistent review/history/settings surface elsewhere

Sunbreak already has the seed of this with widget + dashboard. Keep strengthening that split rather than expanding inline UI complexity.

### 5. Runtime coordination

**Grammarly**

- service worker present
- permissions indicate heavier cross-surface and account-aware orchestration

**Sunbreak**

- no background/service-worker coordination in the current manifest
- local storage drives state and settings

**Implication**

For local-only `sunbreak`, a service worker is optional. Add one only when there is a concrete need such as:

- centralized badge state
- alarms or periodic cleanup
- cross-tab state coordination
- side-panel lifecycle

Do not add it just because Grammarly has one.

### 6. Isolation and resilience

**Grammarly**

- multiple injected scripts imply careful separation between extension-world and page-world execution
- many special scripts imply host breakage is expected and engineered around

**Sunbreak**

- UI isolation is already strong because of the closed shadow root
- DOM observation and health checks are present
- current model still relies on host DOM shape stability for adapter correctness

**Implication**

Sunbreak is already following one of the right Grammarly-like patterns: isolate the UI hard. The next step is to isolate host execution concerns with equal discipline:

- page-context script bridge only where necessary
- per-host capability flags
- explicit failure modes when a host can be read but not safely written back to

### 7. Performance and bundle shape

**Grammarly**

- aggressively code-split
- feature-family chunks and site-rule chunks are separate

**Sunbreak**

- compact extension, likely simpler bundle lifecycle

**Implication**

Do not optimize for bundle splitting yet unless measurements justify it. But adopt the architectural mindset now:

- keep classifier pure and separable
- keep site adapters independently testable
- avoid one monolithic widget/orchestrator file growing unchecked

## Concrete Recommendations for Sunbreak

### Priority 1

Split the current content runtime into three layers more explicitly:

1. host capability detection
2. editor lifecycle management
3. intervention UX

Today these concerns are close together in the observer/orchestrator path. That is manageable with three hosts, but it will become harder to reason about as host-specific quirks accumulate.

### Priority 2

Introduce adapter capability metadata, for example:

- supportsEarlyInjection
- supportsReliableSetText
- supportsSendButtonAnchor
- requiresPageContextBridge
- supportsFileDetection

That gives Sunbreak a controlled way to branch behavior without adding ad hoc conditionals throughout the observer and widget layers.

### Priority 3

Prepare for special entrypoints before you need them:

- keep the current generic content script
- add a path for host-specific entrypoints when a site requires `document_start`, iframe coverage, or page-world injection

This mirrors the useful part of Grammarly's structure without importing its platform complexity.

### Priority 4

Strengthen failure telemetry locally:

- adapter attach failures by host and page pattern
- write-back failures after masking
- send-button anchor failures
- re-attachment counts after SPA navigation

Your current adapter failure counter is a good start. Expand it into a local diagnostics panel before scaling host support.

### Priority 5

Keep UI modest inline and move complexity outward:

- inline widget for urgent decision-making
- dashboard for review and controls
- only consider a side panel if repeated workflows truly need persistent in-tab context

## What Grammarly Suggests You Should Not Do Yet

- do not broaden host permissions beyond the AI tools you actually support
- do not add a service worker unless a concrete product need appears
- do not create site-specific entrypoints prematurely for all hosts
- do not chase bundle-level parity with Grammarly's chunk graph

## Best Reusable Lessons

- Special cases deserve first-class architecture, not hacks.
- Timing matters enough that some hosts need earlier injection paths.
- Inline UI should stay isolated from host CSS and DOM churn.
- Multi-surface products work best when transient and persistent workflows are split.
- Host-specific integrations should be visible in the architecture, not hidden inside conditionals.

## Next Implementation Candidates in Sunbreak

If turning this analysis into code, the highest-value follow-ups are:

1. add adapter capability flags
2. split observer responsibilities into host lifecycle vs intervention lifecycle
3. add structured local diagnostics for attach, anchor, and write-back failures
4. define criteria for when a host graduates from generic adapter to dedicated entrypoint

## Notes

This analysis intentionally avoids reverse engineering proprietary business logic or trying to reconstruct minified internal algorithms. It is based on lawful inspection of the local extension package, manifest, filenames, and limited string-level signals.
