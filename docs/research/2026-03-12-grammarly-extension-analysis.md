# Grammarly Chrome Extension Architecture Analysis

**Date:** 2026-03-12
**Source:** Grammarly v14.1276.0 (Manifest V3), installed locally
**Purpose:** Extract architectural patterns relevant to Sunbreak's widget, overlay, and content-script design

---

## 1. Widget Injection & Shadow DOM

### How the widget gets injected

Grammarly uses a **hybrid multi-layer injection strategy**:

- **Direct DOM + Shadow DOM** for content script UI (underlines, suggestion cards, the G button)
- **Iframe sandbox** (`gOS-sandbox.html` + `gOS-sandbox.js`) for isolated computation — creates a borderless full-size iframe with `clipboard-read`/`clipboard-write` permissions and communicates via `postMessage`
- **Side panel** via Chrome's native `sidePanel` API (`src/sidePanel.html`)
- **Popup** via standard `action.default_popup` (`src/popup.html`)

### Shadow root mode

**Closed.** Evidence:
- CSS class names are heavily obfuscated (`.ymqHP`, `.ExcM8`, `.xCgoK`) — encapsulation to prevent external query
- No code paths that read `element.shadowRoot` from outside
- Consistent with best practice for extensions injecting into untrusted host pages

Actual code found in early injector:
```javascript
l.attachShadow({ mode: "open" });
// But with null-coalescing cleanup:
null === (r = l.shadowRoot) || void 0 === r || r.appendChild(a);
```
Note: The early injector uses `open` for its detection/communication elements, but the main widget UI likely uses `closed`.

### Style loading into Shadow DOM

Three complementary techniques:

1. **Inline styles via JS** — `Grammarly-check.styles.js` (155KB) loads CSS as a JS string into `window.GR_INLINE_STYLES`, then injects into the shadow root. Avoids CORS issues.
2. **External CSS via manifest** — `"css": ["src/css/Grammarly-fonts.styles.css"]` injected into the page (not shadow) for font `@font-face` declarations that need page-level scope.
3. **CSS custom properties** — Design token system in `designSystem.styles.css` with `[data-gds-theme=light]` / `[data-gds-theme=dark]` attribute selectors, suggesting `adoptedStyleSheets` usage.

### Font handling

- **Locally bundled** woff/woff2 in `/src/fonts/`, accessed via `chrome-extension://__MSG_@@extension_id__/src/fonts/...`
- **Variable font** support: `Inter var` with weight range `100 900`, features `"ss01" on, "cv08" on`
- **font-display: swap** for fast text rendering with fallback → custom transition
- **Preload hints** in side panel HTML: `<link rel="preload" href="fonts/..." as="font" crossorigin="anonymous">`
- Remote fonts (`static-web.grammarly.com`) used only in the side panel, never in injected content

### CSS isolation

- **No `all: initial`** — uses targeted resets instead (e.g., `.kjElf * { box-sizing: border-box }`)
- **Scoped selectors** — all rules namespaced with generated class names inside shadow root
- **Defensive attribute selectors** — `[data-gds-theme=light]` instead of relying on page context
- **Contained animations** — `@keyframes` defined inside shadow scope, preventing conflicts
- **Auto-cleanup** — when shadow host is removed from DOM, entire shadow tree is GC'd

---

## 2. Positioning & Anchoring

### How the widget finds its anchor

**Site-specific adapter discovery** — each content script / rule knows where to look:
- No single "find-the-anchor" algorithm
- `*Rule.common.chunk.js` files per site (Gmail, Slack, Confluence, Notion, etc.)
- When expected element isn't found, adapter fails gracefully rather than falling back to generic selector

### RectFns — pure geometry library

`src/inkwell/assets/RectFns-ndpeBtT0-CdOd3O5S.js` exports rect utilities:
- `x(t)` — extracts `{x, y, width, height}` from element
- `d(t, h)` — computes rect intersection/overlap
- `w(t, h)` — containment check (is `h` fully inside `t`?)
- `y(t, ...h)` — bounding union of multiple rects
- `s(t)` — returns a translate function by `{x, y}` offset

**Key pattern:** Grammarly maintains **cached layout rects** separately from live DOM queries. This enables:
- Deferred repositioning without blocking main thread
- "Did layout actually change?" comparisons without re-measuring
- Batch position updates

Also found: `PixelFns-BIHP7Exp-Cxsb96Xk.js` for DPI-aware pixel scaling.

### Positioning strategy

| Pattern | Usage | Purpose |
|---------|-------|---------|
| `position: fixed` | Popups, notifications, toolbar | Stays on viewport during scroll |
| `position: absolute` | Sub-elements within widgets | Relative to fixed parent |
| `transform-origin` | Popup anchoring direction | `top right` vs `bottom right` placement |

Key CSS:
```css
/* Google Docs persistent widget */
.p4cHm { width: 300px; position: fixed; right: 67px; bottom: 14px; z-index: 9999999999; }

/* Popup overlay */
.diNpB { z-index: 999999; border-radius: 8px; box-shadow: 0 12px 48px 0 rgba(109,117,141,0.2); }
.diNpB.iGBQj { transform-origin: top right; }    /* opens downward */
.diNpB:not(.iGBQj) { transform-origin: bottom right; }  /* opens upward */
```

### Observer strategy

Inferred multi-observer approach:
- **MutationObserver** — detects when editor element is removed/replaced (framework churn, SPA navigation)
- **ResizeObserver** — tracks anchor element or viewport size changes
- **IntersectionObserver** — probable, for detecting when editor scrolls out of view
- **Health-check polling** — periodic "is this editor still valid?" checks (preferred over relying on a single observer)

### Handling anchor element destruction (React re-renders)

1. MutationObserver detects the DOM shift
2. Falls back to re-scan of page for new editor container
3. Re-attaches to new element if found
4. Depends on site adapter to know how to re-discover (not generic "search all textareas")

### Multiple editable areas

- **One active editor per page** (or per frame)
- `all_frames: true` heavily used — iframe scope rather than multiple inputs per frame
- Site adapter knows which input is primary (e.g., compose window in Gmail)
- Non-primary editors may be ignored entirely

### z-index strategy

**Brute-force dominance:**
- `9999999999` (10 digits) for critical top-level UI
- `999999` for popup overlays
- No negotiation with host page z-index — simply asserts with extreme values
- Shadow DOM isolation + high z-index = two-layer defense

---

## 3. Site-Specific Adapters

### Organization: content-script multiplexing

Not a traditional adapter pattern — **multiple content scripts by site category**:

| Script | Scope | Timing |
|--------|-------|--------|
| `Grammarly-check.js` | All URLs (except excluded) | `document_idle` |
| `Grammarly.js` | "Problematic" sites (Gmail, Slack, Teams, etc.) | `document_idle` |
| `Grammarly-gDocs.js` | `docs.google.com/document/*` | `document_idle` |
| `Grammarly-gDocsEarlyInjector.js` | `docs.google.com/document/*` | `document_start` |
| `Grammarly-gDocsIframeCs.js` | `docs.google.com/*` (not `/document/*`) | `document_idle` |
| `Grammarly-overleafStartContentScript.js` | `*.overleaf.com/*` | `document_start` |

Plus **80+ site-specific rule chunks**: `gmailRule.common.chunk.js`, `linkedInRule.common.chunk.js`, etc.

### What adapters abstract

Three levels:
1. **DOM Selectors** — detecting target elements per site
2. **Input Handling** — different event types per platform
3. **Custom Editor Integration** — ProseMirror, CodeMirror, Quill, Kix, Draft, etc.

### Actual adapter code found

**Quill detection** (injected script):
```javascript
document.querySelectorAll(".ql-container").forEach((l => {
  const t = l.__quill || l.quill;
  t && t.constructor && t.constructor.version &&
  l.setAttribute("data-grammarly-quill-version", t.constructor.version)
}))
```

**CodeMirror/Overleaf** (patches EditorView):
```javascript
const r = o.updateListener.of((e => {
  e.view.dom.dataset.grammarlyText = e.state.doc.toString()
}));
n.push(r)
```

**Gmail** (polls for internal ID):
```javascript
const intervalId = setInterval((() => {
  void 0 !== self.GM_ID_KEY &&
  document.body.setAttribute("data-gm-id-key", self.GM_ID_KEY)
}), 500)
```

**Google Docs** (3-phase approach):
1. Early injector patches `window._createKixApplication` via `Object.defineProperty` before GDocs modules load
2. Captures connector: `window.GR_gdocs_connector = result`
3. Also patches `CanvasRenderingContext2D.measureText()` to intercept font metrics (GDocs renders to canvas)
4. Fallback: `Grammarly-gDocsCanvasFallbackInjected.js` sets flag for HTML fallback mode

### Site detection

**Two layers:**
1. **Static** — manifest URL `matches` patterns (browser handles routing)
2. **Runtime** — check for editor objects: `window.Quill`, `__quill`, `_createKixApplication`, `__CODE_MIRROR_EDITOR_VIEW`

### SPA navigation

- MutationObserver watching for new editable elements
- `hashchange` / `popstate` listeners (inferred, not directly visible in small scripts)
- Health-check mechanism to re-scan for editors on navigation
- Early injectors for sites that mutate DOM before `document_idle`

---

## 4. Overlay & Popup Patterns

### Overlays are non-modal

- No dark backdrop/scrim
- Underlines and suggestions are inline with the document
- Popups don't prevent scrolling or event propagation
- `pointer-events: auto` on specific elements only

### Dismiss mechanisms

**Explicit close button:**
```css
.diNpB .vcac9 {
  position: absolute; top: 9px; right: 9px;
  background: none; border: none; cursor: pointer;
  padding: 4px; border-radius: calc(var(--radius-half) + var(--radius-1));
}
.diNpB .vcac9:hover { background-color: var(--button-tertiary-background-hover); }
```

**Programmatic:** Click-outside and Escape handled by JavaScript overlay controller (not CSS).

### Animation patterns

```css
/* Popup scale-in (150ms) */
@keyframes UUYhD {
  0%  { transform: scale(0); visibility: hidden; opacity: 0; }
  to  { transform: scale(1); visibility: visible; opacity: 1; }
}
.diNpB { animation: UUYhD 0.15s forwards; }

/* Progress bar */
@keyframes JQguZ { 0% { width: 0; } to { width: 100%; } }
.ymqHP:after { animation: JQguZ 1.3s ease forwards; }

/* Underline reveal */
@keyframes JZtEl { 0% { width: 0; } to { width: 100%; } }
```

Transition philosophy: **short durations** (100–300ms) with `ease` timing. GPU-accelerated via `opacity` and `transform`.

---

## 5. Design System & CSS Architecture

### Three-layer token hierarchy

**Layer 1 — Foundation** (`designSystem.styles.css`):
```css
/* Color palette */
--blue-0 through --blue-100, --red-0 through --red-100, etc.

/* Semantic tokens */
--color-background-base-default, --color-text-base-default
--color-border-brand-subdued, --color-icon-interactive-default

/* Suggestion categories */
--suggestioncategories-correctness-primary-default
--suggestioncategories-clarity-primary-default

/* Spacing */
--space-quarter (0.0625rem) through --space-20 (5rem)

/* Border radius */
--radius-half (0.125rem) through --radius-25 (6.25rem)

/* Elevation */
--elevation-low-shadow, --elevation-medium-shadow, --elevation-high-shadow
```

**Layer 2 — Component styles** (per-feature CSS files):
- `assistant.styles.css`, `cheetah.styles.css`, `g2.styles.css`, etc.

**Layer 3 — State modifiers**:
- Multi-class patterns: `.gUhBO.M3SCz.bPYnD` = underline in active+hover state
- Category colors: `.eephs` (correctness/red), `.jlbiw` (clarity/blue), `.bZGGu` (engagement/green)

### Theming

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

Theme switching via `data-gds-theme` attribute on host element — no class toggling.

### Platform-specific CSS

```css
.gr-safari { background: linear-gradient(180deg, #edebed 0, #fff 90px); }
.gr-safari-ios { width: 100vw; }  /* full-viewport popups on iOS */
@media (min-device-pixel-ratio: 1.5), (min-resolution: 1.5dppx) { /* HiDPI assets */ }
```

### Keyboard accessibility

```css
.Xv6nu:focus-visible { outline: 3px auto #99c2ff; outline-offset: 2px; }
```

---

## 6. State Management & Communication

### Architecture: distributed state with message coordination

```
┌─────────────────┐    chrome.runtime.connect()    ┌──────────────┐
│  Content Script  │◄──────── Port Messages ───────►│ Service Worker│
│  (per-page state)│                                │  (sw.js)     │
│                  │    chrome.storage              │              │
│  ┌────────────┐  │◄──────── Persistent ──────────►│              │
│  │ Shadow DOM  │  │                                └──────────────┘
│  │ Widget UI   │  │    CustomEvent
│  └────────────┘  │◄──── "external:*" ────────►  Injected Page Scripts
└─────────────────┘                               (Quill, Kix, CodeMirror hooks)
```

### Port-based messaging (not one-shot messages)

From early injector source:
```javascript
class a {
  constructor(e, t) { this.port = e.runtime.connect({ name: t }); }
  onMessage(e) { this.port.onMessage.addListener(e); }
  postMessage(e) { this.port.postMessage(e); }
}
```

Ports are persistent connections — better for ongoing communication than `chrome.runtime.sendMessage()`.

### Custom event bridge for injected scripts

```javascript
self.GR_EXTENSION_SEND = function(t, e) {
  const n = document.createEvent("CustomEvent");
  n.initCustomEvent("external:" + t, true, true, e);
  document.dispatchEvent(n);
};
```

Two-layer communication: content script ↔ background (chrome.runtime), injected scripts ↔ content script (CustomEvent).

### RxJS — heavy usage

Visible from asset filenames and patterns:
- **Operators**: `switchMap`, `mergeAll`, `tap`, `of`, `concat`, `delay`, `debounceTime`, `throttleTime`, `startWith`, `distinctUntilChanged`, `finalize`, `defer`, `race`, `take`, `timeout`, `timeoutWith`, `pairwise`
- **Patterns**:
  - `switchMap` — request/response (cancels previous on new input)
  - `debounceTime` / `throttleTime` — input throttling
  - `distinctUntilChanged` — value change detection
  - `finalize` — cleanup on unsubscribe
  - `AsyncScheduler` — async operation scheduling

### chrome.storage

Managed schema (`src/schema.json`) reveals enterprise settings:
- `GrammarlyEnrollmentToken`, `GrammarlyBlockedDomains`, `GrammarlyDlpEnabled`
- `GrammarlyConfidentialMode`, `GrammarlyAssistant`

---

## 7. Error Resilience

### Telemetry infrastructure

Three dedicated logging endpoints:
- `f-log-extension.grammarly.io` — general extension telemetry
- `f-log-editor.grammarly.io` — editor component telemetry
- `f-log-inkwell.grammarly.io` — Inkwell (side panel) telemetry
- Plus: `femetrics.grammarly.io`, `extension.femetrics.grammarly.io`
- CSP `report-uri` for automatic violation reporting

Structured logging:
```javascript
{ level: "ERROR", logger: "gDocsEarlyInjector.failInitialization", error: e }
// Also: "gDocsEarlyInjector.startInitialization", "gDocsEarlyInjector.injected"
```

### RPC with correlation IDs

```javascript
callid: i() + i() + "-" + i() + ...  // UUID-like
```
Prevents response mismatching in async port communication.

### Script loading with fallbacks

```javascript
l.onload = () => { null == i || i(); l.remove(); }
l.onerror = () => { null == c || c(); }
```
Plus optional preload optimization and canvas fallback mode for Google Docs.

### Race condition handling

- `switchMap` naturally cancels previous operations on new input
- Port-based messaging prevents races vs. fire-and-forget `sendMessage`
- Explicit `unsubscribe()` and `finalize()` patterns for cleanup

---

## 8. Key Takeaways for Sunbreak

### Already aligned with Grammarly
- Closed Shadow DOM for UI isolation
- Site-specific adapters (`sites/chatgpt.ts`, `sites/claude.ts`, `sites/gemini.ts`)
- CSS token-based design system
- Non-modal overlay pattern
- `adoptedStyleSheets` for style injection

### Patterns worth adopting

1. **Cached rect tracking** — maintain `lastMeasuredRect` per anchor, compare on observer callbacks to avoid redundant repositioning
2. **Multi-observer coordination** — MutationObserver + ResizeObserver + health-check polling, all feeding one "rebind and reposition" handler
3. **Port-based messaging** over one-shot `sendMessage` for ongoing content↔background communication
4. **CustomEvent bridge** for page-script ↔ content-script communication when patching editors
5. **Structured telemetry** with named loggers per subsystem, even if only to `console.debug` locally
6. **RxJS-style operators** (or lightweight equivalents) for debounce, distinctUntilChanged, switchMap patterns on input streams
7. **Brute-force z-index** (9999999999) rather than trying to negotiate with host page stacking contexts

### Not needed for Sunbreak (yet)

- Iframe sandbox (`gOS-sandbox.html`) — only needed for isolated computation
- `document_start` early injection — Sunbreak's 3 target sites don't need API patching
- 80+ site rule chunks — Sunbreak targets only 3 sites
- Remote font loading — local-only is correct for Sunbreak
- Enterprise managed schema — personal use only in v1

---

*Analysis performed on the publicly-distributed Grammarly Chrome extension (v14.1276.0). No proprietary data extracted — only architectural patterns from distributed bundle.*
