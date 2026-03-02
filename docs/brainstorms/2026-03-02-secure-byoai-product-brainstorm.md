---
date: 2026-03-02
topic: secure-byoai-product
---

# Secure BYOAI — Product Brainstorm

## What We're Building

A Chrome browser extension (Manifest V3) that detects sensitive data in user prompts before they are sent to AI tools (ChatGPT, Claude, Gemini). It warns the user and offers one-click redaction. All classification happens locally in the browser. No data is ever sent to any server.

The product sits in the whitespace between "ban all personal AI" and "allow everything unmonitored." It's the first platform-agnostic tool that makes personal AI accounts safe for enterprise use by building from the employee's side, not the security team's side.

## Why This Approach

### Approaches Considered

1. **Enterprise security tool** (top-down, CISO-facing) — What Harmonic, Acuvity, Nightfall all build. Monitoring and blocking. Employee is a subject.
2. **Enterprise AI platform replacement** (Microsoft Copilot BYOAI model) — Replace personal tools with sanctioned ones. Platform-locked.
3. **Employee-first browser extension** (chosen) — Lightweight, platform-agnostic, local-only classification. Employee is the user. Enterprise gets aggregate visibility without surveillance.

### Why Approach 3

- Every competitor is enterprise-down. Nobody builds employee-first. This is the whitespace.
- Platform lock-in fails: employees use 5+ AI tools. No single vendor governs competitors.
- On-device classification is the strongest privacy guarantee — differentiator against cloud-proxy solutions.
- Browser extension deploys in minutes (vs. weeks for endpoint agents). Lowest friction.
- Grammarly-like UX builds trust and voluntary adoption, which is the bottoms-up GTM engine.

## Key Decisions

- **v1 is regex-only classification**: No ML/SLM. Ship fast, prove the concept. ML comes in v2.
- **v1 is personal use only**: No cloud backend, no enterprise admin console. Free for individuals.
- **Chrome only**: No Firefox/Safari/Edge in v1. Chrome has the largest market share.
- **Warning, not blocking**: User can always "Send Anyway." Respectful, not hostile.
- **Zero UI when clean**: Extension is invisible when nothing is detected. No friction for compliant prompts.
- **Shadow DOM isolation**: All injected UI lives in closed Shadow DOM. Cannot break host pages.
- **Local-only storage**: Only metadata stored (counts, categories, timestamps). Never prompt content.
- **Preact, not React**: Extension needs to be tiny. Preact gives component model at 3KB.
- **WXT framework**: Chosen over CRXJS (which nearly got archived in 2025). WXT has 9,300 stars, 216 contributors, weekly releases. File-based entrypoints, built-in Shadow DOM UI support, auto-reload dev mode.
- **Result<T, E> pattern**: No try/catch. Typed error handling throughout.
- **Pure function classifiers**: No side effects. Easy to test. Each detector is `(text: string) => Finding[]`.

## Scope Boundaries

### In v1
- Chrome extension (Manifest V3)
- ChatGPT, Claude, Gemini web interfaces
- Regex detectors: email, phone, credit card (Luhn), SSN/CPR/NI, IP address, API keys
- Custom keyword lists (user-configurable)
- Warning overlay with: Redact & Send, Edit, Send Anyway, Cancel
- Personal dashboard: stats, flagged event log, settings, AI tool report cards
- File upload warning (no content analysis)

### Explicitly NOT in v1
- Firefox, Safari, Edge, Arc
- On-device SLM/ML classification
- Cloud backend or control plane
- Enterprise admin console
- Response/output monitoring
- API-level interception
- Auto-redaction with semantic preservation
- SIEM/SOAR integration, SSO/SCIM
- Multi-language PII detection (English-focused, with Danish CPR and UK NI as exceptions)

## Quality Bars (Non-Negotiable)

- False positive rate < 2% (1 in 50 prompts max)
- Classification latency < 50ms
- Page load increase < 100ms
- Zero network requests from extension (verify with DevTools)
- Works on all three AI tools without breaking them
- WCAG AA accessible

## Target Users

- **Primary (v1):** Individual knowledge workers who use personal AI tools at work
- **Secondary (v2+):** CISOs/CIOs who want aggregate governance visibility
- **Design philosophy:** Grammarly, not CrowdStrike. Employee-first. Helpful, not hostile.

## Technical Architecture Summary

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Build | Vite + CRXJS | Extension bundling, HMR |
| Language | TypeScript (strict) | Type safety |
| UI Framework | Preact | Lightweight components |
| Testing | Vitest + Playwright | Unit + E2E |
| Storage | chrome.storage.local | Stats and settings |
| UI Isolation | Shadow DOM (closed) | Style and DOM isolation |

## Open Questions

*None remaining — founding documentation resolved all major product and technical decisions. Open questions will emerge during implementation and should be captured in docs/solutions/.*

## Founding Documentation

All original research and planning documents are preserved in `docs/founding/`:

| File | Contents |
|------|----------|
| `founding-CLAUDE.md` | Original project instructions |
| `founding-SPEC.md` | Full 6-section product specification |
| `founding-PLAN.md` | Phase-based implementation checklist |
| `founding-01-product-deep-dive.md` | Market analysis, competitive landscape, GTM, buyer personas |
| `founding-02-execution-plan.md` | 3-workstream execution plan (interviews, MVP, pitch) |
| `founding-03-implementation-guide.md` | Session-by-session Claude Code building guide |

## Next Steps

-> `/ce:plan` to create a detailed implementation plan for Phase 1 (scaffolding)
