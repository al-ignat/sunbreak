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

function queryFallbackInRoot(root: ParentNode, selectors: readonly string[]): HTMLElement | null {
  for (const selector of selectors) {
    const el = root.querySelector<HTMLElement>(selector);
    if (el) return el;
  }

  return null;
}

function isVisibleButton(button: HTMLButtonElement): boolean {
  const rect = button.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function findBestComposerButton(root: ParentNode): HTMLElement | null {
  const buttons = Array.from(root.querySelectorAll('button'))
    .filter((button): button is HTMLButtonElement => button instanceof HTMLButtonElement)
    .filter(isVisibleButton);

  let best: HTMLButtonElement | null = null;

  for (const button of buttons) {
    if (!best) {
      best = button;
      continue;
    }

    const bestIsNamedSend = SEND_BUTTON_SELECTORS.some((selector) => best?.matches(selector));
    const currentIsNamedSend = SEND_BUTTON_SELECTORS.some((selector) => button.matches(selector));
    if (currentIsNamedSend && !bestIsNamedSend) {
      best = button;
      continue;
    }
    if (currentIsNamedSend === bestIsNamedSend && button.getBoundingClientRect().right > best.getBoundingClientRect().right) {
      best = button;
    }
  }

  return best;
}

function findGeminiComposerActionButton(): HTMLElement | null {
  const input = queryFallback(INPUT_SELECTORS);
  const composerRoot = input?.closest('form') ?? input?.parentElement ?? null;

  if (composerRoot) {
    const localMatch = findBestComposerButton(composerRoot) ?? queryFallbackInRoot(composerRoot, SEND_BUTTON_SELECTORS);
    if (localMatch) return localMatch;
  }

  return queryFallback(SEND_BUTTON_SELECTORS);
}

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
    return findGeminiComposerActionButton();
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
};
