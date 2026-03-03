---
status: pending
priority: p2
issue_id: "016"
tags: [code-review, testing]
dependencies: []
---

# E2E tests need more interactive coverage

## Problem Statement

E2E tests cover structural rendering (pages load, elements visible, tabs switch) but miss interactive features. Only 12 of 24 testable user capabilities have coverage (50%). The highest-value gaps are Settings panel interactions, Keyword Manager CRUD, and popup-to-dashboard navigation.

## Findings

- **Source:** agent-native-reviewer
- **Key gaps:**
  - Settings: extension enable/disable toggle (untested)
  - Settings: intervention mode dropdown (untested)
  - Keywords: add/remove keyword (untested)
  - Popup: "View full dashboard" button click → new tab (visibility only, not navigation)
  - Dashboard: detection toggles checked for visibility but not toggled
  - Activity Log: filter controls not tested
  - Overview: chart period toggle not tested

## Proposed Solutions

Add tests for the top 3 gaps:
1. Settings panel: toggle extension enabled, change intervention mode
2. Keyword Manager: add keyword, verify it appears, remove it
3. Popup navigation: click "View full dashboard", verify new tab opens

## Acceptance Criteria

- [ ] Settings enable/disable toggle tested
- [ ] Settings intervention mode change tested
- [ ] Keyword add/remove tested
- [ ] Popup dashboard link navigation tested
- [ ] E2E capability coverage >= 65%
