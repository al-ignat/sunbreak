**Secure BYOAI**

Claude Code Implementation Plan

A session-by-session guide for building the Chrome extension MVP

Designed for a non-tech builder using Claude Code

February 2026

# Section 1: How Claude Code Actually Works (For You)

Before touching any code, you need a mental model of what Claude Code is and isn’t. This will save you days of frustration.

## 1.1 The Mental Model

**Claude Code is a junior developer who is incredibly fast, has no memory between sessions, and will confidently build the wrong thing if you don’t give clear direction.**

Every time you start a new session (a new chat in the terminal), Claude starts from zero. It doesn’t remember what you built yesterday. It doesn’t know your project exists until it reads files. The only things that persist between sessions are:

- **Your code files **(committed to git)
- **CLAUDE.md **(the instruction file Claude reads on startup)
- **Documentation files **(specs, plans, notes you’ve written)

This means your workflow is fundamentally about managing context: what Claude knows at any given moment. Everything in this guide is designed around that constraint.

## 1.2 The Rules That Will Save You

**Rule 1: One session, one task. **Never ask Claude to “build the whole extension.” Ask it to build one component. When that’s done, commit, start a fresh session, build the next component. A session that tries to do too much will degrade as the context window fills up with old conversation.

**Rule 2: Plan before you build. **Every session starts with Claude reading the spec and making a plan. You review the plan. Only then does it write code. Use Shift+Tab twice to enter Plan Mode, which makes Claude read-only — it can explore and think but can’t change files.

**Rule 3: Commit after every working change. **Git is your safety net. If Claude breaks something in the next session, you can revert. Commit early, commit often. Claude can run git commands for you.

**Rule 4: Course-correct immediately. **The moment Claude starts going in a wrong direction, press Escape to stop it. Use /rewind to go back to a previous state. Don’t let it dig a hole — it’s faster to restart than to fix a bad path.

**Rule 5: CLAUDE.md is your most important file. **This file is Claude’s “memory.” It reads it at the start of every session. Everything Claude needs to know about your project, your standards, and your workflow goes here. We’ll write it together.

# Section 2: Prerequisites (Do This First)

## 2.1 Install Everything

You need four things installed before you start. Claude Code can help you install some of these if you get stuck.

| **Tool**           | **What It Is**                                                                  | **How to Install**                                                                              |
| ------------------ | ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Node.js (v20+)     | JavaScript runtime. Required for Claude Code and for the extension build tools. | Download from nodejs.org. Choose the LTS version. Run: node --version to verify.                |
| Git                | Version control. Your safety net.                                               | Likely already installed. Run: git --version. If not, download from git-scm.com.                |
| Claude Code        | The AI coding agent.                                                            | Run: npm install -g @anthropic-ai/claude-code. You need a Claude Max subscription or API key.   |
| VS Code (optional) | Code editor for reviewing what Claude builds.                                   | Download from code.visualstudio.com. Not strictly required but very helpful for reviewing code. |

## 2.2 Create the Project

Open your terminal and run these commands:

mkdir secure-byoai

cd secure-byoai

git init

npm init -y

code .          # Opens VS Code if you have it

## 2.3 Verify Claude Code Works

In the same directory, run:

claude

You should see Claude’s terminal interface. Type “hi” and make sure it responds. Then type /exit to close. If this doesn’t work, check that your API key is configured or that your Claude Max subscription is active.

# Section 3: The Files You Create Before Claude Writes Code

This is the most important section. These files are what separate successful Claude Code projects from chaos. You create them by hand (or with Claude’s help in a planning session), and they guide every coding session after.

## 3.1 CLAUDE.md — Claude’s Project Brain

Create this file at the root of your project. Claude reads it automatically at the start of every session. Keep it under 150 lines. Here’s yours:

# Secure BYOAI — Chrome Extension

## What This Is

A Chrome extension (Manifest V3) that detects sensitive data in user

prompts before they are sent to AI tools (ChatGPT, Claude, Gemini).

It warns the user and offers one-click redaction. All classification

happens locally in the browser. No data is ever sent to any server.

## Tech Stack

- TypeScript (strict mode)

- Chrome Extension Manifest V3

- Vite + CRXJS for building

- Preact for UI components (NOT React — too heavy for extensions)

- Vitest for unit tests

- Playwright for E2E tests against real AI tool pages

## Project Structure

src/

  background/      # Service worker (Manifest V3 requirement)

  content/          # Content scripts injected into AI tool pages

    sites/          # Per-site adapters (chatgpt.ts, claude.ts, gemini.ts)

    observer.ts     # DOM observation and prompt capture

    interceptor.ts  # Submission interception

  classifier/       # All detection logic

    patterns/       # Regex patterns (email, cc, ssn, etc.)

    keywords.ts     # Custom keyword list matching

    engine.ts       # Orchestrates all classifiers, returns findings

  ui/               # Preact components for overlay and dashboard

    overlay/        # Warning overlay shown in AI tool pages

    dashboard/      # Extension popup and full dashboard

  storage/          # chrome.storage.local wrapper

  types/            # Shared TypeScript types

tests/

  unit/             # Vitest tests for classifiers and logic

  e2e/              # Playwright tests against AI tool pages

## Commands

- npm run dev         # Start dev build with HMR

- npm run build       # Production build to dist/

- npm run test        # Run Vitest unit tests

- npm run test:e2e    # Run Playwright E2E tests

- npm run lint        # ESLint check

## Code Style

- Use named exports, not default exports (except Preact components)

- Use ES modules (import/export), never require()

- All functions must have TypeScript return types

- No `any` types. Use `unknown` and narrow.

- Prefer functions over classes

- Errors: use typed ResultT, E pattern, not try/catch

## Architecture Rules

- NEVER send prompt content to any external server. Everything local.

- Content scripts must not break the host page (AI tool).

- Use Shadow DOM for all injected UI to isolate styles.

- Each AI tool site adapter is independent. Shared logic in observer.ts.

- Classifier engine is pure functions. No side effects. Easy to test.

- Storage layer abstracts chrome.storage.local. No direct chrome API

  calls outside storage/ directory.

## Key Decisions

- v1 is regex-only classification. No ML models. Ship fast.

- v1 is personal use only. No cloud backend. No admin console.

- Warning overlay, not block screen. User can always Send Anyway.

- Zero UI when nothing detected. Extension is invisible when clean.

## Testing Requirements

- Every classifier pattern needs: 5 true positives, 5 true negatives.

- E2E tests confirm extension loads on each AI tool without breaking it.

- Run `npm run test` before every commit.

## Current Status

Track progress in docs/PLAN.md. Update this after each session.

## Git Workflow

- Branch per feature: feat/classifier-email, feat/overlay-ui, etc.

- Commit after each working component. Messages: type(scope): description

- Never commit directly to main. Always PR from feature branch.

## 3.2 SPEC.md — The Product Specification

Create docs/SPEC.md. This is the detailed specification Claude references when building each component. It should contain the full product specification from our earlier work: what the extension does, how each component works, the quality bars. Point Claude to it with: “See @docs/SPEC.md for the full product specification.”

The spec should include the four component descriptions from the MVP plan (Content Observer, Classification Engine, Intervention UI, Personal Dashboard), the supported AI tools and their DOM structures, the detection categories and their regex patterns, the overlay UI behavior, and the dashboard metrics. We’ve already defined all of this. You copy it into SPEC.md as a markdown document.

## 3.3 docs/PLAN.md — The Living Progress Tracker

This is your checklist. You update it after every session. Claude reads it to know what’s done and what’s next.

# Implementation Plan

## Phase 1: Scaffolding (Sessions 1-2)

- [ ] Project setup: Vite + CRXJS + TypeScript + Preact

- [ ] Manifest V3 configuration with host permissions

- [ ] Build pipeline: dev and production builds work

- [ ] Extension loads in Chrome without errors

- [ ] Content script injects into ChatGPT page

- [ ] Content script injects into Claude page

- [ ] Content script injects into Gemini page

## Phase 2: DOM Observation (Sessions 3-4)

- [ ] ChatGPT adapter: identify input element, capture text

- [ ] Claude adapter: identify ProseMirror editor, capture text

- [ ] Gemini adapter: identify input element, capture text

- [ ] Submission interception: capture before send on each tool

- [ ] File upload detection (warn on any file upload)

## Phase 3: Classification Engine (Sessions 5-7)

- [ ] Email pattern detector + tests

- [ ] Credit card detector (with Luhn validation) + tests

- [ ] SSN / CPR / NI number detector + tests

- [ ] Phone number detector + tests

- [ ] IP address detector + tests

- [ ] API key / token detector + tests

- [ ] Custom keyword list matcher + tests

- [ ] Classification engine orchestrator + tests

- [ ] Confidence scoring (HIGH / MEDIUM / LOW)

## Phase 4: Overlay UI (Sessions 8-10)

- [ ] Shadow DOM container injected into AI tool pages

- [ ] Warning banner component (shows what was detected)

- [ ] Highlight detected items in prompt text

- [ ] Redact  Send button (replaces with placeholders)

- [ ] Edit button (returns focus to input)

- [ ] Send Anyway button (logs acknowledgment)

- [ ] Cancel button

- [ ] Zero-interference: invisible when nothing detected

- [ ] Visual design: helpful, not hostile. Grammarly-like.

## Phase 5: Dashboard (Sessions 11-12)

- [ ] Storage layer for anonymised stats

- [ ] Extension popup: quick stats view

- [ ] Full dashboard page: weekly/monthly stats

- [ ] Flagged event log (metadata only, no content)

- [ ] Settings panel: toggle detection categories

- [ ] Settings panel: manage custom keyword lists

- [ ] AI Tool Report Cards (static info page)

## Phase 6: Integration  Polish (Sessions 13-15)

- [ ] End-to-end flow: type prompt - detect - warn - redact - send

- [ ] Cross-tool testing on all three AI tools

- [ ] Performance:  50ms classification latency

- [ ] No host page breakage after 30 min of use

- [ ] Chrome Web Store manifest requirements met

- [ ] Landing page (simple HTML)

## 3.4 .claude/skills/ — Teaching Claude Your Patterns

Skills are instruction files that Claude loads when relevant. Create these before you start coding:

**.claude/skills/chrome-extension/SKILL.md**

This teaches Claude Chrome extension specifics it might get wrong:

---

name: chrome-extension

description: Chrome Manifest V3 extension patterns and constraints.

---

# Chrome Extension Patterns

## Manifest V3 Rules

- Service workers replace background pages. No persistent state.

- Use chrome.storage.local, not localStorage (not available in SW).

- Content scripts run in isolated world by default.

- Use Shadow DOM for injected UI to prevent style leakage.

- Host permissions must be declared in manifest.json.

## Content Script Injection

- Match patterns: *://chatgpt.com/*, *://claude.ai/*,

  *://gemini.google.com/*

- content_scripts in manifest, not programmatic injection for v1.

- Each AI tool has different DOM structure. Use site adapters.

## Common Mistakes to Avoid

- Do NOT use document.execCommand (deprecated).

- Do NOT modify the host pages event listeners.

- Do NOT use eval() or inline scripts (CSP violation).

- Do NOT use XMLHttpRequest (use fetch in service worker).

- Do NOT assume DOM structure is stable. AI tools update frequently.

  Use resilient selectors with fallbacks.

**.claude/skills/testing/SKILL.md**

---

name: testing

description: Testing patterns for this project.

---

# Testing Patterns

## Classifier Tests

Every regex pattern needs at minimum:

- 5 true positive cases (should detect)

- 5 true negative cases (should NOT detect)

- Edge cases: empty string, very long string, unicode

## Test File Location

Unit test for src/classifier/patterns/email.ts goes in

tests/unit/classifier/patterns/email.test.ts

## Test Commands

- Single test: npx vitest run tests/unit/classifier/patterns/email.test.ts

- All tests: npm run test

- Watch mode: npx vitest watch

# Section 4: Session-by-Session Implementation Guide

This is the actual work. Each “session” is one Claude Code conversation focused on one task. You start Claude Code, give it the prompt below, review its plan, let it build, test, commit, and close the session. Fresh context for the next one.

## Session 1: Project Scaffolding

**Goal: **Working build pipeline. Extension loads in Chrome.

**Time estimate: **30-60 minutes.

**Before you start: **Make sure CLAUDE.md, docs/SPEC.md, and docs/PLAN.md exist.

**The Prompt**

Start Claude Code in your project directory and give it this prompt:

Set up the project scaffolding for a Chrome Manifest V3 extension. Read CLAUDE.md for the full project context and docs/SPEC.md for the product spec.

I need: Vite + CRXJS + TypeScript + Preact configured. A manifest.json with host permissions for ChatGPT, Claude, and Gemini. A minimal content script that logs BYOAI loaded to the console on each AI tool page. A service worker that does nothing yet. The extension should load in Chrome via chrome://extensions with no errors.

Make a plan first. Dont write code until I approve the plan.

**What to Watch For**

- Claude should propose installing specific npm packages. Verify it uses @crxjs/vite-plugin for the extension build.
- The manifest.json should have content_scripts with matches for the three AI tool domains.
- If Claude suggests React instead of Preact, stop it. The CLAUDE.md says Preact.

**How to Test**

- Run npm run dev. It should build without errors.
- Open Chrome, go to chrome://extensions, enable Developer Mode, click “Load unpacked” and point to the dist/ folder.
- Open chatgpt.com, claude.ai, and gemini.google.com. Open DevTools console. You should see “BYOAI loaded” on each.

**When Done**

Tell Claude: “Commit this as feat(scaffold): initial project setup with Vite + CRXJS + Preact”. Then update docs/PLAN.md to check off the completed items. Close the session.

## Session 2: DOM Research (Use Plan Mode)

**Goal: **Document the exact DOM selectors for each AI tool’s input field.

**Time estimate: **20-40 minutes.

**Mode: **This is a RESEARCH session. Use Plan Mode (Shift+Tab twice) so Claude explores but doesn’t change files.

**The Prompt**

I need to understand the DOM structure of three AI tool pages so I can capture user prompts before submission. Research each tool and write your findings to docs/DOM-RESEARCH.md. For each tool (ChatGPT at chatgpt.com, Claude at claude.ai, Gemini at gemini.google.com) I need: the CSS selector(s) for the main chat input element, whether its a textarea, contenteditable div, or ProseMirror editor, how to detect when the user submits (Enter key, button click, or both), any known quirks or challenges. Use web search to find recent articles or GitHub issues about these DOM structures. They change frequently.

**Why This Matters**

This is the highest-risk technical area of the project. AI tools change their DOM frequently, and a broken selector means the extension silently fails. By doing this research upfront and documenting it, every future session that touches content scripts has a reference to work from.

**Important**

After Claude finishes the research, exit Plan Mode, have Claude write the findings to docs/DOM-RESEARCH.md, and commit. This document becomes a reference for Sessions 3-4.

## Sessions 3-4: Site Adapters and Prompt Capture

**Goal: **Content scripts that capture prompt text on each AI tool.

**Time estimate: **45-60 minutes per session.

**Session 3 Prompt (ChatGPT Adapter)**

Build the ChatGPT site adapter. Read CLAUDE.md for project context, docs/SPEC.md Section 1 for the Content Observer spec, and docs/DOM-RESEARCH.md for the DOM selectors we documented. Create src/content/sites/chatgpt.ts that: finds the chat input element using the selectors from DOM-RESEARCH.md, uses MutationObserver to watch for text changes, intercepts form submission (both Enter key and send button), captures the full prompt text and emits a custom event byoai:prompt-captured with the text. Write tests. The adapter must NOT break ChatGPTs normal functionality. Plan first.

Session 4 follows the same pattern for Claude and Gemini adapters. Each gets its own session for clean context.

## Sessions 5-7: Classification Engine

**Goal: **All PII detectors built and tested.

**Time estimate: **30-45 minutes per session.

This is where Claude Code shines. Regex pattern writing and testing is perfect for AI — it’s well-defined, testable, and Claude is very good at it. Split across sessions by category:

| **Session** | **Detectors**                                                       | **Key Notes**                                                                                                                                                                   |
| ----------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 5           | Email addresses, phone numbers                                      | Email regex is deceptively complex. Tell Claude to use a practical pattern, not RFC 5322 compliant (too many false positives). Phone numbers need international format support. |
| 6           | Credit cards (Luhn), SSN/CPR/NI                                     | Credit card MUST include Luhn checksum validation to avoid false positives on random 16-digit numbers. Danish CPR format: DDMMYY-XXXX.                                          |
| 7           | API keys/tokens, IP addresses, keyword matcher, engine orchestrator | API key patterns for AWS, GitHub, Stripe, Azure. The keyword matcher reads from chrome.storage.local. The engine orchestrator calls all detectors and returns unified findings. |

**Session 5 Prompt (Example)**

Build the email and phone number pattern detectors. Read CLAUDE.md for context and docs/SPEC.md Section 2 for the Classification Engine spec. Create src/classifier/patterns/email.ts and src/classifier/patterns/phone.ts. Each must export a function that takes a string and returns an array of findings: { type, value, startIndex, endIndex, confidence }. Write comprehensive tests with at least 5 true positives and 5 true negatives for each. Include edge cases: emails in sentences, emails with plus signs, phone numbers with different country codes. The email pattern should be practical (catch 95%+ of real emails) not RFC-perfect. Plan first.

## Sessions 8-10: Overlay UI

**Goal: **Warning overlay that appears in AI tool pages when sensitive data is detected.

**Time estimate: **45-60 minutes per session.

This is the user-facing part and needs the most care. The design philosophy from the spec: helpful, not hostile. Think Grammarly’s inline suggestions, not a corporate firewall block page.

**Session 8 Prompt (Shadow DOM Container + Banner)**

Build the overlay UI foundation. Read CLAUDE.md and docs/SPEC.md Section 3. Create a Shadow DOM container that injects into AI tool pages (src/ui/overlay/container.ts). Inside it, build a Preact warning banner component (src/ui/overlay/WarningBanner.tsx) that: appears as a small bar above the chat input, shows a summary like 2 email addresses detected, has a gentle yellow/amber color scheme (not aggressive red), animates in smoothly (200ms fade+slide), includes Redact  Send, Edit, Send Anyway, and Cancel buttons. Style it completely inside the Shadow DOM so it cannot be affected by or affect the host pages CSS. The banner must look good on all three AI tools. Plan first.

Session 9 adds the redaction logic (replacing detected items with [EMAIL_1] etc.) and the text highlighting. Session 10 integrates the overlay with the classifier engine for the full detection-to-warning flow.

## Sessions 11-12: Personal Dashboard

**Goal: **Extension popup and stats dashboard.

Less critical than the overlay but important for the personal value proposition. Session 11 builds the storage layer and extension popup (quick stats). Session 12 builds the full dashboard page with settings and AI tool report cards.

## Sessions 13-15: Integration, Polish, Launch Prep

**Goal: **Everything works end-to-end. Ready for beta.

These sessions are about connecting components, finding bugs, and polishing. The prompts shift from “build X” to “test the full flow on ChatGPT and fix any issues.”

**Session 13 Prompt**

Integration testing. The full flow should work: user types a prompt in ChatGPT containing an email address - classifier detects it - overlay appears - user clicks Redact  Send - email is replaced with [EMAIL_1] - prompt is sent - dashboard records the event. Read CLAUDE.md and docs/PLAN.md for current status. Walk through the flow end-to-end, identify any gaps in the wiring between components, and fix them. Then test on Claude and Gemini. Plan first.

# Section 5: What Will Go Wrong (And How to Handle It)

These are the failure modes I’ve seen. Plan for them now so they don’t derail you.

| **Problem**                    | **What Happens**                                                                                    | **How to Fix It**                                                                                                                                                                                                                      |
| ------------------------------ | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Claude builds the wrong thing  | It misinterprets your prompt and creates something different from the spec.                         | Always start with Read CLAUDE.md and docs/SPEC.md Section X. Always ask for a plan first. Review the plan carefully before saying go.                                                                                                  |
| Context window fills up        | Claude starts forgetting earlier decisions. Code quality degrades. You see a warning about context. | Type /compact to compress the conversation. Or better: commit, close session, start fresh. A new session with clean context is almost always better than continuing a bloated one.                                                     |
| DOM selectors break            | AI tools update their pages and the extension stops working.                                        | This will happen. Its not a bug in your code, its the nature of browser extensions. Keep DOM-RESEARCH.md updated. Build fallback selectors. Consider a selector health-check that warns you when selectors stop matching.              |
| Extension breaks the AI tool   | Your content script interferes with ChatGPT/Claude/Geminis normal operation.                        | Shadow DOM isolation for UI. MutationObserver with disconnect() when not needed. Never modify the host pages DOM except inside your Shadow DOM container. Test by using the AI tool normally for 10 minutes with the extension loaded. |
| False positives overwhelm      | The classifier flags too many things. Users get annoyed.                                            | Start conservative. Only surface HIGH confidence findings in v1. If unsure, log but dont warn. You can always increase sensitivity later. Decreasing it after users are frustrated is much harder.                                     |
| Claude uses wrong patterns     | It generates CommonJS (require), uses React instead of Preact, or ignores your architecture.        | This is what CLAUDE.md is for. If Claude repeatedly ignores a rule, add it more prominently to CLAUDE.md. Also: correct it immediately when you see it. Dont let it continue.                                                          |
| The build fails                | Vite or CRXJS configuration errors. Extension wont load.                                            | Tell Claude: The build fails with this error: [paste error]. Fix it. Claude is excellent at debugging build errors when you give it the exact error message.                                                                           |
| You get stuck between sessions | You dont know what to work on next or how to prompt Claude.                                         | Read docs/PLAN.md. Find the next unchecked item. The prompt formula is always: Read CLAUDE.md and docs/SPEC.md Section X. Build [specific component]. Plan first.                                                                      |

# Section 6: Power Moves (Use When You’re Comfortable)

## 6.1 Subagents for Research

Subagents run in a separate context window. They’re perfect for research tasks that would pollute your main session with irrelevant file reads. Use them like this:

Use a subagent to investigate how ChatGPTs current DOM is structured. Look for the chat input element, the send button, and any form elements. Report back with CSS selectors and any relevant observations about how the page loads.

The subagent explores, reports back, and your main context stays clean for implementation.

## 6.2 Custom Slash Commands

Create .claude/commands/ for repetitive prompts:

**.claude/commands/test-classifier.md**

Run the classifier unit tests and report results.

If any fail, investigate and fix.

Then run the full test suite to make sure nothing else broke.

Now you can just type /test-classifier instead of explaining what you want each time.

**.claude/commands/check-extension.md**

Build the extension with npm run build.

Check for any TypeScript errors.

Verify the manifest.json is valid for Chrome Web Store.

List any warnings or issues.

## 6.3 Hooks for Safety

Hooks run automatically before or after Claude takes actions. Set up a hook to run your linter after every file write:

Run /hooks in Claude Code and create a PostToolUse hook with matcher “Write|Edit” that runs npm run lint. This ensures Claude never commits code that violates your style rules.

## 6.4 The /rewind Lifesaver

If Claude goes down a bad path and you didn’t catch it in time, /rewind lets you go back to any previous point in the conversation and the code. It’s like undo for both the chat and the filesystem. Use it aggressively. The moment something feels wrong, /rewind to the last known good state.

# Section 7: Your Daily Workflow

Here’s what a typical building day looks like:

**Morning (60-90 min): **One or two focused Claude Code sessions.

  - Open docs/PLAN.md. Find the next unchecked item.
  - Start Claude Code in your project directory.
  - Give the session prompt (from this guide or your own based on the pattern).
  - Review Claude’s plan. Approve or adjust.
  - Let Claude build. Watch for deviations.
  - Test the result. Fix any issues.
  - Commit. Update docs/PLAN.md. Close session.

**Afternoon (30 min): **Review and refine.

  - Open the code in VS Code. Read what Claude wrote.
  - Don’t try to understand every line. Focus on: does it match the spec? Does it follow the architecture?
  - Note anything that looks off. Add it to the next session’s prompt.

**Evening (15 min): **Update and reflect.

  - Update CLAUDE.md if you discovered anything Claude needs to know.
  - Update docs/PLAN.md with progress.
  - If Claude repeatedly made the same mistake, add a rule to CLAUDE.md to prevent it.

**The golden rule: **Your job is to direct. Claude’s job is to execute. The better your direction, the better Claude’s output. Everything in this guide exists to make your direction clear, consistent, and persistent across sessions.