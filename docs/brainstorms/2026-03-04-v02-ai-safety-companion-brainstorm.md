---
date: 2026-03-04
topic: v0.2-ai-safety-companion
status: approved
---

# Sunbreak v0.2 — AI Safety Companion

## Positioning

Sunbreak evolves from "security guard" to "AI safety companion." Employees want it because it makes them better at AI. CISOs want it because it delivers company-specific intelligence without surveillance.

**Core principle:** Enable, never restrict. Any hint of restriction pushes users back to shadow AI. We don't have a right for mistake here.

## What We're Building

Eight features across three value pillars:

### Pillar 1: Smarter Protection (Security that helps, not blocks)

### Feature 1: Smart Reversible Masking

**Problem:** Current "Redact & Send" replaces sensitive data with robot-speak (`[EMAIL_1]`). The user loses context in the AI response and has to mentally map tokens back to values. Friction with no payoff.

**Solution:** Descriptive masked tokens + clipboard restore.

**Descriptive masking rules:**

| Type | Old | New | Notes |
|------|-----|-----|-------|
| Email | `[EMAIL_1]` | `[John S. email]` | Name extracted from local part, last name abbreviated |
| Phone | `[PHONE_1]` | `[John S. phone]` | Associated with nearest name in text, or `[phone ending 78]` |
| Credit card | `[CC_1]` | `[card ending 4242]` | Last 4 digits (non-sensitive, shown on receipts) |
| SSN/National ID | `[SSN_1]` | `[SSN redacted]` | No partial info — too sensitive |
| API key | `[API_KEY_1]` | `[OpenAI API key]` | Provider prefix if detectable |
| IP address | `[IP_1]` | `[internal IP]` | Generic label based on range (10.x = internal) |
| Custom keyword | `[KEYWORD_1]` | `[project codename]` | User-configurable label per keyword |

**Multi-field safety:** When multiple findings relate to the same person, fall back to `[Person 1 email]`, `[Person 1 phone]` — descriptive but no name leakage.

**Clipboard restore flow:**

1. User clicks "Fix" or "Fix All" — findings replaced with descriptive tokens in the input
2. Extension builds a mapping table in memory (never persisted): `{ "John S. email": "john.smith@acme.com" }`
3. Small persistent badge near input: "3 values masked — copy to restore"
4. When user copies text from the AI response (Ctrl+C / Cmd+C):
   - Extension scans clipboard for masked tokens
   - Shows toast: "Restore 2 masked values?" Yes / No
   - Yes: replaces tokens with originals in clipboard
   - No: keeps tokenized version
5. Mapping auto-expires after 30 min (configurable) or manual clear
6. Mapping is per-conversation, accumulates across messages

**Technical notes:**
- Mapping stored in content script memory — dies with the tab
- Clipboard interception via `clipboard` permission + `document.addEventListener('copy')`
- Badge rendered in existing Shadow DOM container
- No new permissions needed beyond `clipboardWrite`

### Feature 2: Company-Specific Classification

**Problem:** Regex catches generic PII (emails, SSNs) but misses what companies actually worry about: project codenames, customer account IDs, internal URLs, Jira references.

**v0.2 — Enhanced Configurable Patterns (Tier 1):**
- **Pattern templates**: pre-built for common enterprise data — Jira ticket IDs (`[A-Z]+-\d+`), internal URLs (`*.internal.acme.com`), Slack channel names, AWS account IDs, database connection strings
- **Custom regex**: power users define their own patterns with a test-against-sample UI in the dashboard
- **Labeled categories**: each custom pattern gets a human-readable name and descriptive mask label (ties into Feature 1)
- **Import/export**: share pattern configs across a team as JSON

**Future tiers (architectural direction, not v0.2 commitments):**
- **Tier 2 (v0.3+):** Local SLM via ONNX Runtime Web (WebAssembly). ~50-100M parameters, quantized. Contextual classification — understands "sample PII in a privacy policy draft" vs "actual customer data." Company-specific fine-tuning.
- **Tier 3 (v0.4+):** Federated learning. Anonymized pattern signals across deployments improve the base model. Network effect moat.

### Feature 3: Inline Detection UX (Replaces Blocking Overlay)

**The fundamental shift:** Stop intercepting submission. Analyze the prompt as the user types or pastes. Show findings inline. The user sees issues before they hit send, not after.

**When analysis runs:**
- **On paste**: immediate classification (most common source of sensitive data)
- **On pause**: 500ms debounce after typing stops
- **On focus change**: when user clicks back into input after tab-switching
- NOT on every keystroke

**Inline underlines (primary indicator):**

| Color | Category | Examples |
|-------|----------|----------|
| Red (dotted) | Credentials & secrets | API keys, tokens, passwords, connection strings |
| Orange (dotted) | Identity data | SSN, credit card, national IDs |
| Amber (dotted) | Contact info | Emails, phone numbers |
| Blue (dotted) | Custom/company patterns | Project codenames, internal URLs, keywords |

Underlines are dotted to distinguish from browser spellcheck. Implementation: CSS overlay positioned over text via calculated character positions in Shadow DOM. No DOM modification to the actual input. Fallback: show findings only in widget popover if precise positioning is too fragile for a given site adapter.

**Corner widget (always present on AI tool pages):**

```
Clean state:     ● Sunbreak ✓
Checking:        ● Sunbreak ⟳
Findings:        ● Sunbreak (3)    ← red badge with count
```

~120px pill, semi-transparent until hovered, anchored to corner of chat input. Click opens findings panel. Hover on badge shows one-line summary.

**Hover card (on underlined text):**

```
┌──────────────────────────────────┐
│  📧 Email address                │
│                                  │
│  john.smith@acme.com             │
│  ↓                               │
│  [John S. email]                 │
│                                  │
│  [ Fix ]  [ Ignore ]    ⋯       │
└──────────────────────────────────┘
```

- **Fix**: one click replaces this finding with its masked token. Underline disappears. Count decrements.
- **Ignore**: dismisses for this prompt. Underline disappears.
- **⋯ overflow**: "Ignore all [emails] in this prompt," "Turn off [email] detection," "Why is this flagged?"
- Card disappears when mouse moves away.

**Findings panel (click widget):**

```
┌──────────────────────────────────┐
│  3 findings              Fix All │
│──────────────────────────────────│
│  🔴 sk-proj-a8x...   [ Fix ]    │
│  🟠 john.smith@ac...  [ Fix ]   │
│  🟠 +45 12 34 56 78   [ Fix ]   │
│──────────────────────────────────│
│  Fix All = mask & safe to send   │
└──────────────────────────────────┘
```

Findings grouped by severity color. Each individually fixable or ignorable. Clicking a finding highlights corresponding underline.

**Send-time behavior:**

If all findings fixed or ignored: zero interception, zero delay.

If unresolved findings remain — brief toast near send button:

```
┌──────────────────────────────────┐
│  ⚠ 2 unfixed findings            │
│  [ Review ]  [ Send Anyway ]     │
└──────────────────────────────────┘
```

- 3-second auto-dismissing toast, NOT a modal
- "Review" opens the findings panel
- "Send Anyway" proceeds with logging
- If no interaction within 3 seconds, submission proceeds (with logging)
- **We never block.**

### Pillar 2: AI Enablement (Why employees want it)

### Feature 4: Privacy Intelligence

**Live provider risk profiles** (bundled JSON dataset, updated with extension releases):
- Data retention: "30 days" / "not retained" / "until account deletion"
- Training opt-out: "Yes, automatic" / "Yes, manual toggle" / "No"
- Encryption: "In transit + at rest" / "In transit only"
- Jurisdiction: "US" / "EU" / "China"
- Compliance certs: SOC 2, HIPAA BAA, GDPR DPA, etc.
- Recent policy changes with dates

**In-context risk nudges:** Non-blocking one-line tips shown alongside findings when a provider has a notable risk factor:
- "DeepSeek retains prompts for 30 days and may use them for training"
- "Personal ChatGPT account — data retained 30 days. Enterprise accounts don't retain."
- Dismissable. Respects "don't show again for this provider" preference.
- Max 1 nudge per session.

**Policy change alerts:** One-time notification in dashboard when an extension update includes changed provider profiles. Not push notifications.

**Provider security setup guides:** On first visit to each AI tool (or during onboarding), show a dismissable "Secure your account" checklist:
- ChatGPT: "Turn off model training" (Settings > Data Controls)
- Claude: "Verify training opt-out" (Settings > Privacy)
- Gemini: "Turn off Gemini Apps Activity" (myactivity.google.com)
- Each item links directly to the provider's settings page
- Checkable items, state persists
- Dashboard shows completion: "ChatGPT: 2/3 settings configured"
- Enterprise tier: admins define recommended vs required settings

### Feature 5: AI Adoption Hub

**Surface A — In-Context Micro-Tips:**
- Small, non-blocking tips inside AI tool pages, triggered by user behavior:
  - After a fix: "Tip: Describe the scenario without real names for the same quality answer"
  - After pasting code: "Tip: Remove connection strings before sharing code with AI"
  - After a long prompt: "Tip: Break complex prompts into steps for better results"
  - First time on a new tool: "New to Claude? It excels at long documents and nuanced analysis"
- Inline card below chat input, inside Shadow DOM
- Dismissable. Max 1 per session, 3 per day. "Don't show tips" toggle in settings.

**Surface B — Learning Hub (Dashboard tab):**
- **Role-based guides**: "AI for Marketers," "AI for Developers," "AI for HR," "AI for Finance" — curated use cases, prompt templates, dos/don'ts
- **Prompt templates**: Copy-paste starters for common tasks (meeting summaries, code review, email drafting). Each template is pre-sanitized.
- **Security awareness**: Short practical articles — "What happens to your data when you use ChatGPT," "Why pasting API keys into AI is dangerous." Written for humans.
- **Use case discovery**: "Did you know you can use AI to..." cards. Rotated periodically.
- Content bundled with extension (static markdown/JSON), updated with releases.
- Enterprise tier: admins add company-specific guides and approved prompt templates.

### Pillar 3: Polish & Reach

### Feature 6: Glanceable Popup

Strip the popup to bare minimum:

```
┌─────────────────────────────┐
│  ☀ Sunbreak            ⚙ ⋯ │
│                             │
│     3 catches this week     │
│     ━━━━━━━━━━ 42 prompts   │
│                             │
│  ● Protected                │
│                             │
│  [ Open Dashboard ]         │
└─────────────────────────────┘
```

- One headline stat (catches this week, or "All clear")
- One progress bar (total prompts scanned)
- Status indicator: "Protected" (green) / "Paused" (gray) — click to toggle
- One button: Open Dashboard
- Gear icon: opens settings in dashboard
- Overflow (⋯): "Pause for 1 hour," "Report a problem," version

**Dashboard tabs:** `[ Overview ] [ Activity ] [ Learn ] [ Settings ]`
- Overview: stats, provider security status
- Activity: flagged event log
- Learn: AI Adoption Hub
- Settings: detection toggles, custom patterns, keywords, preferences

### Feature 7: Multi-Browser Support

| Browser | Effort | Timeline |
|---------|--------|----------|
| **Edge** | Low — same Chromium engine, manifest tweaks | v0.2 |
| **Firefox** | Medium — some API polyfills for clipboard, MV2/MV3 differences | v0.2 |
| **Arc** | Minimal — Chromium-based, test and list | v0.2 |
| **Safari** | High — Xcode wrapper, App Store review | v0.3 |

WXT framework handles cross-browser build differences. Testing: Playwright browser matrix for Chrome, Firefox, Edge. Safari tested manually.

### Feature 8: Compliance Reporting (Data Foundation)

**v0.2 scope:** Ensure clean metadata in storage that can generate reports later. No report UI yet.

**Future (enterprise tier):**
- One-click PDF/CSV export with selectable time periods
- Executive summary, detection breakdown, user response patterns
- Framework mapping: GDPR Art. 32, SOC 2 CC6.1, HIPAA §164.312
- Evidence statements auto-generated from usage data
- Aggregated org-level reports, department breakdowns

## What We Explicitly Don't Build in v0.2

- No blocking/enforcement modes — enable, don't restrict
- No cloud backend — fully local
- No native desktop apps — browsers only
- No local SLM — enhanced configurable patterns as stepping stone
- No enterprise admin console
- No compliance report UI — data foundation only

## Design Principles

1. **Enable, never restrict.** Never block submission. Any friction = back to shadow AI.
2. **Invisible when clean.** Zero UI footprint when nothing is detected.
3. **Subtle when flagging.** Dotted underlines and a small widget, not modal overlays.
4. **Helpful when acting.** One-click fixes, descriptive tokens, clipboard restore.
5. **Employee-first value.** Education and AI adoption with security riding along.
6. **All classification stays local.** Zero network requests. Strongest privacy guarantee.
7. **Grammarly, not CrowdStrike.** Companion, not cop.
