---
title: "WXT + Preact + TypeScript Scaffold — Setup Patterns and Pitfalls"
date: 2026-03-02
category: build-errors
tags: [wxt, preact, typescript, eslint, vitest, chrome-extension, scaffold, playwright]
modules_affected: [eslint.config.js, wxt.config.ts, tsconfig.json, vitest.config.ts, package.json, src/entrypoints/]
severity: critical
symptoms:
  - ESLint 9 rejects legacy @typescript-eslint plugin pattern
  - Vitest globals conflict with explicit imports
  - Popup silently fails when root element missing
  - Playwright can't capture content script console on Gemini
  - Broken npm scripts reference uninstalled dependencies
root_cause: "Scaffold used legacy ESLint patterns and inconsistent tooling defaults"
resolution: "Migrated to unified typescript-eslint, fixed all 9 code review findings"
commits: [35ff2db, 1c5eb80, f649220]
---

# WXT + Preact + TypeScript Scaffold — Setup Patterns and Pitfalls

## Problem

Setting up a Chrome extension (Manifest V3) with WXT framework, Preact, and TypeScript strict mode. The initial scaffold worked (build, test, lint all passed), but a 6-agent code review surfaced 9 issues — 2 critical, 4 important, 3 nice-to-have — all rooted in tooling misconfiguration or inconsistent patterns.

## Root Cause

ESLint 9's flat config requires the unified `typescript-eslint` package, not the legacy separate `@typescript-eslint/eslint-plugin` + `@typescript-eslint/parser`. The old pattern appears to work but misses the `strict` preset and uses a fragile config structure. Several other issues stemmed from scaffold defaults that were inconsistent or incomplete.

## Working Solutions

### 1. ESLint 9 Flat Config (Critical)

**Wrong** — legacy separate packages:
```js
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
export default [{ plugins: { '@typescript-eslint': tseslint } }];
```

**Right** — unified `typescript-eslint` package:
```js
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    files: ['{src,tests}/**/*.{ts,tsx}'],
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

Key points:
- `tseslint.config()` returns proper flat config array
- `tseslint.configs.strict` gives no-floating-promises, no-unused-vars, etc. for free
- Single package: `npm install -D typescript-eslint` (remove the two legacy packages)
- Glob `{src,tests}/**` ensures test files are linted too

### 2. WXT + Preact Configuration

```typescript
// wxt.config.ts
import { defineConfig } from 'wxt';
import preact from '@preact/preset-vite';

export default defineConfig({
  srcDir: 'src',
  manifest: {
    name: 'Secure BYOAI',
    version: '0.1.0',
    description: 'Use AI tools at work — safely.',
    permissions: ['storage'],
    // Must stay in sync with matches in src/entrypoints/content.ts
    host_permissions: [
      '*://chatgpt.com/*',
      '*://chat.openai.com/*',
      '*://claude.ai/*',
      '*://gemini.google.com/*',
    ],
  },
  vite: () => ({
    plugins: [preact()],
  }),
});
```

- WXT auto-generates `manifest.json` from this config — never hand-write it
- `srcDir: 'src'` tells WXT to discover entrypoints in `src/entrypoints/`
- Build output goes to `.output/chrome-mv3/` (not `dist/`)
- Include `chat.openai.com` alongside `chatgpt.com` — OpenAI redirects between domains

### 3. TypeScript Config (Extend WXT)

```json
{
  "extends": "./.wxt/tsconfig.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "preact",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

- Always extend `.wxt/tsconfig.json` — WXT provides path aliases and type definitions
- `noUncheckedIndexedAccess` forces handling `undefined` from array/object indexing

### 4. Vitest Config (No Globals)

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    setupFiles: ['./tests/setup.ts'],
  },
});
```

- Do NOT use `globals: true` — keep explicit `import { describe, it, expect } from 'vitest'`
- Explicit imports are self-documenting and have better TypeScript IDE support
- If you use `globals: true`, you must also add `"types": ["vitest/globals"]` to tsconfig

### 5. Chrome API Mocks for Tests

```typescript
// tests/setup.ts
globalThis.chrome = {
  runtime: {
    onInstalled: { addListener: (): void => {} },
    getURL: (path: string): string => `chrome-extension://test-id/${path}`,
  },
  storage: {
    local: {
      get: (): Promise<Record<string, unknown>> => Promise.resolve({}),
      set: (): Promise<void> => Promise.resolve(),
    },
  },
} as unknown as typeof chrome;
```

- `as unknown as typeof chrome` is the correct pattern for partial mocks
- Mock only APIs your code actually uses — expand incrementally
- Runs via `setupFiles` in vitest.config.ts before all tests

### 6. Popup Entry — Throw on Missing Root

**Wrong** — silent failure in controlled HTML:
```typescript
const root = document.getElementById('app');
if (root) { render(<App />, root); }
```

**Right** — fail fast when something is broken:
```typescript
const root = document.getElementById('app');
if (!root) throw new Error('Root element #app not found');
render(<App />, root);
```

- Popup HTML is fully controlled — a missing root is always a bug
- Content scripts injecting into host pages should use silent null-checks (host page is unpredictable)

### 7. Preact JSX Type Import

**Wrong** — implicit global namespace:
```typescript
export default function App(): preact.JSX.Element {
```

**Right** — explicit type import:
```typescript
import type { JSX } from 'preact';
export default function App(): JSX.Element {
```

### 8. Playwright Chrome Extension Testing

Load extension with `launchPersistentContext`:
```javascript
const context = await chromium.launchPersistentContext('', {
  headless: false,
  args: [
    `--disable-extensions-except=${extensionPath}`,
    `--load-extension=${extensionPath}`,
    '--no-first-run',
  ],
});
```

**Site-specific wait strategies:**

| Site | `waitUntil` | Why |
|------|-------------|-----|
| chatgpt.com | `domcontentloaded` | Standard SPA, content script fires quickly |
| claude.ai | `domcontentloaded` | Standard SPA, content script fires quickly |
| gemini.google.com | `networkidle` | Heavy SPA — content script fires late, needs longer wait |

Content script `console.log` runs in the extension's isolated world. Playwright captures it, but timing varies by site.

## Prevention Checklist

- [ ] Use `typescript-eslint` unified package (never separate plugin + parser)
- [ ] ESLint glob covers `{src,tests}/**` — lint everything
- [ ] Vitest: no `globals: true` — use explicit imports
- [ ] All DOM rendering validates root element before use (throw, don't skip)
- [ ] `.gitignore` includes `.env*`, `*.pem`, `*.key` from day one
- [ ] Every npm script references an installed dependency
- [ ] JSX types are explicitly imported, not used via global namespace
- [ ] URL patterns cross-referenced between config and content script
- [ ] Content scripts have no `console.log` in production

## Dependencies

**Runtime (1):** `preact ^10.28.4`

**Dev:** `wxt ^0.20.18`, `@preact/preset-vite ^2.10.3`, `typescript ^5.9.3`, `typescript-eslint ^8.56.1`, `eslint ^9.39.3`, `vitest ^4.0.18`

## Related Documents

- **Plan:** `docs/plans/2026-03-02-feat-phase1-project-scaffolding-plan.md`
- **Brainstorm:** `docs/brainstorms/2026-03-02-secure-byoai-product-brainstorm.md`
- **Review findings:** `todos/001-009` (all resolved)

### External References

- [WXT documentation](https://wxt.dev/)
- [WXT entrypoints guide](https://wxt.dev/guide/essentials/entrypoints)
- [typescript-eslint flat config](https://typescript-eslint.io/getting-started)
- [@preact/preset-vite](https://github.com/preactjs/preset-vite)
