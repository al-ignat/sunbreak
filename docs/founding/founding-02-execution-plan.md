**Secure BYOAI**

From Idea to Execution

Three Parallel Workstreams

1. Customer Discovery Interview Framework

2. MVP Scope and Implementation Plan

3. Pitch Narrative and Positioning

February 2026

# How These Three Workstreams Connect

These workstreams aren’t sequential — they’re parallel and reinforcing. The interview framework validates whether the product should exist and what it must do. The MVP scope turns those insights into a buildable plan. The pitch narrative connects your personal experience to the market opportunity, creating the story that opens doors for interviews, attracts design partners, and eventually raises capital.

The feedback loops matter:

- **Interviews → MVP: **Every conversation refines what v1 must include and what can wait. If 8 out of 10 CISOs say “I’d change my policy if I had classification confidence above 95%,” that’s your v1 bar.
- **MVP → Pitch: **A working prototype makes the pitch concrete. “Let me show you” beats “Imagine if” every time.
- **Pitch → Interviews: **The narrative opens doors. A LinkedIn post about your Maersk experience generates inbound from people living the same problem.

Start all three now. But weight your time 40% interviews, 40% building, 20% narrative for the first 4 weeks.

# Workstream 1: Customer Discovery Interviews

## 1.1 The One Question That Matters

Every interview ultimately tests one hypothesis:

*“If I could make personal AI account usage as governed and auditable as enterprise tools, would you change your policy from ‘ban personal AI’ to ‘use personal AI safely’?”*

If the answer is consistently no — regardless of the tool’s capability — then the product doesn’t have a market. You’d need to pivot to Product A (enforcement). If the answer is “yes, but...” — those “buts” define your feature priorities. If the answer is “yes, immediately” — you have early design partners.

## 1.2 Who to Interview

You need three distinct interview tracks, because each one validates a different layer of the product:

| **Track**                            | **Who**                                                                               | **Target Count** | **What You Learn**                                                                                                                         |
| ------------------------------------ | ------------------------------------------------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Track A:
Decision Makers             | CISOs, CDOs, CIOs, Heads of AI at companies with 500-50,000 employees                 | 8-12 people      | Willingness to change policy. Budget reality. Buying process. Must-have compliance requirements. Dealbreakers.                             |
| Track B:
Security Practitioners      | Security engineers, GRC analysts, IT ops managers who would evaluate/deploy the tool  | 5-8 people       | Technical requirements. Integration needs. What “good enough” classification accuracy looks like. Deployment constraints.                  |
| Track C:
Employees (Shadow AI Users) | Knowledge workers who currently use personal AI at work despite policy. Any function. | 10-15 people     | Actual shadow AI behaviour. Pain points with current workarounds. What would make them use a governance tool voluntarily. UX requirements. |

**How to Find Them**

- **Track A: **LinkedIn outreach. Search for CISOs and CDOs at mid-market companies (500-5000 employees) in regulated industries. Your Maersk story is the hook: “I lived this problem. I’m building something. I’d love 25 minutes of your perspective.” 10-15% response rate is typical. Send 80-100 messages to get 10 calls.
- **Track B: **Security community channels: r/cybersecurity, SANS community forums, local OWASP meetups, BSides conferences. Also ask Track A interviewees for intros to their security engineers.
- **Track C: **The easiest to find. Your current colleagues at Maersk. Friends at other large companies. Post on LinkedIn: “Do you use ChatGPT/Claude for work even though your company hasn’t approved it? I’m researching this. DM me.” You’ll get flooded.

## 1.3 Interview Scripts

**Track A: Decision Maker Interview (25 minutes)**

Goal: Validate willingness to change policy. Understand buying process and budget.

**Opening (2 min):**

“Thanks for the time. I’m exploring a product idea in the AI governance space. I’ve spent [X years] at a large global enterprise where I lived the shadow AI problem firsthand — employees using personal AI accounts because the sanctioned tools didn’t meet their needs. I’m not selling anything today. I just want to learn how you think about this problem.”

**Current State (8 min):**

1. “What’s your current policy on employees using GenAI tools like ChatGPT, Claude, or Gemini?”
2. “How did you arrive at that policy? What was the internal debate?”
3. “Honestly — how well do you think the policy is followed? What’s your gut sense of actual compliance?”
4. “Do you have any technical controls enforcing the policy, or is it honour-system?”
5. “What sanctioned AI tools do you provide? How do employees feel about them?”

**The Pain (5 min):**

1. “What’s the biggest risk you worry about with unsanctioned AI usage?”
2. “Have you had any incidents — data exposure, compliance issues, close calls — related to shadow AI?”
3. “When you think about EU AI Act compliance, how confident are you that your current approach covers employee use of third-party GenAI?”

**The Hypothesis (8 min):**

1. “Imagine a tool that sits in the browser, detects when an employee is about to paste sensitive data into any AI tool, and either warns them or auto-redacts — all happening locally on their device, no conversation content ever sent to us or to you. Employees keep their personal AI accounts. You get an aggregate dashboard showing risk levels and compliance status. Would that change your policy?”
2. “What would it need to do for you to say yes? What’s the minimum bar?”
3. “Who else would need to agree? What does the buying process look like for a tool like this?”
4. “What would you pay per user per month for this?”

**Close (2 min):**

1. “If I build a working prototype in the next 6-8 weeks, would you be willing to look at it? Could I come back and show you?”
2. “Is there anyone else in your network dealing with this problem who I should talk to?”

**Track B: Security Practitioner Interview (20 minutes)**

Goal: Validate technical approach. Understand deployment reality.

**Questions:**

1. “Walk me through how you currently monitor or control employee use of GenAI tools. What tools do you use?”
2. “If you had to detect sensitive data in an AI prompt — not a file attachment, but free-text in a chat window — how would you approach that today?”
3. “What’s your false-positive tolerance? If a classification tool flagged 1 in 20 prompts incorrectly, would that be acceptable?”
4. “Browser extension vs. endpoint agent vs. network proxy — which deployment model would you prefer and why?”
5. “What would you need in a compliance report for an EU AI Act audit? What format, what data?”
6. “If the classification happened entirely on-device and no prompt content was ever sent to a cloud service — does that change your privacy calculus?”
7. “What integrations would be essential? SIEM? SOAR? Okta? Slack?”

**Track C: Employee (Shadow AI User) Interview (15 minutes)**

Goal: Understand real behaviour. Define UX requirements.

**Questions (keep informal — these people need to feel safe admitting policy violations):**

- “What AI tools do you use for work? Which ones are officially approved and which ones are... not?”
- “What do you use them for? Give me a recent example.”
- “When you use a non-approved tool, do you think about what data you’re sharing? What’s your mental process?”
- “Have you ever stopped yourself from using AI for something because you were worried about data sensitivity? What happened?”
- “If your company offered a tool that sat in your browser and warned you before you pasted something sensitive into ChatGPT — would you use it? Would it help or annoy you?”
- “What would make you voluntarily install a tool like this? What would make you immediately uninstall it?”
- “If you could see a personal dashboard showing ‘you had 150 AI interactions this week, all within policy’ — would that be valuable to you?”

## 1.4 What to Listen For

After each interview, score these signals:

| **Signal**                   | **Strong Positive**                                              | **Weak/Negative**                           |
| ---------------------------- | ---------------------------------------------------------------- | ------------------------------------------- |
| Policy change willingness    | If the tech works, yes, wed change the policy                    | Well never allow personal AI tools, period  |
| Pain severity                | Describes specific incidents, compliance gaps, employee friction | Its on our radar but not a priority         |
| Budget signal                | Names a price range, references existing budget line             | Wed need to find budget or long silence     |
| Champion potential           | Let me introduce you to my CDO or Send me the prototype          | Interesting, keep me posted                 |
| Technical feasibility belief | On-device classification? Thats smart.                           | I dont think browser extensions can do that |

If after 10 decision-maker interviews you have 7+ “strong positive” on policy change willingness, you have a product. If you have 3 or fewer, you need to reconsider the positioning or the target segment.

# Workstream 2: MVP Scope and Implementation Plan

## 2.1 The MVP Philosophy

The MVP has one job: prove that personal AI usage can be governed. Not perfectly. Not comprehensively. Just well enough that a CISO says “I can see how this would work” and an employee says “I’d actually use this.”

Everything below is scoped for a solo developer using Claude Code, shipping in 6-8 weeks.

## 2.2 What v1 Does (and Doesn’t Do)

| **In v1 Scope**                                                                                 | **NOT in v1 (Later)**                            |
| ----------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| Chrome extension (Manifest V3)                                                                  | Firefox, Safari, Edge support                    |
| Works with ChatGPT, Claude, Gemini web interfaces                                               | API-level interception, desktop apps, mobile     |
| Detects prompts before submission via DOM observation                                           | Response/output monitoring                       |
| Regex-based detection: emails, phone numbers, credit cards, SSNs, API keys/tokens, IP addresses | SLM-based contextual classification              |
| Simple keyword lists: configurable “company words” (e.g. project codenames, customer names)     | Custom ML classifiers trained on enterprise data |
| Inline warning overlay with options: redact, edit, proceed, cancel                              | Auto-redaction with semantic preservation        |
| Personal dashboard: interaction count, flags triggered, compliance status                       | Enterprise admin console                         |
| AI provider identification (which tool is being used)                                           | Provider risk scoring and policy engine          |
| Local storage of anonymised stats (no prompt content stored)                                    | Cloud control plane with aggregate analytics     |
| Free for individual use                                                                         | Team/enterprise tiers with billing               |

## 2.3 Technical Architecture for v1

**Component 1: Content Observer (content-script.js)**

The content script injects into AI tool pages and observes user input:

- **Target pages: **chatgpt.com, claude.ai, gemini.google.com. Matched via manifest.json host permissions.
- **Observation method: **MutationObserver on the main chat input element. Each AI tool has a different DOM structure, so you need per-site selectors. For ChatGPT it’s a contenteditable div; for Claude it’s a ProseMirror editor; for Gemini it’s a rich text input.
- **Trigger: **Intercept on form submission or Enter keypress. Capture the full text content of the input field before it’s sent.
- **File upload detection: **Monitor file input elements and drag-and-drop events. In v1, warn on any file upload without content analysis (flag the action itself as potentially risky).

**Component 2: Classification Engine (classifier.js)**

A local-only analysis module that runs entirely in the extension:

- **Pattern matchers: **Regex-based detectors for high-confidence categories. These should have near-zero false positives:
  - Email addresses: standard RFC 5322 pattern
  - Credit card numbers: Luhn algorithm validation
  - SSN/national ID patterns: US SSN, Danish CPR, UK NI number formats
  - API keys/tokens: patterns for AWS, Azure, GCP, GitHub, Stripe, etc.
  - IP addresses: IPv4 and IPv6 patterns
  - Phone numbers: international format detection
- **Custom keyword lists: **User-configurable lists of sensitive terms. In the settings panel, employees (or later, admins) can add company-specific terms: project codenames, product names, customer names, internal acronyms. Matched case-insensitively with word-boundary detection to avoid false positives.
- **Confidence scoring: **Each detection gets a confidence tag — HIGH (regex match, near-certain), MEDIUM (keyword match, needs context), LOW (heuristic suspicion). v1 only surfaces HIGH and MEDIUM to the user.

**Component 3: Intervention UI (overlay.js + overlay.css)**

When a classification trigger fires, an overlay appears in the AI tool’s page:

- **Design principle: **Helpful, not hostile. Think of Grammarly’s gentle underlines, not a corporate firewall block page.
- **Warning display: **A small, non-intrusive banner at the top of the chat input area. Shows what was detected (e.g., “2 email addresses detected”) with detected items highlighted in the text.
- **Action buttons: **Four options for the employee:
  - Redact  Send — replaces detected sensitive items with placeholders (e.g., [EMAIL_1], [PHONE_1]). User can review before sending.
  - Edit — returns focus to the input field for manual editing.
  - Send Anyway — proceeds with a logged acknowledgment. This is important: don’t block, warn. The employee is an adult.
  - Cancel — clears the submission.
- **Zero-interference mode: **When nothing is detected, the extension does absolutely nothing. No badge, no icon change, no notification. Invisible.

**Component 4: Personal Dashboard (popup.html + dashboard.js)**

Extension popup and a full-page dashboard accessible from the extension icon:

- **Stats: **Total AI interactions this week/month. Number of flags triggered. Number of auto-redactions. Compliance rate (interactions without flags / total).
- **History: **A log of flagged events (date, AI tool, category detected, action taken). No prompt content stored — only metadata.
- **Settings: **Toggle detection categories on/off. Manage custom keyword lists. Choose intervention mode (warn vs. block vs. log-only).
- **AI Tool Report Cards: **Static information page showing data retention policies, training data usage, and privacy commitments for ChatGPT, Claude, and Gemini. Manually curated in v1. Helps employees make informed tool choices.

## 2.4 Implementation Plan (6-8 Weeks)

| **Week** | **Focus**                 | **Deliverables**                                                                                                                                                    | **Key Decisions**                                                                                             |
| -------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Week 1   | Scaffolding  DOM Research | Chrome extension skeleton with Manifest V3. Content scripts that successfully inject into ChatGPT, Claude, Gemini. DOM selector mapping for each tools input field. | Finalise which AI tools to support in v1. Decide on Manifest V3 vs. V2 (V3 is required for Chrome Web Store). |
| Week 2   | Classification Engine     | Working regex detectors for all PII categories. Custom keyword list with CRUD UI in settings. Confidence scoring logic. Unit tests for all patterns.                | Set false-positive tolerance. Test against 100+ sample prompts to calibrate.                                  |
| Week 3   | Intervention UI           | Warning overlay that appears on detection. Redact  Send functionality. Edit/Send Anyway/Cancel buttons. Styled to feel native on each AI tools page.                | UX testing: show to 5 people. Is it helpful or annoying? Iterate.                                             |
| Week 4   | Personal Dashboard        | Stats tracking and display. Flagged event log. Settings panel with detection toggles. AI Tool Report Cards page.                                                    | Decide on data storage: chrome.storage.local vs. IndexedDB for stats.                                         |
| Week 5   | Integration  Polish       | End-to-end testing across all three AI tools. Edge case handling (multi-line pastes, code blocks, file uploads). Performance optimisation.                          | Test on slow/old machines. Extension must add 50ms latency to submission.                                     |
| Week 6   | Beta Testing              | Deploy to 10-20 beta users (Track C interview participants). Collect feedback on false positive rates, UX friction, perceived value.                                | Kill/pivot decision point: if beta users disable within 3 days, UX needs fundamental rework.                  |
| Week 7-8 | Iterate  Launch           | Fix top 5 issues from beta. Write Chrome Web Store listing. Create landing page. Prepare demo for Track A interviewees.                                             | Soft launch: Chrome Web Store + Product Hunt + LinkedIn post.                                                 |

## 2.5 Technical Stack

| **Component** | **Technology**                      | **Rationale**                                                                                  |
| ------------- | ----------------------------------- | ---------------------------------------------------------------------------------------------- |
| Extension     | TypeScript, Manifest V3             | Type safety for complex DOM manipulation. V3 required for Chrome Web Store going forward.      |
| UI Framework  | Preact or vanilla JS                | Must be tiny. React is overkill for an extension overlay. Preact gives component model at 3KB. |
| Styling       | CSS modules or Tailwind (extracted) | Must not conflict with AI tools existing styles. Scoped CSS is essential.                      |
| Storage       | chrome.storage.local                | Syncs across devices if user is signed into Chrome. No cloud backend needed for v1.            |
| Testing       | Vitest + Playwright                 | Vitest for unit tests on classifiers. Playwright for E2E testing against actual AI tool pages. |
| Build         | Vite with CRXJS plugin              | Fast builds, HMR for development, generates proper extension structure.                        |
| Landing Page  | Simple HTML/CSS or Astro            | Fast to build, good SEO. Deploy on Vercel/Netlify.                                             |

## 2.6 Critical v1 Quality Bars

These are non-negotiable for v1. If any of these fail, don’t ship.

- **False positive rate  2%: **No more than 1 in 50 prompts flagged incorrectly. Measured against a test set of 500 real-world prompts (sourced from beta users with consent).
- **Latency  50ms: **Classification must complete before the user notices. If the warning overlay appears more than 50ms after they hit Enter, it feels broken.
- **Zero data exfiltration: **No prompt content, conversation data, or user activity ever leaves the device. Verify with a network audit. This is the trust foundation.
- **Works on all three AI tools without breaking them: **DOM manipulation must not interfere with the AI tool’s own functionality. Test extensively: multi-turn conversations, file uploads, code blocks, long prompts, image generation prompts.
- **Uninstallable in one click: **If someone doesn’t want it, it must be trivially removable. No dark patterns. No guilt. This builds trust.

# Workstream 3: Pitch Narrative

## 3.1 The Story Arc

Every great product pitch follows a three-act structure: the world as it is (the problem), the world as it could be (the vision), and the bridge between them (your product). Yours has a rare advantage: you’ve lived act one.

**Act 1: The Problem (Your Story)**

You work at one of the world’s largest logistics companies. Your company deploys AI for big strategic initiatives — customer experience, sales, operations. But for the 100,000+ employees doing everyday knowledge work, the policy is simple: use Microsoft Copilot, don’t touch anything else.

The problem? Copilot doesn’t do what employees need. It can’t match Claude for complex reasoning. It can’t match ChatGPT for creative drafts. It can’t match Gemini for research. So employees do what employees always do: they find workarounds. They open personal ChatGPT in a browser tab. They paste in customer emails, shipping data, internal strategies. They get their work done. And the company has no idea it’s happening.

The Acceptable Use Policy says “don’t do this.” The employees say “I need to do my job.” Both are right. Neither side has a way to resolve the tension.

**Act 2: The Vision (The World You’re Building)**

Imagine a world where employees use whatever AI tool works best for them — their personal Claude, their ChatGPT Plus, whatever drops next week — and their company is completely comfortable with it. Not because the company trusts blindly, but because there’s a thin, intelligent layer that makes sure sensitive data never leaves the device unprotected.

The employee’s experience is simple: they type a prompt, and if something in it is risky, they see a helpful suggestion — not a block screen, not a surveillance alert, just a gentle “hey, there are two customer email addresses in this prompt, want me to redact them?” If nothing’s risky, they never notice the tool exists.

The company’s experience is equally simple: a dashboard showing “your employees had 50,000 AI interactions this month, 99.2% within policy, 0.8% flagged and remediated.” Full audit trail. EU AI Act compliant. No employee conversation content exposed.

Both sides get what they need. Employees get the tools they love. Companies get the governance they require. Nobody has to pretend the policy is working when it isn’t.

**Act 3: The Bridge (Your Product)**

Secure BYOAI is a browser extension that makes personal AI accounts safe for work. It works with any AI tool accessed through a browser. It classifies data locally on the device — no prompt content ever sent to a cloud service. It intervenes gently when it detects sensitive data, offering redaction with one click. And it gives the enterprise aggregate visibility without surveillance.

It’s not a DLP tool. It’s not an enterprise AI platform. It’s the missing layer between “ban everything” and “allow everything” — the layer that makes “allow safely” possible for the first time.

## 3.2 The One-Liner Variations

For different audiences:

| **Audience**                     | **One-Liner**                                                                     |
| -------------------------------- | --------------------------------------------------------------------------------- |
| General (LinkedIn, landing page) | Secure BYOAI: Use the AI tools you love at work — safely.                         |
| CISO                             | Govern 100% of employee AI usage, not just the 30% happening in sanctioned tools. |
| CDO / Head of AI                 | Unlock your Citizen Led AI vision across every AI tool, not just Copilot.         |
| CIO                              | Stop choosing between employee productivity and AI governance.                    |
| Compliance / DPO                 | Full audit trail for every AI interaction. EU AI Act ready.                       |
| Employee                         | Use ChatGPT, Claude, and Gemini at work without anxiety.                          |
| Investor                         | The governance layer for the BYOAI era. $4.8B market by 2034.                     |

## 3.3 The LinkedIn Post That Opens Doors

This is designed to generate Track A and Track C interview opportunities. Post it in week 1 or 2.

I work at a company with 100,000+ employees. Our AI policy says: “Only use Microsoft Copilot. Don’t touch ChatGPT, Claude, or Gemini.”

Here’s what actually happens: People use personal AI accounts anyway. Every day. For real work. Because Copilot doesn’t cut it for complex tasks.

They’re not being reckless. They’re being productive. But every paste into ChatGPT is an unmonitored data flow that the security team can’t see.

The policy creates the exact problem it’s trying to prevent.

I’m exploring a different approach: What if we made personal AI accounts safe for work instead of pretending people don’t use them?

If you’re a CISO, CDO, or security leader dealing with this same tension, I’d love to hear how you think about it. DM me or comment below.

And if you’re an employee who uses AI tools your company hasn’t approved — you’re not alone. I’d love to hear your story too.

Expected outcome: 5,000-15,000 impressions, 30-80 comments, 5-15 DMs from security leaders and employees willing to talk. This single post can source half your interview pipeline.

## 3.4 The 3-Minute Demo Script

For when you have a working prototype and a Track A interviewee on a call:

6. **The setup (30 sec): **“Let me show you something. I’m going to open Claude — my personal account, not an enterprise tool — and try to do something an employee might do.”
7. **The trigger (30 sec): **Type a prompt that contains a fake but realistic-looking customer email, phone number, and contract reference. Hit Enter. The overlay appears instantly, highlighting the sensitive items.
8. **The intervention (30 sec): **“See? It caught the email and phone number. I can click Redact  Send to replace them with placeholders, or Edit to fix it myself. No block screen. No IT ticket. Just a helpful nudge.”
9. **The clean case (30 sec): **Now type a prompt with no sensitive data. Hit Enter. Nothing happens. “See? When there’s nothing to flag, the tool is completely invisible. Zero friction.”
10. **The dashboard (30 sec): **Open the extension popup. “This is what the employee sees. 47 interactions this week, all clean. Here’s the one flag that was caught and redacted. They can see their own compliance status.”
11. **The close (30 sec): **“Now imagine this across 1,000 employees, with a dashboard that shows you aggregate risk without reading anyone’s conversations. Your employees get the AI tools they love. You get the governance you need. Would that change your policy?”

# Putting It All Together: 8-Week Plan

| **Week** | **Interviews**                                                                                                   | **Building**                                                                                | **Narrative**                                                                        |
| -------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| 1        | Draft LinkedIn post. Send first 30 LinkedIn outreach messages to Track A. Post employee-focused ask for Track C. | Set up dev environment. Chrome extension scaffold. DOM research on ChatGPT, Claude, Gemini. | Publish LinkedIn post. Start collecting reactions and DMs.                           |
| 2        | First 3-5 Track C (employee) interviews. First 1-2 Track A responses.                                            | Classification engine: all regex detectors built and tested.                                | Refine one-liners based on LinkedIn reactions. What language resonated?              |
| 3        | 3-5 more Track C interviews. 2-3 Track A interviews. First Track B outreach.                                     | Intervention UI: warning overlay working on ChatGPT. Start Claude/Gemini adaptation.        | Write up 2-3 anonymised employee stories from interviews for future content.         |
| 4        | 2-3 Track A interviews. 1-2 Track B interviews. Adjust interview questions based on patterns.                    | Personal dashboard: stats, history, settings. AI tool report cards.                         | Draft the 3-minute demo script. Rehearse.                                            |
| 5        | Continue Track A/B interviews. Score hypothesis results. Go/no-go assessment.                                    | End-to-end integration. Cross-tool testing. Performance optimisation.                       | If go: refine pitch for design partner outreach. If no-go: identify pivot direction. |
| 6        | Recruit 10-20 beta users from Track C interviewees.                                                              | Beta deployment. Daily feedback collection. Bug fixes.                                      | Collect first user testimonials and screenshots.                                     |
| 7-8      | Return to Track A interviewees with working demo. Ask: “Would you change your policy?”                           | Iterate on beta feedback. Prepare Chrome Web Store listing.                                 | Launch landing page. Product Hunt submission. LinkedIn launch post.                  |

## Decision Points

Build kill/pivot decisions into the plan explicitly:

- **Week 5: Interview Go/No-Go. **If fewer than 5 out of 10 Track A interviewees express willingness to change their policy, pause building and investigate why. Is the positioning wrong? Is the target segment wrong? Or is the market not ready?
- **Week 6: Beta Retention. **If more than 50% of beta users disable the extension within 3 days, the UX needs fundamental rework. Pause feature development and do intensive UX research.
- **Week 8: Design Partner Commitment. **If you can’t get at least 2 companies to commit to a paid pilot (even at a token amount), re-examine the GTM strategy.

## Success Metrics at Week 8

| **Metric**                               | **Target**             | **What It Tells You**                        |
| ---------------------------------------- | ---------------------- | -------------------------------------------- |
| Track A interviews completed             | 8-12                   | You understand the buyer well enough to sell |
| Policy change willingness (% of Track A) | 60%                    | The market exists for Product B              |
| Beta users                               | 15-20                  | You can acquire individual users             |
| Beta retention at 7 days                 | 60%                    | The UX works and the product is useful       |
| False positive rate                      | 2%                     | Classification is good enough for production |
| Companies willing to pilot               | 2-3                    | Revenue path exists                          |
| LinkedIn post engagement                 | 50 meaningful comments | The narrative resonates with the market      |

**Start with the LinkedIn post. It costs nothing, takes 30 minutes, and generates the data you need for everything else.**