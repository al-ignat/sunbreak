---
status: complete
priority: p2
issue_id: "014"
tags: [code-review, security, quality]
dependencies: []
---

# Privacy policy: placeholder email and missing chatgpt.com domain

## Problem Statement

Two issues in the privacy policy that must be fixed before Chrome Web Store submission:
1. Contact email uses `privacy@sunbreak.example.com` (IANA reserved domain — emails go nowhere)
2. Supported sites list mentions `chat.openai.com` but omits `chatgpt.com`, which the manifest also covers

## Findings

- **Source:** security-sentinel, kieran-typescript-reviewer
- **Files:** `landing/privacy.html`
- **Evidence:** manifest host_permissions includes both `*://chatgpt.com/*` and `*://chat.openai.com/*`, but privacy policy only lists `chat.openai.com`

## Proposed Solutions

1. Replace placeholder email with real contact address (user must provide)
2. Add `chatgpt.com` to the privacy policy's supported sites list

## Acceptance Criteria

- [ ] Privacy policy contact email is a real, functional address
- [ ] Privacy policy lists all domains from manifest host_permissions
