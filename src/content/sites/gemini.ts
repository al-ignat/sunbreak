import type { SiteAdapter } from '../../types';

const INPUT_SELECTORS = [
  '.ql-editor[contenteditable="true"]',
  'rich-textarea div[contenteditable="true"]',
] as const;

const SEND_BUTTON_SELECTORS = [
  '.send-button',
  'button[aria-label="Send message"]',
] as const;

const DROP_ZONE_SELECTORS = [
  '.xap-uploader-dropzone',
] as const;

function queryFallback(selectors: readonly string[]): HTMLElement | null {
  for (const selector of selectors) {
    const el = document.querySelector<HTMLElement>(selector);
    if (el) return el;
  }
  return null;
}

/** Extract text from Quill editor paragraphs */
function extractQuillText(editor: HTMLElement): string {
  const paragraphs = editor.querySelectorAll('p');
  if (paragraphs.length === 0) {
    return editor.textContent?.trim() ?? '';
  }
  return Array.from(paragraphs)
    .map((p) => p.textContent ?? '')
    .join('\n')
    .trim();
}

export const geminiAdapter: SiteAdapter = {
  name: 'gemini',

  matches(hostname: string): boolean {
    return hostname === 'gemini.google.com';
  },

  findInput(): HTMLElement | null {
    return queryFallback(INPUT_SELECTORS);
  },

  findSendButton(): HTMLElement | null {
    return queryFallback(SEND_BUTTON_SELECTORS);
  },

  getText(input: HTMLElement): string {
    return extractQuillText(input);
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
    const zone = queryFallback(DROP_ZONE_SELECTORS);
    if (zone) return zone;
    // Fallback: find the closest container around the editor
    const input = this.findInput();
    return input?.closest('form') ?? input?.parentElement ?? null;
  },
};
