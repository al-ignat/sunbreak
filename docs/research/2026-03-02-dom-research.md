# DOM Research: AI Chat Tool Structures & Content Script Best Practices

**Date:** 2026-03-02
**Purpose:** Document DOM selectors, element types, and interaction patterns for ChatGPT, Claude, and Gemini to inform site adapter development in Phase 2.
**Method:** Live DOM inspection (Playwright), web search, userscript/extension source analysis.

> **WARNING:** These DOM structures change frequently. Selectors verified on 2026-03-02. Always build fallback chains and test before each release.

---

## 1. ChatGPT (chatgpt.com)

### Input Element

ChatGPT uses a **ProseMirror** contenteditable div, NOT a plain textarea.

```html
<div contenteditable="true"
     translate="no"
     class="ProseMirror"
     id="prompt-textarea"
     data-virtualkeyboard="true">
  <p data-placeholder="Ask anything" class="placeholder">
    <br class="ProseMirror-trailingBreak">
  </p>
</div>
```

**Key facts:**
- Tag: `<div>` with `contenteditable="true"`
- ID: `prompt-textarea` (stable since at least 2024, but was historically a `<textarea>` -- changed to ProseMirror contenteditable div)
- Class: `ProseMirror`
- No `role` attribute on the editor itself
- Placeholder text is inside a `<p data-placeholder="Ask anything">` child element
- A hidden fallback `<textarea class="wcDTda_fallbackTextarea">` exists with `display: none` in the same parent

### Selector Strategy (priority order)

```typescript
const CHATGPT_INPUT_SELECTORS = [
  '#prompt-textarea',                           // Most stable: ID
  'div.ProseMirror[contenteditable="true"]',     // Structural
  '[contenteditable="true"]',                    // Broadest fallback
] as const;
```

### Text Extraction

```typescript
function getChatGPTText(editor: Element): string {
  // ProseMirror stores text in <p> elements
  // Each paragraph is a <p>, line breaks are <br class="ProseMirror-trailingBreak">
  const paragraphs = editor.querySelectorAll('p');
  return Array.from(paragraphs)
    .map(p => p.textContent || '')
    .join('\n');
}

// Alternative: simple textContent works for plain text prompts
function getChatGPTTextSimple(editor: Element): string {
  return editor.textContent || '';
}
```

### Composer Structure (element ancestry)

```
DIV#prompt-textarea.ProseMirror  (the editor)
  -> DIV.wcDTda_prosemirror-parent  (scrollable container)
    -> DIV  (flex container, grid-area: primary)
      -> DIV  (styled composer box with rounded corners)
        -> DIV
          -> FORM.group/composer  (the form element)
```

### Submit Button

The send button appears only when the editor has content.

```html
<button aria-label="Send prompt"
        data-testid="send-button"
        type="submit"
        class="...">
</button>
```

**Selector strategy:**
```typescript
const CHATGPT_SEND_SELECTORS = [
  '[data-testid="send-button"]',           // Most reliable: data-testid
  'button[aria-label="Send prompt"]',      // ARIA label
  'form button[type="submit"]',            // Structural fallback
] as const;
```

### Other Buttons in Composer

| Button | Selector | Notes |
|--------|----------|-------|
| Add files | `[data-testid="composer-plus-btn"]` | Opens file/image menu |
| Voice | `[data-testid="composer-speech-button"]` | type="submit" but is voice input |

### Submission Detection

- **Enter key**: Sends the message (Enter without Shift)
- **Shift+Enter**: Inserts a newline (ProseMirror handles this)
- **Button click**: Click on `[data-testid="send-button"]`
- **Form submission**: The editor lives inside a `<form>` element, but it's `method="get"` and `action="/"` -- the actual submission is handled by JavaScript event handlers, not native form submission

**Interception approach:**
```typescript
// 1. Capture-phase keydown on the editor
editor.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    // This is a submission attempt
    const text = getChatGPTText(editor);
    // Emit event for classification before it sends
  }
}, true); // capture phase

// 2. Click listener on send button
const sendBtn = document.querySelector('[data-testid="send-button"]');
sendBtn?.addEventListener('click', (e) => {
  const text = getChatGPTText(editor);
  // Classify before send
}, true); // capture phase
```

### File Upload Elements

ChatGPT has 3 file input elements:

| Input | Accept | ID | Notes |
|-------|--------|----|-------|
| Image upload | `image/gif,.gif,image/png,.png,image/webp,.webp,image/jpeg,.jpg,.jpeg,.mpo` | (none) | Hidden, parent has class `hidden` |
| Photos | `image/*` | `upload-photos` | Screen reader only (class `sr-only`) |
| Camera | `image/*` | `upload-camera` | Screen reader only (class `sr-only`) |

### Known Quirks

1. **ProseMirror migration**: ChatGPT switched from a plain `<textarea>` to ProseMirror at some point in 2024. Old extensions targeting `textarea#prompt-textarea` broke. The ID stayed the same but the element type changed.
2. **Dynamic button visibility**: The send button only appears when the editor has content. It replaces the voice button in the same position.
3. **Obfuscated class names**: Parent containers use obfuscated class prefixes like `wcDTda_`. These WILL change across deployments.
4. **React framework**: ChatGPT uses React. Direct innerHTML manipulation won't trigger React's state updates. Need to dispatch proper input events.
5. **Formatting blocks**: ChatGPT has begun rolling out rich text formatting blocks for certain content types (emails, docs). This adds additional ProseMirror complexity.

---

## 2. Claude (claude.ai)

### Input Element

Claude also uses a **ProseMirror** contenteditable div.

```html
<div class="ProseMirror"
     contenteditable="true"
     role="textbox"
     ...>
</div>
```

**Key facts:**
- Tag: `<div>` with `contenteditable="true"`
- Class: `ProseMirror`
- Has `role="textbox"` (unlike ChatGPT)
- No stable ID on the editor element
- Claude requires login to access the chat interface, making automated DOM inspection harder

### Selector Strategy (priority order)

```typescript
const CLAUDE_INPUT_SELECTORS = [
  '.ProseMirror[contenteditable="true"]',     // Primary: class + attribute
  'div[contenteditable="true"][role="textbox"]', // Structural with role
  '[contenteditable="true"]',                    // Broadest fallback
] as const;
```

### Text Extraction

Same ProseMirror approach as ChatGPT:

```typescript
function getClaudeText(editor: Element): string {
  // ProseMirror paragraph structure
  const paragraphs = editor.querySelectorAll('p');
  return Array.from(paragraphs)
    .map(p => p.textContent || '')
    .join('\n');
}
```

### Submit Button

```typescript
const CLAUDE_SEND_SELECTORS = [
  'button[aria-label="Send message"]',    // ARIA label (from GhostPrompt)
  'button[aria-label="Send Message"]',    // Case variant
  'fieldset button[type="submit"]',       // Structural
] as const;
```

### Submission Detection

- **Enter key**: Sends the message (Enter without Shift, same as ChatGPT)
- **Button click**: Send message button
- The form structure may vary; rely on capture-phase keyboard events on the editor

### Known Quirks

1. **Login required**: Cannot inspect DOM without an active session. This means any automated DOM research requires authentication.
2. **ProseMirror**: Same editor library as ChatGPT, but the wrapper structure differs. Do not assume identical parent hierarchies.
3. **Next.js framework**: Claude.ai uses Next.js (React-based). Same event dispatch considerations as ChatGPT.
4. **Artifacts panel**: Claude can open a side panel for code/documents. The editor may resize or reposition, but selectors should remain stable.
5. **No stable ID**: Unlike ChatGPT's `#prompt-textarea`, Claude's editor has no ID. Rely on class + attribute selectors.

---

## 3. Gemini (gemini.google.com)

### Input Element

Gemini uses a **Quill** editor (ql-editor) inside a custom Angular web component.

```html
<rich-textarea _ngcontent-ng-c2527499663=""
               atmentions=""
               class="text-input-field_textarea ql-container ql-bubble"
               enterkeyhint="send"
               dir="ltr">
  <div class="ql-editor ql-blank textarea new-input-ui"
       data-gramm="false"
       contenteditable="true"
       role="textbox"
       aria-multiline="true"
       aria-label="Enter a prompt for Gemini"
       data-placeholder="Ask Gemini 3">
    <p><br></p>
  </div>
  <div class="ql-clipboard" contenteditable="true" tabindex="-1"></div>
</rich-textarea>
```

**Key facts:**
- Tag: `<div>` with `contenteditable="true"` inside a `<rich-textarea>` custom element
- Class: `ql-editor` (Quill editor, NOT ProseMirror)
- Has `role="textbox"` and `aria-label="Enter a prompt for Gemini"`
- The `<rich-textarea>` is an Angular custom element (NOT a native web component with Shadow DOM)
- The `enterkeyhint="send"` attribute on `<rich-textarea>` tells mobile keyboards to show "Send"
- No Shadow DOM: Gemini's custom elements are Angular components compiled to regular DOM, NOT web components with shadowRoot

### Selector Strategy (priority order)

```typescript
const GEMINI_INPUT_SELECTORS = [
  '.ql-editor[contenteditable="true"]',            // Primary: Quill editor class
  'rich-textarea .ql-editor',                       // Through custom element
  'div[role="textbox"][aria-label*="Gemini"]',      // ARIA-based
  '[contenteditable="true"][role="textbox"]',        // Generic fallback
] as const;
```

### Full Composer Chain (element ancestry)

```
DIV.ql-editor  (the editor, contenteditable)
  -> RICH-TEXTAREA.text-input-field_textarea.ql-container
    -> DIV.text-input-field_textarea-inner
      -> DIV.text-input-field-main-area
        -> DIV.text-input-field_textarea-wrapper
          -> DIV.text-input-field
            -> DIV.input-area
              -> INPUT-AREA-V2  (custom element)
                -> FIELDSET.input-area-container
                  -> INPUT-CONTAINER  (custom element)
                    -> DIV.chat-container
                      -> CHAT-WINDOW  (custom element)
```

### Text Extraction

```typescript
function getGeminiText(editor: Element): string {
  // Quill editor also uses <p> elements
  const paragraphs = editor.querySelectorAll('p');
  return Array.from(paragraphs)
    .map(p => p.textContent || '')
    .join('\n');
}
```

### Submit Button

```html
<button aria-label="Send message"
        class="... send-button ... submit ..."
        type="submit">
</button>
```

**Selector strategy:**
```typescript
const GEMINI_SEND_SELECTORS = [
  'button[aria-label="Send message"]',      // ARIA label
  'button.send-button',                      // Class-based
  '.send-button-container button',           // Through parent
] as const;
```

### Custom Element Inventory

Gemini uses Angular with many custom elements (739 total elements on the page). Key custom elements:

| Element | Purpose |
|---------|---------|
| `<chat-app>` | Root app container |
| `<chat-window>` | Chat conversation area |
| `<input-container>` | Input area wrapper |
| `<input-area-v2>` | Input area component |
| `<rich-textarea>` | The Quill editor wrapper |
| `<bard-sidenav-container>` | Side navigation |
| `<side-navigation-v2>` | Nav component |

**Critical finding:** None of these use Shadow DOM. They are Angular-compiled components that render as regular DOM elements. Content scripts can access all child elements directly.

### File Upload

```html
<button aria-label="Open upload file menu"
        class="... upload-card-button ...">
</button>
<!-- Hidden file upload buttons -->
<button class="hidden-local-upload-button">...</button>
<button class="hidden-local-file-upload-button">...</button>
```

No `<input type="file">` elements were found in the DOM at page load. Gemini likely creates them dynamically when the upload menu is opened, or handles uploads through a different mechanism (possibly Google's upload infrastructure).

### Submission Detection

- **Enter key**: Sends the message (confirmed by `enterkeyhint="send"` on the parent)
- **Button click**: `button.send-button[aria-label="Send message"]`
- Gemini uses Angular Material (`mat-mdc-*` classes), so event handling follows Angular's zone.js patterns

### Known Quirks

1. **Angular obfuscated attributes**: Attributes like `_ngcontent-ng-c2527499663` and class prefixes like `ng-tns-c2527499663-5` are Angular's view encapsulation markers. The numbers change on every build. NEVER use these in selectors.
2. **Quill editor, not ProseMirror**: Gemini is the outlier. It uses Quill (`.ql-editor`), not ProseMirror. Text extraction and event handling differ slightly.
3. **Dynamic file inputs**: File upload inputs are not present in the DOM by default. They appear only when the upload menu is activated.
4. **Drop zone**: The `DIV.xap-uploader-dropzone.chat-container` class suggests drag-and-drop file uploads are handled at the chat container level.
5. **Angular zone.js**: Angular's change detection means synthetic events might not trigger UI updates correctly. You may need to trigger change detection explicitly.
6. **Model name in placeholder**: The `data-placeholder` includes the current model name (e.g., "Ask Gemini 3"), which changes with model updates.

---

## 4. Cross-Platform Comparison

| Feature | ChatGPT | Claude | Gemini |
|---------|---------|--------|--------|
| **Editor** | ProseMirror | ProseMirror | Quill |
| **Element** | `div[contenteditable]` | `div[contenteditable]` | `div[contenteditable]` |
| **Stable ID** | `#prompt-textarea` | None | None |
| **Class** | `.ProseMirror` | `.ProseMirror` | `.ql-editor` |
| **Role attr** | None | `textbox` | `textbox` |
| **ARIA label** | None | Unknown | `"Enter a prompt for Gemini"` |
| **Framework** | React | Next.js (React) | Angular |
| **Shadow DOM** | No | No | No (Angular components, no shadowRoot) |
| **Send button** | `[data-testid="send-button"]` | `button[aria-label="Send message"]` | `button.send-button` |
| **Submit type** | Enter / button click | Enter / button click | Enter / button click |
| **Form element** | Yes (`<form>`) | Unknown | `<fieldset>` wrapper |

### Universal Text Extraction

Since all three use contenteditable divs with `<p>` elements:

```typescript
function getPromptText(editor: Element): string {
  const paragraphs = editor.querySelectorAll('p');
  if (paragraphs.length > 0) {
    return Array.from(paragraphs)
      .map(p => p.textContent || '')
      .join('\n');
  }
  // Fallback for unexpected structures
  return editor.textContent || '';
}
```

---

## 5. Content Script Best Practices for SPAs

### 5.1 Waiting for Elements (MutationObserver Pattern)

The most reliable way to find dynamically-added elements:

```typescript
function waitForElement(
  selector: string,
  timeout = 10000,
  root: Node = document.body,
): Promise<Element> {
  return new Promise((resolve, reject) => {
    // Check if already exists
    const existing = document.querySelector(selector);
    if (existing) {
      resolve(existing);
      return;
    }

    const timeoutId = setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Element ${selector} not found within ${timeout}ms`));
    }, timeout);

    const observer = new MutationObserver(() => {
      const element = document.querySelector(selector);
      if (element) {
        clearTimeout(timeoutId);
        observer.disconnect();
        resolve(element);
      }
    });

    observer.observe(root, { childList: true, subtree: true });
  });
}
```

### 5.2 Fallback Selector Chain

Try selectors in priority order:

```typescript
function findElement(selectors: readonly string[]): Element | null {
  for (const selector of selectors) {
    const el = document.querySelector(selector);
    if (el) return el;
  }
  return null;
}

// Usage
const editor = findElement(CHATGPT_INPUT_SELECTORS);
```

### 5.3 Observing Text Changes in Contenteditable

MutationObserver does NOT detect `input.value` changes, but it DOES work for contenteditable changes:

```typescript
function observeEditorContent(
  editor: Element,
  callback: (text: string) => void,
): MutationObserver {
  let debounceTimer: ReturnType<typeof setTimeout>;

  const observer = new MutationObserver(() => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      callback(getPromptText(editor));
    }, 150); // debounce at 150ms
  });

  observer.observe(editor, {
    childList: true,
    characterData: true,
    subtree: true,
  });

  return observer;
}
```

**Performance notes:**
- Observe the EDITOR element, not `document.body` -- much smaller subtree
- Use `characterData: true` for text node changes inside ProseMirror/Quill
- Debounce the callback to avoid running classification on every keystroke
- The 150ms debounce balances responsiveness with performance

### 5.4 Event Interception for Submission Detection

Use capture phase to intercept BEFORE the site's own handlers:

```typescript
function interceptSubmission(
  editor: Element,
  sendButtonSelector: string,
  onSubmit: (text: string, event: Event) => boolean, // return false to prevent
): () => void {
  const cleanupFns: Array<() => void> = [];

  // 1. Intercept Enter key (capture phase)
  const keyHandler = (e: KeyboardEvent): void => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
      const text = getPromptText(editor);
      if (text.trim()) {
        const shouldSend = onSubmit(text, e);
        if (!shouldSend) {
          e.preventDefault();
          e.stopPropagation();
        }
      }
    }
  };
  editor.addEventListener('keydown', keyHandler, true);
  cleanupFns.push(() => editor.removeEventListener('keydown', keyHandler, true));

  // 2. Intercept send button click (capture phase)
  // Use event delegation since button may not exist yet
  const clickHandler = (e: MouseEvent): void => {
    const target = e.target as Element;
    const sendBtn = target.closest(sendButtonSelector);
    if (sendBtn) {
      const text = getPromptText(editor);
      if (text.trim()) {
        const shouldSend = onSubmit(text, e);
        if (!shouldSend) {
          e.preventDefault();
          e.stopPropagation();
        }
      }
    }
  };
  document.addEventListener('click', clickHandler, true);
  cleanupFns.push(() => document.removeEventListener('click', clickHandler, true));

  // Return cleanup function
  return () => cleanupFns.forEach(fn => fn());
}
```

**Important considerations:**
- `e.isComposing` check prevents intercepting IME composition events (CJK input)
- Capture phase (`true` third argument) fires BEFORE the site's event handlers
- `e.stopPropagation()` prevents the event from reaching the site's submit handler
- Event delegation on `document` for the click handler means we catch button clicks even if the button is recreated by React/Angular

### 5.5 SPA Navigation Detection

AI chat tools use client-side routing. Detect navigation changes:

**Option A: History API monkey-patching (in content script)**
```typescript
function onUrlChange(callback: (url: string) => void): void {
  let lastUrl = location.href;

  // Monkey-patch pushState and replaceState
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;

  history.pushState = function (...args) {
    const result = originalPushState.apply(this, args);
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      callback(lastUrl);
    }
    return result;
  };

  history.replaceState = function (...args) {
    const result = originalReplaceState.apply(this, args);
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      callback(lastUrl);
    }
    return result;
  };

  // Also catch back/forward navigation
  window.addEventListener('popstate', () => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      callback(lastUrl);
    }
  });
}
```

**Option B: chrome.webNavigation in service worker (background.ts)**
```typescript
// In background service worker
chrome.webNavigation.onHistoryStateUpdated.addListener(
  (details) => {
    // SPA navigation detected (pushState)
    chrome.tabs.sendMessage(details.tabId, {
      type: 'navigation',
      url: details.url,
    });
  },
  {
    url: [
      { hostContains: 'chatgpt.com' },
      { hostContains: 'claude.ai' },
      { hostContains: 'gemini.google.com' },
    ],
  },
);

// Also catch full page loads
chrome.webNavigation.onCompleted.addListener(
  (details) => {
    chrome.tabs.sendMessage(details.tabId, {
      type: 'navigation',
      url: details.url,
    });
  },
  {
    url: [
      { hostContains: 'chatgpt.com' },
      { hostContains: 'claude.ai' },
      { hostContains: 'gemini.google.com' },
    ],
  },
);
```

**Recommendation:** Use Option B (webNavigation API) as the primary approach since it works in the service worker and does not modify the page's JavaScript. Use Option A as a fallback for edge cases.

### 5.6 MutationObserver Performance Guidelines

1. **Observe the smallest possible subtree.** Target the editor or composer container, not `document.body`.
2. **Use `attributeFilter`** when watching attributes to limit which changes trigger callbacks.
3. **Debounce callbacks** (150-300ms) for text observation. Classification can be expensive.
4. **Disconnect when not needed.** When the page navigates away from a chat, disconnect observers.
5. **Clean up on page unload.** Prevent memory leaks:
   ```typescript
   window.addEventListener('beforeunload', () => {
     observer.disconnect();
   });
   ```
6. **MutationObserver batches changes automatically.** Callbacks fire at microtask timing, not synchronously. Do not add your own microtask batching.
7. **Profile with DevTools.** Use the Performance panel to measure observer overhead.

### 5.7 Resilient Selector Strategy

Selector reliability ranking (most to least stable):
1. **Stable IDs** (`#prompt-textarea`) -- best, but rare
2. **data-testid attributes** (`[data-testid="send-button"]`) -- intended for automation, fairly stable
3. **ARIA attributes** (`[aria-label="Send message"]`, `[role="textbox"]`) -- tied to accessibility, rarely removed
4. **Semantic class names** (`.ProseMirror`, `.ql-editor`, `.send-button`) -- meaningful names that reflect function
5. **Structural selectors** (`form button[type="submit"]`, `fieldset .input-area`) -- depend on DOM hierarchy
6. **Obfuscated class names** (`.wcDTda_prosemirror-parent`, `ng-tns-c2527499663`) -- NEVER use these, they change every build

**Implementation pattern:**
```typescript
interface SiteAdapter {
  readonly name: string;
  readonly inputSelectors: readonly string[];
  readonly sendButtonSelectors: readonly string[];
  findInput(): Element | null;
  findSendButton(): Element | null;
  getText(editor: Element): string;
}
```

---

## 6. File Upload Detection

### 6.1 Detecting input[type=file] Changes

```typescript
function observeFileUploads(
  callback: (files: FileList) => void,
): MutationObserver {
  // Watch for dynamically added file inputs
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node instanceof HTMLElement) {
          const fileInputs = node.querySelectorAll('input[type="file"]');
          fileInputs.forEach(input => {
            input.addEventListener('change', (e) => {
              const target = e.target as HTMLInputElement;
              if (target.files && target.files.length > 0) {
                callback(target.files);
              }
            });
          });
        }
      }
    }
  });

  // Also attach to existing file inputs
  document.querySelectorAll('input[type="file"]').forEach(input => {
    input.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      if (target.files && target.files.length > 0) {
        callback(target.files);
      }
    });
  });

  observer.observe(document.body, { childList: true, subtree: true });
  return observer;
}
```

### 6.2 Detecting Drag-and-Drop File Uploads

```typescript
function observeDragDropUploads(
  dropZone: Element,
  callback: (files: FileList) => void,
): () => void {
  const dropHandler = (e: DragEvent): void => {
    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      callback(e.dataTransfer.files);
    }
  };

  // Listen in capture phase to see files before the site processes them
  dropZone.addEventListener('drop', dropHandler, true);

  return () => {
    dropZone.removeEventListener('drop', dropHandler, true);
  };
}
```

**Per-site drop zones:**
- **ChatGPT**: The `<form>` element or the main content area
- **Claude**: The chat area (needs login to verify)
- **Gemini**: `DIV.xap-uploader-dropzone.chat-container`

### 6.3 Shadow DOM Considerations

None of the three AI tools currently use Shadow DOM for their input areas. However, if they do in the future:

- Open Shadow DOM: `element.shadowRoot` is accessible; query inside it
- Closed Shadow DOM: Not accessible from content scripts. Would need to use `chrome.scripting.executeScript` with `world: 'MAIN'` or intercept at the network level instead

Our own extension's injected UI uses closed Shadow DOM (via WXT's `createShadowRootUi`), but that does not affect our ability to read the host page's DOM.

---

## 7. Network-Level Interception Alternative

The security research on AI chat extensions (Urban VPN, Similarweb) revealed that the most reliable interception method overrides `fetch()` and `XMLHttpRequest`:

```typescript
// This is what malicious extensions do. We note it for awareness.
// Our extension does NOT use this approach -- we use DOM observation.
const originalFetch = window.fetch;
window.fetch = function (...args) {
  // Intercept API calls to ChatGPT/Claude/Gemini backends
  // Parse request body for prompt content
  return originalFetch.apply(this, args);
};
```

**Why we do NOT use this:**
1. It requires `world: 'MAIN'` script injection (more invasive)
2. It modifies the page's JavaScript environment
3. It could break the site if the API format changes
4. DOM observation is sufficient for pre-send classification
5. Network interception feels more like surveillance -- our UX should be transparent

**When it might be needed:** If a site moves to a model where the editor content is encrypted or hashed client-side before the submit button is active. Currently none of the three sites do this.

---

## 8. Recommended Architecture for Site Adapters

```typescript
// src/content/sites/types.ts
interface SiteAdapter {
  readonly name: 'chatgpt' | 'claude' | 'gemini';
  readonly hostPattern: RegExp;
  readonly inputSelectors: readonly string[];
  readonly sendButtonSelectors: readonly string[];

  /** Find the editor element, with fallback chain */
  findEditor(): Element | null;

  /** Find the send/submit button */
  findSendButton(): Element | null;

  /** Extract plain text from the editor */
  getEditorText(editor: Element): string;

  /** Get the drop zone for file upload detection */
  getDropZone(): Element | null;
}

// src/content/sites/chatgpt.ts
export const chatgptAdapter: SiteAdapter = {
  name: 'chatgpt',
  hostPattern: /chatgpt\.com/,
  inputSelectors: [
    '#prompt-textarea',
    'div.ProseMirror[contenteditable="true"]',
    '[contenteditable="true"]',
  ],
  sendButtonSelectors: [
    '[data-testid="send-button"]',
    'button[aria-label="Send prompt"]',
    'form button[type="submit"]',
  ],
  findEditor() { return findElement(this.inputSelectors); },
  findSendButton() { return findElement(this.sendButtonSelectors); },
  getEditorText(editor) { return getPromptText(editor); },
  getDropZone() { return document.querySelector('form') || document.querySelector('main'); },
};
```

---

## Sources

- Live DOM inspection of chatgpt.com and gemini.google.com (2026-03-02, via Playwright)
- [GhostPrompt Chrome Extension](https://github.com/charandeep-reddy/ghostprompt) -- PLATFORM_CONFIG selectors for ChatGPT, Claude, Gemini, Grok
- [Illusion Userscript](https://greasyfork.org/en/scripts/527451-illusion/code) -- ProseMirror selectors for Claude and ChatGPT, Quill/textarea for Gemini
- [MutationObserver Guide by Addy Osmani](https://addyosmani.com/blog/mutation-observers/) -- Performance patterns and memory management
- [Complete Guide to MutationObserver API](https://www.badger3000.com/articles/complete-guide-to-mutationobserver-api) -- waitForElement pattern, SPA tips
- [SPA URL Change Detection Gist](https://gist.github.com/mohammedrahman-e2x/de230e8361ef11817c3a1ad7bf9d0ade) -- History API monkey-patching
- [chrome.webNavigation API](https://developer.chrome.com/docs/extensions/reference/api/webNavigation) -- onHistoryStateUpdated for SPA detection
- [Hacker News: Chrome Extension Intercepting AI Chats](https://thehackernews.com/2025/12/featured-chrome-browser-extension.html) -- fetch/XHR override technique analysis
- [ChatGPT DOM adaptation gist](https://gist.github.com/TakashiSasaki/730f930806ec1a6460ab350f7498d622) -- MutationObserver adaptation pattern
- [MDN: File drag and drop](https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API/File_drag_and_drop) -- dataTransfer.files API
