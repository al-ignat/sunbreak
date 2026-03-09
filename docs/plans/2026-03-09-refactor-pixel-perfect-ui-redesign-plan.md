---
title: "Pixel-Perfect UI Redesign from Pencil Design System"
type: refactor
status: active
date: 2026-03-09
---

# Pixel-Perfect UI Redesign from Pencil Design System

## Overview

Implement the complete Sunbreak design system from `pencil-new.pen` into the codebase. This is a visual overhaul affecting every UI surface: popup, dashboard (5 tabs), and widget overlays (hover card, findings panel, send toast). The design tokens (colors, radii, shadows) have already been applied in a previous pass — this plan covers the **structural and component-level changes** needed to match the .pen designs pixel-for-pixel.

## Problem Statement

The current UI was built with placeholder styling. The .pen file defines a polished, cohesive dark-mode design with specific component layouts, icon usage (Lucide), pill badges, toggle switches, metric cards, and a rebrand from "Secure BYOAI" to "Sunbreak". The gap between current code and design is significant in structure, not just styling.

## Key Differences: Current Code vs .pen Design

| Area | Current | .pen Design |
|------|---------|-------------|
| App name | "Secure BYOAI" | "Sunbreak" with sun icon |
| Icons | 2 custom SVGs (GearIcon, ArrowRightIcon) | Lucide icon system (~15 icons) |
| Popup activity | Plain text rows | Pill badges for tools + categories |
| Popup detection toggles | Present in popup | Removed — settings only |
| Dashboard header | Plain text title | Sun icon + "Sunbreak" / "Personal Dashboard" + Export btn |
| Overview metrics | Single StatsCard component | Three metric cards with icons + trends |
| Overview tools | Inline in StatsCard | Three separate tool cards with large numbers |
| Settings toggles | Native `<input type="checkbox">` | Custom toggle switches (green on / grey off) |
| Settings detection list | Checkboxes without dots | Colored severity dots + toggle switches + border rows |
| Activity table | Plain text tool/category | Pill badges with colored dots |
| Keywords input | Plain input + button | Styled input with icon + "+" Add button |
| Report cards | Stacked vertically | Side-by-side grid, colored top accent bar |
| Widget hover card | Text "→" arrow, text overflow "⋯" | Lucide icons (arrow-down, eye-off, more-horizontal) |
| Findings panel | Text "Fix" / "Ignore" buttons | Small button components with icons (shield-check, eye-off) |
| Send toast | Basic layout | Lucide icons, countdown pill, styled buttons |

## Technical Approach

### Architecture

All changes are CSS + Preact component level. No new storage, background script, or content script wiring needed. The existing component hierarchy stays intact — we're updating rendering, not architecture.

**Icon strategy:** Add `lucide-preact` package for tree-shakeable Lucide icons. For Shadow DOM widget components (which can't import from node_modules at runtime), use inline SVG icon components.

### Implementation Phases

#### Phase 1: Icon System Setup

Add Lucide icons to the project. Two approaches needed:

- **Popup/Dashboard:** Install `lucide-preact` — tree-shakeable, works with Preact's JSX
- **Widget (Shadow DOM):** Create inline SVG icon components in `src/ui/widget/icons/` for the ~8 icons used in widget overlays (can't import external packages into Shadow DOM CSS-inlined builds)

**Files to create/modify:**
- `package.json` — add `lucide-preact` dependency
- `src/ui/widget/icons/` — new directory with inline SVG icon components:
  - `ShieldCheckIcon.tsx`
  - `EyeOffIcon.tsx`
  - `ArrowDownIcon.tsx`
  - `MoreHorizontalIcon.tsx`
  - `TriangleAlertIcon.tsx`
  - `ClockIcon.tsx`
  - `SearchIcon.tsx`
  - `InfoIcon.tsx`
- Remove `src/ui/icons/GearIcon.tsx` and `src/ui/icons/ArrowRightIcon.tsx` (replaced by Lucide)

**Acceptance criteria:**
- [x] `lucide-preact` installed and importable
- [x] Widget inline icons render correctly in Shadow DOM
- [x] Old custom icons removed, no broken imports

---

#### Phase 2: Branding — "Secure BYOAI" → "Sunbreak"

Update all user-facing references to the app name.

**Files to modify:**
- `src/entrypoints/popup/App.tsx` — header: sun icon + "Sunbreak"
- `src/entrypoints/popup/index.html` — `<title>Sunbreak</title>`
- `src/entrypoints/dashboard/App.tsx` — header: sun icon + "Sunbreak" / "Personal Dashboard" + Export button
- `src/entrypoints/dashboard/index.html` — `<title>Sunbreak — Dashboard</title>`
- `wxt.config.ts` — extension `name` field if present

**Design spec (from .pen):**
- Popup header: `Sun` icon (20px, orange `#F59E0B`) + "Sunbreak" (18px, 700 weight, -0.3 tracking)
- Dashboard header: `Sun` icon (22px, orange) + "Sunbreak" (22px, 700 weight, -0.5 tracking) / "Personal Dashboard" (13px, muted)
- Dashboard header right: "Export" secondary button with `Download` icon (overview tab only)

**Acceptance criteria:**
- [x] "Secure BYOAI" appears nowhere in the UI
- [x] Sun icon renders in both popup and dashboard headers
- [x] Dashboard shows "Personal Dashboard" subtitle
- [x] Export button visible on overview tab

---

#### Phase 3: Popup Redesign

Rebuild the popup component to match the .pen design exactly.

**Files to modify:**
- `src/entrypoints/popup/App.tsx` — major restructure
- `src/entrypoints/popup/popup.css` — updated styles for new layout
- `src/ui/popup/ComplianceGauge.tsx` — may need style updates

**Changes from current → .pen:**

1. **Stats section:** Keep gauge on left. Right side: three rows "Flagged / Redacted / Sent anyway" with `justify-content: space-between`, colored values (orange / green / red). Remove "labels" uppercase row.

2. **Recent Activity:** Each row = time + tool pill badge + category pill badge + spacer + action text.
   - Tool pill: colored dot (5px) + tool name, on tinted bg (ChatGPT=#0A2A1F, Claude=#1A1510, Gemini=#0D1528), pill radius
   - Category pill: colored dot + category name, on tinted bg (matches severity), pill radius
   - Action text: colored (Redacted=green, Sent anyway=red, Edited=blue)

3. **Remove Detection Toggles** from popup. The .pen shows no toggles in popup — they're in dashboard Settings only.

4. **CTA button:** "Open Dashboard →" with tinted bg (`--color-warning-bg`) + border (`--color-warning-dim`) + orange text. Not solid fill.

**Acceptance criteria:**
- [x] Stats show three labeled rows with colored numbers
- [x] Activity rows use pill badges for tool and category
- [x] No detection toggles in popup
- [x] CTA uses tinted/outlined style, not solid orange
- [x] Layout matches .pen screenshot at 400px width

---

#### Phase 4: Dashboard Header & Tab Bar

Update the shared dashboard header and tab navigation across all tabs.

**Files to modify:**
- `src/entrypoints/dashboard/App.tsx` — header component, conditional Export button
- `src/entrypoints/dashboard/dashboard.css` — header/tab styles
- `src/ui/dashboard/TabNav.tsx` — tab active state uses underline rectangle (not border-bottom)

**Design spec:**
- Header: 24px vertical padding, 32px horizontal. Sun icon (22px) + "Sunbreak" (22px bold) on left, "Personal Dashboard" (13px muted) below
- Export button: secondary style (elevated bg + border), Download icon + "Export" text — only on Overview tab
- Tabs: Orange text + 2px orange underline rectangle on active tab. Muted text on inactive. No border-bottom on tab bar — uses a separate 1px divider line below.

**Acceptance criteria:**
- [x] Header matches .pen across all 5 tabs
- [x] Export button only visible on Overview tab
- [x] Active tab has orange text + orange underline bar
- [x] Tab bar divider is separate 1px line, not border-bottom

---

#### Phase 5: Dashboard — Overview Tab

Rebuild the overview tab with three metric cards, improved chart, and tool breakdown.

**Files to modify:**
- `src/ui/dashboard/BarChart.tsx` — restructure into metric cards + chart card + tool cards
- `src/ui/dashboard/StatsCard.tsx` — may be replaced or heavily modified
- `src/entrypoints/dashboard/dashboard.css` — new metric card and tool card styles

**Design spec:**

1. **Metric cards row** — Three equal-width cards:
   - Card 1: "Total Flagged" label + shield icon (orange) / big number "247" / trend "↗ +12% this week" (green)
   - Card 2: "Redacted" label + shield-check icon (green) / big number "189" / "76% fix rate" (muted)
   - Card 3: "Sent Anyway" label + triangle-alert icon (red) / big number "58" / trend "↘ -8% this week" (green)
   - Each: surface bg, subtle border, 14px radius, 20px padding

2. **Chart card** — "Interactions over time" title + inline period toggle (7 days / 30 days as pill buttons in elevated bg). Stacked bars with green (clean) + orange (flagged). Day labels below. Legend dots.

3. **Tool breakdown row** — Three equal-width cards:
   - ChatGPT: green dot + "ChatGPT" label / "142" (28px bold) / "interactions" (muted)
   - Claude: orange dot + "Claude" / "78" / "interactions"
   - Gemini: blue dot + "Gemini" / "27" / "interactions"

**Acceptance criteria:**
- [x] Three metric cards render side-by-side with correct icons and trends
- [x] Chart has inline period toggle in header
- [x] Three tool cards render below chart with correct colors
- [x] All numbers/labels match .pen typography

---

#### Phase 6: Dashboard — Settings Tab

Replace checkboxes with toggle switches. Restructure into cards.

**Files to modify:**
- `src/ui/dashboard/SettingsPanel.tsx` — restructure into two cards
- `src/ui/dashboard/DetectionToggles.tsx` — replace checkboxes with toggle switches, add severity dots
- `src/entrypoints/dashboard/dashboard.css` — toggle switch styles, detection row styles

**Design spec:**

1. **Extension card** (surface bg, 14px radius):
   - "Extension Enabled" (16px bold) + description (muted) + green toggle (right-aligned)
   - Divider line
   - "Intervention Mode" (16px bold) + description + styled dropdown (elevated bg + border)

2. **Detection Types card** (surface bg, 14px radius):
   - Title: "Detection Types" + "Choose which types of sensitive data to detect."
   - List of detection rows, each with bottom border:
     - Left: colored severity dot (8px, high=red, medium=orange, low=amber, info=blue) + name (14px, 500 weight) + description (12px muted)
     - Right: toggle switch (40x22px, green when on, grey when off, white dot)

3. **Toggle component** (reusable):
   - On: green bg (`--color-safe`), white dot justified end
   - Off: hover bg (`--color-bg-hover`), muted dot
   - 40px wide, 22px tall, pill radius, 3px padding

**Acceptance criteria:**
- [x] No native checkboxes visible — all toggles are custom switches
- [x] Each detection type has a colored severity dot
- [x] Toggle animates between on/off states
- [x] Extension and Detection sections are separate cards
- [x] Intervention mode uses styled dropdown

---

#### Phase 7: Dashboard — Activity Log Tab

Add pill badges for tool names and categories in the activity table.

**Files to modify:**
- `src/ui/dashboard/ActivityLog.tsx` — tool and category cell rendering
- `src/entrypoints/dashboard/dashboard.css` — pill badge styles for table

**Design spec:**
- Tool cell: pill badge with colored dot (5px) + tool name, on tinted bg matching tool color
- Category cell: pill badges with colored dot + category name, on severity-tinted bg, pill radius
- Action cell: colored text (Redacted=green, Sent anyway=red, Edited=blue)
- Filter toggles: already pill-shaped (updated in previous pass)

**Acceptance criteria:**
- [x] Tool names render as colored pill badges in table
- [x] Category names render as colored pill badges
- [x] Action text is color-coded
- [x] Badges don't break table layout on narrow screens

---

#### Phase 8: Dashboard — Keywords Tab

Update input styling and button icons.

**Files to modify:**
- `src/ui/dashboard/KeywordManager.tsx` — input icon, add button icon, import/export icons
- `src/entrypoints/dashboard/dashboard.css` — input with icon styles

**Design spec:**
- Input: search icon prefix + placeholder "Add a keyword or phrase..." in surface bg with border
- Add button: "+" icon + "Add" text, orange bg, right of input
- Keyword badges: already pill-shaped (updated in previous pass)
- Import/Export buttons: ghost style with clipboard-copy/download icons

**Acceptance criteria:**
- [x] Input has search icon prefix
- [x] Add button has "+" icon
- [x] Import/Export buttons have icons
- [x] Layout matches .pen screenshot

---

#### Phase 9: Dashboard — Report Cards Tab

Switch from stacked to side-by-side layout with colored accent bars.

**Files to modify:**
- `src/ui/dashboard/ReportCards.tsx` — grid layout, colored top accent
- `src/entrypoints/dashboard/dashboard.css` — report card grid and accent styles

**Design spec:**
- Description text at top: "Privacy and data handling information for each supported AI tool."
- Three cards in a row (CSS grid or flexbox, equal width)
- Each card has a **4px colored top border** (not left border):
  - ChatGPT: green (`--color-tool-chatgpt` / `#10A37F`)
  - Claude: orange (`--color-tool-claude` / `#D97706`)
  - Gemini: blue (`--color-tool-gemini` / `#4285F4`)
- Card sections: Data Retention, Training Usage, Privacy Mode/Enterprise Features
- Cards: surface bg, subtle border, 14px radius

**Acceptance criteria:**
- [x] Three cards render side-by-side (not stacked)
- [x] Colored top accent bar per tool
- [x] Cards maintain equal height
- [x] Responsive: stack on narrow viewport if needed

---

#### Phase 10: Widget Components (Shadow DOM)

Update hover card, findings panel, and send toast with icons and improved layouts.

**Files to modify:**
- `src/ui/widget/HoverCard.tsx` — icons, layout adjustments
- `src/ui/widget/hover-card.css` — footer bg, icon sizing
- `src/ui/widget/FindingsPanel.tsx` — finding rows restructure, icons
- `src/ui/widget/findings-panel.css` — row layout with type+value stacked
- `src/ui/widget/SendToast.tsx` — countdown pill, icons, button styles
- `src/ui/widget/send-toast.css` — countdown badge, button layout
- `src/ui/widget/Widget.tsx` — minor: ensure sun icon in widget label if needed

**Design spec (from .pen components):**

1. **HoverCard:**
   - Header: severity dot + "EMAIL ADDRESS" (uppercase, letter-spacing 0.5)
   - Body: original value (mono) + arrow-down icon + masked value (orange, mono)
   - Footer: elevated bg, "Fix" small button (orange bg tint + border) + "Ignore" ghost + spacer + "⋯" icon button (more-horizontal)

2. **FindingsPanel:**
   - Header: "3 findings in this prompt" + "Fix All" primary button with shield-check icon
   - Finding rows: severity dot + stacked (type label uppercase + value mono) + "Fix" small button + eye-off icon button
   - Footer: elevated bg, info icon + "Fix All = mask values, safe to send"

3. **SendToast:**
   - Header: triangle-alert icon (orange) + stacked ("Sensitive data detected" bold + "3 findings in your prompt" secondary) + countdown pill (clock icon + "3s" in elevated bg, pill radius)
   - Actions: "Review" primary button (fill width) with search icon + "Send Anyway" ghost button

**Acceptance criteria:**
- [x] All widget components use inline SVG icons (not text characters)
- [x] HoverCard footer has elevated bg with icon buttons
- [x] FindingsPanel rows show type label + value in two lines
- [x] SendToast has countdown pill with clock icon
- [x] All components render correctly in closed Shadow DOM

---

## System-Wide Impact

### Interaction Graph

- Popup → `chrome.storage.local` (read stats/events) — no change
- Popup → `chrome.tabs.create()` to open dashboard — no change
- Dashboard → `chrome.storage.local` (read/write settings) — no change
- Widget → FindingsState subscription → re-render — no change
- Toggle switch change → `setDetectionSettings()` / `setExtensionSettings()` — same callbacks, different DOM element

### State Lifecycle Risks

- **Toggle switch state:** Must maintain same boolean semantics as checkbox `checked`. The toggle is purely visual — the underlying state management is unchanged.
- **Removing detection toggles from popup:** Users who relied on quick-toggling from popup must now use dashboard Settings tab. The gear icon already links there.

### API Surface Parity

- `DetectionToggles` component changes from `<input type="checkbox">` to custom toggle — same `onToggle(type, enabled)` callback interface
- No API changes to storage, background, or content scripts

## Acceptance Criteria

### Functional Requirements

- [ ] Every screen matches its .pen counterpart in layout, spacing, typography, colors, and icons
- [ ] App name "Sunbreak" used consistently; "Secure BYOAI" appears nowhere in UI
- [ ] Lucide icons render crisp at all sizes (14px, 16px, 18px, 20px, 22px)
- [ ] Toggle switches are accessible (keyboard focusable, screenreader announces state)
- [ ] Popup at 400px width — no overflow, no scroll for default content
- [ ] Dashboard responsive down to 800px width minimum

### Non-Functional Requirements

- [ ] No increase in extension load time (classification < 50ms, page load < 100ms)
- [x] `npm run build` succeeds with no errors
- [x] `npm run test` passes (468 tests)
- [ ] Zero network requests from extension (Lucide icons bundled, not fetched)
- [ ] WCAG AA: all interactive elements keyboard-accessible, focus-visible indicators

### Quality Gates

- [ ] Visual comparison: each screen screenshot matched against .pen screenshot
- [ ] Extension loads without errors on ChatGPT, Claude, and Gemini
- [ ] Widget overlays render correctly in Shadow DOM on all three AI tool pages

## Dependencies & Prerequisites

- Design tokens already updated (completed in prior session)
- Outfit font already downloaded and configured
- `lucide-preact` compatible with Preact (confirmed — it's a lightweight wrapper)

## Risk Analysis & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| `lucide-preact` bundle size too large | Low | Medium | Tree-shaking ensures only imported icons are bundled |
| Toggle switch accessibility issues | Medium | High | Use `role="switch"`, `aria-checked`, keyboard handlers |
| Shadow DOM icon rendering issues | Low | High | Use inline SVG components, not external imports |
| Breaking existing test assertions | Medium | Low | Update test expectations for new DOM structure |
| Dashboard layout breaks at edge widths | Low | Medium | Test at 800px, 960px, 1200px widths |

## Sources & References

### Internal References

- Design file: `pencil-new.pen` — all 8 screens + design tokens sheet
- Current tokens: `src/ui/tokens.css` — already updated to dark palette
- Component hierarchy: see repo research (popup App.tsx → dashboard App.tsx → widget-controller.ts)
- Learnings: `docs/solutions/ui-bugs/preact-hooks-shadow-dom-overlay-pitfalls.md` — use `h()` for Shadow DOM rendering

### Key File Paths

**Create:**
- `src/ui/widget/icons/*.tsx` — 8 inline SVG icon components for Shadow DOM

**Modify (major):**
- `src/entrypoints/popup/App.tsx` — popup redesign
- `src/entrypoints/popup/popup.css` — popup styles
- `src/entrypoints/dashboard/App.tsx` — header/branding
- `src/entrypoints/dashboard/dashboard.css` — all dashboard styles
- `src/ui/dashboard/BarChart.tsx` → metric cards + chart + tool cards
- `src/ui/dashboard/DetectionToggles.tsx` → toggle switches
- `src/ui/dashboard/SettingsPanel.tsx` → card-based layout
- `src/ui/dashboard/ActivityLog.tsx` → pill badges
- `src/ui/dashboard/KeywordManager.tsx` → icon buttons
- `src/ui/dashboard/ReportCards.tsx` → side-by-side grid
- `src/ui/widget/HoverCard.tsx` — icons + layout
- `src/ui/widget/FindingsPanel.tsx` — rows + icons
- `src/ui/widget/SendToast.tsx` — countdown pill + icons

**Modify (minor):**
- `src/entrypoints/popup/index.html` — title
- `src/entrypoints/dashboard/index.html` — title
- `src/ui/widget/hover-card.css`
- `src/ui/widget/findings-panel.css`
- `src/ui/widget/send-toast.css`

**Delete:**
- `src/ui/icons/GearIcon.tsx` — replaced by Lucide `Settings`
- `src/ui/icons/ArrowRightIcon.tsx` — replaced by Lucide `ArrowRight`
