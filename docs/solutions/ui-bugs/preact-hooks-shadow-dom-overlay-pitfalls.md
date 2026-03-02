---
title: "Preact Hooks, Shadow DOM, and Overlay Pipeline Pitfalls"
date: 2026-03-03
category: ui-bugs
tags:
  - shadow-dom
  - preact
  - preact-hooks
  - event-interception
  - text-redaction
  - overlay-ui
  - content-scripts
component: "src/ui/overlay/overlay-controller.ts, src/content/interceptor.ts, src/ui/overlay/WarningBanner.tsx"
severity: high
resolved: true
resolution_time: "~3 hours"
---

# Preact Hooks, Shadow DOM, and Overlay Pipeline Pitfalls

Lessons learned building the Phase 4 warning overlay for the Secure BYOAI Chrome extension. These pitfalls affect any project rendering Preact components inside closed Shadow DOM, intercepting browser events with bypass patterns, or performing multi-position text replacement.

## Problems Solved

### 1. Preact Hooks Crash When Component Called as Plain Function

**Problem:** Rendering a Preact component with hooks (`useState`, `useEffect`, `useCallback`) by calling it as a plain function causes a `TypeError: Cannot read properties of null (reading '__H')`.

```typescript
// BROKEN - hooks have no VDOM reconciler context
render(WarningBanner({ findings, onAction: handleAction }), wrapper);
```

**Root cause:** Preact hooks require the VDOM reconciler to manage internal state (`__H` is Preact's hooks state slot). Calling a component as `Component(props)` executes the function body directly, bypassing the reconciler entirely. The hooks try to access `__H` on a null internal fiber node.

**Solution:** Always use `h()` (Preact's `createElement`) to create a VNode that the reconciler can manage:

```typescript
import { render, h } from 'preact';

// CORRECT - hooks get proper reconciler context
render(h(WarningBanner, { findings, onAction: handleAction }), wrapper);
```

**Key insight:** This only manifests when rendering into Shadow DOM because the typical JSX transform (`<WarningBanner ... />`) automatically calls `h()`. When programmatically rendering outside JSX (e.g., in a controller that manages Shadow DOM), you must call `h()` explicitly.

**Detection:** The error message `Cannot read properties of null (reading '__H')` is the telltale sign. It always means a hook is running outside the reconciler.

### 2. Bypass Flag Pattern for Event Re-triggering

**Problem:** When intercepting keyboard/button submission events with `preventDefault()` + `stopImmediatePropagation()`, re-dispatching the same event type after classification causes an infinite loop — the interceptor catches its own re-triggered event.

**Solution:** Use a module-scoped bypass flag with a safety timeout:

```typescript
let bypassNext = false;

const handleKeydown = (e: KeyboardEvent): void => {
  if (bypassNext) {
    bypassNext = false;
    return; // Let the re-triggered event through
  }
  e.preventDefault();
  e.stopImmediatePropagation();
  // ... classify, show overlay, decide ...
};

function triggerKeyboardSubmit(target: HTMLElement): void {
  bypassNext = true;
  const event = new KeyboardEvent('keydown', {
    key: 'Enter',
    code: 'Enter',
    bubbles: true,
    cancelable: true,
  });
  target.dispatchEvent(event);
  // Safety: reset flag if event didn't fire synchronously
  setTimeout(() => { bypassNext = false; }, 100);
}
```

**Key insight:** The 100ms safety timeout prevents the flag from getting stuck if the dispatched event doesn't fire synchronously (e.g., the target element was removed from DOM between blocking and re-triggering). Without this timeout, a stuck `bypassNext = true` would permanently disable interception.

### 3. Right-to-Left Text Redaction for Multiple Findings

**Problem:** When replacing multiple findings in a text string (e.g., replacing `john@test.com` with `[EMAIL_1]` and `555-1234` with `[PHONE_1]`), processing left-to-right shifts all subsequent character indices, causing incorrect replacements or out-of-bounds slicing.

**Solution:** Sort findings by `startIndex` in descending order (right-to-left) so each replacement only affects characters before it:

```typescript
export function buildRedactedText(
  original: string,
  findings: ReadonlyArray<{
    readonly startIndex: number;
    readonly endIndex: number;
    readonly placeholder: string;
  }>,
): string {
  let result = original;
  const sorted = [...findings].sort((a, b) => b.startIndex - a.startIndex);
  for (const finding of sorted) {
    result =
      result.slice(0, finding.startIndex) +
      finding.placeholder +
      result.slice(finding.endIndex);
  }
  return result;
}
```

**Key insight:** `endIndex` must be exclusive (the character *after* the last matched character). An off-by-one here leaves trailing characters from the original value. For `john@test.com` starting at index 23, the endIndex is 36 (23 + 13 chars), not 35.

### 4. Test Cleanup with Preact + Testing Library

**Problem:** Preact component tests using `@testing-library/preact` fail with "Found multiple elements" errors when tests don't clean up between runs. Unlike React Testing Library, Preact's `render()` doesn't auto-cleanup.

**Solution:** Always call `cleanup()` in `afterEach`:

```typescript
import { cleanup, render } from '@testing-library/preact';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
```

**Key insight:** This is a Preact-specific gotcha. React Testing Library includes automatic cleanup. With Preact, you must be explicit.

## Prevention Strategies

### Rules for CLAUDE.md

1. **Never call a Preact component as a plain function.** Always use `h(Component, props)` or JSX syntax. Direct calls (`Component(props)`) bypass the VDOM reconciler and crash hooks.

2. **Always sort multi-position text replacements right-to-left.** When replacing text at multiple character positions, sort findings by `startIndex` descending to avoid index shifting.

3. **Always add `cleanup()` to `afterEach` in Preact component tests.** Unlike React, Preact Testing Library does not auto-cleanup.

### Testing Checklist

- [ ] Shadow DOM rendering: test that `h(Component, props)` works, not just JSX
- [ ] Bypass flag: test that re-triggered events pass through and that the safety timeout resets the flag
- [ ] Redaction: test with adjacent findings, findings at string start/end, and overlapping indices
- [ ] Component tests: verify `cleanup()` runs between every test case

## Cross-References

- **Phase 4 plan:** `docs/plans/2026-03-03-feat-phase4-overlay-ui-plan.md`
- **DOM observation pitfalls:** `docs/solutions/integration-issues/2026-03-02-dom-observation-patterns-and-pitfalls.md`
- **PII classifier pitfalls:** `docs/solutions/logic-errors/2026-03-03-pii-classifier-pitfalls.md`
- **Founding spec (Section 3 — Overlay UI):** `docs/founding/founding-SPEC.md`
- **PR:** https://github.com/al-ignat/sunbreak/pull/4
- **Commit:** `feat: Build Phase 4 overlay UI with redaction flow`
