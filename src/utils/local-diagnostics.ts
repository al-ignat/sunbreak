export type DiagnosticsSubsystem =
  | 'observer'
  | 'widget-controller'
  | 'orchestrator';

export interface DiagnosticEntry {
  readonly timestamp: string;
  readonly subsystem: DiagnosticsSubsystem;
  readonly event: string;
  readonly details?: Record<string, unknown>;
}

const DIAGNOSTICS_KEY = '__SUNBREAK_DIAGNOSTICS__';
const DEBUG_FLAG_KEY = 'sunbreak:debug';
const MAX_ENTRIES = 200;

interface DiagnosticsGlobal {
  __SUNBREAK_DEBUG__?: boolean;
  __SUNBREAK_DIAGNOSTICS__?: DiagnosticEntry[];
}

function getDiagnosticsGlobal(): DiagnosticsGlobal {
  return globalThis as DiagnosticsGlobal;
}

export function getLocalDiagnostics(): DiagnosticEntry[] {
  const root = getDiagnosticsGlobal();
  if (!root[DIAGNOSTICS_KEY]) {
    root[DIAGNOSTICS_KEY] = [];
  }
  return root[DIAGNOSTICS_KEY]!;
}

export function clearLocalDiagnostics(): void {
  getDiagnosticsGlobal()[DIAGNOSTICS_KEY] = [];
}

export function isLocalDiagnosticsEnabled(): boolean {
  const root = getDiagnosticsGlobal();
  if (root.__SUNBREAK_DEBUG__ === true) return true;

  try {
    return globalThis.localStorage?.getItem(DEBUG_FLAG_KEY) === '1';
  } catch {
    return false;
  }
}

export function recordLocalDiagnostic(
  subsystem: DiagnosticsSubsystem,
  event: string,
  details?: Record<string, unknown>,
): DiagnosticEntry {
  const entry: DiagnosticEntry = {
    timestamp: new Date().toISOString(),
    subsystem,
    event,
    details,
  };

  const diagnostics = getLocalDiagnostics();
  diagnostics.push(entry);
  if (diagnostics.length > MAX_ENTRIES) {
    diagnostics.splice(0, diagnostics.length - MAX_ENTRIES);
  }

  if (isLocalDiagnosticsEnabled()) {
    console.debug(`[Sunbreak:${subsystem}] ${event}`, details ?? {});
  }

  return entry;
}
