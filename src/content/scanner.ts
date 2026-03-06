import type { SiteAdapter } from '../types';
import type { FindingType } from '../classifier/types';
import type { DetectionSettings, ExtensionSettings } from '../storage/types';
import { classify } from '../classifier/engine';
import { toEnabledDetectors } from '../storage/dashboard';
import type { FindingsState } from './findings-state';

/** Debounce delay for typing (ms) */
const TYPING_DEBOUNCE_MS = 500;

/** Configuration provided by the orchestrator */
export interface ScannerConfig {
  getKeywords(): string[];
  getDetectionSettings(): DetectionSettings;
  getExtensionSettings(): ExtensionSettings;
}

/** Context for lifecycle management */
export interface ScannerContext {
  readonly isInvalid: boolean;
  onInvalidated(callback: () => void): void;
}

/**
 * Attach the continuous scanner to an input element.
 *
 * Listens for text changes via 'input' events and a MutationObserver fallback.
 * Runs classification with debouncing (500ms for typing, immediate for paste).
 * Pushes results to the FindingsState.
 *
 * Returns a cleanup function.
 */
export function attachScanner(
  input: HTMLElement,
  adapter: SiteAdapter,
  config: ScannerConfig,
  state: FindingsState,
  ctx: ScannerContext,
): () => void {
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let lastText = '';

  function runClassification(): void {
    if (ctx.isInvalid) return;

    const extensionSettings = config.getExtensionSettings();
    if (!extensionSettings.enabled) {
      state.clear();
      return;
    }

    const el = input.isConnected ? input : adapter.findInput();
    if (!el) return;

    const text = adapter.getText(el);

    // Skip if text hasn't changed
    if (text === lastText) return;
    lastText = text;

    // Empty text = clear findings
    if (text.trim().length === 0) {
      state.clear();
      return;
    }

    const detectionSettings = config.getDetectionSettings();
    const enabledDetectors: Set<FindingType> = toEnabledDetectors(detectionSettings);
    const keywords = config.getKeywords();

    const result = classify(text, { keywords, enabledDetectors });

    // Filter to HIGH and MEDIUM confidence (same as orchestrator)
    const visible = result.findings.filter(
      (f) => f.confidence === 'HIGH' || f.confidence === 'MEDIUM',
    );

    state.update(visible);
  }

  function scheduleScan(immediate: boolean): void {
    if (debounceTimer !== null) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }

    if (immediate) {
      runClassification();
    } else {
      debounceTimer = setTimeout(runClassification, TYPING_DEBOUNCE_MS);
    }
  }

  // Input event handler — covers most typing and paste scenarios
  const handleInput = (e: Event): void => {
    if (ctx.isInvalid) return;
    // InputEvent with inputType 'insertFromPaste' = paste → immediate
    const isPaste =
      e instanceof InputEvent && e.inputType === 'insertFromPaste';
    scheduleScan(isPaste);
  };

  // Paste event handler — fires before input event, ensures immediate scan
  const handlePaste = (): void => {
    if (ctx.isInvalid) return;
    // Schedule immediate scan after paste content is applied
    // Use a microtask to let the paste complete first
    queueMicrotask(() => scheduleScan(true));
  };

  // MutationObserver fallback for editors that don't fire 'input' events
  const mutationObserver = new MutationObserver(() => {
    if (ctx.isInvalid) {
      mutationObserver.disconnect();
      return;
    }
    scheduleScan(false);
  });

  // Attach listeners
  input.addEventListener('input', handleInput);
  input.addEventListener('paste', handlePaste);
  mutationObserver.observe(input, {
    childList: true,
    subtree: true,
    characterData: true,
  });

  // Cleanup
  const cleanup = (): void => {
    if (debounceTimer !== null) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    input.removeEventListener('input', handleInput);
    input.removeEventListener('paste', handlePaste);
    mutationObserver.disconnect();
  };

  ctx.onInvalidated(cleanup);

  return cleanup;
}
