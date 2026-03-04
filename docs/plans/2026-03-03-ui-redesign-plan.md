# Plan: UI Redesign — Secure BYOAI

Date: 2026-03-03
Status: Draft — not yet started

## Context

The extension is functionally complete but visually generic. System fonts, Material-orange-on-white-cards aesthetic. Doesn't communicate "security tool" — looks like any settings page. The overlay (the core UX moment) is too polite for a tool that stops sensitive data leaks.

## Design Direction

**Utilitarian / industrial.** Think control panel, not settings page. Precise, authoritative, purposeful. Dark dashboard. Color used only for status and severity.

## Findings (6 areas)

### 1. Generic visual identity (HIGH impact, MEDIUM effort)

Current: system fonts, `#FF9800` orange everywhere, `#FAFAFA` backgrounds, 8px radius white cards with `#E0E0E0` borders. Looks like default Material UI.

Changes:
- Typography: **DM Sans** or **General Sans** for body. **JetBrains Mono** or **IBM Plex Mono** for data values, stats, detected items
- Palette shift: deep slate base (`#1A1F2E`), signal amber (`#F59E0B`) for warnings only, teal/green (`#10B981`) for safe/redacted states
- Dark theme for dashboard
- Border-radius: 8px → 4px or 2px (precision over friendliness)

### 2. Overlay is too polite (HIGH impact, MEDIUM effort)

Current: soft yellow `#FFF8E1` background, thin left border, gentle slide-up. Easy to miss or dismiss.

Changes:
- Stronger entrance animation: scale + opacity (100ms) — feels like interception, not suggestion
- Summary text: bolder weight, larger size, tighter leading
- **Send Anyway** must look dangerous: red text or red tint on hover. Currently identical to Cancel
- **Redact & Send** (safe choice): most prominent element. Slightly larger, possible subtle pulse on first appearance
- Semi-transparent backdrop (5-10% opacity) behind banner to create modal moment
- Consider positioning change: currently bottom 80px. Could be more central/intrusive

### 3. Data presentation lacks hierarchy (MEDIUM impact, MEDIUM effort)

Current: StatsCard dumps metrics in a paragraph with `<strong>` tags. Bar chart is plain SVG. Activity log is flat table.

Changes:
- **Stats**: grid of 4-6 discrete stat cards. Large number + label + trend indicator. Compliance rate gets biggest treatment
- **Bar chart**: hover tooltips with exact values. Subtle gradients on bars instead of flat fills. Either make gridlines useful or remove them
- **Activity log**: per-category accent colors for badges (not all orange). Row hover states. Action column as colored badges, not just colored text

### 4. Popup needs density (MEDIUM impact, SMALL effort)

Current: 400px wide, 16px padding, lots of whitespace. Unicode icons (⚙, ⚠) render differently across OS. Fat orange dashboard button.

Changes:
- Tighten vertical spacing — glance-and-go surface
- Replace Unicode icons with inline SVGs
- Dashboard link: text link or subtle row, not a fat button
- Mini compliance gauge/ring at top — one number with color coding

### 5. No visual transitions (LOW impact, SMALL effort)

Current: all state changes are instant. Tabs, toggles, log entries — everything snaps.

Changes:
- Tab content: 150ms opacity fade between panels
- Settings: custom toggle switches (animated sliding dot) instead of native checkboxes with accent-color
- Activity log: new rows fade in
- Keyword badges: scale + opacity on add/remove
- Keep light: 100-200ms, ease-out curves

### 6. Inline styles limit maintainability (MEDIUM impact, MEDIUM effort)

Current: every component uses `style={{ ... }}` in JSX. No hover/focus in inline styles (except overlay CSS file). Duplicate color/spacing values across 10+ files. No media queries.

Changes:
- Extract CSS variables file: colors, spacing, typography, radii, shadows
- Overlay: keep inline CSS in shadow DOM (isolation matters)
- Dashboard + popup: move to CSS modules or single stylesheet per entrypoint
- This is the prerequisite for any serious visual work

## Implementation Order

| # | Change | Impact | Effort | Depends on |
|---|--------|--------|--------|------------|
| 1 | Design tokens + CSS variables | Unblocks all | Medium | — |
| 2 | Overlay redesign | Core UX moment | Medium | #1 |
| 3 | Dashboard dark theme + typography | Transforms feel | Large | #1 |
| 4 | Stats card redesign | Better data | Small | #1, #3 |
| 5 | Popup density | Daily touchpoint | Small | #1 |
| 6 | Micro-animations | Polish | Small | #1 |

## Files affected

- New: `src/ui/tokens.css` (design tokens)
- Rewrite: `src/ui/overlay/WarningBanner.css` + `.tsx`
- Rewrite: `src/entrypoints/dashboard/index.html` (add stylesheet, fonts)
- Rewrite: `src/entrypoints/popup/index.html` (add stylesheet, fonts)
- Modify: all `src/ui/dashboard/*.tsx` (replace inline styles with classes)
- Modify: `src/entrypoints/popup/App.tsx` (replace inline styles)
- New: `src/entrypoints/dashboard/dashboard.css`
- New: `src/entrypoints/popup/popup.css`
- New: SVG icon components replacing Unicode characters

## Resolved Questions

- **Font loading:** Self-hosted woff2. Bundle fonts with the extension to maintain zero-network-requests promise. Adds ~100-200KB to build.
- **Dark theme scope:** Dashboard only. Popup and overlay stay light to match host page context.
- **Overlay color scheme:** Fixed light overlay. No prefers-color-scheme adaptation. Consistent look, simpler to implement.
