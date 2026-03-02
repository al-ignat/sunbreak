import type { SiteAdapter } from '../../types';

const INPUT_SELECTORS = [
  '.ProseMirror[contenteditable="true"]',
  'div[role="textbox"][contenteditable="true"]',
] as const;

const SEND_BUTTON_SELECTORS = [
  'button[aria-label="Send message"]',
  'button[aria-label="Send Message"]',
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

export const claudeAdapter: SiteAdapter = {
  name: 'claude',

  matches(hostname: string): boolean {
    return hostname === 'claude.ai';
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
    const input = this.findInput();
    return input?.closest('fieldset') ?? input?.closest('form') ?? null;
  },
};
