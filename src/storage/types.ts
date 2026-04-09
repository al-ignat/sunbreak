import type { FindingType } from '../classifier/types';
import type { SiteName } from '../types';

/** A flagged event record — metadata only, NEVER stores prompt text */
export type FlaggedEventSource = 'prompt' | 'file-upload';

export const FLAGGED_EVENT_ACTIONS = [
  'redacted',
  'sent-anyway',
  'cancelled',
  'edited',
  'fixed',
  'ignored',
  'file-warning',
] as const;

export const FLAGGED_EVENT_SOURCES = ['prompt', 'file-upload'] as const;

export const FLAGGED_EVENT_GUIDANCE_VERSION = 1 as const;

export interface FlaggedEvent {
  readonly id: string;
  readonly timestamp: string;
  readonly tool: string;
  readonly categories: ReadonlyArray<string>;
  readonly findingCount: number;
  readonly action: 'redacted' | 'sent-anyway' | 'cancelled' | 'edited' | 'fixed' | 'ignored' | 'file-warning';
  readonly source: FlaggedEventSource;
  readonly maskingAvailable: boolean;
  readonly maskingUsed: boolean;
  readonly needsAttention: boolean;
  readonly guidanceVersion: typeof FLAGGED_EVENT_GUIDANCE_VERSION;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isFlaggedEventAction(value: unknown): value is FlaggedEvent['action'] {
  return typeof value === 'string' &&
    (FLAGGED_EVENT_ACTIONS as ReadonlyArray<string>).includes(value);
}

function isFlaggedEventSource(value: unknown): value is FlaggedEventSource {
  return typeof value === 'string' &&
    (FLAGGED_EVENT_SOURCES as ReadonlyArray<string>).includes(value);
}

function normalizeCategories(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  const categories: string[] = [];
  for (const entry of value) {
    if (typeof entry !== 'string') continue;
    const normalized = entry.trim();
    if (normalized.length === 0 || seen.has(normalized)) continue;
    seen.add(normalized);
    categories.push(normalized);
  }
  return categories;
}

function normalizeFindingCount(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? Math.floor(value)
    : 0;
}

function defaultNeedsAttention(action: FlaggedEvent['action']): boolean {
  return action === 'sent-anyway' || action === 'cancelled' || action === 'edited' || action === 'file-warning';
}

/** Normalize stored flagged-event metadata and supply safe defaults for legacy records. */
export function normalizeFlaggedEvent(input: unknown): FlaggedEvent | null {
  if (!isRecord(input)) return null;

  const { id, timestamp, tool, action } = input;
  if (
    typeof id !== 'string' ||
    id.trim().length === 0 ||
    typeof timestamp !== 'string' ||
    timestamp.trim().length === 0 ||
    typeof tool !== 'string' ||
    tool.trim().length === 0 ||
    !isFlaggedEventAction(action)
  ) {
    return null;
  }

  return {
    id,
    timestamp,
    tool,
    categories: normalizeCategories(input['categories']),
    findingCount: normalizeFindingCount(input['findingCount']),
    action,
    source: isFlaggedEventSource(input['source']) ? input['source'] : 'prompt',
    maskingAvailable: typeof input['maskingAvailable'] === 'boolean' ? input['maskingAvailable'] : false,
    maskingUsed: typeof input['maskingUsed'] === 'boolean' ? input['maskingUsed'] : action === 'redacted',
    needsAttention: typeof input['needsAttention'] === 'boolean'
      ? input['needsAttention']
      : defaultNeedsAttention(action),
    guidanceVersion:
      input['guidanceVersion'] === FLAGGED_EVENT_GUIDANCE_VERSION
        ? FLAGGED_EVENT_GUIDANCE_VERSION
        : FLAGGED_EVENT_GUIDANCE_VERSION,
  };
}

/** Daily interaction counter */
export interface DailyStats {
  readonly totalInteractions: number;
  readonly flaggedCount: number;
  readonly redactedCount: number;
  readonly sentAnywayCount: number;
  readonly cancelledCount: number;
  readonly editedCount: number;
  readonly fixedCount: number;
  readonly ignoredCount: number;
  readonly byTool: Record<string, number>;
}

/** Extension-level on/off and mode settings */
export type ProviderGuidanceMode =
  | 'general'
  | 'consumer'
  | 'business'
  | 'enterprise'
  | 'api'
  | 'workspace';

export type ProviderGuidanceSettings = Record<SiteName, ProviderGuidanceMode>;

export interface ExtensionSettings {
  readonly enabled: boolean;
  readonly interventionMode: 'warn' | 'log-only';
  readonly maskingEnabled: boolean;
  readonly recoveryAssistanceEnabled: boolean;
  readonly providerGuidance: ProviderGuidanceSettings;
}

/** Per-category detection toggles */
export type DetectionSettings = Record<FindingType, boolean>;

/** All detection categories with human-readable descriptions */
export const DETECTION_CATEGORIES: ReadonlyArray<{
  readonly type: FindingType;
  readonly label: string;
  readonly description: string;
}> = [
  { type: 'email', label: 'Email Addresses', description: 'Detects email addresses in prompts' },
  { type: 'phone', label: 'Phone Numbers', description: 'Detects phone numbers (US and international formats)' },
  { type: 'credit-card', label: 'Credit Card Numbers', description: 'Detects credit card numbers with Luhn validation' },
  { type: 'ssn', label: 'Social Security Numbers', description: 'Detects US SSN patterns (XXX-XX-XXXX)' },
  { type: 'cpr', label: 'Danish CPR Numbers', description: 'Detects Danish CPR numbers (DDMMYY-XXXX)' },
  { type: 'ni-number', label: 'UK National Insurance', description: 'Detects UK NI numbers (XX 99 99 99 X)' },
  { type: 'ip-address', label: 'IP Addresses', description: 'Detects IPv4 and IPv6 addresses' },
  { type: 'api-key', label: 'API Keys & Tokens', description: 'Detects AWS, GitHub, Stripe, OpenAI, and generic API keys' },
  { type: 'keyword', label: 'Custom Keywords', description: 'Matches your custom keyword list' },
  { type: 'custom-pattern', label: 'Company Patterns', description: 'Runs your company-specific identifier patterns' },
];

/** Default detection settings — all categories enabled */
export const DEFAULT_DETECTION_SETTINGS: DetectionSettings = {
  'email': true,
  'phone': true,
  'credit-card': true,
  'ssn': true,
  'cpr': true,
  'ni-number': true,
  'ip-address': true,
  'api-key': true,
  'keyword': true,
  'custom-pattern': true,
};

/** Default extension settings */
export const DEFAULT_EXTENSION_SETTINGS: ExtensionSettings = {
  enabled: true,
  interventionMode: 'warn',
  maskingEnabled: true,
  recoveryAssistanceEnabled: false,
  providerGuidance: {
    chatgpt: 'general',
    claude: 'general',
    gemini: 'general',
  },
};

/** Filter options for querying flagged events */
export interface EventFilter {
  readonly days?: number;
  readonly tool?: string;
}

/** Aggregated stats for a time period */
export interface AggregatedStats {
  readonly totalInteractions: number;
  readonly flaggedCount: number;
  readonly redactedCount: number;
  readonly sentAnywayCount: number;
  readonly cancelledCount: number;
  readonly editedCount: number;
  readonly fixedCount: number;
  readonly ignoredCount: number;
  readonly byTool: Record<string, number>;
  readonly dailyBreakdown: ReadonlyArray<{
    readonly date: string;
    readonly total: number;
    readonly flagged: number;
    readonly clean: number;
    readonly byTool: Record<string, number>;
  }>;
  readonly complianceRate: number | null;
}

export type CustomPatternSeverity = 'warning' | 'concern' | 'critical';

export type CustomPatternCategory =
  | 'internal-identifier'
  | 'finance'
  | 'hr'
  | 'legal'
  | 'security'
  | 'operations'
  | 'other';

export type CustomPatternSourceMode = 'template' | 'advanced-regex';

export type CustomPatternTemplateId =
  | 'employee-id'
  | 'customer-id'
  | 'invoice-number'
  | 'project-code'
  | 'ticket-reference'
  | 'matter-reference';

export interface CustomPatternSamples {
  readonly positive: ReadonlyArray<string>;
  readonly negative: ReadonlyArray<string>;
}

/** Stored editable company-specific pattern definition */
export interface CustomPattern {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly enabled: boolean;
  readonly severity: CustomPatternSeverity;
  readonly category: CustomPatternCategory;
  readonly sourceMode: CustomPatternSourceMode;
  readonly templateId: CustomPatternTemplateId | null;
  readonly pattern: string;
  readonly flags: string;
  readonly samples: CustomPatternSamples;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CustomPatternBundle {
  readonly version: 1;
  readonly exportedAt: string;
  readonly patterns: ReadonlyArray<CustomPattern>;
}

/** Onboarding state — UI-only, separate from ExtensionSettings */
export type OnboardingStatus = 'not-started' | 'completed' | 'skipped';

export interface OnboardingState {
  readonly status: OnboardingStatus;
  readonly completedAt?: string;
}
