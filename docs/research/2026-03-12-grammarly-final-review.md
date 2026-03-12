# Grammarly Extension Review — Consolidated Findings for Sunbreak

**Date:** 2026-03-12
**Sources:** Grammarly v14.1276.0 installed bundle, manifest inspection, CSS analysis, minified JS analysis
**Supersedes:** `grammarly-architecture-diff.md` (strategic), `grammarly-extension-analysis.md` (technical)
**Companion:** `../plans/2026-03-12-grammarly-style-widget-model-for-sunbreak.md` (proposed widget lifecycle)

### Confidence key

Claims are tagged by evidence quality:

- **Observed** — directly verified from manifest, CSS, HTML, or readable JS (injected scripts, small entrypoints)
- **Inferred** — reasonable conclusion from file structure, naming patterns, or minified code shapes, but not conclusively proven
- **CSS-verified** — confirmed from unminified CSS shipped in the bundle

Where no tag appears, treat the claim as inferred.

---

## Part 1 — What Sunbreak Should Steal

These are patterns Grammarly uses in production that would improve Sunbreak's architecture. Ordered by impact.

### 1.1 Cached Rect Tracking (minor optimization, low effort)

**What Grammarly appears to do:** *(inferred)*
A file named `RectFns` in the Inkwell assets exports minified functions that operate on rect-like objects — extracting dimensions, computing intersections, testing containment, and translating by offset. A companion `PixelFns` file likely handles DPI scaling. The exact usage (whether for caching, diffing, or something else) is not verifiable from the minified code.

**Pattern worth borrowing:**
Maintaining a cached last-known rect and comparing before repositioning is a sound micro-optimization. It would let the widget skip unnecessary style updates when the anchor hasn't actually moved. This is a minor efficiency gain — not a stability improvement — and should be prioritized accordingly.

**Concrete shape:**
```typescript
interface AnchorRect { x: number; y: number; width: number; height: number }

function rectsEqual(a: AnchorRect, b: AnchorRect, threshold = 1): boolean {
  return Math.abs(a.x - b.x) < threshold
      && Math.abs(a.y - b.y) < threshold
      && Math.abs(a.width - b.width) < threshold
      && Math.abs(a.height - b.height) < threshold;
}
```

---

### 1.2 Multi-Observer Coordination (validated — already partially implemented)

**What Grammarly appears to do:** *(inferred from architecture, not from readable code)*
Does not bet on a single observer. Likely uses multiple mechanisms feeding one handler:
- **MutationObserver** — detects when editor element is removed/replaced
- **ResizeObserver** — detects anchor/viewport size changes
- **Health-check polling** — periodic "is this editor still valid?" verification

**Sunbreak status:**
Sunbreak already implements this pattern. `widget-controller.ts:235` uses `ResizeObserver` on both `currentInput` and `document.body`. `MutationObserver` watches the form/fieldset ancestor for child and attribute changes. `observer.ts` has a health-check fallback via `clearIfNavigatedFromConversation()`.

**What could be improved:**
The current `ResizeObserver` targets the input element. If the send-button anchor element resizes or repositions independently of the input (e.g., the host page reflows the action bar), the widget wouldn't catch it. Observing the send-button anchor element directly would close that gap — but only if evidence shows it's actually a problem on a supported host.

---

### 1.3 Brute-Force z-index (validated — already implemented)

**What Grammarly does:** *(CSS-verified)*
```css
.p4cHm { z-index: 9999999999; }  /* top-level widget */
.diNpB { z-index: 999999; }       /* popup overlays */
```
No negotiation with the host page's stacking contexts. Shadow DOM isolation + extreme z-index = two-layer defense.

**Sunbreak status:**
Already implemented. `widget-controller.ts:129` sets `zIndex = '2147483646'` (max 32-bit int minus 1) on the shadow host container. This is the same brute-force strategy. No change needed.

---

### 1.4 Structured Local Telemetry (medium impact, low effort)

**What Grammarly does:**
Named loggers per subsystem with structured events:
```javascript
{ level: "ERROR", logger: "gDocsEarlyInjector.failInitialization", error: e }
// Also: "startInitialization", "injected"
```
Five dedicated telemetry endpoints for different extension surfaces.

**Why Sunbreak should adopt this (locally):**
Sunbreak doesn't need remote telemetry (no cloud backend in v1). But structured local logging with named subsystems would dramatically improve debugging:

```typescript
const log = createLogger("widget-controller");
log.debug("anchor-found", { element: el.tagName, anchorMode: "send-button" });
log.warn("anchor-lost", { reason: "element-removed", retryIn: 5000 });
```

This is the prerequisite for the diagnostics panel proposed in the widget model plan.

---

### 1.5 Adapter Capability Flags (medium impact, medium effort)

**What Grammarly does:**
Site adapters are first-class, with 80+ dedicated rule chunks *(observed — filenames like `gmailRule.common.chunk.js` visible in `src/js/`)*. Small injected scripts show adapters that detect editor type *(observed — Quill, CodeMirror, Gmail code readable)* and use different communication strategies per site *(observed — CustomEvent bridge, `setInterval` polling, `Object.defineProperty` patching)*. The exact shape of per-adapter capability declarations is not verifiable from minified code *(inferred from the diversity of approaches)*.

**Why Sunbreak should adopt this:**
Both the architecture diff and widget model plan recommend capability flags. The evidence from Grammarly's injected scripts shows adapters that behave very differently per editor type, which supports the case. Adding flags like `supportsSendButtonAnchor`, `supportsReliableSetText`, `requiresPageContextBridge` would let the orchestrator branch behavior cleanly instead of using ad-hoc conditionals. This is more important for correctness than micro-optimizations like rect caching.

---

### 1.6 Non-Modal Overlays with Scale-In Animation (low effort, polish)

**What Grammarly does:** *(CSS-verified for animation; inferred for dismiss behavior)*
```css
@keyframes UUYhD {
  0%  { transform: scale(0); visibility: hidden; opacity: 0; }
  to  { transform: scale(1); visibility: visible; opacity: 1; }
}
.diNpB { animation: UUYhD 0.15s forwards; }
```
No scrim or scroll-lock CSS was found in the shipped stylesheets *(CSS-verified)*. Dismiss likely uses explicit close button *(CSS-verified — `.vcac9` close button styles exist)* plus JS click-outside and Escape *(inferred — no CSS-only dismiss mechanism visible)*.

**Why Sunbreak should note this:**
Sunbreak already uses non-modal overlays. The 150ms scale-in animation is a nice production polish that could be applied to the widget's expanded state transitions. Keep durations in the 100–300ms range with `ease` timing.

---

### 1.7 Design Token Architecture (reference, not urgent)

**What Grammarly does:**
Three-layer token system:
1. **Foundation** — color palette (`--blue-0` to `--blue-100`), spacing (`--space-quarter` to `--space-20`), radius, elevation
2. **Semantic** — `--color-background-base-default`, `--color-text-base-default`, suggestion categories
3. **Theme** — `[data-gds-theme=light]` / `[data-gds-theme=dark]` attribute overrides

**Sunbreak comparison:**
Sunbreak already has a three-layer token architecture (per project memory: "three-layer token architecture, data-severity, adoptedStyleSheets, pure positioning"). This is validated by Grammarly's approach. Grammarly's use of `data-*` attributes for theme switching (not class toggling) is a pattern worth noting for when Sunbreak adds dark mode support.

---

## Part 2 — What Sunbreak Is Already Doing Right

These patterns are confirmed as production-grade by seeing them in Grammarly.

### 2.1 Closed Shadow DOM for all injected UI

Grammarly's early injector uses `open` for communication/detection elements *(observed)*. The main widget UI likely uses closed shadow roots *(inferred — no `element.shadowRoot` external access patterns found, heavy class obfuscation, but not directly verified)*. Sunbreak uses a manual closed shadow root via `attachShadow({ mode: 'closed' })` in `widget-controller.ts:137`.

### 2.2 Site-specific adapters as first-class architecture

Grammarly has 80+ site-specific rule chunks. Sunbreak has 3 adapters in `src/content/sites/`. The pattern is the same — host specialization is visible in the architecture, not hidden in conditionals. Sunbreak's adapter-per-site approach is the right primitive.

### 2.3 adoptedStyleSheets for Shadow DOM styling

Both extensions use `adoptedStyleSheets` to inject styles into shadow roots. Grammarly also uses inline JS strings (`window.GR_INLINE_STYLES`) as a complementary technique. Sunbreak's current approach is correct and doesn't need the JS string pattern (that's a workaround for Grammarly's scale).

### 2.4 One active editor per page

Grammarly appears to track one active editor per frame *(inferred — `all_frames: true` in manifest suggests frame-level scoping, not multi-editor per frame, but internal multiplexing is not verifiable from shipped code)*. Sunbreak's single-widget-per-page model is a reasonable match for its 3-site scope regardless of what Grammarly does internally.

### 2.5 Narrow host permissions

Grammarly uses `<all_urls>` with 60+ exclusions. Sunbreak uses an explicit allowlist of 3 AI tools. Sunbreak's approach is better for its scope — less permission surface, clearer intent. The architecture diff explicitly warns against broadening permissions.

### 2.6 Non-modal overlay pattern

No scrim or scroll-lock CSS was found in Grammarly's shipped stylesheets *(CSS-verified)*. Close-button styles exist for popover cards *(CSS-verified)*. This is consistent with non-modal overlays, though the full dismiss behavior cannot be confirmed from CSS alone *(inferred)*. Sunbreak's widget behavior follows the same non-modal approach.

### 2.7 Local-only classification

Grammarly sends text to remote servers (WebSocket to `capi.grammarly.com`). Sunbreak classifies locally only. This is a deliberate product decision that should stay — it's a core differentiator.

### 2.8 Health-check fallback for SPA navigation

Sunbreak's `clearIfNavigatedFromConversation()` in `observer.ts` is exactly the pattern Grammarly uses — a health check that catches SPA navigations missed by standard events.

### 2.9 CSS token-based design system

Both extensions use CSS custom properties for theming and consistent styling. Sunbreak's three-layer token architecture matches Grammarly's approach.

---

## Part 3 — What Sunbreak Does Not Need

These are things Grammarly does that are inappropriate for Sunbreak's scope.

### 3.1 Iframe sandbox (`gOS-sandbox.html`)

Grammarly uses an iframe sandbox for isolated computation with clipboard permissions. Sunbreak's classification is synchronous and local — no need for a sandboxed execution context.

### 3.2 `document_start` early injection

Grammarly needs this for Google Docs (patching `_createKixApplication`) and Overleaf (patching CodeMirror's `EditorView`). Sunbreak's three target sites (ChatGPT, Claude, Gemini) don't use editors that require pre-initialization API patching. `document_idle` is correct.

**When to reconsider:** Only if a target AI tool starts using a canvas-based or custom editor that can't be observed after initialization.

### 3.3 Multiple content-script entrypoints

Grammarly has 7 content-script entries in its manifest. Sunbreak has one. One entrypoint with adapter dispatch is the right approach for 3 target sites.

**When to reconsider:** If one site requires fundamentally different timing or iframe handling that can't be resolved within the adapter pattern.

### 3.4 Service worker / background script

Grammarly has `sw.js` for cross-tab coordination, account management, and remote API communication. Sunbreak has no background script and doesn't need one for local-only classification with `chrome.storage`.

**When to reconsider:** When Sunbreak needs centralized badge state, cross-tab coordination, or alarms/periodic cleanup.

### 3.5 RxJS or reactive stream library

Grammarly uses RxJS heavily (20+ operators identified: `switchMap`, `mergeAll`, `debounceTime`, `distinctUntilChanged`, `finalize`, etc.). This makes sense for their scale — hundreds of asynchronous streams across multiple editor integrations.

Sunbreak's debounce/throttle needs are well-served by simple `setTimeout` patterns in `scanner.ts`. Adding RxJS would be over-engineering.

**What to borrow instead:** The *concepts* of `distinctUntilChanged` (cached rect comparison) and `switchMap` (cancel previous on new input) can be implemented as simple patterns without the library.

### 3.6 Port-based messaging (`chrome.runtime.connect`)

Grammarly uses persistent port connections between content scripts and the service worker:
```javascript
class a {
  constructor(e, t) { this.port = e.runtime.connect({ name: t }); }
}
```
Sunbreak has no service worker. No ports needed until there's a background script to talk to.

### 3.7 CustomEvent bridge for page-world scripts

Grammarly bridges injected page-world scripts via custom events:
```javascript
n.initCustomEvent("external:" + t, true, true, e);
document.dispatchEvent(n);
```
Sunbreak doesn't inject page-world scripts and doesn't need this pattern. The target AI tools' editors can be observed through standard DOM APIs.

### 3.8 80+ site-specific rule chunks

Grammarly has dedicated rule files for Gmail, LinkedIn, Confluence, Notion, Airtable, etc. Sunbreak targets 3 sites. Keep the adapter pattern but don't build infrastructure for a scale that doesn't exist yet.

### 3.9 Remote telemetry endpoints

Grammarly has 5+ logging/metrics endpoints. Sunbreak has no cloud backend (by design). Local structured logging is the right equivalent.

### 3.10 Side panel

Grammarly uses Chrome's `sidePanel` API. Sunbreak has popup + dashboard. No need for a side panel unless repeated workflows truly need persistent in-tab context.

### 3.11 Enterprise features (managed schema)

Grammarly's `schema.json` includes enterprise settings (enrollment tokens, DLP, blocked domains). Sunbreak is personal-use in v1. Skip entirely.

### 3.12 Remote font loading

Grammarly loads fonts from `static-web.grammarly.com` in its side panel. Sunbreak should keep fonts local-only (`chrome-extension://` URLs). Zero network requests is a product commitment.

---

## Part 4 — Priority Implementation Recommendations

Consolidated from all three analyses, ordered by **product risk and correctness impact**, not micro-optimization value.

### Priority 1 — Correctness and host resilience

1. **Add adapter capability flags** — `supportsSendButtonAnchor`, `supportsReliableSetText`, `requiresPageContextBridge`, etc. This is the highest-value structural change because it lets the orchestrator branch behavior per host in a controlled way, and makes write-back safety explicit. If `supportsReliableSetText` is `false` for a host state, the system can disable masking actions rather than silently corrupting text.
2. **Explicit editor lifecycle states** — `searching → attached → observing → degraded → detached` (per widget model plan). Separates editor lifecycle from widget rendering. Makes failure modes visible and recoverable instead of implicit.
3. **Anchor strategy selection** — ranked priority: send-button → composer-actions → input-box → hidden. The widget should downgrade and upgrade anchors deliberately, not guess. This is a correctness concern, not a polish concern.

### Priority 2 — Observability

4. **Structured local logging** — named loggers per subsystem (`scanner`, `widget-controller`, `observer`, `orchestrator`). Prerequisite for understanding failures in the wild. Without this, capability flags and lifecycle states are hard to debug.
5. **Local diagnostics** — attach/anchor/write-back failure counts per host. Build after structured logging is in place.

### Priority 3 — Minor optimizations (when evidence justifies it)

6. **Cache last-measured anchor rect** — compare before repositioning. Eliminates redundant layout recalculations. Minor efficiency gain, not a stability fix. Only worth doing if profiling shows `getBoundingClientRect()` as a bottleneck.
7. **Observe send-button anchor directly with ResizeObserver** — `widget-controller.ts` already observes the input element and `document.body` via `ResizeObserver`. If the send-button anchor repositions independently of the input, adding it as an observed target would close that gap. Only worth doing if evidence shows it's actually a problem.
8. **Host-specific custom anchors** — only when a site's behavior diverges enough that the generic path fails repeatedly.

### Already done (no action needed)

- Brute-force z-index (`2147483646` at `widget-controller.ts:129`)
- Multi-observer coordination (ResizeObserver + MutationObserver + health-check fallback)
- Closed shadow DOM (`attachShadow({ mode: 'closed' })` at `widget-controller.ts:137`)

### Do not build

- Service worker, port messaging, RxJS, iframe sandbox, early injection, side panel, remote telemetry, enterprise features, page-world script bridge. Revisit only when a concrete product need appears.

---

## Appendix — Key Code Patterns from Grammarly

Preserved here as reference for when implementing the above recommendations.

### A. Port-based RPC with correlation IDs (for future service worker)
```javascript
class a {
  constructor(e, t) { this.port = e.runtime.connect({ name: t }); }
  onMessage(e) { this.port.onMessage.addListener(e); }
  postMessage(e) { this.port.postMessage(e); }
}
// Correlation:
callid: i() + i() + "-" + i() + ...  // UUID-like
```

### B. CustomEvent bridge (for future page-world scripts)
```javascript
self.GR_EXTENSION_SEND = function(t, e) {
  const n = document.createEvent("CustomEvent");
  n.initCustomEvent("external:" + t, true, true, e);
  document.dispatchEvent(n);
};
```

### C. Editor detection patterns
```javascript
// Quill: query DOM, read internal property, tag with data attribute
document.querySelectorAll(".ql-container").forEach((l => {
  const t = l.__quill || l.quill;
  t && t.constructor && t.constructor.version &&
  l.setAttribute("data-grammarly-quill-version", t.constructor.version)
}))

// CodeMirror: register update listener, mirror text to data attribute
const r = o.updateListener.of((e => {
  e.view.dom.dataset.grammarlyText = e.state.doc.toString()
}));

// Gmail: poll for internal object, expose via data attribute
const intervalId = setInterval((() => {
  void 0 !== self.GM_ID_KEY &&
  document.body.setAttribute("data-gm-id-key", self.GM_ID_KEY)
}), 500)

// Google Docs: patch application constructor before load
Object.defineProperty(window, "_createKixApplication", { ... })
window.GR_gdocs_connector = result;
```

### D. Script loading with fallback
```javascript
l.onload = () => { null == i || i(); l.remove(); }
l.onerror = () => { null == c || c(); }
```

### E. Popup animation
```css
@keyframes UUYhD {
  0%  { transform: scale(0); visibility: hidden; opacity: 0; }
  to  { transform: scale(1); visibility: visible; opacity: 1; }
}
.diNpB { animation: UUYhD 0.15s forwards; }
```

### F. Design token theming
```css
[data-gds-theme=light] {
  --color-background-base-default: #fff;
  --color-text-base-default: #1c1c1c;
}
[data-gds-theme=dark] {
  --color-background-base-default: #1c1c1c;
  --color-text-base-default: #f5f5f5;
}
```

---

*This document consolidates findings from direct extension analysis and two prior research documents. It represents the complete set of Grammarly lessons relevant to Sunbreak as of 2026-03-12.*
