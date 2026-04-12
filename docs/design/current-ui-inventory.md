# Sunbreak Current UI Inventory

Last updated: 2026-03-15

## Scope

This inventory is based on the current user-facing extension code paths that are wired from the app entrypoints today.

Included:
- Extension popup
- Injected in-page widget and prompt overlay UI
- Dashboard tabs and their currently rendered states

Excluded:
- Marketing pages in `landing/`
- Hidden accessibility-only markup such as visually hidden tables
- Purely structural wrappers with no user-visible meaning
- Outdated test expectations that no longer match the current app code

## Product Surfaces In Current Code

1. Popup: `src/entrypoints/popup/App.tsx`
2. Injected page UI: `src/ui/widget/*` via the content script/widget controller
3. Dashboard: `src/entrypoints/dashboard/App.tsx`

## 1. Injected In-Page UI

### 1.1 Floating widget launcher

- Sunbreak launcher button with sun icon
- Severity state styling: `clean`, `warning`, `concern`, `critical`
- Active findings count badge
- Masked-local-values count badge
- Divider shown when both badges are present
- Dynamic accessible labels:
  - `Sunbreak: no issues detected`
  - `Sunbreak: N warning/concern/critical finding(s)`
  - `Sunbreak: N masked locally`
  - Combined finding + masked label

### 1.2 Findings panel

- Dialog panel labeled `Sunbreak findings`
- Header count text: `1 finding` or `N findings`
- Header suffix: `in this prompt`
- `Fix All` button when there are multiple maskable active findings
- Empty state: `No active findings`
- Active finding rows, each containing:
  - Severity dot
  - Finding label, for example `Email Address` or a custom company pattern label
  - Finding value preview
  - Placeholder/mask preview text: `Masks to ...` when applicable
  - Explanation summary when contextual explanation exists
  - `Fix` button for maskable findings
  - Ignore icon button
- Masked-values section when local masking tokens exist:
  - Title: `N value(s) masked locally`
  - `Clear All` button
  - List of token -> original-value preview rows
  - Clipboard/memory note: originals stay in memory only until confirmed restore
  - Auto-clear countdown label: `Auto-clears in ...`
- Footer note:
  - `Fix actions mask supported values locally before sending`
  - Or `Sensitive data or company identifiers detected in prompt`

### 1.3 Inline prompt overlay

- Inline underline overlays for detected spans inside the editor
- Severity-colored underline styling for each active finding

### 1.4 Hover card on underlined findings

- Tooltip card anchored to the finding
- Header with severity dot and finding label
- Original detected value
- Arrow indicator between original value and mask preview
- Masked placeholder preview when masking exists
- Masking hint copy for some finding types, including:
  - Company patterns are detection-only
  - Email masking behavior hints
- Context explanation summary when available
- Action row:
  - `Fix`
  - `Ignore`
  - Overflow button: `More actions`
- Overflow menu items:
  - `Ignore all <type> in this prompt`
  - `Turn off <type> detection`

### 1.5 Send interception toast

- Alert dialog for pending send with unresolved findings
- Warning icon
- Message: `N unfixed finding(s)`
- Countdown indicator, default 3 seconds
- `Review` button
- `Send Anyway` button

### 1.6 Restore-originals toast

- Alert dialog after masked text is copied
- Clipboard icon
- Eyebrow: `Masked text copied`
- Prompt: `Restore N original value(s) locally?`
- Note: masked clipboard content stays unless restore is confirmed
- Countdown indicator, default 8 seconds
- `Restore` button
- `Keep masked` button

### 1.7 File upload warning toast

- File upload warning banner/toast
- Warning icon
- Eyebrow: `File upload detected`
- Message: `Review N attachment(s) manually before sending.`
- Note: Sunbreak can detect upload events but cannot inspect file contents
- Countdown indicator, default 8 seconds
- `Dismiss` button

## 2. Popup

### 2.1 Popup shell

- Loading state: `Loading...`
- Header brand:
  - Sun icon
  - Product name: `Sunbreak`
- Settings icon button with label `Open settings`

### 2.2 Popup stats summary

- Compliance gauge ring
- Compliance gauge center text:
  - `—` when no data
  - `%` value when data exists
- Stats rows:
  - `Flagged`
  - `Redacted`
  - `Sent anyway`

### 2.3 Recent activity section

- Section heading: `Recent Activity`
- Up to three recent activity rows
- Per-row elements:
  - Relative timestamp such as `now`, `5m ago`, `2h ago`, `3d ago`
  - Tool pill: `ChatGPT`, `Claude`, or `Gemini`
  - First category pill for the event
  - Action label such as `Redacted` or `Sent Anyway`

### 2.4 Popup footer

- `Open Dashboard` link with arrow icon

## 3. Dashboard

### 3.1 Dashboard shell

- Header brand:
  - Sun icon
  - `Sunbreak`
  - Subtitle: `Personal Dashboard`
- Overview-only header action:
  - `Export` button
- Tab navigation:
  - `Overview`
  - `Activity Log`
  - `Settings`
  - `Keywords`
  - `Report Cards`

### 3.2 Overview tab

#### Global states

- Loading state: `Loading...`
- Empty state: `No data yet. Start using AI tools and your charts will appear here.`

#### Metric cards

- `Total Flagged`
- `Redacted`
- `Sent Anyway`
- Trend or rate text when data allows:
  - `N% fix rate`
  - `+N% this week`
  - `N% this week` with up/down trend icon and good/bad styling

#### Interaction chart card

- Title: `Interactions over time`
- Period toggle buttons:
  - `7 days`
  - `30 days`
- Daily stacked bar chart
- Legend:
  - `Clean prompts`
  - `Flagged prompts`
- Day labels derived from dates: `Sun` to `Sat`

#### Tool breakdown cards

- One card per tool in the data
- Elements per card:
  - Tool dot
  - Tool name
  - Interaction count
  - Label: `interactions`

### 3.3 Activity Log tab

#### Global state

- Empty state: `No flagged events yet.`

#### Filters and meta

- Date-range filter buttons:
  - `7 days`
  - `30 days`
  - `All`
- Tool filter select:
  - `All tools`
  - `ChatGPT`
  - `Claude`
  - `Gemini`
- Event count label: `N event(s)`
- Section title: `Recent flagged events`
- Hint text:
  - Recovery-detail guidance when recovery assistance is enabled
  - Lightweight-history-only message when it is disabled

#### Event table/list

- Column headers:
  - `Date & Time`
  - `Tool`
  - `Categories`
  - `Findings`
  - `Action`
- Empty filtered state: `No events match the current filters.`
- Event row elements:
  - Clickable row button when recovery assistance is enabled
  - Timestamp
  - Tool pill
  - One or more category pills
  - Finding count
  - Action label
  - Selected-row styling
  - Static/disabled styling when recovery assistance is off

#### Recovery detail panel

Rendered inline for the selected event only when recovery assistance is enabled.

- Eyebrow: `Recovery detail`
- Summary title that varies by event context, including cases such as:
  - File sent and should be reviewed manually
  - Sensitive content detected but still sent
  - Sensitive content masked before send
  - Send flow interrupted and reviewed
  - Generic follow-up summary
- Attention status badge:
  - `Needs follow-up`
  - `Informational`
- Metadata grid:
  - `Tool`
  - `Action`
  - `Source`
  - `Findings` or `Attachments`
- `Detected categories` block with category chips
- `Next steps` checklist/list
- `Protection context` note
- Provider-specific recovery block when guidance resolves:
  - Provider recovery title
  - Provider recovery steps list
  - Caveat note
  - Mode note when applicable
  - Verification note with date
  - `Open provider guidance in Reports` link

### 3.4 Settings tab

#### Extension behavior card

- Extension enabled/disabled row
- Copy states:
  - `Extension Enabled`
  - `Extension Disabled`
  - Active scanning description
  - Paused description
- Switch: `Enable or disable extension`

- Intervention mode row
- Description: `How Sunbreak responds when sensitive data is detected.`
- Select options:
  - `Warn before sending`
  - `Log only (no overlay)`

- Smart masking row
- Copy states:
  - `Smart Masking On`
  - `Smart Masking Off`
  - Descriptive-token masking explanation
  - Removal-without-tokens explanation
- Switch: `Enable or disable smart masking`

#### Detection types card

- Card title: `Detection Types`
- Card description: `Choose which types of sensitive data to detect.`
- Toggle rows for:
  - `Email Addresses`
  - `Phone Numbers`
  - `Credit Card Numbers`
  - `Social Security Numbers`
  - `Danish CPR Numbers`
  - `UK National Insurance`
  - `IP Addresses`
  - `API Keys & Tokens`
  - `Custom Keywords`
  - `Company Patterns`
- Each detection row includes:
  - Severity/status color dot
  - Label
  - Description
  - On/off switch

#### Recovery assistance card

- Card title: `Recovery Assistance`
- Description that the feature is still in development
- Nested disabled card:
  - `Recovery Assistance Off`
  - Disabled switch labeled `Recovery assistance is currently unavailable`
  - `Coming next`
  - Explanatory copy about bringing back concise recovery guidance later

### 3.5 Keywords tab

#### Custom keywords manager

- Card title: `Custom Keywords`
- Description explaining custom monitored words/phrases
- Input field: `Add a keyword or phrase...`
- `Add` button
- Inline validation/error text
- Empty state: `No custom keywords. Add words or phrases you want to monitor.`
- Keyword badges list
- Per-keyword remove button
- Import/export action row:
  - `Import`
  - `Export`
- Import/export status text

#### Company patterns manager

- Card title: `Company Patterns`
- Description for guided templates or advanced regex
- Empty state when no patterns exist
- Existing pattern list rows, each with:
  - Pattern label
  - `Enabled` or `Disabled` badge
  - Template badge when present
  - Severity
  - Category
  - Regex pattern preview
  - `Enable` or `Disable` button
  - `Delete` button

##### Pattern creation form

- Mode toggle buttons:
  - `Template`
  - `Advanced Regex`
- Common fields:
  - `Label`
  - `Description`
- Template mode controls:
  - `Template` select
  - Dynamic template fields
- Advanced mode control:
  - `Regex Pattern` textarea
- Additional controls:
  - `Flags`
  - `Severity`
  - `Category`
  - `Generated Pattern` preview
  - `Positive Samples`
  - `Negative Samples`
- Template options currently in code:
  - `Employee ID`
  - `Customer ID`
  - `Invoice Number`
  - `Project Code`
  - `Ticket Reference`
  - `Matter Reference`
- Severity options:
  - `warning`
  - `concern`
  - `critical`
- Category options:
  - `internal-identifier`
  - `finance`
  - `hr`
  - `legal`
  - `security`
  - `operations`
  - `other`
- Validation surfaces:
  - Error messages block
  - Warning messages block
  - Sample match summary
- Form action row:
  - `Save Pattern`
  - `Import JSON`
  - `Export JSON`
- Save/import/export status text

### 3.6 Report Cards tab

#### Current default disabled state

Because `recoveryAssistanceEnabled` defaults to `false`, this is the effective current default experience.

- Description: `Provider guidance and recovery assistance are being refined before a wider release.`
- Disabled report card:
  - Status dot
  - `Recovery assistance is off`
  - Dormant-surface explanation
  - Note that file-upload warning toast remains active

#### Enabled state that still exists in current code

If recovery assistance is enabled in settings/storage, the reports surface renders a provider guidance grid.

- Reports description: `Privacy and data handling information for each supported AI tool.`
- One report card each for:
  - `ChatGPT`
  - `Claude`
  - `Gemini`
- Each provider card contains:
  - Accent rail
  - Accent dot
  - Provider name
  - Three overview sections with title + body copy
  - Configured guidance mode label
  - Optional mode note
  - Recent-events summary text
  - `Review activity log` link
  - Verification note with date
  - Official source links list

##### Provider section titles currently in code

- ChatGPT:
  - `Conversation controls`
  - `Training and privacy`
  - `Recovery framing`
- Claude:
  - `Conversation controls`
  - `Training and privacy`
  - `Recovery framing`
- Gemini:
  - `Conversation controls`
  - `Training and retention`
  - `Recovery framing`

## Notes

- Current source-of-truth product naming in the app code is `Sunbreak`.
- Some tests still reference older labels such as `Secure BYOAI`; those were not treated as current UI.
- The dashboard includes dormant but still implemented UI for recovery guidance and provider report cards; those elements are included because they exist in the current codebase, even when default settings keep them disabled.
