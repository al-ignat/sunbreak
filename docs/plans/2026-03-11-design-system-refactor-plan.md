# Design System Refactor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Consolidate the widget design system into a single-source-of-truth token architecture with data-attribute state, adoptedStyleSheets, and testable positioning — enabling rapid experimentation without cross-component breakage.

**Architecture:** Three-layer CSS custom property tokens (primitive → semantic → component) scoped via `:host` for Shadow DOM. State expressed via `data-*` attributes instead of BEM modifiers. Position calculation extracted as pure function. Style injection via `adoptedStyleSheets` API. Polling replaced with `ResizeObserver`.

**Tech Stack:** CSS Custom Properties, `adoptedStyleSheets`, `data-*` attributes, `ResizeObserver`, Preact, Vitest

---

## Task 1: Create widget token stylesheet

Create `widget-tokens.css` with all design tokens scoped to `:host` for Shadow DOM inheritance. This is purely additive — no existing code changes.

**Files:**
- Create: `src/ui/widget/widget-tokens.css`

**Step 1: Create the token file**

```css
/* Widget design tokens — scoped to :host for Shadow DOM */

/* === Primitives === */
:host {
  /* Neutral palette */
  --sb-raw-neutral-950: #141316;
  --sb-raw-neutral-900: #1E1D21;
  --sb-raw-neutral-800: #28272C;
  --sb-raw-neutral-750: #2E2D33;
  --sb-raw-neutral-700: #32313A;
  --sb-raw-neutral-600: #3D3C44;
  --sb-raw-neutral-400: #6B6869;
  --sb-raw-neutral-300: #9B9898;
  --sb-raw-neutral-100: #F0EDE8;

  /* Green */
  --sb-raw-green-400: #34D399;
  --sb-raw-green-800: #065F46;

  /* Amber */
  --sb-raw-amber-400: #FBBF24;
  --sb-raw-amber-700: #92700A;

  /* Orange */
  --sb-raw-orange-400: #FB923C;
  --sb-raw-orange-700: #9A4A12;
  --sb-raw-orange-500: #F59E0B;
  --sb-raw-orange-600: #D97706;

  /* Red */
  --sb-raw-red-400: #F87171;
  --sb-raw-red-800: #991B1B;

  /* Blue */
  --sb-raw-blue-400: #60A5FA;
  --sb-raw-blue-800: #1E40AF;

  /* === Semantic tokens === */
  --sb-color-surface: var(--sb-raw-neutral-900);
  --sb-color-surface-elevated: var(--sb-raw-neutral-800);
  --sb-color-surface-hover: var(--sb-raw-neutral-700);
  --sb-color-border: var(--sb-raw-neutral-600);
  --sb-color-border-subtle: var(--sb-raw-neutral-750);
  --sb-color-text-primary: var(--sb-raw-neutral-100);
  --sb-color-text-secondary: var(--sb-raw-neutral-300);
  --sb-color-text-muted: var(--sb-raw-neutral-400);
  --sb-color-cta: var(--sb-raw-orange-500);
  --sb-color-cta-hover: var(--sb-raw-orange-600);
  --sb-color-info: var(--sb-raw-blue-400);

  /* Severity: clean */
  --sb-severity-clean-icon: var(--sb-raw-green-400);
  --sb-severity-clean-border: var(--sb-raw-green-800);
  --sb-severity-clean-border-hover: var(--sb-raw-green-400);
  --sb-severity-clean-shadow: rgba(52, 211, 153, 0.2);

  /* Severity: warning */
  --sb-severity-warning-icon: var(--sb-raw-amber-400);
  --sb-severity-warning-badge: var(--sb-raw-amber-400);
  --sb-severity-warning-badge-text: var(--sb-raw-neutral-900);
  --sb-severity-warning-border: var(--sb-raw-amber-700);
  --sb-severity-warning-border-hover: var(--sb-raw-amber-400);
  --sb-severity-warning-shadow: rgba(251, 191, 36, 0.2);

  /* Severity: concern */
  --sb-severity-concern-icon: var(--sb-raw-orange-400);
  --sb-severity-concern-badge: var(--sb-raw-orange-400);
  --sb-severity-concern-badge-text: var(--sb-raw-neutral-900);
  --sb-severity-concern-border: var(--sb-raw-orange-700);
  --sb-severity-concern-border-hover: var(--sb-raw-orange-400);
  --sb-severity-concern-shadow: rgba(251, 146, 60, 0.2);

  /* Severity: critical */
  --sb-severity-critical-icon: var(--sb-raw-red-400);
  --sb-severity-critical-badge: var(--sb-raw-red-400);
  --sb-severity-critical-badge-text: #FFFFFF;
  --sb-severity-critical-border: var(--sb-raw-red-800);
  --sb-severity-critical-border-hover: var(--sb-raw-red-400);
  --sb-severity-critical-shadow: rgba(248, 113, 113, 0.2);

  /* Masked */
  --sb-masked-badge: var(--sb-raw-blue-800);
  --sb-masked-badge-text: var(--sb-raw-blue-400);

  /* Typography */
  --sb-font-body: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --sb-font-mono: 'JetBrains Mono', 'SF Mono', 'Fira Code', monospace;

  /* Spacing */
  --sb-space-xs: 4px;
  --sb-space-sm: 8px;
  --sb-space-md: 12px;
  --sb-space-lg: 16px;

  /* Radii */
  --sb-radius-sm: 6px;
  --sb-radius-md: 10px;
  --sb-radius-lg: 14px;
  --sb-radius-pill: 100px;

  /* Transitions */
  --sb-transition-fast: 100ms ease-out;
  --sb-transition-normal: 150ms ease-out;
}

@media (prefers-reduced-motion: reduce) {
  :host {
    --sb-transition-fast: 0ms;
    --sb-transition-normal: 0ms;
  }
}
```

Note: `:host` targets the shadow host element. CSS custom properties defined here inherit to all shadow DOM children — this is how tokens pierce the Shadow DOM boundary.

**Step 2: Run existing tests to confirm nothing breaks**

Run: `npm run test`
Expected: All 685 tests pass (purely additive file)

**Step 3: Commit**

```bash
git add src/ui/widget/widget-tokens.css
git commit -m "feat(tokens): add widget-tokens.css with :host-scoped design tokens"
```

---

## Task 2: Widget — data-severity + CSS vars

Replace BEM severity modifiers with `data-severity` attributes. Replace hardcoded hex in `widget.css` with token references. Remove `SEVERITY_COLORS` and `MASKED_COLORS` exports from `severity.ts` — CSS becomes the single source of truth for visual appearance.

**Files:**
- Modify: `src/ui/widget/widget.css` (full rewrite of severity section)
- Modify: `src/ui/widget/Widget.tsx` (data-severity, remove MASKED_COLORS inline styles)
- Modify: `src/ui/widget/severity.ts` (remove SEVERITY_COLORS, MASKED_COLORS, SeverityColors interface)
- Modify: `tests/unit/ui/widget/Widget.test.tsx` (assert data-severity instead of class)
- Modify: `tests/unit/ui/widget/severity.test.ts` (remove SEVERITY_COLORS/MASKED_COLORS tests)

**Step 1: Update severity.ts — strip color exports, keep pure logic**

Remove `SeverityColors` interface, `SEVERITY_COLORS` object, `MASKED_COLORS` object, and `severityColor()` function. Keep `SeverityLevel`, `findingSeverity()`, `maxSeverity()`.

The resulting file should be:

```typescript
import type { FindingType } from '../../classifier/types';
import type { TrackedFinding } from '../../content/findings-state';

/** Four-level severity for the widget badge */
export type SeverityLevel = 'clean' | 'warning' | 'concern' | 'critical';

/** Numeric order for comparison (higher = more severe) */
const SEVERITY_ORDER: Record<SeverityLevel, number> = {
  clean: 0,
  warning: 1,
  concern: 2,
  critical: 3,
};

/** Map a finding type to its severity level */
export function findingSeverity(type: FindingType): SeverityLevel {
  switch (type) {
    case 'api-key':
      return 'critical';
    case 'ssn':
    case 'cpr':
    case 'ni-number':
    case 'credit-card':
      return 'concern';
    case 'email':
    case 'phone':
    case 'ip-address':
    case 'keyword':
      return 'warning';
    default:
      return 'warning';
  }
}

/** Determine the highest severity across active findings */
export function maxSeverity(tracked: ReadonlyArray<TrackedFinding>): SeverityLevel {
  let max: SeverityLevel = 'clean';
  for (const f of tracked) {
    if (f.status !== 'active') continue;
    const level = findingSeverity(f.finding.type);
    if (SEVERITY_ORDER[level] > SEVERITY_ORDER[max]) {
      max = level;
    }
  }
  return max;
}
```

**Step 2: Update Widget.tsx — data-severity attribute, remove inline color styles**

Key changes:
- Remove `MASKED_COLORS` import
- Use `data-severity={severity}` on `.sb-widget` div
- Use `data-panel={panelOpen ? 'open' : 'closed'}` (future-proofing)
- Remove `sb-widget--${severity}` class modifier
- Remove `style={{ background: MASKED_COLORS.badge, color: MASKED_COLORS.badgeText }}` from masked badge

The widget div becomes:
```tsx
<div
  class="sb-widget"
  data-severity={severity}
  role="button"
  tabIndex={0}
  aria-label={buildAriaLabel(severity, snapshot.activeCount, maskedCount)}
  aria-expanded={panelOpen}
  onClick={handleClick}
  onKeyDown={handleKeyDown}
>
```

And the masked badge becomes just:
```tsx
<span class="sb-widget__masked-badge">{maskedCount}</span>
```

**Step 3: Rewrite widget.css — data-severity selectors + token vars**

Replace all hardcoded hex values with `var(--sb-*)` references. Replace `.sb-widget--severity` with `.sb-widget[data-severity="..."]`. Use component-level private custom properties (`--_border`, `--_icon`, etc.) set per severity, consumed by the base rule.

Key pattern:
```css
.sb-widget {
  /* ... existing layout ... */
  color: var(--_icon);
  background: var(--sb-color-surface);
  border: 1px solid var(--_border, var(--sb-color-border));
  box-shadow: 0 2px 12px var(--_shadow, rgba(0, 0, 0, 0.12));
  /* ... */
}

.sb-widget[data-severity="clean"] {
  --_icon: var(--sb-severity-clean-icon);
  --_border: var(--sb-severity-clean-border);
}
.sb-widget[data-severity="clean"]:hover {
  --_border: var(--sb-severity-clean-border-hover);
  --_shadow: var(--sb-severity-clean-shadow);
}

/* Similarly for warning, concern, critical */

.sb-widget__severity-badge {
  background: var(--_badge, transparent);
  color: var(--_badge-text, inherit);
}

.sb-widget__masked-badge {
  background: var(--sb-masked-badge);
  color: var(--sb-masked-badge-text);
}
```

Full replacement for the severity-related sections:

```css
/* ── Severity states (via data-attribute) ────── */

.sb-widget[data-severity="clean"] {
  --_icon: var(--sb-severity-clean-icon);
  --_border: var(--sb-severity-clean-border);
}
.sb-widget[data-severity="clean"]:hover {
  --_border: var(--sb-severity-clean-border-hover);
  --_shadow: var(--sb-severity-clean-shadow);
}

.sb-widget[data-severity="warning"] {
  --_icon: var(--sb-severity-warning-icon);
  --_badge: var(--sb-severity-warning-badge);
  --_badge-text: var(--sb-severity-warning-badge-text);
  --_border: var(--sb-severity-warning-border);
  opacity: 0.85;
}
.sb-widget[data-severity="warning"]:hover {
  --_border: var(--sb-severity-warning-border-hover);
  --_shadow: var(--sb-severity-warning-shadow);
  opacity: 1;
}

.sb-widget[data-severity="concern"] {
  --_icon: var(--sb-severity-concern-icon);
  --_badge: var(--sb-severity-concern-badge);
  --_badge-text: var(--sb-severity-concern-badge-text);
  --_border: var(--sb-severity-concern-border);
  opacity: 0.85;
}
.sb-widget[data-severity="concern"]:hover {
  --_border: var(--sb-severity-concern-border-hover);
  --_shadow: var(--sb-severity-concern-shadow);
  opacity: 1;
}

.sb-widget[data-severity="critical"] {
  --_icon: var(--sb-severity-critical-icon);
  --_badge: var(--sb-severity-critical-badge);
  --_badge-text: var(--sb-severity-critical-badge-text);
  --_border: var(--sb-severity-critical-border);
  opacity: 0.85;
}
.sb-widget[data-severity="critical"]:hover {
  --_border: var(--sb-severity-critical-border-hover);
  --_shadow: var(--sb-severity-critical-shadow);
  opacity: 1;
}
```

**Step 4: Update Widget.test.tsx — check data-severity**

Replace all `classList.contains('sb-widget--xxx')` checks with `dataset.severity`:

```typescript
// Before:
expect(widget?.classList.contains('sb-widget--clean')).toBe(true);
// After:
expect((widget as HTMLElement)?.dataset.severity).toBe('clean');
```

**Step 5: Update severity.test.ts — remove SEVERITY_COLORS/MASKED_COLORS tests**

Remove the `SEVERITY_COLORS` and `MASKED_COLORS` describe blocks. Remove `severityColor` from imports and its test. Keep `findingSeverity` and `maxSeverity` tests unchanged.

**Step 6: Run tests**

Run: `npm run test`
Expected: All tests pass

**Step 7: Commit**

```bash
git add src/ui/widget/severity.ts src/ui/widget/Widget.tsx src/ui/widget/widget.css tests/unit/ui/widget/Widget.test.tsx tests/unit/ui/widget/severity.test.ts
git commit -m "refactor(widget): data-severity attributes + CSS token vars, single source of truth"
```

---

## Task 3: FindingsPanel + HoverCard — unified severity, CSS vars

Replace hardcoded hex in both components with token references. Unify HoverCard's separate `SEVERITY_MAP` with the shared `findingSeverity()`. Use `data-severity` on dot elements.

**Files:**
- Modify: `src/ui/widget/findings-panel.css`
- Modify: `src/ui/widget/FindingsPanel.tsx`
- Modify: `src/ui/widget/hover-card.css`
- Modify: `src/ui/widget/HoverCard.tsx`

**Step 1: Update findings-panel.css — replace all hex with var()**

Replace:
- `#1E1D21` → `var(--sb-color-surface)`
- `#3D3C44` → `var(--sb-color-border)`
- `#2E2D33` → `var(--sb-color-border-subtle)`
- `#F0EDE8` → `var(--sb-color-text-primary)`
- `#9B9898` → `var(--sb-color-text-secondary)`
- `#6B6869` → `var(--sb-color-text-muted)`
- `#28272C` → `var(--sb-color-surface-elevated)`
- `#F59E0B` → `var(--sb-color-cta)`
- `#D97706` → `var(--sb-color-cta-hover)`
- `#141316` → `var(--sb-raw-neutral-950)`
- `#60A5FA` → `var(--sb-color-info)`
- `#F87171` → `var(--sb-severity-critical-icon)`
- Font families → `var(--sb-font-body)` / `var(--sb-font-mono)`
- `100ms ease-out` → `var(--sb-transition-fast)`
- `14px` border-radius → `var(--sb-radius-lg)`
- `6px` border-radius → `var(--sb-radius-sm)`

Replace dot color classes with data-severity:
```css
/* Before */
.sb-panel__dot--red { background: #F87171; }
.sb-panel__dot--orange { background: #F59E0B; }
.sb-panel__dot--amber { background: #F59E0B; }
.sb-panel__dot--blue { background: #60A5FA; }

/* After */
.sb-panel__dot[data-severity="critical"] { background: var(--sb-severity-critical-icon); }
.sb-panel__dot[data-severity="concern"] { background: var(--sb-severity-concern-icon); }
.sb-panel__dot[data-severity="warning"] { background: var(--sb-severity-warning-icon); }
.sb-panel__dot[data-severity="clean"] { background: var(--sb-severity-clean-icon); }
```

**Step 2: Update FindingsPanel.tsx — data-severity on dots**

Remove the `SEVERITY_DOT` map and `getDotClass()` function. Instead:

```tsx
<span
  class="sb-panel__dot"
  data-severity={findingSeverity(tf.finding.type)}
  aria-hidden="true"
/>
```

**Step 3: Update hover-card.css — replace all hex with var()**

Same token replacement pattern as findings-panel. Replace dot classes:
```css
.sb-hover-card__dot[data-severity="critical"] { background: var(--sb-severity-critical-icon); }
.sb-hover-card__dot[data-severity="concern"] { background: var(--sb-severity-concern-icon); }
.sb-hover-card__dot[data-severity="warning"] { background: var(--sb-severity-warning-icon); }
.sb-hover-card__dot[data-severity="clean"] { background: var(--sb-severity-clean-icon); }
```

**Step 4: Update HoverCard.tsx — use shared findingSeverity()**

Remove the local `Severity` type, `SEVERITY_MAP`, and `getSeverity()`. Import `findingSeverity` from `./severity`. Change the dot element:

```tsx
import { findingSeverity } from './severity';

// In render:
<span
  class="sb-hover-card__dot"
  data-severity={findingSeverity(finding.finding.type)}
  aria-hidden="true"
/>
```

**Step 5: Run tests**

Run: `npm run test`
Expected: All tests pass

**Step 6: Commit**

```bash
git add src/ui/widget/findings-panel.css src/ui/widget/FindingsPanel.tsx src/ui/widget/hover-card.css src/ui/widget/HoverCard.tsx
git commit -m "refactor(panel,hover): unified severity system + CSS token vars"
```

---

## Task 4: Toasts — CSS vars

Replace hardcoded hex in both toast CSS files with token references.

**Files:**
- Modify: `src/ui/widget/send-toast.css`
- Modify: `src/ui/widget/restore-toast.css`

**Step 1: Update send-toast.css**

Replace all hex colors with token vars. Same mapping as previous tasks. Key replacements:
- `#F59E0B` → `var(--sb-color-cta)` (border, icon, text, buttons)
- `rgba(245, 158, 11, 0.15)` → `rgba(245, 158, 11, 0.15)` (keep rgba for alpha transparency — or define as `--sb-cta-bg-15: rgba(245, 158, 11, 0.15)` in tokens)
- Surface/text/border colors → token vars

Note: For the `rgba()` values used in button backgrounds and box-shadow, keep them as-is since they're alpha variants not easily expressible as custom property references. The hex values that map 1:1 to tokens should be replaced.

**Step 2: Update restore-toast.css**

Same pattern. The restore toast uses info/blue colors:
- `#60A5FA` → `var(--sb-color-info)` (border, icon, text, buttons)
- Surface/text/border colors → token vars

**Step 3: Run tests**

Run: `npm run test`
Expected: All tests pass

**Step 4: Commit**

```bash
git add src/ui/widget/send-toast.css src/ui/widget/restore-toast.css
git commit -m "refactor(toasts): replace hardcoded hex with CSS token vars"
```

---

## Task 5: TextOverlay — data-severity on underlines

Replace inline color strings in underline segments with severity-level data attributes, making the CSS the source of truth for underline colors too.

**Files:**
- Modify: `src/ui/widget/text-overlay-utils.ts`
- Modify: `src/ui/widget/text-overlay.css`
- Modify: `src/ui/widget/TextOverlay.tsx`
- Modify: `tests/unit/ui/widget/text-overlay-utils.test.ts`

**Step 1: Change UnderlineSegment — severity instead of color**

In `text-overlay-utils.ts`:
- Import `findingSeverity` and `SeverityLevel` from `./severity`
- Remove the `severityColor` re-export
- Change `UnderlineSegment.color: string` to `severity: SeverityLevel`
- In `calculateUnderlines()`, set `severity: findingSeverity(tf.finding.type)` instead of `color: severityColor(tf.finding.type)`

```typescript
export interface UnderlineSegment {
  readonly top: number;
  readonly left: number;
  readonly width: number;
  readonly severity: SeverityLevel;
  readonly findingId: string;
}
```

**Step 2: Update text-overlay.css — severity-colored underlines**

```css
.sb-underline {
  pointer-events: none;
  box-sizing: border-box;
  border-bottom: 2px dotted transparent;
}

.sb-underline[data-severity="warning"] {
  border-bottom-color: var(--sb-severity-warning-icon);
}
.sb-underline[data-severity="concern"] {
  border-bottom-color: var(--sb-severity-concern-icon);
}
.sb-underline[data-severity="critical"] {
  border-bottom-color: var(--sb-severity-critical-icon);
}
.sb-underline[data-severity="clean"] {
  border-bottom-color: var(--sb-severity-clean-icon);
}
```

**Step 3: Update TextOverlay.tsx — use data-severity instead of inline borderBottom color**

Change the underline rendering:
```tsx
{segments.map((seg, i) => (
  <div
    key={`${seg.findingId}-${i}`}
    class="sb-underline"
    data-severity={seg.severity}
    style={{
      position: 'absolute',
      top: `${seg.top - editorRect.top}px`,
      left: `${seg.left - editorRect.left}px`,
      width: `${seg.width}px`,
      height: '0px',
      pointerEvents: 'none',
    }}
  />
))}
```

Note: We keep position-related inline styles (they're dynamic per-segment), but color is now CSS-driven via `data-severity`.

**Step 4: Update text-overlay-utils.test.ts**

Change assertions from `color` to `severity`:
```typescript
// Before:
expect(segments[0].color).toBe(SEVERITY_COLORS[findingSeverity('email')].icon);
// After:
expect(segments[0].severity).toBe('warning');
```

**Step 5: Run tests**

Run: `npm run test`
Expected: All tests pass

**Step 6: Commit**

```bash
git add src/ui/widget/text-overlay-utils.ts src/ui/widget/text-overlay.css src/ui/widget/TextOverlay.tsx tests/unit/ui/widget/text-overlay-utils.test.ts
git commit -m "refactor(overlay): data-severity underlines, CSS-driven colors"
```

---

## Task 6: adoptedStyleSheets in widget-controller

Replace the string-concatenated `<style>` tag with the `adoptedStyleSheets` API. Each CSS file becomes a `CSSStyleSheet` object, parsed once, composable.

**Files:**
- Modify: `src/ui/widget/widget-controller.ts`

**Step 1: Replace style injection**

At the top of the file, after the `?inline` imports, create `CSSStyleSheet` instances:

```typescript
import tokenStyles from './widget-tokens.css?inline';
import widgetStyles from './widget.css?inline';
import panelStyles from './findings-panel.css?inline';
import toastStyles from './send-toast.css?inline';
import restoreToastStyles from './restore-toast.css?inline';
import overlayStyles from './text-overlay.css?inline';
import hoverCardStyles from './hover-card.css?inline';

function createSheet(css: string): CSSStyleSheet {
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(css);
  return sheet;
}

const sheets = [
  createSheet(tokenStyles),
  createSheet(widgetStyles),
  createSheet(panelStyles),
  createSheet(toastStyles),
  createSheet(restoreToastStyles),
  createSheet(overlayStyles),
  createSheet(hoverCardStyles),
];
```

In `ensureContainer()`, replace:
```typescript
// Before:
const styleEl = document.createElement('style');
styleEl.textContent = widgetStyles + '\n' + panelStyles + '\n' + toastStyles + '\n' + restoreToastStyles + '\n' + overlayStyles + '\n' + hoverCardStyles;
shadow.appendChild(styleEl);

// After:
shadow.adoptedStyleSheets = sheets;
```

**Step 2: Run tests**

Run: `npm run test`
Expected: All tests pass (Vitest/jsdom supports `adoptedStyleSheets` since jsdom 24+)

Note: If jsdom doesn't support `adoptedStyleSheets`, we may need a polyfill in tests/setup.ts. Check and add if needed:
```typescript
// In tests/setup.ts, if ShadowRoot.prototype.adoptedStyleSheets is undefined:
if (typeof CSSStyleSheet === 'undefined' || !('replaceSync' in CSSStyleSheet.prototype)) {
  // Polyfill for test environment
  (globalThis as Record<string, unknown>).CSSStyleSheet = class {
    replaceSync(): void { /* noop in tests */ }
  };
}
```

**Step 3: Commit**

```bash
git add src/ui/widget/widget-controller.ts
git commit -m "refactor(widget): adoptedStyleSheets replaces style concatenation"
```

---

## Task 7: Extract computeWidgetPosition pure function

Extract position calculation into a testable pure function. Add comprehensive unit tests.

**Files:**
- Create: `src/ui/widget/position.ts`
- Create: `tests/unit/ui/widget/position.test.ts`
- Modify: `src/ui/widget/widget-controller.ts`

**Step 1: Write the position test file**

```typescript
import { describe, it, expect } from 'vitest';
import { computeWidgetPosition } from '../../../../src/ui/widget/position';
import type { AnchorConfig } from '../../../../src/ui/widget/position';

function makeRect(overrides: Partial<DOMRect> = {}): DOMRect {
  const defaults = {
    top: 300, left: 200, right: 800, bottom: 400,
    width: 600, height: 100, x: 200, y: 300,
  };
  return { ...defaults, ...overrides, toJSON: () => ({}) } as DOMRect;
}

const viewport = { width: 1024, height: 768 };
const widgetSize = { width: 120, height: 36 };

const defaultConfig: AnchorConfig = {
  edge: 'bottom-right',
  offsetX: 12,
  offsetY: 36,
};

describe('computeWidgetPosition', () => {
  it('positions at bottom-right of input rect', () => {
    const pos = computeWidgetPosition(makeRect(), widgetSize, viewport, defaultConfig);
    expect(pos.left).toBe(800 - 120 - 12); // right - widgetWidth - offsetX
    expect(pos.top).toBe(400 - 36); // bottom - offsetY
  });

  it('clamps to right edge of viewport', () => {
    const pos = computeWidgetPosition(
      makeRect({ right: 1020 }),
      widgetSize,
      viewport,
      defaultConfig,
    );
    expect(pos.left).toBeLessThanOrEqual(viewport.width - widgetSize.width);
  });

  it('clamps to left edge of viewport', () => {
    const pos = computeWidgetPosition(
      makeRect({ right: 50 }),
      widgetSize,
      viewport,
      defaultConfig,
    );
    expect(pos.left).toBeGreaterThanOrEqual(0);
  });

  it('clamps to bottom of viewport', () => {
    const pos = computeWidgetPosition(
      makeRect({ bottom: 780 }),
      widgetSize,
      viewport,
      defaultConfig,
    );
    expect(pos.top).toBeLessThanOrEqual(viewport.height - widgetSize.height);
  });

  it('clamps to top of viewport', () => {
    const pos = computeWidgetPosition(
      makeRect({ bottom: 10 }),
      widgetSize,
      viewport,
      defaultConfig,
    );
    expect(pos.top).toBeGreaterThanOrEqual(0);
  });

  it('returns integer pixel values', () => {
    const pos = computeWidgetPosition(
      makeRect({ right: 500.7, bottom: 300.3 }),
      widgetSize,
      viewport,
      defaultConfig,
    );
    expect(pos.top).toBe(Math.round(pos.top));
    expect(pos.left).toBe(Math.round(pos.left));
  });

  it('supports bottom-left edge', () => {
    const pos = computeWidgetPosition(
      makeRect(),
      widgetSize,
      viewport,
      { edge: 'bottom-left', offsetX: 12, offsetY: 36 },
    );
    expect(pos.left).toBe(200 + 12); // left + offsetX
    expect(pos.top).toBe(400 - 36); // bottom - offsetY
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- tests/unit/ui/widget/position.test.ts`
Expected: FAIL — module not found

**Step 3: Implement position.ts**

```typescript
export interface AnchorConfig {
  readonly edge: 'bottom-right' | 'bottom-left';
  readonly offsetX: number;
  readonly offsetY: number;
}

export interface WidgetPosition {
  readonly top: number;
  readonly left: number;
}

/**
 * Compute widget position relative to an input element rect.
 *
 * Pure function — no DOM access. Fully testable.
 */
export function computeWidgetPosition(
  inputRect: DOMRect,
  widgetSize: { width: number; height: number },
  viewport: { width: number; height: number },
  config: AnchorConfig,
): WidgetPosition {
  let top: number;
  let left: number;

  switch (config.edge) {
    case 'bottom-right':
      top = inputRect.bottom - config.offsetY;
      left = inputRect.right - widgetSize.width - config.offsetX;
      break;
    case 'bottom-left':
      top = inputRect.bottom - config.offsetY;
      left = inputRect.left + config.offsetX;
      break;
  }

  // Clamp to viewport
  top = Math.max(0, Math.min(top, viewport.height - widgetSize.height));
  left = Math.max(0, Math.min(left, viewport.width - widgetSize.width));

  return { top: Math.round(top), left: Math.round(left) };
}
```

**Step 4: Run tests to verify they pass**

Run: `npm run test -- tests/unit/ui/widget/position.test.ts`
Expected: All pass

**Step 5: Wire into widget-controller.ts**

Replace `updatePosition()` to use the pure function:

```typescript
import { computeWidgetPosition } from './position';
import type { AnchorConfig } from './position';

// Near top of createWidgetController:
const anchorConfig: AnchorConfig = { edge: 'bottom-right', offsetX: 12, offsetY: 36 };

// Replace updatePosition:
function updatePosition(): void {
  if (!wrapper || !currentInput) return;
  const rect = currentInput.getBoundingClientRect();
  const pos = computeWidgetPosition(
    rect,
    { width: 140, height: 36 },
    { width: window.innerWidth, height: window.innerHeight },
    anchorConfig,
  );
  wrapper.style.top = `${pos.top}px`;
  wrapper.style.left = `${pos.left}px`;
}
```

**Step 6: Run full test suite**

Run: `npm run test`
Expected: All tests pass

**Step 7: Commit**

```bash
git add src/ui/widget/position.ts tests/unit/ui/widget/position.test.ts src/ui/widget/widget-controller.ts
git commit -m "refactor(position): extract pure computeWidgetPosition function"
```

---

## Task 8: Replace setInterval polling with ResizeObserver

Replace the 300ms `setInterval` position poll with event-driven `ResizeObserver` on the input element.

**Files:**
- Modify: `src/ui/widget/widget-controller.ts`

**Step 1: Replace polling with ResizeObserver**

Remove `positionPollId`, `startPositionPolling()`, `stopPositionPolling()`. Add `ResizeObserver`:

```typescript
let resizeObserver: ResizeObserver | null = null;

function startObserving(): void {
  stopObserving();
  if (!currentInput) return;

  resizeObserver = new ResizeObserver(() => {
    onScrollOrResize();
  });
  resizeObserver.observe(currentInput);
  // Also observe the body for layout shifts that move the input
  resizeObserver.observe(document.body);
}

function stopObserving(): void {
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
}
```

In `mount()`, replace `startPositionPolling()` with `startObserving()`.

In `unmount()`, replace `stopPositionPolling()` with `stopObserving()`.

In `destroy()`, no change needed (unmount already calls stopObserving).

**Step 2: Run tests**

Run: `npm run test`
Expected: All tests pass

Note: If `ResizeObserver` is not available in jsdom test environment, add a mock in `tests/setup.ts`:
```typescript
if (typeof ResizeObserver === 'undefined') {
  (globalThis as Record<string, unknown>).ResizeObserver = class {
    observe(): void { /* noop */ }
    unobserve(): void { /* noop */ }
    disconnect(): void { /* noop */ }
  };
}
```

**Step 3: Commit**

```bash
git add src/ui/widget/widget-controller.ts
git commit -m "perf(widget): replace 300ms setInterval poll with ResizeObserver"
```

---

## Task 9: Final cleanup + full test run

Verify everything works end-to-end. Run linter. Clean up any remaining hardcoded hex values.

**Files:**
- Possibly modify: any remaining files with hardcoded hex

**Step 1: Search for remaining hardcoded hex in widget CSS files**

Run a grep for hex color patterns across widget CSS/TSX files. Any `#[0-9A-Fa-f]{6}` in component CSS (not tokens) is a candidate for replacement.

Exceptions (OK to keep):
- `#FFFFFF` in critical badge text (or move to token)
- `rgba()` values (opacity variants — could define as tokens later)

**Step 2: Run linter**

Run: `npm run lint`
Expected: No errors

**Step 3: Run full test suite**

Run: `npm run test`
Expected: All tests pass

**Step 4: Final commit if any cleanup was needed**

```bash
git add -A
git commit -m "chore: final design system cleanup — verify all hex values tokenized"
```

---

## Summary

| Task | What | Key Outcome |
|------|------|-------------|
| 1 | widget-tokens.css | Token foundation for Shadow DOM |
| 2 | Widget data-severity + CSS vars | Single source of truth for severity colors |
| 3 | Panel + HoverCard unified severity | One severity system across all components |
| 4 | Toasts CSS vars | Consistent token usage |
| 5 | TextOverlay data-severity | Underline colors CSS-driven |
| 6 | adoptedStyleSheets | Composable, performant style injection |
| 7 | computeWidgetPosition | Testable positioning logic |
| 8 | ResizeObserver | No more CPU-wasting poll |
| 9 | Final cleanup | Everything verified |

**After this refactor:**
- Change any color → edit `widget-tokens.css` only
- Change widget positioning/anchoring → edit `position.ts` + its test
- Change a component's appearance → edit its CSS file only (token vars as knobs)
- Test any visual state → assert `data-severity` in DOM (no class parsing)
- Experiment with layout variants → add `data-variant` attributes and CSS rules
