import type { FindingType } from '../classifier/types';

/** A flagged event record — metadata only, NEVER stores prompt text */
export interface FlaggedEvent {
  readonly id: string;
  readonly timestamp: string;
  readonly tool: string;
  readonly categories: ReadonlyArray<string>;
  readonly findingCount: number;
  readonly action: 'redacted' | 'sent-anyway' | 'cancelled' | 'edited' | 'fixed' | 'ignored';
}

/** Daily interaction counter */
export interface DailyStats {
  readonly totalInteractions: number;
  readonly flaggedCount: number;
  readonly redactedCount: number;
  readonly sentAnywayCount: number;
  readonly cancelledCount: number;
  readonly editedCount: number;
  readonly byTool: Record<string, number>;
}

/** Extension-level on/off and mode settings */
export interface ExtensionSettings {
  readonly enabled: boolean;
  readonly interventionMode: 'warn' | 'log-only';
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
};

/** Default extension settings */
export const DEFAULT_EXTENSION_SETTINGS: ExtensionSettings = {
  enabled: true,
  interventionMode: 'warn',
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
