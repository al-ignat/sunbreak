# Implementation Plan

## Phase 1: Scaffolding (Sessions 1-2)
- [ ] Project setup: Vite + CRXJS + TypeScript + Preact
- [ ] Manifest V3 configuration with host permissions
- [ ] Build pipeline: dev and production builds work
- [ ] Extension loads in Chrome without errors
- [ ] Content script injects into ChatGPT page
- [ ] Content script injects into Claude page
- [ ] Content script injects into Gemini page
- [ ] DOM research documented in docs/DOM-RESEARCH.md

## Phase 2: DOM Observation (Sessions 3-4)
- [ ] ChatGPT adapter: identify input element, capture text
- [ ] Claude adapter: identify ProseMirror editor, capture text
- [ ] Gemini adapter: identify input element, capture text
- [ ] Submission interception: capture before send on each tool
- [ ] File upload detection (warn on any file upload)

## Phase 3: Classification Engine (Sessions 5-7)
- [ ] Email pattern detector + tests
- [ ] Phone number detector + tests
- [ ] Credit card detector (with Luhn validation) + tests
- [ ] SSN / CPR / NI number detector + tests
- [ ] IP address detector + tests
- [ ] API key / token detector + tests
- [ ] Custom keyword list matcher + tests
- [ ] Classification engine orchestrator + tests
- [ ] Confidence scoring (HIGH / MEDIUM / LOW)

## Phase 4: Overlay UI (Sessions 8-10)
- [ ] Shadow DOM container injected into AI tool pages
- [ ] Warning banner component (shows what was detected)
- [ ] Highlight detected items in prompt text
- [ ] Redact & Send button (replaces with placeholders)
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

## Phase 6: Integration & Polish (Sessions 13-15)
- [ ] End-to-end flow: type prompt -> detect -> warn -> redact -> send
- [ ] Cross-tool testing on all three AI tools
- [ ] Performance: < 50ms classification latency
- [ ] No host page breakage after 30 min of use
- [ ] Chrome Web Store manifest requirements met
- [ ] Landing page (simple HTML)
