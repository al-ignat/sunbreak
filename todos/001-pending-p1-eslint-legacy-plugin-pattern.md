---
status: complete
priority: p1
issue_id: "001"
tags: [code-review, quality, typescript]
dependencies: []
---

# ESLint uses legacy plugin pattern instead of unified `typescript-eslint`

## Problem Statement

`eslint.config.js` imports `@typescript-eslint/eslint-plugin` and `@typescript-eslint/parser` separately using the pre-flat-config pattern. ESLint 9 with typescript-eslint v8+ has a dedicated `typescript-eslint` package that provides `tseslint.config()` helper and proper flat config support. The current approach is fragile and misses the `strict` preset rules (no-floating-promises, no-unused-vars, etc.) that align with CLAUDE.md's strict typing philosophy.

## Findings

- **Source:** TypeScript reviewer (kieran-typescript-reviewer)
- **File:** `eslint.config.js`
- **Evidence:** Imports `@typescript-eslint/eslint-plugin` and `@typescript-eslint/parser` separately. Uses `plugins: { '@typescript-eslint': tseslint }` which is the legacy pattern duct-taped into flat config shape.

## Proposed Solutions

### Option A: Migrate to unified `typescript-eslint` package (Recommended)
- Replace `@typescript-eslint/eslint-plugin` + `@typescript-eslint/parser` with single `typescript-eslint` package
- Use `tseslint.config()` helper with `...tseslint.configs.strict`
- **Pros:** Correct flat config pattern, gets strict preset rules for free, single package to maintain
- **Cons:** Requires dependency swap
- **Effort:** Small
- **Risk:** Low

## Recommended Action

<!-- Filled during triage -->

## Technical Details

**Affected files:** `eslint.config.js`, `package.json`

**Target code:**
```js
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [...tseslint.configs.strict],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/explicit-function-return-type': 'warn',
      'no-console': 'off',
    },
  },
  { ignores: ['.output/', '.wxt/', 'node_modules/', 'dist/'] },
);
```

## Acceptance Criteria

- [ ] `typescript-eslint` unified package is the only eslint TS dependency
- [ ] `@typescript-eslint/eslint-plugin` and `@typescript-eslint/parser` removed from package.json
- [ ] `tseslint.configs.strict` preset is applied
- [ ] `npm run lint` passes with no errors
- [ ] No regressions in existing lint behavior

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-02 | Created from code review | TypeScript reviewer flagged as critical |

## Resources

- [typescript-eslint flat config docs](https://typescript-eslint.io/getting-started)
