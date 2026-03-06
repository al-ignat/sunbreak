import type { SiteAdapter, SiteName, FileCallback } from '../types';
import type { Finding } from '../classifier/types';
import type { SubmitInterceptConfig } from './interceptor';
import { clearKeywordCache } from '../classifier/keywords';
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
import {
  getDetectionSettings,
  getExtensionSettings,
  getKeywords,
} from '../storage/dashboard';
import { createFindingsState } from './findings-state';
import type { FindingsState } from './findings-state';
import type { ScannerConfig } from './scanner';
import { createWidgetController } from '../ui/widget/widget-controller';
import type { WidgetContext } from '../ui/widget/widget-controller';

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
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

/** Get unique finding type categories from findings */
function getCategories(findings: ReadonlyArray<Finding>): string[] {
  return [...new Set(findings.map((f) => f.type))];
}

/**
 * Create the full interception orchestrator.
 *
 * v0.2: wires scanner → findingsState → widget + toast → interceptor
 *
 * The scanner runs continuously, populating FindingsState.
 * On submit, the interceptor checks activeCount and shows a toast
 * if findings are present. Submission is never fully blocked.
 */
export function createOrchestrator(
  adapter: SiteAdapter,
  ctx: OrchestratorContext,
): {
  submitConfig: SubmitInterceptConfig;
  onFileDetected: FileCallback;
  findingsState: FindingsState;
  scannerConfig: ScannerConfig;
  widgetController: ReturnType<typeof createWidgetController>;
} {
  // Cache keywords from chrome.storage.local
  let cachedKeywords: string[] = [];
  let cachedDetectionSettings: DetectionSettings = {
    ...DEFAULT_DETECTION_SETTINGS,
  };
  let cachedExtensionSettings: ExtensionSettings = {
    ...DEFAULT_EXTENSION_SETTINGS,
  };

  // FindingsState for the continuous scanner
  const findingsState = createFindingsState();

  // ScannerConfig: exposes cached settings to the scanner without duplication
  const scannerConfig: ScannerConfig = {
    getKeywords: () => cachedKeywords,
    getDetectionSettings: () => cachedDetectionSettings,
    getExtensionSettings: () => cachedExtensionSettings,
  };

  // Widget controller for the corner widget UI
  const widgetCtx: WidgetContext = {
    get isInvalid(): boolean {
      return ctx.isInvalid;
    },
    onInvalidated: ctx.onInvalidated.bind(ctx),
  };
  const widgetController = createWidgetController(findingsState, adapter, widgetCtx);

  // Fetch all cached settings initially
  void fetchAllSettings();

  // Listen for storage changes
  if (chrome.storage?.onChanged) {
    chrome.storage.onChanged.addListener(
      (changes: Record<string, chrome.storage.StorageChange>) => {
        if (changes['keywords']) {
          cachedKeywords =
            (changes['keywords'].newValue as string[] | undefined) ?? [];
          clearKeywordCache();
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

  async function fetchAllSettings(): Promise<void> {
    try {
      const [kw, ds, es] = await Promise.all([
        getKeywords(),
        getDetectionSettings(),
        getExtensionSettings(),
      ]);
      cachedKeywords = [...kw];
      cachedDetectionSettings = ds;
      cachedExtensionSettings = es;
    } catch {
      cachedKeywords = [];
      cachedDetectionSettings = { ...DEFAULT_DETECTION_SETTINGS };
      cachedExtensionSettings = { ...DEFAULT_EXTENSION_SETTINGS };
    }
  }

  /**
   * Synchronous check: should this submission be blocked?
   * Also handles logging for clean prompts and log-only mode.
   */
  function shouldBlock(): boolean {
    if (!cachedExtensionSettings.enabled) return false;

    const snap = findingsState.getSnapshot();

    if (snap.activeCount === 0) {
      logCleanPrompt(adapter.name);
      return false;
    }

    if (cachedExtensionSettings.interventionMode === 'log-only') {
      const active = snap.tracked.filter((t) => t.status === 'active');
      const logOnlyEvent: FlaggedEvent = {
        id: generateEventId(),
        timestamp: new Date().toISOString(),
        tool: adapter.name,
        categories: getCategories(active.map((t) => t.finding)),
        findingCount: snap.activeCount,
        action: 'sent-anyway',
      };
      logFlaggedEvent(logOnlyEvent);
      return false;
    }

    return true;
  }

  /**
   * Async handler: called after submission is blocked.
   * Shows toast, waits for resolution, then logs the event.
   */
  async function onBlocked(): Promise<void> {
    const snap = findingsState.getSnapshot();
    const action = await widgetController.showToast(snap.activeCount);

    const active = snap.tracked.filter((t) => t.status === 'active');
    const event: FlaggedEvent = {
      id: generateEventId(),
      timestamp: new Date().toISOString(),
      tool: adapter.name,
      categories: getCategories(active.map((t) => t.finding)),
      findingCount: snap.activeCount,
      action: 'sent-anyway',
    };

    // If the user clicked "Send Anyway" explicitly, it's 'sent-anyway'
    // Timeout also results in release — same action
    void action; // both 'send-anyway' and 'timeout' result in 'sent-anyway'
    logFlaggedEvent(event);
  }

  const submitConfig: SubmitInterceptConfig = {
    shouldBlock,
    onBlocked,
  };

  function onFileDetected(filename: string, adapterName: SiteName): void {
    console.log(
      `[Sunbreak] File detected on ${adapterName}: ${filename}`,
    );
  }

  return { submitConfig, onFileDetected, findingsState, scannerConfig, widgetController };
}
