---
status: pending
priority: p3
issue_id: "018"
tags: [code-review, security]
dependencies: []
---

# Add CSP meta tag to landing pages

## Problem Statement

Landing pages have no Content Security Policy. Since they are static HTML with no JS, the practical risk is near zero, but a CSP header would be good defense in depth if deployed to a web host.

## Findings

- **Source:** security-sentinel
- **Files:** `landing/index.html`, `landing/privacy.html`

## Proposed Solutions

Add to both landing pages:
```html
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src 'self'">
```

## Acceptance Criteria

- [ ] Both landing pages include CSP meta tag
