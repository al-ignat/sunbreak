---
title: "feat: UI redesign — design tokens, dark dashboard, overlay hardening, popup density"
type: feat
status: completed
date: 2026-03-03
origin: docs/plans/2026-03-03-ui-redesign-plan.md
---

# feat: UI Redesign Implementation

## Overview

Transform the extension from generic Material-orange-on-white to a utilitarian, industrial aesthetic. Dark dashboard, stronger overlay, denser popup, self-hosted typography, and a proper design token system replacing ~25 hardcoded color values across 15+ files.

Three UI surfaces, three strategies:
- **Dashboard** — dark theme (`#1A1F2E` base), DM Sans + JetBrains Mono, CSS classes
- **Popup** — light theme, DM Sans, tighter spacing, CSS classes
- **Overlay** — light theme, system fonts, stays in Shadow DOM with `?inline` CSS

(see redesign direction: `docs/plans/2026-03-03-ui-redesign-plan.md`)

## Problem Statement / Motivation

The extension is functionally complete (355 tests, 84KB build) but visually indistinguishable from a settings page. System fonts, `#FF9800` everywhere, white cards with `#E0E0E0` borders. The overlay — the core UX moment where sensitive data is intercepted — is too polite. "Send Anyway" (the dangerous choice) looks identical to "Cancel."

The inline styles (`style={{ ... }}`) across all components prevent hover/focus states, media queries, and any design-system consistency. Colors are hardcoded at 25+ use-sites with no shared tokens.

## Resolved Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Font loading | Self-hosted woff2 in `public/fonts/` | Zero network requests (CLAUDE.md rule) |
| Dark theme scope | Dashboard only | Popup and overlay sit on/near host pages — dark would clash |
| Overlay color scheme | Fixed light, no `prefers-color-scheme` | Consistent, simpler CSS |
| Backdrop behavior | Cosmetic only (5-10% opacity) | No pointer-events blocking. Shadow DOM container stays zero-size. |
| StatsCard sharing | Split into `PopupStats` + `DashboardStats` | Clean separation — no theme-awareness conditionals |
| Overlay font | System font stack | No `@font-face` injection into Shadow DOM. Keeps overlay lightweight. |
| Overlay position | Stay at `bottom: 80px` | Near chat input, already works, no container restructuring |
| `prefers-reduced-motion` | All animations → `0ms` when reduced | WCAG AA compliance |

## Proposed Solution

Six phases, each independently shippable. Phase 1 (tokens) unblocks all others.

### Phase 1: Design Tokens + CSS Infrastructure

**Goal:** Replace all hardcoded values with CSS custom properties. Create per-entrypoint stylesheets.

**Step 1: Create `src/ui/tokens.css`**

Define the full token inventory. Every component will reference these variables.

```css
/* src/ui/tokens.css */
:root {
  /* === Typography === */
  --font-body: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-mono: 'JetBrains Mono', 'SF Mono', 'Fira Code', monospace;

  /* === Colors — Light (popup, overlay fallback) === */
  --color-bg-page: #F5F5F5;
  --color-bg-card: #FFFFFF;
  --color-bg-elevated: #FAFAFA;
  --color-border: #E0E0E0;
  --color-border-subtle: #F0F0F0;

  --color-text-primary: #333333;
  --color-text-secondary: #666666;
  --color-text-muted: #888888;

  /* === Signal Colors (shared across themes) === */
  --color-warning: #F59E0B;        /* amber — warnings, flagged items */
  --color-warning-bg: #FFF3E0;     /* light amber background */
  --color-safe: #10B981;           /* teal-green — redacted, compliant */
  --color-safe-bg: rgba(16, 185, 129, 0.12);
  --color-danger: #EF4444;         /* red — "Send Anyway", destructive */
  --color-danger-bg: rgba(239, 68, 68, 0.08);
  --color-info: #1565C0;           /* blue — edited, informational */
  --color-cta: #E65100;            /* deep orange — primary CTA */
  --color-cta-hover: #BF360C;

  /* === Tool Colors === */
  --color-tool-chatgpt: #10A37F;
  --color-tool-claude: #D97706;
  --color-tool-gemini: #4285F4;

  /* === Action Colors === */
  --color-action-redacted: #2E7D32;
  --color-action-sent-anyway: #E65100;
  --color-action-cancelled: #888888;
  --color-action-edited: #1565C0;

  /* === Spacing === */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 12px;
  --space-lg: 16px;
  --space-xl: 20px;
  --space-2xl: 24px;

  /* === Radii === */
  --radius-sm: 2px;
  --radius-md: 4px;
  --radius-lg: 6px;

  /* === Shadows === */
  --shadow-card: 0 1px 3px rgba(0, 0, 0, 0.08);
  --shadow-elevated: 0 4px 12px rgba(0, 0, 0, 0.12);

  /* === Transitions === */
  --transition-fast: 100ms ease-out;
  --transition-normal: 150ms ease-out;
}

/* Dark theme — applied on dashboard only */
[data-theme="dark"] {
  --color-bg-page: #1A1F2E;
  --color-bg-card: #242938;
  --color-bg-elevated: #2A3040;
  --color-border: #333A4A;
  --color-border-subtle: #2A3040;

  --color-text-primary: #E8E8ED;
  --color-text-secondary: #A0A4B0;
  --color-text-muted: #6B7080;

  --color-warning-bg: rgba(245, 158, 11, 0.12);
  --color-safe-bg: rgba(16, 185, 129, 0.08);
  --color-danger-bg: rgba(239, 68, 68, 0.06);

  --shadow-card: 0 1px 3px rgba(0, 0, 0, 0.2);
  --shadow-elevated: 0 4px 12px rgba(0, 0, 0, 0.3);
}

@media (prefers-reduced-motion: reduce) {
  :root {
    --transition-fast: 0ms;
    --transition-normal: 0ms;
  }
}
```

**Step 2: Download and bundle fonts**

- Download DM Sans (400, 500, 600) and JetBrains Mono (400) as woff2
- Place in `public/fonts/`
- Add `@font-face` declarations in `tokens.css` (dashboard and popup will import it; overlay will not)

```
public/fonts/
  dm-sans-400.woff2
  dm-sans-500.woff2
  dm-sans-600.woff2
  jetbrains-mono-400.woff2
```

**Step 3: Create entrypoint stylesheets**

- `src/entrypoints/dashboard/dashboard.css` — imports `tokens.css`, sets `[data-theme="dark"]` on `<html>`
- `src/entrypoints/popup/popup.css` — imports `tokens.css`, light theme only
- Update both `index.html` files to link the new CSS

**Step 4: Update `src/ui/format.ts`**

Audit the six hardcoded hex values against WCAG AA contrast on dark cards. Add dark-safe variants if needed:

```typescript
// format.ts — add dark-safe colors for dashboard context
export function actionColor(action: string, dark = false): string { ... }
```

Or: keep the current colors and verify they pass contrast against `#242938` (card bg). Adjust only if they fail.

**Step 5: Delete `src/ui/dashboard/styles.ts`**

Replace the three exported style constants (`sectionStyle`, `sectionHeaderStyle`, `emptyStateStyle`) with CSS classes in `dashboard.css`. Update `KeywordManager.tsx`, `SettingsPanel.tsx`, and `ActivityLog.tsx` to use class names instead of importing from `styles.ts`.

**Files changed:**
- New: `src/ui/tokens.css`
- New: `src/entrypoints/dashboard/dashboard.css`
- New: `src/entrypoints/popup/popup.css`
- New: `public/fonts/` (4 woff2 files)
- Modified: `src/entrypoints/dashboard/index.html` (link CSS, add `data-theme="dark"` on `<html>`)
- Modified: `src/entrypoints/popup/index.html` (link CSS)
- Modified: `src/ui/format.ts` (contrast audit)
- Deleted: `src/ui/dashboard/styles.ts`
- Modified: `KeywordManager.tsx`, `SettingsPanel.tsx`, `ActivityLog.tsx` (drop styles.ts import, use classes)

**Acceptance criteria:**
- [ ] `tokens.css` defines all variables listed above
- [ ] `@font-face` declarations load DM Sans + JetBrains Mono from `public/fonts/`
- [ ] `dashboard.css` imports tokens, applies dark theme via `[data-theme="dark"]`
- [ ] `popup.css` imports tokens, applies light theme
- [ ] `styles.ts` deleted, no remaining imports
- [ ] `npm run build` succeeds, fonts copied to `.output/chrome-mv3/fonts/`
- [ ] All 355+ unit tests pass (tests don't assert on styles)

---

### Phase 2: Overlay Redesign

**Goal:** Make the overlay feel like interception, not suggestion. Stronger visual hierarchy, danger styling on "Send Anyway."

**Step 1: New button class — `byoai-btn--danger`**

Add to `WarningBanner.css`:
```css
.byoai-btn--danger {
  color: var(--color-danger, #EF4444);
  background: transparent;
  border: 1px solid transparent;
}
.byoai-btn--danger:hover {
  background: var(--color-danger-bg, rgba(239, 68, 68, 0.08));
  border-color: var(--color-danger, #EF4444);
}
```

Note: CSS variables in the overlay get fallback values since the Shadow DOM doesn't inherit `:root` variables. Use the `var(--name, fallback)` pattern throughout overlay CSS.

Apply `byoai-btn--danger` to "Send Anyway" button in `WarningBanner.tsx`. Keep "Cancel" as `byoai-btn--tertiary`.

**Step 2: Entrance animation**

Replace the current gentle slide-up with scale + opacity:
```css
@keyframes byoai-entrance {
  from { opacity: 0; transform: translateX(-50%) scale(0.96); }
  to   { opacity: 1; transform: translateX(-50%) scale(1); }
}
.byoai-banner {
  animation: byoai-entrance 100ms ease-out;
}
@media (prefers-reduced-motion: reduce) {
  .byoai-banner { animation: none; }
}
```

**Step 3: Cosmetic backdrop**

Add a `::before` pseudo-element on the wrapper inside the Shadow DOM:
```css
#byoai-overlay-wrapper::before {
  content: '';
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.06);
  pointer-events: none;  /* cosmetic only */
  z-index: -1;
}
```

This requires the overlay wrapper to have `position: relative` or the pseudo to be positioned against the viewport. Since the wrapper is inside the zero-size host, the `position: fixed` on the pseudo-element will cover the viewport within the shadow root. `pointer-events: none` ensures no click blocking.

**Step 4: Visual refinements**

- Summary text: bump to `font-weight: 600`, `font-size: 15px` (from 14px)
- "Redact & Send" button: add `padding: 10px 20px` (from 8px 16px) — "slightly larger" means more generous padding
- Reduce border-radius from `8px` to `4px` on the banner and `4px` on buttons
- Update the primary accent from `#FF9800` to `#F59E0B` (signal amber) for the left border and icon

**Files changed:**
- Modified: `src/ui/overlay/WarningBanner.css`
- Modified: `src/ui/overlay/WarningBanner.tsx` (assign `byoai-btn--danger` class to "Send Anyway")

**Acceptance criteria:**
- [ ] "Send Anyway" has red text, red-tinted hover state
- [ ] "Cancel" remains grey/tertiary — visually distinct from "Send Anyway"
- [ ] Banner appears with scale+opacity animation (100ms)
- [ ] Cosmetic backdrop visible behind banner
- [ ] Backdrop does NOT block host page clicks
- [ ] `prefers-reduced-motion: reduce` disables entrance animation
- [ ] All overlay unit tests pass (they test behavior, not styles)

---

### Phase 3: Dashboard Dark Theme + Typography

**Goal:** Transform the dashboard from light/generic to dark/utilitarian. Apply DM Sans + JetBrains Mono.

**Step 1: Apply `data-theme="dark"` to dashboard HTML**

In `src/entrypoints/dashboard/index.html`:
```html
<html data-theme="dark">
```

With `dashboard.css` importing `tokens.css`, the dark overrides from `[data-theme="dark"]` activate automatically.

**Step 2: Migrate all dashboard components from inline styles to CSS classes**

For each component in `src/ui/dashboard/`:
1. Replace `style={{ ... }}` props with `className="..."`
2. Add corresponding classes in `dashboard.css`
3. Use CSS variables from `tokens.css` for all colors, spacing, radii

Components to migrate (in order):
- `TabNav.tsx` — tab bar, active/inactive states
- `StatsCard.tsx` → rename to `DashboardStats.tsx` (new grid layout)
- `BarChart.tsx` — SVG colors need special handling (see Step 3)
- `ActivityLog.tsx` — table, badges, filters
- `SettingsPanel.tsx` — toggles, sections
- `DetectionToggles.tsx` — checkbox list
- `KeywordManager.tsx` — input, badges, import/export
- `ReportCards.tsx` — provider cards
- `src/entrypoints/dashboard/App.tsx` — header, layout

**Step 3: Refactor `BarChart.tsx` SVG attributes**

Inline SVG attributes (`fill="#888"`, `stroke="#F0F0F0"`) cannot be overridden by CSS variables. Convert them:

- Replace `fill="#888"` with `fill="currentColor"` and control via CSS `color` property on parent
- Replace hardcoded `fill` on bars with CSS class selectors on `<rect>` elements
- Replace `stroke="#F0F0F0"` gridlines with `stroke="var(--color-border-subtle)"` — SVG presentation attributes accept `var()` in modern browsers
- Or: set fills via inline `style` prop using JS token values (safer cross-browser)

Pragmatic approach: since BarChart renders via Preact JSX, use JS constants that read from a theme config object rather than trying to make SVG attributes consume CSS variables:

```typescript
const CHART_COLORS = {
  clean: 'var(--color-safe)',
  flagged: 'var(--color-warning)',
  gridline: 'var(--color-border-subtle)',
  text: 'var(--color-text-muted)',
};
```

SVG `fill` and `stroke` attributes do accept CSS `var()` — this works in Chrome (our only target).

**Step 4: Category badge colors for Activity Log**

Define per-category colors (9 detection categories):

| Category | Color | Rationale |
|----------|-------|-----------|
| credit_card | `#EF4444` (red) | Financial — highest severity |
| ssn | `#EF4444` (red) | Identity — highest severity |
| email | `#F59E0B` (amber) | PII — medium |
| phone | `#F59E0B` (amber) | PII — medium |
| ip_address | `#3B82F6` (blue) | Network — technical |
| api_key | `#8B5CF6` (purple) | Credential — technical |
| custom_keyword | `#6B7280` (grey) | User-defined — neutral |
| danish_cpr | `#EF4444` (red) | Identity — highest severity |
| uk_ni | `#EF4444` (red) | Identity — highest severity |

Add a `categoryColor(category: string): string` function to `format.ts`.

**Step 5: Dashboard header and layout**

- Header: dark background (`--color-bg-card`), subtle bottom border
- Tab bar: underline-style active indicator (amber) instead of filled tab
- Content max-width stays 960px

**Files changed:**
- Modified: `src/entrypoints/dashboard/index.html`
- Modified: `src/entrypoints/dashboard/dashboard.css` (all dashboard classes)
- Modified: `src/entrypoints/dashboard/App.tsx` (classes instead of inline)
- Modified: all `src/ui/dashboard/*.tsx` (classes instead of inline)
- Renamed: `StatsCard.tsx` → `DashboardStats.tsx` (grid layout)
- Modified: `src/ui/dashboard/BarChart.tsx` (SVG attribute refactor)
- Modified: `src/ui/format.ts` (add `categoryColor`)

**Acceptance criteria:**
- [ ] Dashboard renders with dark background (`#1A1F2E`)
- [ ] All cards use `--color-bg-card` (`#242938`)
- [ ] Text is light (`--color-text-primary: #E8E8ED`)
- [ ] DM Sans renders for body text
- [ ] JetBrains Mono renders for stat numbers and data values
- [ ] Bar chart colors work on dark background
- [ ] Activity log badges have per-category colors
- [ ] No inline `style={{ }}` remaining in any dashboard component
- [ ] All dashboard unit tests pass
- [ ] WCAG AA contrast: all text meets 4.5:1 on dark cards

---

### Phase 4: Popup Redesign

**Goal:** Tighter, denser popup. Replace Unicode icons with SVGs. Mini compliance gauge.

**Step 1: Create `PopupStats` component**

Extract the popup's usage of `StatsCard` into a new `src/ui/popup/PopupStats.tsx`:
- Compact layout: single column, tight spacing
- Light theme (uses light token values)
- Shows: total scanned, total flagged, compliance rate as a mini ring gauge

**Step 2: Mini compliance gauge**

A small SVG ring (40×40px) showing compliance percentage:
- Full ring = 100% compliance (green)
- Partial ring = percentage (amber under 80%, red under 50%)
- Null state: grey ring with "—" text centered

```tsx
function ComplianceGauge({ rate }: { rate: number | null }): JSX.Element {
  // SVG circle with stroke-dasharray for progress
}
```

**Step 3: Density improvements**

- Reduce container padding: 16px → 12px
- Reduce section gaps: 16px → 8px
- Replace Unicode icons (⚙ ⚠) with inline SVG components (gear, warning-triangle)
- Dashboard link: change from fat orange button to a subtle text link with arrow: `Dashboard →`
  - Element: `<a>` tag (not button) — updates E2E test assertion from `getByRole('button')` to `getByRole('link')`

**Step 4: Typography**

- Apply DM Sans via `popup.css` (inherits from `tokens.css`)
- Stat numbers in JetBrains Mono

**Files changed:**
- New: `src/ui/popup/PopupStats.tsx`
- New: `src/ui/popup/ComplianceGauge.tsx`
- New: `src/ui/icons/` (2-3 SVG icon components: gear, warning-triangle, arrow-right)
- Modified: `src/entrypoints/popup/App.tsx` (classes, new components, density)
- Modified: `src/entrypoints/popup/popup.css`
- Modified: `tests/e2e/popup.spec.ts` (update "View full dashboard" assertion from button to link role)

**Acceptance criteria:**
- [ ] Popup renders with DM Sans typography
- [ ] Compliance gauge shows ring with percentage
- [ ] Gauge shows grey "—" when `complianceRate` is null
- [ ] Unicode icons replaced with SVGs
- [ ] Dashboard link is an `<a>` tag
- [ ] Popup feels noticeably denser — less whitespace
- [ ] E2E popup test passes with updated assertion
- [ ] All popup-related unit tests pass

---

### Phase 5: Micro-Animations

**Goal:** Add subtle transitions so state changes don't snap.

**Step 1: Tab transitions (dashboard)**

```css
.tab-panel {
  opacity: 1;
  transition: opacity var(--transition-normal);
}
.tab-panel--entering {
  opacity: 0;
}
```

Manage `--entering` class in `App.tsx` or `TabNav.tsx` during tab switch.

**Step 2: Custom toggle switches (dashboard settings)**

Replace native `<input type="checkbox">` with a styled toggle:
```css
.toggle-switch {
  width: 36px; height: 20px;
  border-radius: 10px;
  background: var(--color-border);
  transition: background var(--transition-fast);
}
.toggle-switch--active {
  background: var(--color-safe);
}
.toggle-switch__dot {
  width: 16px; height: 16px;
  border-radius: 50%;
  background: white;
  transform: translateX(0);
  transition: transform var(--transition-fast);
}
.toggle-switch--active .toggle-switch__dot {
  transform: translateX(16px);
}
```

**Step 3: Keyword badge animations**

```css
.keyword-badge {
  animation: badge-in var(--transition-fast);
}
@keyframes badge-in {
  from { opacity: 0; transform: scale(0.9); }
  to   { opacity: 1; transform: scale(1); }
}
```

**Step 4: Activity log row hover**

```css
.activity-row:hover {
  background: var(--color-bg-elevated);
  transition: background var(--transition-fast);
}
```

**Step 5: `prefers-reduced-motion` guard**

Already defined in `tokens.css` — `--transition-fast` and `--transition-normal` go to `0ms`. All animations that use `animation:` properties also need direct override:

```css
@media (prefers-reduced-motion: reduce) {
  .byoai-banner,
  .keyword-badge,
  .tab-panel {
    animation: none !important;
  }
}
```

**Files changed:**
- Modified: `src/entrypoints/dashboard/dashboard.css` (transitions, toggle, hover states)
- Modified: `src/ui/dashboard/SettingsPanel.tsx` (custom toggle markup)
- Modified: `src/ui/dashboard/DetectionToggles.tsx` (custom toggle markup)
- Modified: `src/ui/dashboard/KeywordManager.tsx` (badge animation class)
- Modified: `src/ui/dashboard/TabNav.tsx` or `App.tsx` (tab transition class)
- Modified: `src/ui/overlay/WarningBanner.css` (reduced-motion for entrance animation — already in Phase 2)

**Acceptance criteria:**
- [ ] Tab switch has 150ms opacity fade
- [ ] Settings toggles are custom-styled with sliding dot animation
- [ ] Keyword badges scale in on add
- [ ] Activity log rows have hover highlight
- [ ] All animations disabled when `prefers-reduced-motion: reduce` is active
- [ ] No animation exceeds 200ms duration

---

### Phase 6: Cleanup + Verification

**Goal:** Final pass — remove all remaining inline styles, verify contrast, run full test suite.

**Step 1: Inline style audit**

Grep for remaining `style={{` in all `.tsx` files under `src/`. Every instance should be either:
- Replaced with a CSS class, OR
- Justified (e.g., dynamic values that must be computed at runtime)

**Step 2: WCAG AA contrast verification**

Check all text/background combinations against 4.5:1 ratio:
- Light theme (popup): text on white/`#F5F5F5` cards
- Dark theme (dashboard): text on `#242938` cards, `#1A1F2E` page
- Overlay: text on `#FFF8E1` banner (or updated color)
- Signal colors on both themes: amber, green, red, blue badges/text on their respective backgrounds
- `format.ts` action/tool colors on dark cards

**Step 3: Run all tests**

```bash
npm run test        # 355+ unit tests
npm run test:e2e    # popup + dashboard E2E
npm run lint        # ESLint
```

**Step 4: Manual visual QA**

- Load extension in Chrome
- Check popup: fonts, gauge, density, dashboard link
- Check dashboard: dark theme, all 5 tabs, charts, activity log, settings toggles
- Check overlay on ChatGPT/Claude/Gemini: entrance animation, button hierarchy, backdrop
- Check with `prefers-reduced-motion: reduce` in Chrome DevTools

**Step 5: Build size check**

```bash
npm run build
du -sh .output/chrome-mv3/
```

Current build: 84KB. Target: < 300KB after adding fonts (~100-200KB woff2).

**Acceptance criteria:**
- [ ] Zero remaining unjustified `style={{` in component files
- [ ] All text passes WCAG AA 4.5:1 contrast
- [ ] Full test suite green
- [ ] ESLint clean
- [ ] Build size < 300KB
- [ ] Visual QA pass on all three surfaces

## Technical Considerations

### Shadow DOM CSS Isolation

The overlay runs in a closed Shadow DOM. It cannot access `:root` CSS variables from the document. Two options:
1. **Fallback values:** `var(--color-danger, #EF4444)` — use this. Simple, self-contained.
2. **Duplicate tokens in shadow root:** inject a subset of `tokens.css` into the shadow root alongside `WarningBanner.css`.

Recommend option 1 — the overlay uses only ~5 color values and doesn't need the full token system.

### SVG Attribute Styling in Chrome

SVG `fill` and `stroke` attributes accept CSS `var()` in Chrome (our only target browser). Example: `<rect fill="var(--color-safe)" />`. This is not universally supported across browsers but works reliably in Chromium. Since this is a Chrome-only extension, this approach is safe.

### Font File Size Budget

| File | Estimated Size |
|------|---------------|
| DM Sans 400 | ~40KB |
| DM Sans 500 | ~40KB |
| DM Sans 600 | ~40KB |
| JetBrains Mono 400 | ~50KB |
| **Total** | **~170KB** |

This brings the extension from 84KB to ~254KB. Well under Chrome's soft limit of 10MB and acceptable for a local-only extension.

### Test Impact

All existing tests are behavior-based (`@testing-library/preact` with `render`, `fireEvent`, `screen`). No snapshot tests. No style assertions. **The entire CSS migration can be done without breaking any test** — but:

- E2E `popup.spec.ts` queries `getByRole('button', { name: 'View full dashboard' })` — this changes to `getByRole('link')` when the dashboard button becomes an `<a>` tag (Phase 4)
- If `StatsCard` is renamed to `DashboardStats`, any test importing it by name needs updating

### Migration Safety: Inline → CSS Classes

The safest migration order per component:
1. Add the CSS class in the stylesheet
2. Add `className` to the JSX element
3. Remove the `style={{ }}` prop
4. Verify visually (dev mode hot reload)

Never do steps 2 and 3 atomically across many components — do one component at a time.

## System-Wide Impact

### Interaction Graph

- Token changes cascade to all UI surfaces via CSS variable inheritance
- Dashboard `[data-theme="dark"]` activates dark overrides without JS
- Overlay CSS is isolated — changes there cannot affect the host page or other extension pages
- `format.ts` color changes affect ActivityLog badges (dashboard) and recent activity (popup)

### Error Propagation

- Font loading failure: CSS `font-family` stack includes system font fallbacks — graceful degradation
- Missing CSS variable: every `var()` in overlay CSS has a hardcoded fallback — no broken rendering
- Build failure: `npm run build` will catch any broken imports or missing files

### State Lifecycle Risks

None. This is a pure presentation change. No storage schema changes, no message passing changes, no content script behavior changes.

### API Surface Parity

- The `StatsCard` → `DashboardStats` rename requires updating the import in `BarChart.tsx` and `dashboard/App.tsx`
- The popup's `StatsCard` usage gets replaced by `PopupStats` — different component, different import path

## Dependencies & Risks

### Dependencies

- Phases 1-5 complete (all code exists, 355+ tests pass)
- DM Sans and JetBrains Mono woff2 files (open-source, freely available)
- Chrome DevTools for contrast verification

### Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| SVG `var()` support edge case | Chart colors break | Test in Chrome 120+; fallback to JS constants |
| Font files bloat build | Slower install from CWS | Budget is ~170KB; well under 10MB limit |
| Inline style removal misses a component | Visual regression | Grep audit in Phase 6; dev mode visual QA |
| Dark theme contrast failures | WCAG AA violation | Test every text/background combo before merging |
| `styles.ts` deletion breaks imports | Build failure | Delete file last, after all consumers migrated |

## Success Metrics

- All hardcoded colors replaced with CSS variables or documented exceptions
- Dashboard renders fully dark with no light-theme remnants
- Overlay "Send Anyway" is visually distinguishable from "Cancel"
- Popup renders in < 100ms with new fonts
- Build size < 300KB
- Zero test failures
- WCAG AA contrast on all surfaces

## Sources & References

### Origin

- **Redesign direction:** [docs/plans/2026-03-03-ui-redesign-plan.md](docs/plans/2026-03-03-ui-redesign-plan.md) — design direction, findings, resolved questions

### Internal References

- Overlay CSS: `src/ui/overlay/WarningBanner.css`
- Overlay controller: `src/ui/overlay/overlay-controller.ts`
- Dashboard entry: `src/entrypoints/dashboard/App.tsx`
- Popup entry: `src/entrypoints/popup/App.tsx`
- Shared styles (to delete): `src/ui/dashboard/styles.ts`
- Color helpers: `src/ui/format.ts`
- Shadow DOM learnings: `docs/solutions/ui-bugs/preact-hooks-shadow-dom-overlay-pitfalls.md`
- Dashboard code review: `docs/solutions/code-quality/phase-5-dashboard-code-review-fixes.md`

### Related Work

- Phase 4 PR (overlay): implemented current `WarningBanner.css`
- Phase 5 PR: #5 (dashboard)
- Phase 6 PRs: #6, #7, #8 (integration, polish)
