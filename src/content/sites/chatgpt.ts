import type { SiteAdapter } from '../../types';
import { queryFallback, extractParagraphText, setParagraphText } from './dom-utils';

const INPUT_SELECTORS = [
  '#prompt-textarea',
  'div.ProseMirror[contenteditable="true"]',
] as const;

const SEND_BUTTON_SELECTORS = [
  '[data-testid="send-button"]',
  'button[aria-label="Send prompt"]',
] as const;

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
    return extractParagraphText(input);
  },

  setText(input: HTMLElement, text: string): void {
    // ProseMirror may not pick up raw DOM changes — Phase 4 will
    // research editor-specific APIs for reliable text replacement.
    setParagraphText(input, text);
  },

  getDropZone(): HTMLElement | null {
    // ChatGPT wraps the editor in a <form>
    const input = this.findInput();
    return input?.closest('form') ?? null;
  },

  widgetAnchor: { gapX: 8 },
};
