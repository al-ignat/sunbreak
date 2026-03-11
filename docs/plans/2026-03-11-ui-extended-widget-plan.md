# UI: Extended Widget — Implementation Plan

**Date:** 2026-03-11
**Branch:** `ui/extended-widget`
**Status:** Completed
**Design:** `docs/design/pencil-sunbreak.pen` > "Widget Redesign — Slim & Extended"

---

## Summary

Replace the current text-heavy widget (`☀ Sunbreak [badge|✓|N masked]`) with the
compact Extended Widget from the Pencil design: sun icon + severity-colored count
badge + optional blue masked badge. No "Sunbreak" text. Border and shadow tint
match the highest-severity finding.

### Current vs New

```
Current:  [ ☀ Sunbreak  3 ]    ~140px, text-heavy, binary clean/findings
New:      [ ☀ ● 3 ]            ~60px, icon + badge, 4-level severity colors
New+mask: [ ☀ ● 3 | 5 ]       ~90px, severity badge + divider + blue masked badge
```

---

## Design Spec (from Pencil)

### Severity Levels

| Level    | Icon color | Badge bg  | Badge text | Border    | Shadow tint  |
|----------|-----------|-----------|------------|-----------|-------------|
| Clean    | #34D399   | —         | —          | #065F46   | #00000020   |
| Warning  | #FBBF24   | #FBBF24   | #1E1D21    | #92700A   | #FBBF2415   |
| Concern  | #FB923C   | #FB923C   | #1E1D21    | #9A4A12   | #FB923C15   |
| Critical | #F87171   | #F87171   | #FFFFFF    | #991B1B   | #F8717115   |

### Finding Type → Severity Mapping

| Severity  | Finding types                    | Rationale                     |
|-----------|----------------------------------|-------------------------------|
| Critical  | `api-key`                        | Credentials = direct breach   |
| Concern   | `ssn`, `cpr`, `ni-number`, `credit-card` | Identity/financial data |
| Warning   | `email`, `phone`, `ip-address`   | Contact info, network info    |
| (none)    | `keyword`                        | User-defined → Warning        |

Widget severity = **max** across all active findings (Critical > Concern > Warning).

### Masked Badge

- Background: `#1E40AF`, text: `#60A5FA`, font: Outfit 11px bold
- Appears next to severity badge when `maskedCount > 0`
- Separated by 1px × 14px divider (`#2E2D33`) when both badges shown
- Clean+Masked: green icon + blue masked badge (no severity badge)

### Dimensions

- Background: `#1E1D21`, corner-radius: `100px` (full pill)
- Padding: `8px 12px` (clean), `8px 14px 8px 12px` (with badges)
- Icon: 18×18 Lucide sun (currently 16×16 — bump)
- Badge pill: corner-radius 100, padding `2px 7px`
- Gap: 8px icon→badge, 6px badge→divider→masked
- Shadow: blur 12px, y-offset 2px (currently blur 8px — increase)

---

## Task Breakdown

### T1 — Severity type system

**New file:** `src/ui/widget/severity.ts`

Extract severity logic into a shared module (currently duplicated in
FindingsPanel.tsx and text-overlay-utils.ts):

```typescript
export type SeverityLevel = 'clean' | 'warning' | 'concern' | 'critical';

export const SEVERITY_ORDER: Record<SeverityLevel, number>;
export const SEVERITY_COLORS: Record<SeverityLevel, {
  icon: string; badge: string; badgeText: string;
  border: string; shadow: string;
}>;

export function findingSeverity(type: FindingType): SeverityLevel;
export function maxSeverity(tracked: ReadonlyArray<TrackedFinding>): SeverityLevel;
```

Also update `FindingsPanel.tsx` and `text-overlay-utils.ts` to import from
this module instead of defining their own severity maps.

**Tests:** Unit tests for `findingSeverity()` and `maxSeverity()` edge cases
(empty list, mixed types, all ignored).

### T2 — Widget component rewrite

**File:** `src/ui/widget/Widget.tsx`

Replace the current render with the Extended Widget layout:

```
Clean:            [ ☀ ]
Warning:          [ ☀  (2) ]        yellow badge
Concern:          [ ☀  (5) ]        orange badge
Critical:         [ ☀  (3) ]        red badge
Clean+Masked:     [ ☀  (3) ]        blue badge
Warning+Masked:   [ ☀  (2) | (3) ]  yellow + divider + blue
Critical+Masked:  [ ☀  (3) | (5) ]  red + divider + blue
```

Changes:
- Remove `<span class="sb-widget__label">Sunbreak</span>`
- Remove `CheckIcon` component (clean state = just the icon, no checkmark)
- Replace `WidgetStatus` (`'clean' | 'findings'`) with `SeverityLevel`
- Pass severity level as CSS class: `sb-widget--{severity}`
- Severity badge: colored pill with count (only when activeCount > 0)
- Masked badge: blue pill with count (only when maskedCount > 0)
- Divider: thin rectangle between badges (only when both shown)
- Update `buildAriaLabel()` to include severity name
- Bump SVG icon from 16×16 to 18×18

### T3 — Widget CSS rewrite

**File:** `src/ui/widget/widget.css`

Replace binary `.sb-widget--clean` / `.sb-widget--findings` with 4 severity
states plus masked badge styling:

```css
.sb-widget--clean    { border-color: #065F46; color: #34D399; }
.sb-widget--warning  { border-color: #92700A; color: #FBBF24; }
.sb-widget--concern  { border-color: #9A4A12; color: #FB923C; }
.sb-widget--critical { border-color: #991B1B; color: #F87171; }
```

New elements:
- `.sb-widget__severity-badge` — colored count pill
- `.sb-widget__masked-badge` — blue count pill
- `.sb-widget__divider` — 1px × 14px separator

Remove:
- `.sb-widget__label` — no "Sunbreak" text
- `.sb-widget__badge` — replaced by severity-badge
- `.sb-widget__check` — no checkmark in clean state
- `.sb-widget__sep` — replaced by divider
- `.sb-widget__masked` — replaced by masked-badge

Update:
- Padding from `6px 12px` to `8px 12px`
- Shadow from `0 2px 8px` to `0 2px 12px` with severity-tinted colors
- Hover states per severity level
- Opacity: keep 0.6 default, 1.0 on hover (existing behavior works)

### T4 — Widget controller severity pass-through

**File:** `src/ui/widget/widget-controller.ts`

Minimal changes:
- Import `maxSeverity` from `severity.ts`
- Compute severity in `renderWidget()` from `findingsState.getSnapshot()`
- Pass as prop to `Widget` component (Widget already subscribes to
  findingsState, so it can compute severity internally too — decide which
  is cleaner)

**Decision:** Let Widget compute severity internally from its own snapshot
subscription. This keeps the controller unchanged and the component
self-contained.

### T5 — Update FindingsPanel severity import

**File:** `src/ui/widget/FindingsPanel.tsx`

- Import `findingSeverity` and color map from `severity.ts`
- Remove local `SEVERITY_MAP` and `getSeverity()`
- Map severity levels to dot colors (same colors, just sourced from shared module)

### T6 — Update TextOverlay severity import

**File:** `src/ui/widget/text-overlay-utils.ts`

- Import `SEVERITY_COLORS` and `findingSeverity` from `severity.ts`
- Remove local `severityColor()` function
- Map finding type → severity → underline color

### T7 — Tests

- Unit tests for `severity.ts` functions
- Update existing Widget snapshot/behavior tests for new markup
- Update FindingsPanel tests if they reference old severity types
- Run full suite: `npm run test`

---

## Files Changed

| File | Change |
|------|--------|
| `src/ui/widget/severity.ts` | **New** — shared severity types + colors |
| `src/ui/widget/Widget.tsx` | Rewrite render, remove text label |
| `src/ui/widget/widget.css` | Rewrite for 4-level severity + badges |
| `src/ui/widget/FindingsPanel.tsx` | Import severity from shared module |
| `src/ui/widget/text-overlay-utils.ts` | Import severity from shared module |
| `tests/unit/ui/widget/severity.test.ts` | **New** — severity unit tests |
| Existing widget tests | Update assertions for new markup |

## Files NOT Changed

- `widget-controller.ts` — Widget computes severity internally
- `orchestrator.ts`, `observer.ts` — no wiring changes
- `HoverCard.tsx`, `SendToast.tsx`, `RestoreToast.tsx` — untouched
- `findings-panel.css`, `hover-card.css`, toast CSS — untouched

---

## Scope

**In:** Widget component, CSS, shared severity module, test updates
**Out:** Badge positioning (separate plan), FindingsPanel redesign, toast
redesign, hover card changes, new detection categories

---

## Verification

- [x] Widget shows green sun icon when no findings
- [x] Widget shows yellow icon + yellow "2" badge for email-only findings
- [x] Widget shows orange icon + orange "5" badge for credit-card findings
- [x] Widget shows red icon + red "3" badge for api-key findings
- [x] Mixed findings: widget shows highest severity (e.g., email + api-key → red)
- [x] Clean + 3 masked: green icon + blue "3" badge
- [x] Warning + 3 masked: yellow icon + yellow badge + divider + blue badge
- [x] Critical + 5 masked: red icon + red badge + divider + blue badge
- [x] Panel still opens/closes on click
- [x] Inline underlines still render with correct colors
- [x] HoverCard still works
- [x] SendToast and RestoreToast still work
- [x] Reduced motion: no animation
- [x] All existing tests pass (or updated)
- [x] New severity tests pass
