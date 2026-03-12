# Sunbreak Roadmap Review — Reconstructing the AI Safety Companion

**Date:** 2026-03-12  
**Inputs reviewed:**  

- [docs/v1-roadmap.md](/private/tmp/sunbreak-roadmap-review/docs/v1-roadmap.md)  
- [docs/brainstorms/2026-03-04-v02-ai-safety-companion-brainstorm.md](/private/tmp/sunbreak-roadmap-review/docs/brainstorms/2026-03-04-v02-ai-safety-companion-brainstorm.md)  
- [docs/brainstorms/2026-03-06-sensitive-data-roadmap-brainstorm.md](/private/tmp/sunbreak-roadmap-review/docs/brainstorms/2026-03-06-sensitive-data-roadmap-brainstorm.md)  
- [docs/brainstorms/2026-03-02-secure-byoai-product-brainstorm.md](/private/tmp/sunbreak-roadmap-review/docs/brainstorms/2026-03-02-secure-byoai-product-brainstorm.md)

**External pressure-test sources:** official Chrome built-in AI docs, OpenAI Help, Anthropic/Claude support, Google support, and official vendor sites for adjacent enterprise AI security products. Links are listed at the end.

---

## Executive Judgment

The companion brainstorm contains the strongest version of the product.

The current roadmap is directionally good, but it has drifted back toward a feature checklist. It preserves the security roadmap, but it underweights the parts that make Sunbreak desirable rather than merely responsible.

The missing idea that got diluted is this:

**Sunbreak should not become a better prompt DLP pop-up. It should become the safety layer that helps people use AI well without feeling watched or blocked.**

That implies a sharper product hierarchy:

1. **Stay employee-first**
2. **Make protection feel helpful and reversible**
3. **Teach the user how to operate safely in context**
4. **Only then expand detection depth and enterprise controls**

The biggest roadmap problem is not that it has bad ideas. It is that it treats too many second-order features as if they deserve equal weight with the core compounding loops.

---

## The Best Core Product Thesis

The strongest thesis across all docs is:

> Sunbreak is the Grammarly for safe workplace AI use.

That means four things:

- it should be present while the user works, not only after mistakes
- it should improve outcomes, not merely prevent bad ones
- it should feel lightweight, local, respectful, and reversible
- it should become more valuable as the user and team teach it their environment

This is stronger than "browser extension that detects sensitive data before sending."

That original framing is useful for the first install and the Chrome Web Store listing. It is not strong enough as the long-term product frame.

---

## What The Current Roadmap Gets Right

### 1. It correctly shifts v1 toward contextual detection

The move from regex-only to context-aware scoring is the highest-ROI technical step in the entire roadmap. It increases real coverage in the categories people actually care about without introducing model download, inference latency, or trust issues.

This is still the right first detection expansion.

### 2. It correctly includes company-specific classification

This is one of the most important features in the entire product direction. Generic PII detection is table stakes. Company-specific patterns are where Sunbreak starts feeling like "our safety layer," not "a generic scanner."

This is also the cleanest bridge from individual use to team and security evaluation.

### 3. It correctly adds user journeys beyond detection

The roadmap includes onboarding, recovery, and file upload warning. That is good. It acknowledges that the product is not just "detect, warn, done."

### 4. It correctly avoids bloating v1 with heavy infrastructure

The roadmap still avoids service workers, enterprise console complexity, remote telemetry, and model-heavy classification in the immediate scope. That restraint is correct.

---

## What The Current Roadmap Gets Wrong

## 1. It underweights the companion layer

The companion brainstorm's best insight was that users adopt safety tools when the tool makes them better at AI, not just safer around AI.

In the current roadmap:

- Privacy intelligence is demoted to post-v1
- AI adoption help is demoted to post-v1
- user-facing trust-building guidance is treated as optional polish

That is a mistake.

If Sunbreak ships as:

- better detection
- more settings
- more logs

it will be useful, but it will still feel like a security utility.

If it ships as:

- safe prompt detection
- reversible masking
- account/provider guidance
- next-step help after mistakes

it starts to feel like a trusted companion.

That is the right product shape.

## 2. It overweights configurability too early

Milestone 4 is too broad for the value it creates at this stage.

Users do need some configurability, but:

- sensitivity thresholds
- notification style permutations
- multiple scan trigger modes

are not first-order user pull features. They are mostly operational tuning.

Too much early configurability creates two risks:

- you spend time building control surfaces instead of core workflows
- you force users to configure a product before they trust it

For this stage, Sunbreak should prefer:

- intelligent defaults
- a few high-confidence settings
- visible explanation of why something was flagged

over deep settings surfaces.

## 3. It overweights dashboard breadth

The dashboard matters, but the roadmap still thinks in terms of tabs and information architecture before the in-context product is fully sharp.

That is backwards.

The in-page experience creates value.
The dashboard explains, stores, and extends that value.

If the in-page experience is mediocre, no amount of dashboard richness fixes it.

## 4. It does not clearly distinguish "must ship for product truth" from "can ship later"

Right now the roadmap mixes:

- core truth-establishing features
- operational controls
- channel expansion
- polish
- enterprise seeds

These need separate priority classes.

---

## Features From The Companion Brainstorm That Should Be Pulled Forward

These are the ideas most likely to have gotten lost and should come back to the center.

## 1. Smart Reversible Masking

This is one of the best ideas in the whole product set.

Why it matters:

- it solves a real workflow problem, not just a compliance problem
- it improves the quality of AI outputs compared with blunt `[EMAIL_1]` style tokens
- it creates a memorable "Sunbreak is actually better than simple redaction" moment
- it supports the employee-first thesis

Why it is stronger than it looks:

- it is not merely masking UX
- it is the first feature that makes Sunbreak an active collaborator in AI work

Judgment:

**Pull this forward to core roadmap status.**

If you have to choose between broader settings and better reversible masking, choose masking.

## 2. Privacy Intelligence

This should not be post-v1. It should be part of the product truth earlier.

Why:

- provider differences matter to users now, not later
- account-level and mode-level privacy confusion is a real user problem
- this is one of the easiest ways for Sunbreak to feel helpful even when no prompt is flagged

The market has shifted since the original concept. AI tools now include more modes, more connectors, more memory, and more account distinctions. That increases user confusion and increases the value of contextual privacy guidance.

Judgment:

**Pull a narrow version into the core roadmap.**

Not a huge knowledge hub. A small, sharp provider/account safety layer.

## 3. Inline Detection UX

This is already partially reflected in the product, but the companion brainstorm frames it better than the current roadmap.

The key principle remains correct:

- detect before send
- avoid modal blocking
- let the user resolve inline

That should remain the north star for the interaction model.

## 4. Recovery Flows

This appears in the roadmap, but it is underspecified relative to its value.

The moment after a user realizes they sent something sensitive is emotionally high-value:

- they are anxious
- they need next actions
- they want to feel helped, not judged

This is where Sunbreak can build disproportionate trust.

Judgment:

**Expand this into a first-class product flow.**

---

## New Gaps The Roadmap Should Add

These are the most important missing areas after reviewing the brainstorms and current product landscape.

### External signals that strengthen these gaps

The official product docs already point in the same direction:

- OpenAI documents Temporary Chat, memory controls, training controls, and retention differences
- Google documents Gemini Apps Activity and the behavior of connected apps
- Anthropic documents different privacy expectations and retention controls across product tiers and features
- Chrome keeps moving on-device AI forward, which keeps the long-term "local intelligence" path credible

This matters because it means Sunbreak does not have to invent anxiety. The user-facing safety complexity is already there in the products.

## 1. Account and Mode Awareness

This is the biggest missing user-facing feature area.

Sunbreak should understand not only *which provider* the user is on, but *what kind of account or mode they appear to be using* when that can be inferred safely from local UI.

Examples:

- personal vs work ChatGPT account
- temporary/private/incognito chat modes
- history on vs history off
- memory on vs off if visible in the product UI

Why this matters:

- risk depends heavily on account/mode, not just provider
- users often assume they are safer than they are
- provider settings and retention controls are confusing and change over time
- official vendor docs now make it clear that users are expected to manage these distinctions themselves

Example user moment:

> "This prompt is clean enough structurally, but you are in a personal account with persistent history and model-improvement enabled."

That is a much richer companion behavior than pure prompt scanning.

Judgment:

**Add as a roadmap feature.**

## 2. Connector / Connected-App Risk Journeys

AI tools increasingly connect to:

- Google Drive
- Slack
- GitHub
- Notion
- calendars
- internal workspace sources

That changes the risk model.

Sunbreak should eventually help users understand:

- when they are using a model with connected internal data
- when a prompt may expose references from connected tools
- when a provider setup means AI has broader retrieval power than the user realizes

This does not need deep integration at first. Even a provider/setup awareness layer is valuable.

Judgment:

**Add as a post-v1 strategic track.**

## 3. Agent / Browser / Computer-Use Safety

This is another major gap.

Modern AI workflows increasingly involve:

- tool use
- browser actions
- file access
- screenshots
- connected applications
- autonomous multi-step tasks

Sunbreak’s current framing is mostly "prompt text before send." That is still necessary, but it is no longer enough as the product horizon.

Near-term implication:

- treat screenshots, pasted transcripts, and file uploads as first-class risky inputs
- add clearer warning language around what Sunbreak does and does not inspect

Longer-term implication:

- Sunbreak may need a product line that protects agent actions and broader AI workflows, not just text prompts

Judgment:

**Add as a horizon feature and design toward it now.**

## 4. Explainability and Confidence Narratives

The roadmap talks about thresholds and toggles, but not enough about explanation.

Users need to understand:

- why something was flagged
- how confident Sunbreak is
- what category it belongs to
- what the safest alternative is

This matters more than extra settings.

If a user sees:

- "Flagged because currency amount + forecast language + quarter marker"

that builds trust and helps them self-correct.

Judgment:

**Make explanation a core requirement across findings UX.**

## 5. Safe Prompt Transformation, Not Just Masking

This is adjacent to masking but slightly broader.

There are many cases where the best user help is not:

- remove this token

but:

- rewrite the request so it preserves task intent without leaking specifics

Examples:

- "Summarize this customer issue without names or account numbers"
- "Ask for analysis of this contract clause without pasting party names"
- "Describe the system behavior without sharing the internal hostname"

This can start with static patterns and templates rather than model generation.

Judgment:

**Add as a narrow post-v1 product track.**

---

## Revised Feature Hierarchy

If the roadmap is rewritten around actual product leverage, the features sort into four buckets.

## Bucket A — Product Truth Features

These are the features that make Sunbreak feel like the product it wants to become.

1. Inline, non-blocking prompt safety
2. Smart reversible masking
3. Context-aware detection
4. Company-specific classification
5. Recovery flow after accidental send
6. Provider/account safety guidance

If these are strong, the product thesis is strong.

## Bucket B — Trust and Adoption Features

1. First-run onboarding
2. Try-it sandbox
3. Explanation and "why flagged"
4. Glanceable popup
5. Lightweight learning content where it directly helps usage

These features make users keep the extension on.

## Bucket C — Operational Tuning Features

1. Detector toggles
2. Sensitivity tuning
3. Allowlists
4. Notification preferences
5. Scan trigger preferences

These matter, but they should not dominate early roadmap energy.

## Bucket D — Strategic Expansion Features

1. Compliance reporting foundation
2. Multi-browser support
3. Advanced local models
4. Connector awareness
5. Agent/workflow protection

These should stay clearly separate from the core build.

---

## Recommended Roadmap Rewrite

Below is the version I would actually build toward.

## Phase 1 — Finish Core Experience

This is close to your current Milestone 1, but the framing matters.

Ship a clean, trustworthy base:

- fix widget placement and reliability
- complete the design system cleanup
- make disabled state behavior unambiguous
- ensure inline UX feels stable and quiet

Goal:

> "Sunbreak feels polished and never gets in the way when nothing is wrong."

## Phase 2 — Make Detection Meaningfully Better

- context-aware scoring
- confidentiality markers
- financial/law/HR/security/code context patterns
- confidence/explanation surface in UI

Goal:

> "Sunbreak catches more of what actually matters and explains why."

## Phase 3 — Make It Actually Useful In Workflow

- smart reversible masking
- fix/ignore/fix-all patterns
- restore-on-copy flow
- upgraded recovery flow
- activity review for recent risky sends

Goal:

> "Sunbreak doesn’t just warn me. It helps me keep working safely."

## Phase 4 — Make It Feel Personal And Company-Aware

- company-specific pattern library
- custom regex and labels
- JSON import/export
- provider/account safety guidance
- setup checklists for ChatGPT, Claude, Gemini

Goal:

> "Sunbreak understands both my workflow and my company context."

## Phase 5 — Add Carefully Chosen Controls

- detector category toggles
- sensitivity controls
- allowlists
- selective notification preferences

Goal:

> "Advanced users can tune Sunbreak without overwhelming everyone else."

## Phase 6 — Expand Trust, Distribution, And Strategic Surface

- glanceable popup refinement
- limited learning hub
- multi-browser expansion where worthwhile
- compliance data foundation
- groundwork for future local models and connector awareness

Goal:

> "Sunbreak becomes a credible platform, not just a single workflow tool."

---

## Concrete User Journeys To Build Around

These are the journeys that should drive prioritization and design reviews.

## Journey 1 — The Careful Professional

Persona:

- consultant, marketer, PM, analyst
- uses AI constantly for drafting and summarization
- wants speed, not policy friction

Flow:

1. pastes work content into AI tool
2. Sunbreak quietly flags 2 issues inline
3. user sees why they are risky
4. user fixes them in one click with descriptive masking
5. AI still gives useful output
6. if they copy the result, Sunbreak offers restore

Why this matters:

- this is the daily habit-forming loop
- if this works beautifully, Sunbreak earns adoption

## Journey 2 — The "Oh No, I Sent It" Moment

Persona:

- anyone

Flow:

1. user sends sensitive content anyway
2. Sunbreak logs the event locally
3. user opens recovery view
4. Sunbreak gives immediate next actions:
  - what was risky
  - provider-specific deletion/settings path
  - what to change next time
5. user feels helped instead of blamed

Why this matters:

- high emotional leverage
- strong trust-builder
- under-served by current products

## Journey 3 — The Security-Conscious Team Evaluator

Persona:

- security champion, IT lead, privacy lead, startup founder
- trying the tool before broader rollout

Flow:

1. installs extension
2. tests company-specific patterns
3. imports internal codename/account ID patterns
4. sees Sunbreak catch both generic and company-specific exposures
5. sees that data stays local
6. believes this could work for the team

Why this matters:

- this is the bridge from personal use to organizational value

## Journey 4 — The Provider-Confused User

Persona:

- employee who uses multiple AI tools
- unclear on privacy settings and retention differences

Flow:

1. visits ChatGPT/Claude/Gemini
2. Sunbreak shows one subtle provider/account risk note or setup checklist
3. user adjusts settings once
4. Sunbreak becomes the memory aid for "am I using this safely?"

Why this matters:

- this extends value beyond prompt scanning
- it creates ongoing utility even when no content is flagged
- it aligns with the real complexity documented by OpenAI, Google, and Anthropic

## Journey 5 — The Developer With Real Secrets Nearby

Persona:

- engineer using AI for code help

Flow:

1. pastes stack trace or code snippet
2. Sunbreak identifies token, internal hostname, env var, or company pattern
3. explains what is risky
4. offers safe rewrite/masking
5. user keeps the debugging task intact

Why this matters:

- developers are a strong early wedge
- secrets and internal infra are high-value categories

---

## Additional Use Cases Worth Explicitly Adding

These are specific scenarios that deserve to be visible in the roadmap, not only implied.

- Summarizing internal email threads for AI assistance
- Turning meeting notes into action items without leaking names or deals
- Asking AI for help with contracts or legal drafts without waiving privilege
- Using AI to rewrite performance feedback or HR notes safely
- Pasting logs, stack traces, or config fragments for engineering help
- Uploading screenshots or screenshots pasted from clipboard
- Working across multiple AI tools and forgetting which settings are safer
- Using AI from a personal account on a work machine

---

## What To Deprioritize Or Narrow

These are not bad ideas. They are just lower leverage right now.

## 1. Full AI Adoption Hub

Role-based guides, content hubs, and prompt template libraries are directionally attractive, but too broad for the current stage.

Recommendation:

- keep a narrow "tips and setup guidance" layer
- do not invest heavily in a large learning content surface yet

## 2. Broad notification and scan-mode permutations

Users do not need a matrix of modes early.

Recommendation:

- keep only a small number of settings that correspond to real behavior differences

## 3. Multi-browser support as a product priority

This may matter commercially, but it does not sharpen the product.

Recommendation:

- treat this as distribution work, not roadmap-defining product work

## 4. Compliance reporting as a near-term user-facing feature

The storage foundation is fine to preserve, but reports are not part of the core employee-first truth.

Recommendation:

- keep metadata clean
- do not let reporting pull product energy too early

---

## Strategic Product Risks

These are the main ways the roadmap could still go wrong.

## 1. Becoming "security settings plus dashboard"

This is the largest risk.

If Sunbreak feels mostly like:

- toggles
- logs
- severity controls
- future enterprise hooks

then the employee-first differentiation collapses.

## 2. Solving too much with detection sophistication alone

Better detection helps, but it is not enough.

Users remember:

- whether the tool helped them complete the task
- whether it embarrassed them
- whether it slowed them down

not just whether the classifier got smarter.

## 3. Shipping too much "learn" content and too little in-context help

Static content hubs are easy to imagine and slow to prove valuable.
In-context help compounds much faster.

## 4. Expanding scope before nailing the daily loop

If the core loop is not strong:

- detect
- explain
- fix safely
- continue working

then every adjacent feature is premature.

---

## My Recommended Priorities, In Order

If I were forcing the roadmap into a harder order, it would be:

1. Finish the stable inline UX and widget reliability work
2. Ship context-aware detection with clear explanations
3. Ship smart reversible masking
4. Ship company-specific patterns and import/export
5. Ship a real accidental-send recovery flow
6. Ship provider/account safety guidance
7. Add light onboarding and sandbox
8. Add only the minimum useful configuration controls
9. Add popup/dashboard refinements as support surfaces
10. Keep advanced learning, multi-browser, compliance reporting, and local models behind that

---

## Bottom Line

The brainstorm did not get lost because the ideas were weak. It got lost because the roadmap compressed product strategy into a milestone checklist.

The companion brainstorm is still the right directional correction.

The strongest version of Sunbreak is:

- not a stricter blocker
- not a broader detector
- not a dashboard-heavy governance tool

It is a **trusted in-browser AI safety companion** that:

- catches risky content
- helps the user keep working
- teaches safer behavior in context
- understands company-specific reality
- builds a bridge from individual adoption to organizational value

That is the product worth steering the roadmap back toward.

---

## External References

- Chrome built-in AI and on-device model direction:
  - [https://developer.chrome.com/blog/ai-chromebook-plus](https://developer.chrome.com/blog/ai-chromebook-plus)
  - [https://developer.chrome.com/blog/gemini-nano-cpu-support](https://developer.chrome.com/blog/gemini-nano-cpu-support)
- OpenAI Help Center:
  - [https://help.openai.com/en/articles/8914046-temporary-chat-faq](https://help.openai.com/en/articles/8914046-temporary-chat-faq)
  - [https://help.openai.com/en/articles/8590148-memory-faq](https://help.openai.com/en/articles/8590148-memory-faq)
  - [https://help.openai.com/en/articles/8983778-chat-and-file-retention-policies-in-chatgpt](https://help.openai.com/en/articles/8983778-chat-and-file-retention-policies-in-chatgpt)
  - [https://help.openai.com/en/articles/5722486-how-your-data-is-used-to-improve-model-performance](https://help.openai.com/en/articles/5722486-how-your-data-is-used-to-improve-model-performance)
- Google support:
  - [https://support.google.com/gemini/answer/13594961](https://support.google.com/gemini/answer/13594961)
- Anthropic privacy and support docs:
  - [https://docs.anthropic.com/en/docs/claude-code/data-usage](https://docs.anthropic.com/en/docs/claude-code/data-usage)
  - [https://privacy.anthropic.com/en/articles/7996868-i-want-to-opt-out-of-my-prompts-and-results-being-used-for-training-models](https://privacy.anthropic.com/en/articles/7996868-i-want-to-opt-out-of-my-prompts-and-results-being-used-for-training-models)
  - [https://support.anthropic.com/en/articles/9450526-how-can-i-export-my-claude-data](https://support.anthropic.com/en/articles/9450526-how-can-i-export-my-claude-data)
  - [https://support.anthropic.com/en/articles/10440198-custom-data-retention-controls-for-claude-enterprise](https://support.anthropic.com/en/articles/10440198-custom-data-retention-controls-for-claude-enterprise)
  - [https://privacy.anthropic.com/en/articles/10030352-what-personal-data-will-be-processed-by-computer-use](https://privacy.anthropic.com/en/articles/10030352-what-personal-data-will-be-processed-by-computer-use)
- Adjacent market positioning:
  - [https://www.harmonic.security/](https://www.harmonic.security/)
  - [https://www.nightfall.ai/blog/introducing-nightfall-for-genai](https://www.nightfall.ai/blog/introducing-nightfall-for-genai)

