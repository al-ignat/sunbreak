# Smart Reversible Masking — Manual Testing Guide

End-to-end testing guide covering all 6 phases of the Smart Reversible Masking feature.

## Setup

```bash
npm run dev          # Start WXT dev mode (auto-reloads on changes)
```

1. Open `chrome://extensions`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked** → select `.output/chrome-mv3/`
4. Pin the Sunbreak extension icon in the toolbar

Open the **Dashboard** (click extension icon → "Open Dashboard") and confirm:
- Extension is **enabled**
- Intervention mode is **Warn before sending**
- **Smart Masking** toggle is **ON**
- All detection types are enabled

## Test Data

Use these values when pasting into chat inputs. Mix them into natural sentences.

| Type | Test Value | Expected Token |
|------|-----------|----------------|
| Email | `john.smith@acme.com` | `[John S. email]` |
| Email (role) | `support@acme.com` | `[email]` |
| Phone | `+1-555-012-3467` | `[phone ending 67]` |
| Credit Card | `4111-1111-1111-1111` | `[card ending 1111]` |
| SSN | `123-45-6789` | `[SSN redacted]` |
| API Key (OpenAI) | `sk-proj-abc123def456ghi789jkl012mno345pqr678` | `[OpenAI API key]` |
| IP Address | `192.168.1.100` | `[internal IP]` |

**Template prompt for testing:**

```
My name is John Smith, email john.smith@acme.com, phone +1-555-012-3467.
My server is at 192.168.1.100 and my API key is sk-proj-abc123def456ghi789jkl012mno345pqr678.
```
For this prompt in ChatGPT -
1. Unable to undo (Ctrl+Z) the state of masked values. They stay in memory, and not get cleared, but it should be fine, as non-masked text is detected again.
2. API key is not detected.
3. 
---

## Phase 1 — Detection & Widget

**Goal:** Confirm the scanner detects sensitive data and the widget shows findings.

### T1.1 — Paste detection

1. Open ChatGPT / Claude / Gemini
2. Paste the template prompt into the chat input
3. **Expect:** Widget appears at bottom-right of input, shows orange badge with finding count (e.g. `5`)
4. **Expect:** Widget shows `Sunbreak (5)` with the sun icon

**Pass / Fail: FAIL** 
**Notes:** Widget is visible right away - without pasting the prompt. After pasting - shows orange badge with 3 count - API key is not identified. Widget shows red status as expected.

### T1.2 — Typing detection

1. In a fresh chat input, slowly type `john.smith@acme.com`
2. **Expect:** After ~500ms pause, widget updates to show `(1)` badge

**Pass / Fail: PASS**
**Notes:**

### T1.3 — Clean state

1. Clear the input (select all + delete)
2. Type `Hello, how are you?`
3. **Expect:** Widget shows green checkmark, no badge

**Pass / Fail: PASS**
**Notes:**

---

## Phase 2 — Fix & MaskingMap Population

**Goal:** Confirm Fix replaces values with descriptive tokens and populates the mapping.

### T2.1 — Fix single finding

1. Paste the template prompt
2. Click the widget to open the Findings Panel
3. Click **Fix** next to the email finding
4. **Expect:** `john.smith@acme.com` in the input is replaced with `[John S. email]`
5. **Expect:** Badge count decreases by 1
6. **Expect:** Widget shows `N masked` label in info-blue

**Pass / Fail: PASS**
**Notes:**

### T2.2 — Fix All

1. Paste the template prompt (fresh)
2. Open the Findings Panel
3. Click **Fix All**
4. **Expect:** All sensitive values replaced with descriptive tokens
5. **Expect:** Badge disappears, widget shows `5 masked` (or similar count)
6. **Expect:** Findings Panel shows "Masked values" section with token→truncated original table

**Pass / Fail: PASS**
**Notes:**

### T2.3 — Masked values panel

1. After Fix All, click the widget to open the panel
2. **Expect:** "Masked values" section visible at bottom
3. **Expect:** Each token shown with truncated original (e.g. `john.smi...`)
4. **Expect:** "Auto-clears in ~30 min" countdown visible
5. **Expect:** "Clear All" button visible

**Pass / Fail: PASS**
**Notes:**

### T2.4 — Clear All masked

1. In the masked values section, click **Clear All**
2. **Expect:** Masked values section disappears
3. **Expect:** Widget no longer shows "N masked" label
4. **Expect:** Green checkmark returns (if no active findings)

**Pass / Fail: PASS**
**Notes:**

---

## Phase 3 — Clipboard Interception

**Goal:** Confirm copy events are intercepted when tokens are present.

### T3.1 — Copy with tokens triggers toast

1. Paste template, click Fix All
2. Send the masked prompt to the AI
3. Wait for the AI to respond (response will contain the tokens like `[John S. email]`)
4. Select part of the AI response that includes a token
5. Press **Ctrl+C / Cmd+C**
6. **Expect:** RestoreToast appears above the widget

**Pass / Fail: PASS**
**Notes:**

### T3.2 — Copy without tokens — no toast

1. With masked values still active, select text from the AI response that does NOT contain any tokens
2. Press **Ctrl+C / Cmd+C**
3. **Expect:** No RestoreToast appears, normal copy behavior

**Pass / Fail: PASS**
**Notes:**

### T3.3 — Site copy button bypass (known limitation)

1. If the AI response has a code block, click the site's **Copy** button (not Ctrl+C)
2. **Expect:** No RestoreToast appears (known limitation — site copy buttons use `navigator.clipboard.writeText` directly)
3. Document if behavior differs across sites

**Pass / Fail: FAIL**
**Notes:** Confirm nothing happens, but cannot be unmasked back aslo, so I call it a fail

---

## Phase 4 — RestoreToast UI

**Goal:** Confirm the toast looks correct and both actions work.

### T4.1 — Toast appearance

1. Trigger the RestoreToast (copy AI response text with tokens)
2. **Expect:** Toast has clipboard icon, "Restore N masked values?" text
3. **Expect:** Countdown starts at `8s` and ticks down
4. **Expect:** Two buttons: "Restore" (blue) and "Keep masked" (gray)
5. **Expect:** Toast has dark background with blue border (info-blue accent)

**Pass / Fail: PASS**
**Notes:**

### T4.2 — Restore action

1. Trigger the RestoreToast
2. Click **Restore**
3. Open a text editor and paste (Ctrl+V / Cmd+V)
4. **Expect:** Pasted text contains the **original values** (e.g. `john.smith@acme.com`), not the tokens

**Pass / Fail: PASS**
**Notes:**

### T4.3 — Keep masked action

1. Trigger the RestoreToast
2. Click **Keep masked**
3. Paste into a text editor
4. **Expect:** Pasted text contains the **tokens** (e.g. `[John S. email]`), not the originals

**Pass / Fail: PASS**
**Notes:**

### T4.4 — Auto-dismiss (safe default)

1. Trigger the RestoreToast
2. Do nothing — wait 8 seconds
3. **Expect:** Toast disappears automatically
4. Paste into a text editor
5. **Expect:** Pasted text contains the **tokens** (safe default — no restore without explicit click)

**Pass / Fail: PASS**
**Notes:**

### T4.5 — Singular vs plural

1. Fix only 1 finding, then copy AI response with that 1 token
2. **Expect:** Toast says "Restore 1 masked value?" (singular)
3. Fix multiple findings, copy response with 2+ tokens
4. **Expect:** Toast says "Restore N masked values?" (plural)

**Pass / Fail: PASS**
**Notes:**

---

## Phase 5 — MaskBadge in Widget

**Goal:** Confirm the widget pill and panel correctly display masked state.

### T5.1 — Masked-only state (no active findings)

1. Paste template, Fix All, then clear the input
2. **Expect:** Widget shows green state with `5 masked` label (no red badge)
3. **Expect:** No checkmark icon (replaced by masked label)

**Pass / Fail: PASS**
**Notes:**

### T5.2 — Mixed state (findings + masked)

1. After Fix All, type a new email in the input (e.g. `alice@test.com`)
2. **Expect:** Widget shows `(1) | 5 masked` — orange badge AND blue masked label with separator

**Pass / Fail: PASS**
**Notes:**

### T5.3 — Badge updates reactively

1. Open the Findings Panel masked section
2. Click **Clear All**
3. **Expect:** "N masked" label disappears immediately from widget pill
4. **Expect:** Widget returns to clean checkmark (if no findings)

**Pass / Fail: PASS**
**Notes:**

---

## Phase 6 — Full Integration & Settings Gate

**Goal:** Confirm the end-to-end flow and the maskingEnabled toggle.

### T6.1 — Complete happy path

1. Open ChatGPT (or Claude / Gemini)
2. Paste: `My email is john.smith@acme.com and phone is +1-555-012-3467`
3. Widget shows `(2)` → open panel → click **Fix All**
4. Input now shows: `My email is [John S. email] and phone is [phone ending 67]`
5. Widget shows `2 masked`
6. Send the prompt
7. AI responds using the tokens
8. Select the AI response text containing both tokens → **Ctrl+C**
9. RestoreToast appears: "Restore 2 masked values?"
10. Click **Restore**
11. Paste into a text editor
12. **Expect:** `john.smith@acme.com` and `+1-555-012-3467` appear in the pasted text

**Pass / Fail: PASS**
**Notes:**

### T6.2 — maskingEnabled OFF disables restore

1. Open Dashboard → Settings → turn **Smart Masking OFF**
2. Go back to a chat, paste sensitive data, open panel
3. Click Fix — values should still be masked (Fix always works)
4. Send prompt, get AI response with tokens
5. Select and copy (Ctrl+C) text with tokens
6. **Expect:** No RestoreToast appears
7. Paste → text contains tokens (no restore offered)

**Pass / Fail: PASS**
**Notes:**

### T6.3 — Conversation change clears mapping

1. Turn Smart Masking back ON
2. Fix a finding → confirm `1 masked` in widget
3. Navigate to a **new conversation** (click "New chat" or similar)
4. **Expect:** `N masked` label disappears
5. Copy text containing the old token from the previous conversation
6. **Expect:** No RestoreToast (mapping was cleared)

**Pass / Fail: FAIL**
**Notes:** Mapping is not cleared belween chats. Masked status remained. Reverse problem also exist - when going back to "old" chat - it is not reset, and carry over the state

### T6.4 — TTL expiry

1. Fix a finding → note the "Auto-clears in ~30 min" in panel
2. (Accelerated test: modify `DEFAULT_TTL_MS` in `masking-map.ts` to `60000` for 1 min, rebuild)
3. Wait for TTL to expire
4. **Expect:** "N masked" label disappears from widget
5. **Expect:** Copy with old tokens produces no RestoreToast

**Pass / Fail: PASS**
**Notes:**

---

## Cross-Site Testing - WORKED PERFECTLY WELL

Run the happy path (T6.1) on each supported site:

| Site | Widget Appears | Fix Works | Tokens Display | Copy → Toast | Restore Works |
|------|:-:|:-:|:-:|:-:|:-:|
| ChatGPT | _ | _ | _ | _ | _ |
| Claude | _ | _ | _ | _ | _ |
| Gemini | _ | _ | _ | _ | _ |

**Notes per site:** All worked equally well for Happy flow

---

## Edge Cases

### E1 — Duplicate token disambiguation

1. Paste: `Contact john.smith@acme.com or john.smith@other.com`
2. Fix All
3. **Expect:** Two different tokens, e.g. `[John S. email]` and `[John S. email 2]`

**Result: PASS**

### E2 — Multiple copies in sequence

1. Fix All on a prompt with several findings
2. Copy AI response → RestoreToast appears
3. Before clicking, copy something else (different text with tokens)
4. **Expect:** New toast replaces the old one with updated count

**Result: When I copy something else with no tokens - countdown just continued. If I cooy something with a different token - countdown continues. If I copy same tokens - countdown continues**

### E3 — Very long prompt

1. Paste a prompt with 20+ sensitive values mixed into paragraphs
2. **Expect:** All detected, Fix All works, tokens appear correctly
3. **Expect:** Panel scrolls for the list, masked section scrolls too

PROMPT USED:
Hi, I need help debugging our production environment. My name is John Smith, email john.smith@acme.com, and my colleague is Jane Doe at jane.doe@globex.com. Our support inbox is support@acme.com and billing goes to billing@globex.com.

My phone is +1-555-012-3467 and Jane's is +44-20-7946-0958. Our office line is +1-212-555-7890.

The main server is at 192.168.1.100 and the database replica is on 10.0.0.42. We also have a staging box at 172.16.5.200 and a monitoring node at 192.168.50.11.

For API access, here are the keys:
- OpenAI: sk-proj-abc123def456ghi789jkl012mno345pqr678
- AWS: AKIAIOSFODNN7EXAMPLE
- GitHub: ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijk

Payment is on file with card 4111-1111-1111-1111 and backup card 5500-0000-0000-0004.

My SSN is 123-45-6789 and Jane's is 876-54-3210.

Can you review our setup and suggest improvements?
18 items - 4 emails, 3 phone numbers, 4 IPs, 3 APIs, 2 cards and 2 SSN.
(Previous test values 4532-1234-5678-9010 and 987-65-4321 were invalid — failed Luhn checksum and SSN area range respectively.)

This is redacted version:
Hi, I need help debugging our production environment. My name is John Smith, email [John S. email], and my colleague is Jane Doe at [Jane D. email]. Our support inbox is [email] and billing goes to [email 2].

My phone is [phone ending 67] and Jane's is [phone ending 58]. Our office line is [phone ending 90].

The main server is at [internal IP] and the database replica is on 10.0.0.42. We also have a staging box at [internal IP 2] and a monitoring node at [phone ending 11].

For API access, here are the keys:
- OpenAI: [OpenAI API key]
- AWS: [AWS access key]
- GitHub: [GitHub token]

Payment is on file with card 4532-1234-5678-9010 and backup card 5425-9876-5432-1098.
My SSN is [SSN redacted] and Jane's is 987-65-4321.

Can you review our setup and suggest improvements?

**Result: Not everything is redacted. But everything scrolls well.
Non redacted are - credit cards and Janes SSN, plus one IP (out of 4). emails of support and billing, are masked non discriptively, but maybe they shouldn't be confidential in the first place**

### E4 — Extension disable/enable cycle

1. Disable extension in Dashboard
2. Paste sensitive data → no widget
3. Re-enable extension
4. **Expect:** Scanner picks up findings on next input event

**Result: When turned off through settings of an extention - the green icon/widget is still there, but it shows no suggestions. Better to remove it all in all or change it to "alert" icon - to highlight that the widget is not working/turned off**

### E5 — Tab suspension and wake

1. Fix All on a prompt → masked values exist
2. Switch to another tab, wait several minutes
3. Return to the AI tab
4. **Expect:** Masked values still available (TTL timer fires on wake)

**Result: UNTESTED - its too long for a manual test **

---

## Accessibility

### A1 — Keyboard navigation

1. Tab to the widget → **Expect:** Focus ring visible
2. Press Enter → **Expect:** Panel opens
3. Tab through Fix/Ignore buttons → **Expect:** Each focusable
4. Press Escape → **Expect:** Panel closes

**Pass / Fail: PASS**

### A2 — Screen reader

1. With a screen reader active, navigate to the widget
2. **Expect:** Reads "Sunbreak: N findings detected" or "Sunbreak: N masked"
3. Open panel → **Expect:** "Sunbreak findings" dialog announced
4. RestoreToast → **Expect:** `role="alertdialog"` and `aria-live="polite"` announced

**Pass / Fail: I Dont understand what screen reader is**

### A3 — Reduced motion

1. Enable `prefers-reduced-motion: reduce` in OS/browser settings
2. **Expect:** Widget and toast entrance animations disabled

**Pass / Fail: i dont understand how to test it**

---

## Issues Found

| # | Phase | Severity | Description | Steps to Reproduce |
|---|-------|----------|-------------|-------------------|
| | | | | |

## Feature Ideas

| # | Description | Related Phase |
|---|-------------|---------------|
| | | |
