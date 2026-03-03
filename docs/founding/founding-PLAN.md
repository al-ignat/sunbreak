# Implementation Plan

## Phase 1: Scaffolding (Sessions 1-2)
- [x] Project setup: Vite + CRXJS + TypeScript + Preact
- [x] Manifest V3 configuration with host permissions
- [x] Build pipeline: dev and production builds work
- [x] Extension loads in Chrome without errors
- [x] Content script injects into ChatGPT page
- [x] Content script injects into Claude page
- [x] Content script injects into Gemini page
- [x] DOM research documented in docs/DOM-RESEARCH.md

## Phase 2: DOM Observation (Sessions 3-4)
- [x] ChatGPT adapter: identify input element, capture text
- [x] Claude adapter: identify ProseMirror editor, capture text
- [x] Gemini adapter: identify input element, capture text
- [x] Submission interception: capture before send on each tool
- [x] File upload detection (warn on any file upload)

## Phase 3: Classification Engine (Sessions 5-7)
- [x] Email pattern detector + tests
- [x] Phone number detector + tests
- [x] Credit card detector (with Luhn validation) + tests
- [x] SSN / CPR / NI number detector + tests
- [x] IP address detector + tests
- [x] API key / token detector + tests
- [x] Custom keyword list matcher + tests
- [x] Classification engine orchestrator + tests
- [x] Confidence scoring (HIGH / MEDIUM / LOW)

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
- [x] Storage layer for anonymised stats
- [x] Extension popup: quick stats view
- [x] Full dashboard page: weekly/monthly stats
- [x] Flagged event log (metadata only, no content)
- [x] Settings panel: toggle detection categories
- [x] Settings panel: manage custom keyword lists
- [x] AI Tool Report Cards (static info page)

## Phase 6: Integration & Polish (Sessions 13-15)
- [ ] End-to-end flow: type prompt -> detect -> warn -> redact -> send
- [ ] Cross-tool testing on all three AI tools
- [ ] Performance: < 50ms classification latency
- [ ] No host page breakage after 30 min of use
- [ ] Chrome Web Store manifest requirements met
- [ ] Landing page (simple HTML)
