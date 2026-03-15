import type {
  SiteAdapter,
  SiteName,
  FileCallback,
  AttachmentRemovedCallback,
} from '../types';
import { compileCustomPatterns } from '../classifier/custom-patterns';
import type { CompiledCustomPattern } from '../classifier/custom-patterns';
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
  getCustomPatterns,
} from '../storage/dashboard';
import { createFindingsState } from './findings-state';
import type { FindingsState } from './findings-state';
import type { ScannerConfig } from './scanner';
import { createWidgetController } from '../ui/widget/widget-controller';
import type { WidgetContext } from '../ui/widget/widget-controller';
import { createMaskingMap } from './masking-map';
import type { MaskingMap } from './masking-map';
import { createClipboardInterceptor } from './clipboard-interceptor';
import type { ClipboardInterceptor } from './clipboard-interceptor';
import { recordLocalDiagnostic } from '../utils/local-diagnostics';

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
  return [...new Set(findings.map((f) => (
    f.type === 'custom-pattern'
      ? `custom-pattern:${f.customPattern?.category ?? 'other'}`
      : f.type
  )))];
}

function getComposerRoot(adapter: SiteAdapter): HTMLElement | null {
  const attachmentEvidenceRoot = adapter.getAttachmentEvidenceRoot?.();
  if (attachmentEvidenceRoot) return attachmentEvidenceRoot;

  const input = adapter.findInput();
  if (!input) return null;

  return (
    adapter.getDropZone?.() ??
    input.closest('fieldset') ??
    input.closest('form') ??
    input.parentElement
  );
}

function isLikelyVisibleElement(element: HTMLElement): boolean {
  if (element.hidden) return false;
  if (element.getAttribute('aria-hidden') === 'true') return false;

  const style = window.getComputedStyle(element);
  return style.display !== 'none' && style.visibility !== 'hidden';
}

function collectVisibleText(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent ?? '';
  }

  if (!(node instanceof HTMLElement)) {
    return Array.from(node.childNodes).map(collectVisibleText).join(' ');
  }

  if (!isLikelyVisibleElement(node)) {
    return '';
  }

  return Array.from(node.childNodes).map(collectVisibleText).join(' ');
}

function hasPendingAttachmentDomEvidence(
  adapter: SiteAdapter,
  pendingFileNames: ReadonlySet<string>,
): boolean {
  if (pendingFileNames.size === 0) return false;

  const composerRoot = getComposerRoot(adapter);
  if (!composerRoot) return false;

  const visibleText = collectVisibleText(composerRoot);
  const descendantMetadata = Array.from(
    composerRoot.querySelectorAll<HTMLElement>('[aria-label],[title],[data-testid]'),
  )
    .filter(isLikelyVisibleElement)
    .map((element) => (
      `${element.getAttribute('aria-label') ?? ''} ${element.getAttribute('title') ?? ''} ${element.getAttribute('data-testid') ?? ''}`
    ))
    .join(' ');

  const searchableText = `${visibleText} ${descendantMetadata}`
    .trim()
    .toLowerCase();

  if (searchableText.length === 0) return false;

  return Array.from(pendingFileNames).some((filename) => searchableText.includes(filename));
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
  onAttachmentRemoved: AttachmentRemovedCallback;
  findingsState: FindingsState;
  scannerConfig: ScannerConfig;
  widgetController: ReturnType<typeof createWidgetController>;
  maskingMap: MaskingMap;
  clipboardInterceptor: ClipboardInterceptor;
} {
  // Cache keywords from chrome.storage.local
  let cachedKeywords: string[] = [];
  let cachedCustomPatterns: CompiledCustomPattern[] = [];
  let cachedDetectionSettings: DetectionSettings = {
    ...DEFAULT_DETECTION_SETTINGS,
  };
  let cachedExtensionSettings: ExtensionSettings = {
    ...DEFAULT_EXTENSION_SETTINGS,
  };
  let pendingFileWarningNames = new Set<string>();

  // FindingsState for the continuous scanner
  const findingsState = createFindingsState();

  // MaskingMap: in-memory token→original mapping for reversible masking
  const maskingMap = createMaskingMap();

  // ScannerConfig: exposes cached settings to the scanner without duplication
  const scannerConfig: ScannerConfig = {
    getKeywords: () => cachedKeywords,
    getCustomPatterns: () => cachedCustomPatterns,
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
  const widgetController = createWidgetController(findingsState, adapter, widgetCtx, maskingMap);

  // ClipboardInterceptor: detect masking tokens in copy events, offer restore
  const clipboardInterceptor = createClipboardInterceptor(maskingMap, {
    onTokensFound: (count: number): Promise<boolean> => {
      // Gate: skip restore toast when masking is disabled
      if (!cachedExtensionSettings.maskingEnabled) return Promise.resolve(false);
      return widgetController.showRestoreToast(count);
    },
  });

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
        if (changes['customPatterns']) {
          const nextPatterns =
            (changes['customPatterns'].newValue as Parameters<typeof compileCustomPatterns>[0] | undefined) ?? [];
          cachedCustomPatterns = compileCustomPatterns(nextPatterns);
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
          widgetController.setEnabled(cachedExtensionSettings.enabled);
        }
      },
    );
  }

  async function fetchAllSettings(): Promise<void> {
    try {
      const [kw, ds, es, patterns] = await Promise.all([
        getKeywords(),
        getDetectionSettings(),
        getExtensionSettings(),
        getCustomPatterns(),
      ]);
      cachedKeywords = [...kw];
      cachedDetectionSettings = ds;
      cachedExtensionSettings = es;
      cachedCustomPatterns = compileCustomPatterns(patterns);
      widgetController.setEnabled(es.enabled);
    } catch {
      cachedKeywords = [];
      cachedCustomPatterns = [];
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
      const hasVerifiedPendingAttachments = maybeLogPendingAttachmentSend(adapter.name);
      if (!hasVerifiedPendingAttachments) {
        logCleanPrompt(adapter.name);
      }
      return false;
    }

    if (cachedExtensionSettings.interventionMode === 'log-only') {
      maybeLogPendingAttachmentSend(adapter.name);
      const active = snap.tracked.filter((t) => t.status === 'active');
      const logOnlyEvent: FlaggedEvent = {
        id: generateEventId(),
        timestamp: new Date().toISOString(),
        tool: adapter.name,
        categories: getCategories(active.map((t) => t.finding)),
        findingCount: snap.activeCount,
        action: 'sent-anyway',
        source: 'prompt',
        maskingAvailable: cachedExtensionSettings.maskingEnabled && adapter.capabilities?.reliableSetText !== false,
        maskingUsed: false,
        needsAttention: true,
        guidanceVersion: 1,
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
    findingsState.clear();

    const active = snap.tracked.filter((t) => t.status === 'active');
    const event: FlaggedEvent = {
      id: generateEventId(),
      timestamp: new Date().toISOString(),
      tool: adapter.name,
      categories: getCategories(active.map((t) => t.finding)),
      findingCount: snap.activeCount,
      action: 'sent-anyway',
      source: 'prompt',
      maskingAvailable: cachedExtensionSettings.maskingEnabled && adapter.capabilities?.reliableSetText !== false,
      maskingUsed: false,
      needsAttention: true,
      guidanceVersion: 1,
    };

    // If the user clicked "Send Anyway" explicitly, it's 'sent-anyway'
    // Timeout also results in release — same action
    void action; // both 'send-anyway' and 'timeout' result in 'sent-anyway'
    maybeLogPendingAttachmentSend(adapter.name);
    logFlaggedEvent(event);
  }

  function maybeLogPendingAttachmentSend(adapterName: SiteName): boolean {
    if (pendingFileWarningNames.size === 0) return false;

    const attachmentCount = adapter.getPendingAttachmentCount?.() ?? 0;
    if (attachmentCount <= 0) {
      if (adapter.name !== 'chatgpt') {
        if (!hasPendingAttachmentDomEvidence(adapter, pendingFileWarningNames)) {
          recordLocalDiagnostic('orchestrator', 'file-send-cleared-without-dom-evidence', {
            adapter: adapterName,
            pendingCount: pendingFileWarningNames.size,
          });
          pendingFileWarningNames = new Set<string>();
          return false;
        }

        const pendingCount = pendingFileWarningNames.size;
        pendingFileWarningNames = new Set<string>();

        logFlaggedEvent({
          id: generateEventId(),
          timestamp: new Date().toISOString(),
          tool: adapterName,
          categories: ['file-upload'],
          findingCount: pendingCount,
          action: 'file-warning',
          source: 'file-upload',
          maskingAvailable: false,
          maskingUsed: false,
          needsAttention: true,
          guidanceVersion: 1,
        });
        return true;
      }

      recordLocalDiagnostic('orchestrator', 'file-send-check-cleared', {
        adapter: adapterName,
        pendingCount: pendingFileWarningNames.size,
      });
      pendingFileWarningNames = new Set<string>();
      return false;
    }

    pendingFileWarningNames = new Set<string>();

    logFlaggedEvent({
      id: generateEventId(),
      timestamp: new Date().toISOString(),
      tool: adapterName,
      categories: ['file-upload'],
      findingCount: attachmentCount,
      action: 'file-warning',
      source: 'file-upload',
      maskingAvailable: false,
      maskingUsed: false,
      needsAttention: true,
      guidanceVersion: 1,
    });
    return true;
  }

  const submitConfig: SubmitInterceptConfig = {
    shouldBlock,
    onBlocked,
  };

  function onFileDetected(filename: string, adapterName: SiteName): void {
    recordLocalDiagnostic('orchestrator', 'file-detected', {
      adapter: adapterName,
      filename,
    });

    if (!cachedExtensionSettings.enabled) return;

    const normalizedFileName = filename.trim().toLowerCase();
    if (normalizedFileName.length === 0) return;

    if (pendingFileWarningNames.has(normalizedFileName)) {
      recordLocalDiagnostic('orchestrator', 'file-detected-duplicate-suppressed', {
        adapter: adapterName,
        filename,
      });
      return;
    }

    pendingFileWarningNames.add(normalizedFileName);
    widgetController.showFileWarning(pendingFileWarningNames.size);
  }

  function onAttachmentRemoved(adapterName: SiteName): void {
    if (pendingFileWarningNames.size === 0) return;

    const next = Array.from(pendingFileWarningNames);
    next.pop();
    pendingFileWarningNames = new Set(next);

    recordLocalDiagnostic('orchestrator', 'attachment-removed', {
      adapter: adapterName,
      remainingCount: pendingFileWarningNames.size,
    });
  }

  ctx.onInvalidated(() => {
    pendingFileWarningNames = new Set<string>();
  });

  return {
    submitConfig,
    onFileDetected,
    onAttachmentRemoved,
    findingsState,
    scannerConfig,
    widgetController,
    maskingMap,
    clipboardInterceptor,
  };
}
