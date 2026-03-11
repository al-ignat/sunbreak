import type { SiteAdapter } from '../../types';
import { queryFallback, extractParagraphText, setParagraphText } from './dom-utils';

const INPUT_SELECTORS = [
  '.ProseMirror[contenteditable="true"]',
  'div[role="textbox"][contenteditable="true"]',
] as const;

const SEND_BUTTON_SELECTORS = [
  'button[aria-label="Send message"]',
  'button[aria-label="Send Message"]',
] as const;

export const claudeAdapter: SiteAdapter = {
  name: 'claude',
  widgetAnchor: { gapX: 8 },

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
    return extractParagraphText(input);
  },

  setText(input: HTMLElement, text: string): void {
    setParagraphText(input, text);
  },

  getDropZone(): HTMLElement | null {
    const input = this.findInput();
    return input?.closest('fieldset') ?? input?.closest('form') ?? null;
  },

  widgetAnchor: { gapX: 8 },
};
