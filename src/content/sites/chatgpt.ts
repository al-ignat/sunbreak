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

const STOP_BUTTON_SELECTORS = [
  '[data-testid="stop-button"]',
  'button[aria-label="Stop generating"]',
  'button[aria-label="Stop streaming"]',
  'button[title="Stop generating"]',
  'button[title="Stop streaming"]',
] as const;

const SPEECH_BUTTON_SELECTORS = [
  '[data-testid="composer-speech-button"]',
  'button[aria-label="Start voice mode"]',
  'button[aria-label="Voice"]',
  'button[aria-label="Audio"]',
] as const;

const EXCLUDED_BUTTON_SELECTORS = [
  '[data-testid="composer-plus-btn"]',
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

function buttonMatchesAny(button: HTMLButtonElement, selectors: readonly string[]): boolean {
  return selectors.some((selector) => button.matches(selector));
}

function scoreComposerButton(button: HTMLButtonElement): number {
  if (buttonMatchesAny(button, EXCLUDED_BUTTON_SELECTORS)) return -1;
  if (buttonMatchesAny(button, SEND_BUTTON_SELECTORS)) return 400;
  if (buttonMatchesAny(button, STOP_BUTTON_SELECTORS)) return 300;
  if (buttonMatchesAny(button, SPEECH_BUTTON_SELECTORS)) return 250;
  if (button.type === 'submit') return 200;
  return 100;
}

function findBestComposerButton(root: ParentNode): HTMLElement | null {
  const buttons = Array.from(root.querySelectorAll('button'))
    .filter((button): button is HTMLButtonElement => button instanceof HTMLButtonElement)
    .filter(isVisibleButton);

  let best: HTMLButtonElement | null = null;
  let bestScore = -1;

  for (const button of buttons) {
    const score = scoreComposerButton(button);
    if (score < 0) continue;
    if (!best || score > bestScore) {
      best = button;
      bestScore = score;
      continue;
    }
    if (score === bestScore && button.getBoundingClientRect().right > best.getBoundingClientRect().right) {
      best = button;
    }
  }

  return best;
}

function findComposerActionButton(): HTMLElement | null {
  const input = queryFallback(INPUT_SELECTORS);
  const composerRoot = input?.closest('form') ?? input?.parentElement ?? null;

  if (composerRoot) {
    const localMatch =
      findBestComposerButton(composerRoot) ??
      queryFallbackInRoot(composerRoot, SEND_BUTTON_SELECTORS) ??
      queryFallbackInRoot(composerRoot, STOP_BUTTON_SELECTORS) ??
      queryFallbackInRoot(composerRoot, SPEECH_BUTTON_SELECTORS);
    if (localMatch) return localMatch;
  }

  return (
    queryFallback(SEND_BUTTON_SELECTORS) ??
    queryFallback(STOP_BUTTON_SELECTORS) ??
    queryFallback(SPEECH_BUTTON_SELECTORS)
  );
}

export const chatgptAdapter: SiteAdapter = {
  name: 'chatgpt',
  widgetAnchor: { gapX: 8 },

  matches(hostname: string): boolean {
    return hostname === 'chatgpt.com' || hostname === 'chat.openai.com';
  },

  findInput(): HTMLElement | null {
    return queryFallback(INPUT_SELECTORS);
  },

  findSendButton(): HTMLElement | null {
    return findComposerActionButton();
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
};
