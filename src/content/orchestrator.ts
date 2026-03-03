import type { SiteAdapter, SiteName, FileCallback } from '../types';
import type { Finding, FindingType } from '../classifier/types';
import { classify } from '../classifier/engine';
import { createOverlayController } from '../ui/overlay/overlay-controller';
import type { OverlayContext } from '../ui/overlay/overlay-controller';
import type { OverlayFinding } from '../ui/overlay/types';
import { buildRedactedText } from './interceptor';
import type { InterceptResult } from './interceptor';
import { logFlaggedEvent, logCleanPrompt } from '../storage/events';
import type {
  FlaggedEvent,
  DetectionSettings,
  ExtensionSettings,
} from '../storage/types';
import {
  DEFAULT_DETECTION_SETTINGS,
  DEFAULT_EXTENSION_SETTINGS,
} from '../storage/types';

/**
 * Context for the orchestrator.
 * In production this comes from WXT's ContentScriptContext.
 */
export interface OrchestratorContext {
  readonly isInvalid: boolean;
  onInvalidated(callback: () => void): void;
}

/** Generate a unique ID for flagged events */
function generateEventId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

/** Convert classifier Findings to OverlayFindings */
function toOverlayFindings(
  findings: ReadonlyArray<Finding>,
): ReadonlyArray<OverlayFinding> {
  return findings.map((f) => ({
    type: f.type,
    label: f.label,
    value: f.value,
    placeholder: f.placeholder,
    confidence: f.confidence,
  }));
}

/** Get unique finding type categories from findings */
function getCategories(findings: ReadonlyArray<Finding>): string[] {
  return [...new Set(findings.map((f) => f.type))];
}

/** Convert DetectionSettings to a Set of enabled FindingTypes */
function toEnabledDetectors(
  settings: DetectionSettings,
): Set<FindingType> {
  const enabled = new Set<FindingType>();
  for (const [type, on] of Object.entries(settings)) {
    if (on) {
      enabled.add(type as FindingType);
    }
  }
  return enabled;
}

/**
 * Create the full interception orchestrator.
 *
 * Wires: interceptor → classifier → overlay → action → storage
 *
 * Returns callbacks for the observer to use.
 */
export function createOrchestrator(
  adapter: SiteAdapter,
  ctx: OrchestratorContext,
): {
  onPromptIntercepted: (
    text: string,
    adapterName: SiteName,
  ) => Promise<InterceptResult>;
  onFileDetected: FileCallback;
} {
  const overlayCtx: OverlayContext = {
    get isInvalid(): boolean {
      return ctx.isInvalid;
    },
    onInvalidated: ctx.onInvalidated.bind(ctx),
  };

  const overlay = createOverlayController(overlayCtx);

  // Cache keywords from chrome.storage.local
  let cachedKeywords: string[] = [];
  // Cache detection settings
  let cachedDetectionSettings: DetectionSettings = {
    ...DEFAULT_DETECTION_SETTINGS,
  };
  // Cache extension settings
  let cachedExtensionSettings: ExtensionSettings = {
    ...DEFAULT_EXTENSION_SETTINGS,
  };

  // Fetch all cached settings initially
  void fetchKeywords();
  void fetchDetectionSettings();
  void fetchExtensionSettings();

  // Listen for storage changes
  if (chrome.storage?.onChanged) {
    chrome.storage.onChanged.addListener(
      (changes: Record<string, chrome.storage.StorageChange>) => {
        if (changes['keywords']) {
          cachedKeywords =
            (changes['keywords'].newValue as string[] | undefined) ?? [];
        }
        if (changes['detectionSettings']) {
          cachedDetectionSettings =
            (changes['detectionSettings'].newValue as
              | DetectionSettings
              | undefined) ?? { ...DEFAULT_DETECTION_SETTINGS };
        }
        if (changes['settings']) {
          cachedExtensionSettings =
            (changes['settings'].newValue as
              | ExtensionSettings
              | undefined) ?? { ...DEFAULT_EXTENSION_SETTINGS };
        }
      },
    );
  }

  async function fetchKeywords(): Promise<void> {
    try {
      const data = await chrome.storage.local.get('keywords');
      cachedKeywords = (data['keywords'] as string[] | undefined) ?? [];
    } catch {
      cachedKeywords = [];
    }
  }

  async function fetchDetectionSettings(): Promise<void> {
    try {
      const data = await chrome.storage.local.get('detectionSettings');
      cachedDetectionSettings =
        (data['detectionSettings'] as DetectionSettings | undefined) ?? {
          ...DEFAULT_DETECTION_SETTINGS,
        };
    } catch {
      cachedDetectionSettings = { ...DEFAULT_DETECTION_SETTINGS };
    }
  }

  async function fetchExtensionSettings(): Promise<void> {
    try {
      const data = await chrome.storage.local.get('settings');
      cachedExtensionSettings =
        (data['settings'] as ExtensionSettings | undefined) ?? {
          ...DEFAULT_EXTENSION_SETTINGS,
        };
    } catch {
      cachedExtensionSettings = { ...DEFAULT_EXTENSION_SETTINGS };
    }
  }

  async function onPromptIntercepted(
    text: string,
    adapterName: SiteName,
  ): Promise<InterceptResult> {
    if (ctx.isInvalid) return 'release';

    // Respect extension enabled toggle
    if (!cachedExtensionSettings.enabled) {
      return 'release';
    }

    // Run classifier with enabled detectors
    const enabledDetectors = toEnabledDetectors(cachedDetectionSettings);
    const result = classify(text, {
      keywords: cachedKeywords,
      enabledDetectors,
    });

    // Filter to HIGH and MEDIUM confidence only
    const visibleFindings = result.findings.filter(
      (f) => f.confidence === 'HIGH' || f.confidence === 'MEDIUM',
    );

    // Zero-interference: if nothing to show, release immediately
    if (visibleFindings.length === 0) {
      logCleanPrompt(adapterName);
      return 'release';
    }

    // In log-only mode, log the event but skip the overlay
    if (cachedExtensionSettings.interventionMode === 'log-only') {
      const logOnlyEvent: FlaggedEvent = {
        id: generateEventId(),
        timestamp: new Date().toISOString(),
        tool: adapterName,
        categories: getCategories(visibleFindings),
        findingCount: visibleFindings.length,
        action: 'sent-anyway',
      };
      logFlaggedEvent(logOnlyEvent);
      return 'release';
    }

    // Show overlay and wait for user action
    const overlayFindings = toOverlayFindings(visibleFindings);
    const action = await overlay.show(overlayFindings);

    const eventBase = {
      id: generateEventId(),
      timestamp: new Date().toISOString(),
      tool: adapterName,
      categories: getCategories(visibleFindings),
      findingCount: visibleFindings.length,
    };

    switch (action) {
      case 'redact': {
        // Replace findings with placeholders
        const redactedText = buildRedactedText(text, visibleFindings);
        adapter.setText(
          adapter.findInput() as HTMLElement,
          redactedText,
        );

        const redactEvent: FlaggedEvent = {
          ...eventBase,
          action: 'redacted',
        };
        logFlaggedEvent(redactEvent);

        return 'redact';
      }

      case 'edit': {
        const editEvent: FlaggedEvent = {
          ...eventBase,
          action: 'edited',
        };
        logFlaggedEvent(editEvent);

        // Return focus to input
        adapter.findInput()?.focus();
        return 'block';
      }

      case 'send-anyway': {
        const sendEvent: FlaggedEvent = {
          ...eventBase,
          action: 'sent-anyway',
        };
        logFlaggedEvent(sendEvent);

        return 'release';
      }

      case 'cancel': {
        const cancelEvent: FlaggedEvent = {
          ...eventBase,
          action: 'cancelled',
        };
        logFlaggedEvent(cancelEvent);

        return 'block';
      }
    }
  }

  function onFileDetected(filename: string, adapterName: SiteName): void {
    // Phase 4: file detection is logged but not blocked
    // File content analysis is out of scope for v1
    console.log(
      `[BYOAI] File detected on ${adapterName}: ${filename}`,
    );
  }

  return { onPromptIntercepted, onFileDetected };
}
