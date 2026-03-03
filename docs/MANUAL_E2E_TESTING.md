# Manual E2E Testing Guide

This guide walks through every user-facing feature of Secure BYOAI using real AI tool accounts. Budget ~45 minutes for a full pass.

## Setup

1. Build the extension:
   ```bash
   npm run build
   ```
2. Open `chrome://extensions`, enable **Developer mode**
3. Click **Load unpacked**, select `.output/chrome-mv3/`
4. Pin the extension to the toolbar so you can see the icon

Keep DevTools open (`F12` > Console tab) on each AI tool page. Extension logs go here. If something breaks silently, the console is where you'll see it.

## Test Data

Copy-paste these into prompts. Mix and match across tests.

```
Email:       john.doe@example.com, alice@company.co.uk
Phone:       +1-555-123-4567, (202) 555-0173
Credit card: 4532-1234-5678-9010
SSN:         123-45-6789
Danish CPR:  150102-3456
UK NI:       AB 12 34 56 C
IPv4:        192.168.1.1
IPv6:        2001:db8::1
Stripe key:  sk_test_4eC39HqLyjWDarhtT657Cd7
AWS key:     AKIAIOSFODNN7EXAMPLE
```

---

## 1. Extension Loading (5 min)

Open each site in a separate tab. The extension should be completely invisible when nothing is detected.

| Step | Action | Expected |
|------|--------|----------|
| 1.1 | Open chatgpt.com, wait for page load | Page works normally. No visual changes. No console errors from the extension. |
| 1.2 | Open claude.ai, wait for page load | Same. |
| 1.3 | Open gemini.google.com, wait for page load | Same. |
| 1.4 | Type a clean prompt ("What is the capital of France?") and send it on each site | Prompt sends immediately with zero delay. No overlay. |
| 1.5 | Click the extension icon in the toolbar | Popup opens with stats (may show zeros if first use). |

**What can go wrong:**
- Page layout breaks or shifts — the content script is interfering with the host page's CSS
- Console shows errors like "Cannot find input element" — the site adapter's selectors are stale
- Prompt doesn't send — the interceptor is blocking clean prompts

---

## 2. Prompt Interception — ChatGPT (10 min)

| Step | Action | Expected |
|------|--------|----------|
| 2.1 | Type: `My email is john.doe@example.com` and press **Enter** | Overlay appears at top of page. Summary says "1 email address detected". Prompt does NOT send. |
| 2.2 | Click **Show details** on the overlay | Expands to show: `Email Address: john.doe@example.com → [EMAIL]` |
| 2.3 | Click **Cancel** (or press Escape) | Overlay disappears. Prompt text unchanged in the input box. Nothing sent. |
| 2.4 | Same prompt, press Enter again. This time click **Redact & Send** (or press Enter on overlay) | Overlay closes. Prompt text changes to `My email is [EMAIL]` and sends. |
| 2.5 | Type: `My SSN is 123-45-6789 and my card is 4532-1234-5678-9010`. Press Enter. | Overlay shows 2 findings (SSN + credit card). |
| 2.6 | Click **Send Anyway** | Prompt sends with original text unchanged. |
| 2.7 | Type the same prompt. Press Enter. Click **Edit**. | Overlay closes. Cursor returns to input. You can manually edit the text. |
| 2.8 | Type a prompt with just `AKIAIOSFODNN7EXAMPLE` and click the **send button** (don't press Enter) | Overlay appears — verifying button click interception works, not just Enter key. |
| 2.9 | Hold **Shift+Enter** | Inserts a newline. No interception. |
| 2.10 | Multi-line prompt: line 1 is clean, line 2 has `sk_test_4eC39HqLyjWDarhtT657Cd7`. Send. | Overlay catches the Stripe key even though it's on line 2. |

---

## 3. Prompt Interception — Claude (10 min)

Repeat steps 2.1–2.10 on claude.ai. Same expected behavior.

**Claude-specific things to watch for:**
- Claude uses a ProseMirror editor — text extraction works differently than a plain textarea
- After redaction, verify the replaced text renders correctly in the editor (no HTML artifacts)
- Navigate to a different conversation, then come back — interception should still work (SPA re-attachment)

---

## 4. Prompt Interception — Gemini (10 min)

Repeat steps 2.1–2.10 on gemini.google.com. Same expected behavior.

**Gemini-specific things to watch for:**
- Gemini uses a Quill-based editor — another rich text editor variant
- The send button selector (`.send-button`) may differ between Gemini versions
- If the overlay doesn't appear, check console for "Cannot find input element" or "Cannot find send button"

---

## 5. Popup (5 min)

| Step | Action | Expected |
|------|--------|----------|
| 5.1 | Click extension icon after running the tests above | Stats card shows interaction counts. Numbers should match what you did in steps 2–4. |
| 5.2 | Check "Recent Activity" section | Shows your last few flagged events with date, tool name, categories, and action taken. |
| 5.3 | Uncheck "Email Addresses" toggle | Toggle turns off. |
| 5.4 | Go to ChatGPT, type `john.doe@example.com`, send | No overlay — email detection is disabled. Prompt sends immediately. |
| 5.5 | Go back to popup, re-enable "Email Addresses" | Toggle back on. |
| 5.6 | Click the gear icon (top-right of popup) | Opens the dashboard in a new tab, on the Settings section. |
| 5.7 | Click "View full dashboard" at the bottom of popup | Opens the dashboard in a new tab, on the Overview section. |

---

## 6. Dashboard (10 min)

### Overview tab
| Step | Action | Expected |
|------|--------|----------|
| 6.1 | Check the bar chart | Shows today's interactions. Green bars = clean, orange = flagged. |
| 6.2 | Toggle between "7 days" and "30 days" | Chart time range updates. |
| 6.3 | Check stats card | Total, flagged, redacted, sent-anyway, cancelled, edited counts. Compliance rate percentage. |

### Activity Log tab
| Step | Action | Expected |
|------|--------|----------|
| 6.4 | Click "Activity Log" tab | Table of flagged events with Date/Time, Tool, Categories, Finding Count, Action columns. |
| 6.5 | Filter by "Last 7 days" | Only recent events shown. |
| 6.6 | Filter by tool (e.g., "ChatGPT") | Only ChatGPT events shown. |

### Settings tab
| Step | Action | Expected |
|------|--------|----------|
| 6.7 | Toggle "Extension enabled" OFF | Extension disabled globally. |
| 6.8 | Go to ChatGPT, type sensitive data, send | No interception. Prompt sends immediately. |
| 6.9 | Toggle back ON in dashboard | Extension re-enabled. No page reload needed. |
| 6.10 | Switch intervention mode to "Log only" | |
| 6.11 | Go to ChatGPT, type sensitive data, send | No overlay. Prompt sends. But the event should appear in Activity Log as "sent-anyway". |
| 6.12 | Switch back to "Warn before sending" | Overlay behavior returns. |

### Keywords tab
| Step | Action | Expected |
|------|--------|----------|
| 6.13 | Type "payroll" in the keyword input, click Add | "payroll" appears as a badge in the keywords list. |
| 6.14 | Go to ChatGPT, type "Here is the payroll data", send | Overlay appears, detecting your custom keyword. |
| 6.15 | Back in dashboard, click the X on the "payroll" badge | Keyword removed. |
| 6.16 | Add a duplicate keyword | Should reject it (no duplicate added). |
| 6.17 | Click Export | Downloads a .txt file with your keywords, one per line. |
| 6.18 | Click Import, select a .txt file with one keyword per line | Keywords from file added to the list. |

### Report Cards tab
| Step | Action | Expected |
|------|--------|----------|
| 6.19 | Click "Report Cards" tab | Shows information cards for ChatGPT, Claude, and Gemini with privacy/data handling details. |

---

## 7. Edge Cases (5 min)

| Step | Action | Expected |
|------|--------|----------|
| 7.1 | Navigate between conversations on any AI tool (don't reload the page) | Interception still works after SPA navigation. |
| 7.2 | Paste a long prompt (500+ words) with one email buried in the middle | Email detected. Classification should complete in under 50ms (check console for timing if logged). |
| 7.3 | Try a false positive: type "version 1.2.3.4" | Should NOT trigger IP address detection (it's not a valid IP). |
| 7.4 | Try a number that looks like a CC but fails Luhn: `1234-5678-9012-3456` | Should NOT trigger credit card detection. |
| 7.5 | Type `SSN: 000-00-0000` | Should NOT trigger — 000 area code is invalid. |

---

## How to Capture Issues

### For every bug, capture these 4 things:

**1. Screenshot or screen recording**
- macOS: `Cmd+Shift+5` for screen recording, `Cmd+Shift+4` for screenshot
- Capture the overlay, the prompt input, or whatever is broken

**2. Console output**
- `F12` > Console tab
- Right-click in console > "Save as..." to export the full log
- Or just screenshot the relevant error lines

**3. Steps to reproduce**
Write the exact sequence:
```
1. Opened claude.ai
2. Typed: "my email is test@example.com"
3. Pressed Enter
4. Expected: overlay appears
5. Actual: nothing happened, prompt sent immediately
```

**4. Environment**
- Chrome version (`chrome://version`)
- OS
- Which AI tool and URL
- Extension version (shown in popup header or `chrome://extensions`)

### Severity levels

Use these when reporting back:

| Level | Meaning | Example |
|-------|---------|---------|
| **P0 — Blocker** | Extension breaks the AI tool or data leaks undetected | Prompt sends without interception when it should be caught |
| **P1 — Major** | Feature doesn't work but workaround exists | Overlay appears but "Redact & Send" doesn't replace text |
| **P2 — Minor** | Cosmetic or non-critical functional issue | Overlay positioning is off, stats count is wrong by 1 |
| **P3 — Nit** | Polish item | Typo in overlay text, slight animation jank |

### Where to report

Create a GitHub issue per bug with:
- Title: `[P1] Overlay doesn't appear on Claude after SPA navigation`
- Body: steps to reproduce, expected vs actual, screenshot/recording, console log, environment
- Label: `bug` + severity label

Or, if running through this guide in one session, collect everything into a single document and we can triage together.

---

## Quick Regression Checklist

After fixing any bug, re-run this minimal set to make sure nothing else broke:

- [ ] Clean prompt sends immediately on all 3 sites
- [ ] Email detected and overlay shown on all 3 sites
- [ ] Redact & Send replaces text correctly
- [ ] Cancel blocks submission
- [ ] Popup shows updated stats
- [ ] Dashboard activity log shows new events
- [ ] Extension disable/enable works
