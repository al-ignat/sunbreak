import type { SiteAdapter } from '../../types';

const INPUT_SELECTORS = [
  '#prompt-textarea',
  'div.ProseMirror[contenteditable="true"]',
] as const;

const SEND_BUTTON_SELECTORS = [
  '[data-testid="send-button"]',
  'button[aria-label="Send prompt"]',
] as const;

function queryFallback(selectors: readonly string[]): HTMLElement | null {
  for (const selector of selectors) {
    const el = document.querySelector<HTMLElement>(selector);
    if (el) return el;
  }
  return null;
}

/** Extract text from ProseMirror editor paragraphs */
function extractProseMirrorText(editor: HTMLElement): string {
  const paragraphs = editor.querySelectorAll('p');
  if (paragraphs.length === 0) {
    return editor.textContent?.trim() ?? '';
  }
  return Array.from(paragraphs)
    .map((p) => p.textContent ?? '')
    .join('\n')
    .trim();
}

export const chatgptAdapter: SiteAdapter = {
  name: 'chatgpt',

  matches(hostname: string): boolean {
    return hostname === 'chatgpt.com' || hostname === 'chat.openai.com';
  },

  findInput(): HTMLElement | null {
    return queryFallback(INPUT_SELECTORS);
  },

  findSendButton(): HTMLElement | null {
    return queryFallback(SEND_BUTTON_SELECTORS);
  },

  getText(input: HTMLElement): string {
    return extractProseMirrorText(input);
  },

  setText(input: HTMLElement, text: string): void {
    // Best-effort: set innerHTML with paragraph wrapping.
    // ProseMirror may not pick up raw DOM changes — Phase 4 will
    // research editor-specific APIs for reliable text replacement.
    const escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    const paragraphs = escaped
      .split('\n')
      .map((line) => `<p>${line || '<br>'}</p>`)
      .join('');
    input.innerHTML = paragraphs;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  },

  getDropZone(): HTMLElement | null {
    // ChatGPT wraps the editor in a <form>
    const input = this.findInput();
    return input?.closest('form') ?? null;
  },
};
