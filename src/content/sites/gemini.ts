import type { SiteAdapter } from '../../types';
import { queryFallback, extractParagraphText, setParagraphText } from './dom-utils';

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

export const geminiAdapter: SiteAdapter = {
  name: 'gemini',
  widgetAnchor: { gapX: 8 },

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
    return extractParagraphText(input);
  },

  setText(input: HTMLElement, text: string): void {
    setParagraphText(input, text);
  },

  getDropZone(): HTMLElement | null {
    const zone = queryFallback(DROP_ZONE_SELECTORS);
    if (zone) return zone;
    // Fallback: find the closest container around the editor
    const input = this.findInput();
    return input?.closest('form') ?? input?.parentElement ?? null;
  },

  widgetAnchor: { gapX: 8 },
};
