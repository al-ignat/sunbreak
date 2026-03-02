---
status: complete
priority: p2
issue_id: "005"
tags: [code-review, security]
dependencies: []
---

# .gitignore missing preventive patterns for secrets

## Problem Statement

`.gitignore` does not include `.env*`, `*.pem`, or `*.key` patterns. While no such files exist yet, adding these patterns preemptively prevents accidental commits of environment files or Chrome extension signing keys as the project grows.

## Findings

- **Source:** Security sentinel
- **File:** `.gitignore`
- **Evidence:** Only ignores `node_modules/`, `.output/`, `.wxt/`, `dist/`, `*.DS_Store`

## Proposed Solutions

### Option A: Add preventive patterns (Recommended)
Add to `.gitignore`:
```
.env*
*.pem
*.key
```
- **Effort:** Small
- **Risk:** None

## Acceptance Criteria

- [ ] `.env*`, `*.pem`, `*.key` added to `.gitignore`

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-02 | Created from code review | |
